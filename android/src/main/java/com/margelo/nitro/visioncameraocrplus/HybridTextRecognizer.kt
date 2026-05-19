package com.margelo.nitro.visioncameraocrplus

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.margelo.nitro.core.Promise
import java.util.concurrent.Executors

/**
 * Android implementation of the TextRecognizer HybridObject.
 * Uses ML Kit on-device text recognition for both live frame scanning and
 * still-photo recognition.
 *
 * Frame scanning requires the Camera component to use pixelFormat="rgb" on
 * Android so the AHardwareBuffer is in RGBA format and can be CPU-locked.
 */
@DoNotStrip
@Keep
class HybridTextRecognizer : HybridTextRecognizerSpec() {

  // Native method — converts AHardwareBuffer pointer → android.graphics.Bitmap.
  // Implemented in src/main/cpp/HybridTextRecognizer.cpp.
  @DoNotStrip
  @Keep
  private external fun nativeCreateBitmapFromHardwareBuffer(pointer: Long): Bitmap?

  companion object {
    init {
      // The shared library is already loaded by NitroVisionCameraOcrPlusOnLoad,
      // but we need System.loadLibrary here as a fallback during tests.
      try { System.loadLibrary("NitroVisionCameraOcrPlus") } catch (_: UnsatisfiedLinkError) {}
    }
  }

  private var recognizer: TextRecognizer =
    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

  private var scanRegion: ScanRegion? = null
  private var frameSkipThreshold: Int = 3
  private var useLightweightMode: Boolean = false

  // Background OCR: a single-thread executor so OCR never blocks the frame thread.
  // scanFrame returns the last completed result immediately and enqueues a new job
  // only when the executor is idle (isBusy == false).
  private val ocrExecutor = Executors.newSingleThreadExecutor()
  @Volatile private var isBusy: Boolean = false
  @Volatile private var lastResult: RecognizedText? = null
  private var frameCounter: Int = 0

  override fun configure(config: TextRecognitionConfig) {
    frameSkipThreshold = maxOf(1, config.frameSkipThreshold.toInt())
    useLightweightMode = config.useLightweightMode
    scanRegion = config.scanRegion

    if (useLightweightMode) {
      recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      return
    }

    recognizer = when (config.language.lowercase()) {
      "chinese" -> TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
      "devanagari" -> TextRecognition.getClient(DevanagariTextRecognizerOptions.Builder().build())
      "japanese" -> TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())
      "korean" -> TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
      else -> TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    }
  }

  override fun recognizePhoto(uri: String, orientation: String): Promise<RecognizedText> {
    return Promise.async {
      // Decode the image from the file URI
      val cleanPath = if (uri.startsWith("file://")) uri.removePrefix("file://") else uri
      val bitmap = BitmapFactory.decodeFile(cleanPath)
        ?: throw RuntimeException("Cannot decode image at URI: $uri")

      val croppedBitmap = applyScanRegion(bitmap)
      val inputImage = InputImage.fromBitmap(croppedBitmap, 0)
      val mlkitResult = Tasks.await(recognizer.process(inputImage))
      buildRecognizedText(mlkitResult)
    }
  }

  override fun scanFrame(nativeBufferPointer: ULong, orientation: String): RecognizedText? {
    // Apply frame-skip for performance
    frameCounter++
    if (frameCounter % maxOf(1, frameSkipThreshold) != 0) {
      return lastResult
    }

    // If the OCR executor is still processing the previous frame, skip this one.
    // This is the key fix: we never block the frame thread waiting for ML Kit.
    if (isBusy) return lastResult

    val sourceBitmap = nativeCreateBitmapFromHardwareBuffer(nativeBufferPointer.toLong())
      ?: return lastResult

    val softwareBitmap = copyToSoftwareBitmap(sourceBitmap)
      ?: return lastResult

    val croppedBitmap = applyScanRegion(softwareBitmap)
    val rotationDegrees = orientationToDegrees(orientation)
    val inputImage = InputImage.fromBitmap(croppedBitmap, rotationDegrees)

    // Run ML Kit off the frame thread.
    isBusy = true
    val currentRecognizer = recognizer
    ocrExecutor.execute {
      try {
        val result = Tasks.await(currentRecognizer.process(inputImage))
        lastResult = buildRecognizedText(result)
      } catch (_: Exception) {
        // Ignore ML Kit errors on individual frames
      } finally {
        if (!croppedBitmap.isRecycled) {
          croppedBitmap.recycle()
        }
        if (croppedBitmap !== softwareBitmap && !softwareBitmap.isRecycled) {
          softwareBitmap.recycle()
        }
        isBusy = false
      }
    }

    // Return the last completed result immediately — the frame thread is never blocked.
    return lastResult
  }

  private fun orientationToDegrees(orientation: String): Int = when (orientation) {
    "landscapeLeft"      -> 90
    "portraitUpsideDown" -> 180
    "landscapeRight"     -> 270
    else                 -> 0  // portrait
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private fun applyScanRegion(bitmap: Bitmap): Bitmap {
    val region = scanRegion ?: return bitmap

    val bitmapWidth = bitmap.width
    val bitmapHeight = bitmap.height

    val requestedLeft = (region.left / 100.0 * bitmapWidth).toInt()
    val requestedTop = (region.top / 100.0 * bitmapHeight).toInt()
    val requestedWidth = (region.width / 100.0 * bitmapWidth).toInt()
    val requestedHeight = (region.height / 100.0 * bitmapHeight).toInt()

    val left = requestedLeft.coerceIn(0, bitmapWidth)
    val top = requestedTop.coerceIn(0, bitmapHeight)
    val right = (requestedLeft + requestedWidth).coerceIn(left, bitmapWidth)
    val bottom = (requestedTop + requestedHeight).coerceIn(top, bitmapHeight)

    val width = right - left
    val height = bottom - top

    if (width <= 0 || height <= 0) {
      return bitmap
    }

    return Bitmap.createBitmap(bitmap, left, top, width, height)
  }

  private fun copyToSoftwareBitmap(bitmap: Bitmap): Bitmap? {
    return bitmap.copy(Bitmap.Config.ARGB_8888, false)
  }

  private fun buildRecognizedText(result: Text): RecognizedText {
    val blocks = result.textBlocks.map { block ->
      val lines = block.lines.map { line ->
        val elements = line.elements.map { element ->
          TextElement(
            elementText = element.text,
            elementFrame = boundingFrame(element.boundingBox),
            elementCornerPoints = cornerPoints(element.cornerPoints)
          )
        }.toTypedArray()

        // ML Kit Android Text.TextLine does not expose per-line language codes;
        // default to "und" (undetermined) to satisfy the spec contract.
        val languages = arrayOf("und")

        TextLine(
          lineText = line.text,
          lineFrame = boundingFrame(line.boundingBox),
          lineCornerPoints = cornerPoints(line.cornerPoints),
          lineLanguages = languages,
          elements = elements
        )
      }.toTypedArray()

      TextBlock(
        blockText = block.text,
        blockFrame = boundingFrame(block.boundingBox),
        blockCornerPoints = cornerPoints(block.cornerPoints),
        lines = lines
      )
    }.toTypedArray()

    return RecognizedText(resultText = result.text, blocks = blocks)
  }

  private fun boundingFrame(rect: android.graphics.Rect?): BoundingFrame {
    if (rect == null) {
      return BoundingFrame(
        boundingCenterX = 0.0,
        boundingCenterY = 0.0,
        height = 0.0,
        width = 0.0,
        x = 0.0,
        y = 0.0
      )
    }
    val centerX = rect.exactCenterX().toDouble()
    val centerY = rect.exactCenterY().toDouble()
    val width = rect.width().toDouble()
    val height = rect.height().toDouble()
    val offsetX = (centerX - Math.ceil(width)) / 2.0
    val offsetY = (centerY - Math.ceil(height)) / 2.0
    val x = rect.right.toDouble() + offsetX
    val y = rect.top.toDouble() + offsetY
    return BoundingFrame(
      boundingCenterX = centerX,
      boundingCenterY = centerY,
      height = height,
      width = width,
      x = centerX + (centerX - x),
      y = centerY + (y - centerY)
    )
  }

  private fun cornerPoints(points: Array<android.graphics.Point>?): Array<CornerPoint> {
    return points?.map { CornerPoint(x = it.x.toDouble(), y = it.y.toDouble()) }?.toTypedArray()
      ?: emptyArray()
  }
}

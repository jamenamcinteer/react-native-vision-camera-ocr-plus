package com.rnvisioncameraocr

import android.graphics.Point
import android.graphics.Rect
import android.media.Image
import android.os.SystemClock
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class RNVisionCameraOCRPlugin(proxy: VisionCameraProxy, options: Map<String, Any>?) :
    FrameProcessorPlugin() {

    private var recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val scanRegion: Map<*, *>?
    private val latinOptions = TextRecognizerOptions.DEFAULT_OPTIONS
    private val chineseOptions = ChineseTextRecognizerOptions.Builder().build()
    private val devanagariOptions = DevanagariTextRecognizerOptions.Builder().build()
    private val japaneseOptions = JapaneseTextRecognizerOptions.Builder().build()
    private val koreanOptions = KoreanTextRecognizerOptions.Builder().build()

    private var frameSkipCount = 0
    private val frameSkipThreshold: Int
    private val useLightweightMode: Boolean

    // Critical: DO NOT block the callback — OCR runs in the background.
    private val executor = Executors.newSingleThreadExecutor()
    private val isProcessing = AtomicBoolean(false)

    @Volatile private var cachedResult: HashMap<String, Any?>? = null
    @Volatile private var lastProcessedAtMs = 0L

    // Cache window (prevents the UI from "flickering" between frames)
    private val cacheTimeoutMs = 600L

    init {
        val language = options?.get("language").toString()
        scanRegion = options?.get("scanRegion") as Map<*, *>?
        frameSkipThreshold = (options?.get("frameSkipThreshold") as? Number)?.toInt() ?: 10
        useLightweightMode = (options?.get("useLightweightMode") as? Boolean) ?: false

        recognizer = when (language) {
            "latin" -> TextRecognition.getClient(latinOptions)
            "chinese" -> TextRecognition.getClient(chineseOptions)
            "devanagari" -> TextRecognition.getClient(devanagariOptions)
            "japanese" -> TextRecognition.getClient(japaneseOptions)
            "korean" -> TextRecognition.getClient(koreanOptions)
            else -> TextRecognition.getClient(latinOptions)
        }
    }

    override fun callback(frame: Frame, arguments: Map<String, Any>?): Any? {
        val now = SystemClock.elapsedRealtime()

        frameSkipCount++
        val shouldSkip = frameSkipCount < frameSkipThreshold
        if (shouldSkip) {
            return getCachedResult(now)
        }
        frameSkipCount = 0

        // If OCR is already running, don't add work - return cached result.
        if (!isProcessing.compareAndSet(false, true)) {
            return getCachedResult(now)
        }

        // Minimize work in the callback: prepare NV21 (preferably cropped) and submit to the executor.
        return try {
            val rotationDegrees = frame.imageProxy.imageInfo.rotationDegrees
            val srcWidth = frame.width
            val srcHeight = frame.height

            val cropRect = scanRegion?.let { computeCropRectRaw(it, rotationDegrees, srcWidth, srcHeight) }
            val (nv21, outW, outH) = if (cropRect != null) {
                val bytes = BitmapUtils.yuv420888ToNv21Cropped(frame.image.planes, srcWidth, srcHeight, cropRect)
                Triple(bytes, cropRect.width(), cropRect.height())
            } else {
                val bytes = BitmapUtils.yuv420888ToNv21(frame.image.planes, srcWidth, srcHeight)
                Triple(bytes, srcWidth, srcHeight)
            }

            executor.execute {
                try {
                    val image = InputImage.fromByteArray(
                        nv21,
                        outW,
                        outH,
                        rotationDegrees,
                        InputImage.IMAGE_FORMAT_NV21
                    )

                    val task: Task<Text> = recognizer.process(image)
                    val text: Text = Tasks.await(task)

                    val resultText = text.text
                    val result = if (resultText.isEmpty()) {
                        WritableNativeMap().toHashMap() as HashMap<String, Any?>
                    } else {
                        val data = WritableNativeMap().apply {
                            putString("resultText", resultText)
                            if (useLightweightMode) {
                                putArray("blocks", getLightweightBlocks(text.textBlocks))
                            } else {
                                putArray("blocks", getBlocks(text.textBlocks))
                            }
                        }
                        data.toHashMap() as HashMap<String, Any?>
                    }

                    // Cache update
                    if (resultText.isNotEmpty()) {
                        cachedResult = result
                        lastProcessedAtMs = SystemClock.elapsedRealtime()
                    } else {
                        cachedResult = null
                        lastProcessedAtMs = SystemClock.elapsedRealtime()
                    }
                } catch (_: Exception) {
                    // On error, keep the last cache.
                } finally {
                    isProcessing.set(false)
                }
            }

            // Callback must return immediately:
            getCachedResult(now)
        } catch (_: Exception) {
            isProcessing.set(false)
            getCachedResult(now)
        }
    }

    private fun getCachedResult(now: Long): HashMap<String, Any?>? {
        val result = cachedResult ?: return null
        // If currently processing, keep returning the last stable result.
        if (isProcessing.get()) return result
        return if (now - lastProcessedAtMs <= cacheTimeoutMs) result else null
    }

    /**
     * scanRegion is in percent relative to the "upright" preview (as the user sees it).
     * Map it to RAW image coordinates (before rotation) so the NV21 crop is correct.
     */
    private fun computeCropRectRaw(
        region: Map<*, *>,
        rotationDegrees: Int,
        rawWidth: Int,
        rawHeight: Int
    ): Rect? {
        val leftPct = (region["left"] as? Number)?.toDouble() ?: return null
        val topPct = (region["top"] as? Number)?.toDouble() ?: return null
        val widthPct = (region["width"] as? Number)?.toDouble() ?: return null
        val heightPct = (region["height"] as? Number)?.toDouble() ?: return null

        val rot = ((rotationDegrees % 360) + 360) % 360
        val uprightW = if (rot == 90 || rot == 270) rawHeight else rawWidth
        val uprightH = if (rot == 90 || rot == 270) rawWidth else rawHeight

        val ul = (leftPct / 100.0 * uprightW).toInt().coerceIn(0, uprightW - 2)
        val ut = (topPct / 100.0 * uprightH).toInt().coerceIn(0, uprightH - 2)
        val uw = (widthPct / 100.0 * uprightW).toInt().coerceIn(2, uprightW - ul)
        val uh = (heightPct / 100.0 * uprightH).toInt().coerceIn(2, uprightH - ut)

        val uprightRect = Rect(ul, ut, ul + uw, ut + uh)
        return mapUprightRectToRaw(uprightRect, rot, rawWidth, rawHeight)
    }

    private fun mapUprightRectToRaw(upright: Rect, rot: Int, rawW: Int, rawH: Int): Rect {
        // Use points inside the rect (right-1/bottom-1), then compose the bounding box.
        val l = upright.left
        val t = upright.top
        val r = upright.right - 1
        val b = upright.bottom - 1

        val p1 = mapUprightPointToRaw(l, t, rot, rawW, rawH)
        val p2 = mapUprightPointToRaw(r, t, rot, rawW, rawH)
        val p3 = mapUprightPointToRaw(l, b, rot, rawW, rawH)
        val p4 = mapUprightPointToRaw(r, b, rot, rawW, rawH)

        val minX = minOf(p1.first, p2.first, p3.first, p4.first).coerceIn(0, rawW - 2)
        val maxX = maxOf(p1.first, p2.first, p3.first, p4.first).coerceIn(1, rawW - 1)
        val minY = minOf(p1.second, p2.second, p3.second, p4.second).coerceIn(0, rawH - 2)
        val maxY = maxOf(p1.second, p2.second, p3.second, p4.second).coerceIn(1, rawH - 1)

        // +1 because maxX/maxY are inclusive, Rect's right/bottom are exclusive
        return Rect(minX, minY, maxX + 1, maxY + 1)
    }

    private fun mapUprightPointToRaw(
        xU: Int,
        yU: Int,
        rot: Int,
        rawW: Int,
        rawH: Int
    ): Pair<Int, Int> {
        return when (rot) {
            0 -> Pair(xU, yU)
            90 -> Pair(rawW - 1 - yU, xU)
            180 -> Pair(rawW - 1 - xU, rawH - 1 - yU)
            270 -> Pair(yU, rawH - 1 - xU)
            else -> Pair(xU, yU)
        }
    }

    companion object {
        fun getLightweightBlocks(blocks: MutableList<Text.TextBlock>): WritableNativeArray {
            val blockArray = WritableNativeArray()
            blocks.forEach { block ->
                val blockMap = WritableNativeMap().apply {
                    putString("blockText", block.text)
                    putMap("blockFrame", getFrame(block.boundingBox))
                    putArray("lines", getLightweightLines(block.lines))
                }
                blockArray.pushMap(blockMap)
            }
            return blockArray
        }

        fun getBlocks(blocks: MutableList<Text.TextBlock>): WritableNativeArray {
            val blockArray = WritableNativeArray()
            blocks.forEach { block ->
                val blockMap = WritableNativeMap().apply {
                    putString("blockText", block.text)
                    putArray("blockCornerPoints", block.cornerPoints?.let { getCornerPoints(it) })
                    putMap("blockFrame", getFrame(block.boundingBox))
                    putArray("lines", getLines(block.lines))
                }
                blockArray.pushMap(blockMap)
            }
            return blockArray
        }

        private fun getLightweightLines(lines: MutableList<Text.Line>): WritableNativeArray {
            val lineArray = WritableNativeArray()
            lines.forEach { line ->
                val lineMap = WritableNativeMap().apply {
                    putString("lineText", line.text)
                    putMap("lineFrame", getFrame(line.boundingBox))
                }
                lineArray.pushMap(lineMap)
            }
            return lineArray
        }

        private fun getLines(lines: MutableList<Text.Line>): WritableNativeArray {
            val lineArray = WritableNativeArray()
            lines.forEach { line ->
                val lineMap = WritableNativeMap().apply {
                    putString("lineText", line.text)
                    putArray("lineCornerPoints", line.cornerPoints?.let { getCornerPoints(it) })
                    putMap("lineFrame", getFrame(line.boundingBox))
                    putArray("lineLanguages", WritableNativeArray().apply { pushString(line.recognizedLanguage) })
                    putArray("elements", getElements(line.elements))
                }
                lineArray.pushMap(lineMap)
            }
            return lineArray
        }

        private fun getElements(elements: MutableList<Text.Element>): WritableNativeArray {
            val elementArray = WritableNativeArray()
            elements.forEach { element ->
                val elementMap = WritableNativeMap().apply {
                    putString("elementText", element.text)
                    putArray("elementCornerPoints", element.cornerPoints?.let { getCornerPoints(it) })
                    putMap("elementFrame", getFrame(element.boundingBox))
                }
                elementArray.pushMap(elementMap)
            }
            return elementArray
        }

        private fun getCornerPoints(points: Array<Point>): WritableNativeArray {
            val cornerPoints = WritableNativeArray()
            points.forEach { point ->
                cornerPoints.pushMap(WritableNativeMap().apply {
                    putInt("x", point.x)
                    putInt("y", point.y)
                })
            }
            return cornerPoints
        }

        private fun getFrame(boundingBox: Rect?): WritableNativeMap {
            return WritableNativeMap().apply {
                boundingBox?.let {
                    putDouble("x", it.exactCenterX().toDouble())
                    putDouble("y", it.exactCenterY().toDouble())
                    putInt("width", it.width())
                    putInt("height", it.height())
                    putInt("boundingCenterX", it.centerX())
                    putInt("boundingCenterY", it.centerY())
                }
            }
        }
    }
}

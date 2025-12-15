package com.rnvisioncameraocr

import android.graphics.Point
import android.graphics.Rect
import android.media.Image
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
import android.graphics.Bitmap

class RNVisionCameraOCRPlugin(proxy: VisionCameraProxy, options: Map<String, Any>?) :
    FrameProcessorPlugin() {

    private var recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private var scanRegion: Map<*, *>? = null
    private val latinOptions = TextRecognizerOptions.DEFAULT_OPTIONS
    private val chineseOptions = ChineseTextRecognizerOptions.Builder().build()
    private val devanagariOptions = DevanagariTextRecognizerOptions.Builder().build()
    private val japaneseOptions = JapaneseTextRecognizerOptions.Builder().build()
    private val koreanOptions = KoreanTextRecognizerOptions.Builder().build()
    
    // Performance optimization: configurable frame skipping
    private var frameSkipCount = 0
    private val frameSkipThreshold: Int
    private val useLightweightMode: Boolean
    private var isProcessing = false
    
    // Short-term caching for performance
    private var lastProcessedText = ""
    private var lastProcessedTime = 0L
    private var cachedResult: HashMap<String, Any?>? = null
    private val cacheTimeoutMs = 150L // Cache results for 150ms

    init {
        val language = options?.get("language").toString()
        scanRegion =  options?.get("scanRegion") as Map<*, *>?
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
        // Performance optimization: skip frames to reduce processing load
        frameSkipCount++
        if (frameSkipCount < frameSkipThreshold || isProcessing) {
            return getCachedResult()
        }
        frameSkipCount = 0
        isProcessing = true
        
        return try {
            var image: InputImage? = null
            if (scanRegion != null) {
                var bitmap: Bitmap? = BitmapUtils.getBitmap(frame)
                if (bitmap == null) return null
                val left = (scanRegion!!["left"] as Double) / 100.0 * bitmap.width
                val top = (scanRegion!!["top"] as Double) / 100.0 * bitmap.height
                val width = (scanRegion!!["width"] as Double) / 100.0 * bitmap.width
                val height = (scanRegion!!["height"] as Double) / 100.0 * bitmap.height
                bitmap = Bitmap.createBitmap(
                    bitmap,
                    left.toInt(),
                    top.toInt(),
                    width.toInt(),
                    height.toInt(),
                    null,
                    false
                )
                image = InputImage.fromBitmap(bitmap,frame.imageProxy.imageInfo.rotationDegrees);
            } else {
                val mediaImage: Image = frame.image
                image = InputImage.fromMediaImage(mediaImage, frame.imageProxy.imageInfo.rotationDegrees)
            }
            
            // Use ML Kit recognition
            val task: Task<Text> = recognizer.process(image)
            val text: Text = Tasks.await(task)
            
            val resultText = text.text
            val currentTime = System.currentTimeMillis()
            
            val result = if (resultText.isEmpty()) {
                WritableNativeMap().toHashMap()
            } else {
                val data = WritableNativeMap().apply {
                    putString("resultText", resultText)
                    // Use configurable block processing mode
                    if (useLightweightMode) {
                        putArray("blocks", getLightweightBlocks(text.textBlocks))
                    } else {
                        putArray("blocks", getBlocks(text.textBlocks))
                    }
                }
                data.toHashMap()
            }
            
            // Update cache
            updateCache(resultText, currentTime, result as HashMap<String, Any?>)
            result
            
        } catch (e: Exception) {
            e.printStackTrace()
            // Return cached result on error, or null if no cache
            getCachedResult()
        } finally {
            isProcessing = false
        }
    }
    
    private fun updateCache(text: String, time: Long, result: HashMap<String, Any?>) {
        lastProcessedText = text
        lastProcessedTime = time
        cachedResult = if (text.isNotEmpty()) result else null
    }
    
    private fun getCachedResult(): HashMap<String, Any?>? {
        val currentTime = System.currentTimeMillis()
        return if (currentTime - lastProcessedTime < cacheTimeoutMs && 
                  cachedResult != null) {
            cachedResult
        } else {
            null
        }
    }

    companion object {
        // Lightweight version for better performance
        fun getLightweightBlocks(blocks: MutableList<Text.TextBlock>): WritableNativeArray {
            val blockArray = WritableNativeArray()
            blocks.forEach { block ->
                val blockMap = WritableNativeMap().apply {
                    putString("blockText", block.text)
                    putMap("blockFrame", getFrame(block.boundingBox))
                    // Skip detailed corner points and lines for better performance
                    putArray("lines", getLightweightLines(block.lines))
                }
                blockArray.pushMap(blockMap)
            }
            return blockArray
        }
        
        // Original full-featured version (kept for backward compatibility)
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

        // Lightweight version for performance - skips corner points, languages, and elements
        private fun getLightweightLines(lines: MutableList<Text.Line>): WritableNativeArray {
            val lineArray = WritableNativeArray()
            lines.forEach { line ->
                val lineMap = WritableNativeMap().apply {
                    putString("lineText", line.text)
                    putMap("lineFrame", getFrame(line.boundingBox))
                    // Skip corner points, languages, and elements for better performance
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
                    putArray(
                        "lineLanguages",
                        WritableNativeArray().apply { pushString(line.recognizedLanguage) })
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
                    putArray(
                        "elementCornerPoints",
                        element.cornerPoints?.let { getCornerPoints(it) })
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



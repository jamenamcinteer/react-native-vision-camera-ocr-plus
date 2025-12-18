package com.rnvisioncameraocr

import android.graphics.ImageFormat
import android.graphics.Rect
import android.media.Image
import java.nio.ByteBuffer
import kotlin.math.max
import kotlin.math.min

object BitmapUtils {

    /**
     * Fast conversion YUV_420_888 -> NV21 (byte[]).
     * No Bitmap/JPEG involved. Suitable for ML Kit: InputImage.fromByteArray(..., IMAGE_FORMAT_NV21).
     */
    fun yuv420888ToNv21(planes: Array<Image.Plane>, width: Int, height: Int): ByteArray {
        val imageSize = width * height
        val out = ByteArray(imageSize + imageSize / 2)

        if (areUVPlanesNV21(planes, width, height)) {
            // Fast path: UV is already in NV21 layout.
            planes[0].buffer.copyToByteArray(out, 0, imageSize)

            val uBuffer = planes[1].buffer
            val vBuffer = planes[2].buffer

            val vPos = vBuffer.position()
            vBuffer.position(vPos)
            // First V byte
            out[imageSize] = vBuffer.get()
            vBuffer.position(vPos)

            // Remaining VU (from the U buffer)
            val uPos = uBuffer.position()
            uBuffer.position(uPos)
            // The U buffer contains: U0 V1 U1 V2 ... (in practice)
            // We want in out: V0 U0 V1 U1 ...
            // Original fast-path: copy 2*imageSize/4 - 1 bytes starting at imageSize+1.
            val len = 2 * imageSize / 4 - 1
            uBuffer.get(out, imageSize + 1, len)
            uBuffer.position(uPos)

            return out
        }

        // Fallback: unpack taking stride into account.
        unpackPlaneToNV21Y(planes[0], width, height, out)
        unpackPlaneToNV21UV(planes[1], planes[2], width, height, out)

        return out
    }

    /**
     * Conversion + CROP (coordinates in the RAW image before rotation).
     * Rect must be within bounds and have even left/top/width/height (required by NV21).
     */
    fun yuv420888ToNv21Cropped(
        planes: Array<Image.Plane>,
        width: Int,
        height: Int,
        crop: Rect
    ): ByteArray {
        val safe = makeEvenCropRect(crop, width, height)
        val cw = safe.width()
        val ch = safe.height()
        val out = ByteArray(cw * ch + (cw * ch) / 2)

        // Copy Y
        copyLumaCropped(planes[0], width, height, safe, out)

        // Copy UV (NV21 => VU)
        copyChromaCroppedNV21(planes[1], planes[2], width, height, safe, out, cw * ch)

        return out
    }

    private fun unpackPlaneToNV21Y(
        yPlane: Image.Plane,
        width: Int,
        height: Int,
        out: ByteArray
    ) {
        val buffer = yPlane.buffer
        val rowStride = yPlane.rowStride
        val pixelStride = yPlane.pixelStride

        var outIndex = 0
        for (row in 0 until height) {
            val rowStart = row * rowStride
            var col = 0
            while (col < width) {
                out[outIndex++] = buffer.get(rowStart + col * pixelStride)
                col++
            }
        }
    }

    private fun unpackPlaneToNV21UV(
        uPlane: Image.Plane,
        vPlane: Image.Plane,
        width: Int,
        height: Int,
        out: ByteArray
    ) {
        val chromaHeight = height / 2
        val chromaWidth = width / 2

        val uBuffer = uPlane.buffer
        val vBuffer = vPlane.buffer

        val uRowStride = uPlane.rowStride
        val vRowStride = vPlane.rowStride

        val uPixelStride = uPlane.pixelStride
        val vPixelStride = vPlane.pixelStride

        var outIndex = width * height
        for (row in 0 until chromaHeight) {
            val uRowStart = row * uRowStride
            val vRowStart = row * vRowStride
            for (col in 0 until chromaWidth) {
                val u = uBuffer.get(uRowStart + col * uPixelStride)
                val v = vBuffer.get(vRowStart + col * vPixelStride)
                out[outIndex++] = v
                out[outIndex++] = u
            }
        }
    }

    private fun copyLumaCropped(
        yPlane: Image.Plane,
        width: Int,
        height: Int,
        crop: Rect,
        out: ByteArray
    ) {
        val buffer = yPlane.buffer
        val rowStride = yPlane.rowStride
        val pixelStride = yPlane.pixelStride

        val cw = crop.width()
        val ch = crop.height()

        var outIndex = 0
        for (row in 0 until ch) {
            val srcY = crop.top + row
            if (srcY < 0 || srcY >= height) continue
            val rowStart = srcY * rowStride
            val base = rowStart + crop.left * pixelStride
            var col = 0
            while (col < cw) {
                out[outIndex++] = buffer.get(base + col * pixelStride)
                col++
            }
        }
    }

    private fun copyChromaCroppedNV21(
        uPlane: Image.Plane,
        vPlane: Image.Plane,
        width: Int,
        height: Int,
        crop: Rect,
        out: ByteArray,
        outOffset: Int
    ) {
        val uBuffer = uPlane.buffer
        val vBuffer = vPlane.buffer

        val uRowStride = uPlane.rowStride
        val vRowStride = vPlane.rowStride

        val uPixelStride = uPlane.pixelStride
        val vPixelStride = vPlane.pixelStride

        val cw = crop.width()
        val ch = crop.height()

        val chromaLeft = crop.left / 2
        val chromaTop = crop.top / 2
        val chromaWidth = cw / 2
        val chromaHeight = ch / 2

        var outIndex = outOffset
        for (row in 0 until chromaHeight) {
            val srcRow = chromaTop + row
            if (srcRow < 0 || srcRow >= height / 2) continue

            val uRowStart = srcRow * uRowStride
            val vRowStart = srcRow * vRowStride

            for (col in 0 until chromaWidth) {
                val srcCol = chromaLeft + col
                val u = uBuffer.get(uRowStart + srcCol * uPixelStride)
                val v = vBuffer.get(vRowStart + srcCol * vPixelStride)
                out[outIndex++] = v
                out[outIndex++] = u
            }
        }
    }

    private fun makeEvenCropRect(rect: Rect, width: Int, height: Int): Rect {
        var left = rect.left
        var top = rect.top
        var right = rect.right
        var bottom = rect.bottom

        left = max(0, min(left, width - 2))
        top = max(0, min(top, height - 2))
        right = max(left + 2, min(right, width))
        bottom = max(top + 2, min(bottom, height))

        // NV21 requires even coordinates and dimensions (2x2 chroma)
        if (left % 2 != 0) left--
        if (top % 2 != 0) top--
        if ((right - left) % 2 != 0) right--
        if ((bottom - top) % 2 != 0) bottom--

        left = max(0, min(left, width - 2))
        top = max(0, min(top, height - 2))
        right = max(left + 2, min(right, width))
        bottom = max(top + 2, min(bottom, height))

        return Rect(left, top, right, bottom)
    }

    private fun areUVPlanesNV21(planes: Array<Image.Plane>, width: Int, height: Int): Boolean {
        val imageSize = width * height

        val uBuffer = planes[1].buffer
        val vBuffer = planes[2].buffer

        val vBufferPosition = vBuffer.position()
        val uBufferLimit = uBuffer.limit()

        // Comparison as in the original implementation (fast-path)
        vBuffer.position(vBufferPosition + 1)
        uBuffer.limit(uBufferLimit - 1)

        val areNV21 =
            (vBuffer.remaining() == (2 * imageSize / 4 - 2)) && (vBuffer.compareTo(uBuffer) == 0)

        vBuffer.position(vBufferPosition)
        uBuffer.limit(uBufferLimit)

        return areNV21
    }

    private fun ByteBuffer.copyToByteArray(dst: ByteArray, dstOffset: Int, length: Int) {
        val dup = duplicate()
        dup.rewind()
        dup.get(dst, dstOffset, length)
    }

    @Suppress("unused")
    private fun imageFormatNv21(): Int = ImageFormat.NV21
}

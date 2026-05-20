/**
 * HybridTextRecognizer.cpp
 *
 * JNI helper that converts an AHardwareBuffer (passed as a jlong pointer from
 * VisionCamera's frame.getNativeBuffer()) into an android.graphics.Bitmap so
 * ML Kit can run text recognition on it.
 *
 * VisionCamera v5 delivers GPU-only AHardwareBuffers (ImageFormat.PRIVATE) by default.
 * Set pixelFormat='rgb' on useFrameOutput to get CPU-accessible RGBA_8888 frames.
 *
 * Primary path: CPU-lock when buffer has CPU_READ usage (pixelFormat='rgb') → ARGB_8888
 *   software Bitmap, supports scan-region cropping on all API levels.
 * Fallback: Bitmap.wrapHardwareBuffer() for GPU-only buffers (API 31+, no crop support).
 */

#include <jni.h>
#include <android/hardware_buffer.h>
#include <android/hardware_buffer_jni.h>
#include <android/bitmap.h>
#include <android/log.h>
#include <cstring>

#define TAG "HybridTextRecognizer"

// ---------------------------------------------------------------------------
// Helper: GPU path — Bitmap.wrapHardwareBuffer(hardwareBuffer, null)
// Returns a HARDWARE-config Bitmap that ML Kit's InputImage.fromBitmap()
// accepts directly (no CPU readback required). Requires API 31+.
// ---------------------------------------------------------------------------
static jobject createBitmapViaHardwarePath(JNIEnv* env, AHardwareBuffer* ahb) {
  // Get a Java android.hardware.HardwareBuffer wrapper around the native pointer.
  jobject hardwareBuffer = AHardwareBuffer_toHardwareBuffer(env, ahb);
  if (!hardwareBuffer) {
    __android_log_print(ANDROID_LOG_ERROR, TAG, "AHardwareBuffer_toHardwareBuffer failed");
    return nullptr;
  }

  jclass bitmapClass = env->FindClass("android/graphics/Bitmap");
  if (!bitmapClass) {
    env->DeleteLocalRef(hardwareBuffer);
    return nullptr;
  }

  // Bitmap.wrapHardwareBuffer(HardwareBuffer buffer, ColorSpace colorSpace) — API 31+
  // Returns a HARDWARE-config Bitmap. ML Kit InputImage.fromBitmap() accepts this
  // directly and handles the GPU-side inference without any CPU readback.
  jmethodID wrapMid = env->GetStaticMethodID(bitmapClass, "wrapHardwareBuffer",
      "(Landroid/hardware/HardwareBuffer;Landroid/graphics/ColorSpace;)Landroid/graphics/Bitmap;");
  env->DeleteLocalRef(bitmapClass);
  if (!wrapMid) {
    env->ExceptionClear();
    env->DeleteLocalRef(hardwareBuffer);
    __android_log_print(ANDROID_LOG_WARN, TAG,
        "Bitmap.wrapHardwareBuffer not available (requires API 31+).");
    return nullptr;
  }

  jclass bitmapClass2 = env->FindClass("android/graphics/Bitmap");
  jobject hwBitmap = env->CallStaticObjectMethod(bitmapClass2, wrapMid,
                         hardwareBuffer, nullptr /*colorSpace*/);
  env->DeleteLocalRef(bitmapClass2);
  env->DeleteLocalRef(hardwareBuffer);

  if (!hwBitmap) {
    __android_log_print(ANDROID_LOG_ERROR, TAG, "Bitmap.wrapHardwareBuffer returned null");
  }
  // Return the HARDWARE-config bitmap directly — no .copy() needed.
  // ML Kit processes HARDWARE bitmaps natively.
  return hwBitmap;
}

// ---------------------------------------------------------------------------
// Helper: CPU path — AHardwareBuffer_lock + memcpy.
// Only valid when the buffer was allocated with CPU_READ usage.
// ---------------------------------------------------------------------------
static jobject createBitmapViaCpuLock(JNIEnv* env, AHardwareBuffer* ahb,
                                       int32_t width, int32_t height,
                                       uint32_t stridePixels) {
  void* data = nullptr;
  int ret = AHardwareBuffer_lock(ahb, AHARDWAREBUFFER_USAGE_CPU_READ_RARELY,
                                 -1, nullptr, &data);
  if (ret != 0 || data == nullptr) {
    __android_log_print(ANDROID_LOG_WARN, TAG,
        "AHardwareBuffer_lock failed (ret=%d), falling back to hardware bitmap path", ret);
    return nullptr;  // Caller will try the GPU path
  }

  jclass  bitmapClass       = env->FindClass("android/graphics/Bitmap");
  jclass  configClass       = env->FindClass("android/graphics/Bitmap$Config");
  jfieldID argbField        = env->GetStaticFieldID(configClass, "ARGB_8888",
                                  "Landroid/graphics/Bitmap$Config;");
  jobject argbConfig        = env->GetStaticObjectField(configClass, argbField);
  jmethodID createBitmapMid = env->GetStaticMethodID(bitmapClass, "createBitmap",
                                  "(IILandroid/graphics/Bitmap$Config;)Landroid/graphics/Bitmap;");
  env->DeleteLocalRef(configClass);

  jobject bitmap = env->CallStaticObjectMethod(bitmapClass, createBitmapMid,
                       width, height, argbConfig);
  if (!bitmap) {
    AHardwareBuffer_unlock(ahb, nullptr);
    env->DeleteLocalRef(bitmapClass);
    __android_log_print(ANDROID_LOG_ERROR, TAG, "Failed to create Bitmap");
    return nullptr;
  }

  void* pixels = nullptr;
  AndroidBitmap_lockPixels(env, bitmap, &pixels);
  if (!pixels) {
    AHardwareBuffer_unlock(ahb, nullptr);
    env->DeleteLocalRef(bitmapClass);
    __android_log_print(ANDROID_LOG_ERROR, TAG, "Failed to lock Bitmap pixels");
    return nullptr;
  }

  AndroidBitmapInfo bitmapInfo;
  AndroidBitmap_getInfo(env, bitmap, &bitmapInfo);

  // stridePixels is in pixels; each RGBA pixel is 4 bytes.
  auto srcStride = stridePixels * 4u;
  auto dstStride = static_cast<uint32_t>(bitmapInfo.stride);
  auto rowBytes  = static_cast<uint32_t>(width) * 4u;

  for (int32_t y = 0; y < height; y++) {
    const auto* src = static_cast<const uint8_t*>(data) + static_cast<size_t>(y) * srcStride;
    auto*       dst = static_cast<uint8_t*>(pixels)     + static_cast<size_t>(y) * dstStride;
    std::memcpy(dst, src, rowBytes);
  }

  AndroidBitmap_unlockPixels(env, bitmap);
  AHardwareBuffer_unlock(ahb, nullptr);
  env->DeleteLocalRef(bitmapClass);

  return bitmap;
}

// ---------------------------------------------------------------------------
// JNI entry point
// ---------------------------------------------------------------------------
extern "C" JNIEXPORT jobject JNICALL
Java_com_margelo_nitro_visioncameraocrplus_HybridTextRecognizer_nativeCreateBitmapFromHardwareBuffer(
    JNIEnv* env,
    jobject /* thiz */,
    jlong pointer) {

  if (pointer == 0) {
    __android_log_print(ANDROID_LOG_ERROR, TAG, "Received null native buffer pointer");
    return nullptr;
  }

  auto* ahb = reinterpret_cast<AHardwareBuffer*>(static_cast<uintptr_t>(pointer));

  AHardwareBuffer_Desc desc;
  AHardwareBuffer_describe(ahb, &desc);

  // Prefer CPU-lock path when the buffer is CPU-readable (e.g. pixelFormat="rgb"
  // on the useFrameOutput hook, which sets OUTPUT_IMAGE_FORMAT_RGBA_8888 on Android).
  // This returns a plain ARGB_8888 software Bitmap that can be cropped and handled
  // by all Android API levels without special HARDWARE-bitmap treatment.
  bool cpuReadable = (desc.usage & AHARDWAREBUFFER_USAGE_CPU_READ_RARELY) ||
                     (desc.usage & AHARDWAREBUFFER_USAGE_CPU_READ_OFTEN);
  if (cpuReadable) {
    return createBitmapViaCpuLock(env, ahb,
        static_cast<int32_t>(desc.width),
        static_cast<int32_t>(desc.height),
        desc.stride);
  }

  // GPU-only buffer (pixelFormat="native"): use Bitmap.wrapHardwareBuffer (API 31+).
  // Returns a HARDWARE-config Bitmap. ML Kit accepts this natively.
  // Scan-region cropping is not supported for GPU-only frames.
  {
    jclass bitmapClass = env->FindClass("android/graphics/Bitmap");
    jmethodID wrapMid = bitmapClass
        ? env->GetStaticMethodID(bitmapClass, "wrapHardwareBuffer",
            "(Landroid/hardware/HardwareBuffer;Landroid/graphics/ColorSpace;)Landroid/graphics/Bitmap;")
        : nullptr;
    if (bitmapClass) env->DeleteLocalRef(bitmapClass);
    if (!wrapMid) env->ExceptionClear();

    if (wrapMid) {
      return createBitmapViaHardwarePath(env, ahb);
    }
  }

  __android_log_print(ANDROID_LOG_ERROR, TAG,
      "Buffer is GPU-only (usage=0x%llx) and Bitmap.wrapHardwareBuffer is unavailable (API<31). "
      "Set pixelFormat='rgb' on useFrameOutput for VisionCamera v5 frame scanning.",
      (unsigned long long)desc.usage);
  return nullptr;
}

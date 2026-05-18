/**
 * HybridTextRecognizer.cpp
 *
 * JNI helper that converts an AHardwareBuffer (passed as a jlong pointer from
 * VisionCamera's frame.getNativeBuffer()) into an android.graphics.Bitmap so
 * ML Kit can run text recognition on it.
 *
 * Requirements:
 *   - minSdk 26  (AHardwareBuffer and AHardwareBuffer_lock)
 *   - pixelFormat="rgb" in the VisionCamera Camera component so the buffer is
 *     AHARDWAREBUFFER_FORMAT_R8G8B8A8_UNORM, which supports CPU-read locking.
 */

#include <jni.h>
#include <android/hardware_buffer.h>
#include <android/bitmap.h>
#include <android/log.h>
#include <cstring>

#define TAG "HybridTextRecognizer"

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

  // Obtain the buffer dimensions and stride.
  AHardwareBuffer_Desc desc;
  AHardwareBuffer_describe(ahb, &desc);

  auto width  = static_cast<int32_t>(desc.width);
  auto height = static_cast<int32_t>(desc.height);

  // Lock the hardware buffer for CPU read.
  // This works for AHARDWAREBUFFER_FORMAT_R8G8B8A8_UNORM (pixelFormat="rgb" in VisionCamera).
  void* data = nullptr;
  int ret = AHardwareBuffer_lock(ahb, AHARDWAREBUFFER_USAGE_CPU_READ_RARELY, -1, nullptr, &data);
  if (ret != 0 || data == nullptr) {
    __android_log_print(ANDROID_LOG_ERROR, TAG,
        "AHardwareBuffer_lock failed (ret=%d). "
        "Ensure the Camera component uses pixelFormat=\"rgb\" on Android.", ret);
    return nullptr;
  }

  // Allocate an ARGB_8888 software Bitmap (same memory layout as RGBA_8888 AHardwareBuffer).
  jclass  bitmapClass       = env->FindClass("android/graphics/Bitmap");
  jclass  configClass       = env->FindClass("android/graphics/Bitmap$Config");
  jfieldID argbField        = env->GetStaticFieldID(configClass, "ARGB_8888",
                                  "Landroid/graphics/Bitmap$Config;");
  jobject argbConfig        = env->GetStaticObjectField(configClass, argbField);
  jmethodID createBitmapMid = env->GetStaticMethodID(bitmapClass, "createBitmap",
                                  "(IILandroid/graphics/Bitmap$Config;)Landroid/graphics/Bitmap;");

  jobject bitmap = env->CallStaticObjectMethod(bitmapClass, createBitmapMid,
                       width, height, argbConfig);
  if (bitmap == nullptr) {
    AHardwareBuffer_unlock(ahb, nullptr);
    __android_log_print(ANDROID_LOG_ERROR, TAG, "Failed to create Bitmap");
    return nullptr;
  }

  // Lock the Bitmap pixels for writing.
  void* pixels = nullptr;
  AndroidBitmap_lockPixels(env, bitmap, &pixels);
  if (pixels == nullptr) {
    AHardwareBuffer_unlock(ahb, nullptr);
    __android_log_print(ANDROID_LOG_ERROR, TAG, "Failed to lock Bitmap pixels");
    return nullptr;
  }

  AndroidBitmapInfo bitmapInfo;
  AndroidBitmap_getInfo(env, bitmap, &bitmapInfo);

  // desc.stride is in pixels; each RGBA pixel is 4 bytes.
  auto srcStride = static_cast<uint32_t>(desc.stride) * 4u;
  auto dstStride = static_cast<uint32_t>(bitmapInfo.stride);
  auto rowBytes  = static_cast<uint32_t>(width) * 4u;

  for (int32_t y = 0; y < height; y++) {
    const auto* src = static_cast<const uint8_t*>(data) + static_cast<size_t>(y) * srcStride;
    auto*       dst = static_cast<uint8_t*>(pixels)      + static_cast<size_t>(y) * dstStride;
    std::memcpy(dst, src, rowBytes);
  }

  AndroidBitmap_unlockPixels(env, bitmap);
  AHardwareBuffer_unlock(ahb, nullptr);

  return bitmap;
}

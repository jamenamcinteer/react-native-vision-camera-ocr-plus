package com.margelo.nitro.visioncameraocrplus

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise

// Stub used when translation is disabled; keeps the generated Nitro registration resolving this class.
@DoNotStrip
@Keep
class HybridTranslator : HybridTranslatorSpec() {

  private val disabledMessage =
    "Translation is disabled. Remove VisionCameraOcrPlus_disableTranslate from gradle.properties and rebuild."

  override fun translate(text: String, from: String, to: String): Promise<String> {
    return Promise.async { throw RuntimeException(disabledMessage) }
  }

  override fun removeLanguageModel(languageCode: String): Promise<Boolean> {
    return Promise.async { throw RuntimeException(disabledMessage) }
  }
}

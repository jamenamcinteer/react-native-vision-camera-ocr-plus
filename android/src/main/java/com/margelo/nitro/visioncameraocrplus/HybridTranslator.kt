package com.margelo.nitro.visioncameraocrplus

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import com.margelo.nitro.core.Promise

/**
 * Android implementation of the Translator HybridObject.
 * Uses ML Kit on-device translation with automatic model downloads.
 */
@DoNotStrip
@Keep
class HybridTranslator : HybridTranslatorSpec() {

  private val downloadConditions = DownloadConditions.Builder()
    .requireWifi()
    .build()

  override fun translate(text: String, from: String, to: String): Promise<String> {
    return Promise.async {
      val sourceTag = toTranslateLanguage(from)
        ?: throw RuntimeException("Unsupported source language: '$from'")
      val targetTag = toTranslateLanguage(to)
        ?: throw RuntimeException("Unsupported target language: '$to'")

      val options = TranslatorOptions.Builder()
        .setSourceLanguage(sourceTag)
        .setTargetLanguage(targetTag)
        .build()
      val translator = Translation.getClient(options)

      try {
        // Download model if needed (no-op when already present)
        Tasks.await(translator.downloadModelIfNeeded(downloadConditions))
        Tasks.await(translator.translate(text))
      } finally {
        translator.close()
      }
    }
  }

  override fun removeLanguageModel(languageCode: String): Promise<Boolean> {
    return Promise.async {
      val tag = toTranslateLanguage(languageCode) ?: return@async false
      val model = TranslateRemoteModel.Builder(tag).build()
      val modelManager = RemoteModelManager.getInstance()
      val isDownloaded = Tasks.await(modelManager.isModelDownloaded(model))
      if (!isDownloaded) return@async false
      Tasks.await(modelManager.deleteDownloadedModel(model))
      true
    }
  }

  // ---------------------------------------------------------------------------
  // Language code mapping  (BCP-47 → ML Kit TranslateLanguage tag)
  // ML Kit uses the same BCP-47 codes as the iOS MLKitTranslate constants.
  // ---------------------------------------------------------------------------
  private fun toTranslateLanguage(code: String): String? {
    return when (code.lowercase()) {
      "af" -> TranslateLanguage.AFRIKAANS
      "sq" -> TranslateLanguage.ALBANIAN
      "ar" -> TranslateLanguage.ARABIC
      "be" -> TranslateLanguage.BELARUSIAN
      "bn" -> TranslateLanguage.BENGALI
      "bg" -> TranslateLanguage.BULGARIAN
      "ca" -> TranslateLanguage.CATALAN
      "zh" -> TranslateLanguage.CHINESE
      "cs" -> TranslateLanguage.CZECH
      "da" -> TranslateLanguage.DANISH
      "nl" -> TranslateLanguage.DUTCH
      "en" -> TranslateLanguage.ENGLISH
      "eo" -> TranslateLanguage.ESPERANTO
      "et" -> TranslateLanguage.ESTONIAN
      "fi" -> TranslateLanguage.FINNISH
      "fr" -> TranslateLanguage.FRENCH
      "gl" -> TranslateLanguage.GALICIAN
      "ka" -> TranslateLanguage.GEORGIAN
      "de" -> TranslateLanguage.GERMAN
      "el" -> TranslateLanguage.GREEK
      "gu" -> TranslateLanguage.GUJARATI
      "ht" -> TranslateLanguage.HAITIAN_CREOLE
      "he" -> TranslateLanguage.HEBREW
      "hi" -> TranslateLanguage.HINDI
      "hu" -> TranslateLanguage.HUNGARIAN
      "is" -> TranslateLanguage.ICELANDIC
      "id" -> TranslateLanguage.INDONESIAN
      "ga" -> TranslateLanguage.IRISH
      "it" -> TranslateLanguage.ITALIAN
      "ja" -> TranslateLanguage.JAPANESE
      "kn" -> TranslateLanguage.KANNADA
      "ko" -> TranslateLanguage.KOREAN
      "lv" -> TranslateLanguage.LATVIAN
      "lt" -> TranslateLanguage.LITHUANIAN
      "mk" -> TranslateLanguage.MACEDONIAN
      "ms" -> TranslateLanguage.MALAY
      "mt" -> TranslateLanguage.MALTESE
      "mr" -> TranslateLanguage.MARATHI
      "no" -> TranslateLanguage.NORWEGIAN
      "fa" -> TranslateLanguage.PERSIAN
      "pl" -> TranslateLanguage.POLISH
      "pt" -> TranslateLanguage.PORTUGUESE
      "ro" -> TranslateLanguage.ROMANIAN
      "ru" -> TranslateLanguage.RUSSIAN
      "sk" -> TranslateLanguage.SLOVAK
      "sl" -> TranslateLanguage.SLOVENIAN
      "es" -> TranslateLanguage.SPANISH
      "sw" -> TranslateLanguage.SWAHILI
      "tl" -> TranslateLanguage.TAGALOG
      "ta" -> TranslateLanguage.TAMIL
      "te" -> TranslateLanguage.TELUGU
      "th" -> TranslateLanguage.THAI
      "tr" -> TranslateLanguage.TURKISH
      "uk" -> TranslateLanguage.UKRAINIAN
      "ur" -> TranslateLanguage.URDU
      "vi" -> TranslateLanguage.VIETNAMESE
      "cy" -> TranslateLanguage.WELSH
      else -> null
    }
  }
}

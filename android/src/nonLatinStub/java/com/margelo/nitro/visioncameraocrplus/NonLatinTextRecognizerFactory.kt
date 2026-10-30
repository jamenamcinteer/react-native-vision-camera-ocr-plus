package com.margelo.nitro.visioncameraocrplus

import com.google.mlkit.vision.text.TextRecognizer

object NonLatinTextRecognizerFactory {
  fun create(language: String): TextRecognizer {
    throw IllegalStateException(
      "Non-Latin text recognition models are disabled. Re-enable them with " +
        "VisionCameraOcrPlus_disableNonLatinTextRecognition=false and rebuild. " +
        "Requested language: $language"
    )
  }
}
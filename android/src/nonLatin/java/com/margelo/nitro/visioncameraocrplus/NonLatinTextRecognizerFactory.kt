package com.margelo.nitro.visioncameraocrplus

import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.devanagari.DevanagariTextRecognizerOptions
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions

object NonLatinTextRecognizerFactory {
  fun create(language: String): TextRecognizer {
    val options = when (language) {
      "chinese" -> ChineseTextRecognizerOptions.Builder().build()
      "devanagari" -> DevanagariTextRecognizerOptions.Builder().build()
      "japanese" -> JapaneseTextRecognizerOptions.Builder().build()
      "korean" -> KoreanTextRecognizerOptions.Builder().build()
      else -> throw IllegalArgumentException("Unsupported non-Latin language: $language")
    }
    return TextRecognition.getClient(options)
  }
}
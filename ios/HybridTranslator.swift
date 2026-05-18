import Foundation
import NitroModules
import MLKitTranslate

/// Nitro HybridObject implementation for on-device text translation using ML Kit.
/// Downloads language models on demand and caches the translator for a given language pair.
class HybridTranslator: HybridTranslatorSpec {

  private let conditions = ModelDownloadConditions(
    allowsCellularAccess: false,
    allowsBackgroundDownloading: true
  )

  // MARK: - HybridTranslatorSpec

  func translate(text: String, from: String, to: String) throws -> Promise<String> {
    return Promise.async {
      guard let sourceLanguage = translateLanguage(from: from),
            let targetLanguage = translateLanguage(from: to) else {
        throw NSError(domain: "HybridTranslator", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Unsupported language pair: '\(from)' → '\(to)'"])
      }

      let options = TranslatorOptions(sourceLanguage: sourceLanguage, targetLanguage: targetLanguage)
      let translator = Translator.translator(options: options)

      // Download the model if needed (no-op when already present)
      try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
        translator.downloadModelIfNeeded(with: self.conditions) { error in
          if let error = error {
            continuation.resume(throwing: error)
          } else {
            continuation.resume()
          }
        }
      } as Void

      return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<String, Error>) in
        translator.translate(text) { translatedText, error in
          if let error = error {
            continuation.resume(throwing: error)
          } else {
            continuation.resume(returning: translatedText ?? "")
          }
        }
      }
    }
  }

  func removeLanguageModel(languageCode: String) throws -> Promise<Bool> {
    return Promise.async {
      guard let language = translateLanguage(from: languageCode) else {
        return false
      }
      let model = TranslateRemoteModel.translateRemoteModel(language: language)
      let modelManager = ModelManager.modelManager()

      guard modelManager.isModelDownloaded(model) else {
        return false
      }

      return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Bool, Error>) in
        modelManager.deleteDownloadedModel(model) { error in
          if let error = error {
            continuation.resume(throwing: error)
          } else {
            continuation.resume(returning: true)
          }
        }
      }
    }
  }
}

import Foundation
import NitroModules
import MLKitTranslate

/// Nitro HybridObject implementation for on-device text translation using ML Kit.
/// Downloads language models on demand and caches the translator for a given language pair.
class HybridTranslator: HybridTranslatorSpec {

  // MARK: - HybridTranslatorSpec

  func translate(text: String, from: String, to: String) throws -> Promise<String> {
    guard let sourceLanguage = translateLanguage(from: from),
          let targetLanguage = translateLanguage(from: to) else {
      return Promise.rejected(withError: NSError(
        domain: "HybridTranslator", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Unsupported language pair: '\(from)' → '\(to)'"]))
    }

    let options = TranslatorOptions(sourceLanguage: sourceLanguage, targetLanguage: targetLanguage)
    let translator = Translator.translator(options: options)
    let sourceModel = TranslateRemoteModel.translateRemoteModel(language: sourceLanguage)
    let targetModel = TranslateRemoteModel.translateRemoteModel(language: targetLanguage)
    let promise = Promise<String>()

    // Download models if needed, then translate.
    // If translate returns code 13 (model files not found / corrupted), follow
    // ML Kit's own recovery advice: delete both models and re-download once.
    translator.downloadModelIfNeeded { error in
      if let error = error {
        promise.reject(withError: error)
        return
      }

      translator.translate(text) { translatedText, translateError in
        if let translateError = translateError {
          let nsError = translateError as NSError
          if nsError.domain == "com.google.mlkit" && nsError.code == 13 {
            // Model files missing/stale — delete and re-download once, then retry.
            let mm = ModelManager.modelManager()
            mm.deleteDownloadedModel(sourceModel) { _ in
              mm.deleteDownloadedModel(targetModel) { _ in
                translator.downloadModelIfNeeded { retryDownloadError in
                  if let retryDownloadError = retryDownloadError {
                    promise.reject(withError: retryDownloadError)
                    return
                  }
                  translator.translate(text) { retryText, retryError in
                    if let retryError = retryError {
                      promise.reject(withError: retryError)
                    } else {
                      promise.resolve(withResult: retryText ?? "")
                    }
                  }
                }
              }
            }
          } else {
            promise.reject(withError: translateError)
          }
        } else {
          promise.resolve(withResult: translatedText ?? "")
        }
      }
    }

    return promise
  }

  func removeLanguageModel(languageCode: String) throws -> Promise<Bool> {
    guard let language = translateLanguage(from: languageCode) else {
      return Promise.resolved(withResult: false)
    }

    let model = TranslateRemoteModel.translateRemoteModel(language: language)
    let modelManager = ModelManager.modelManager()

    guard modelManager.isModelDownloaded(model) else {
      return Promise.resolved(withResult: false)
    }

    let promise = Promise<Bool>()
    modelManager.deleteDownloadedModel(model) { error in
      if let error = error {
        promise.reject(withError: error)
      } else {
        promise.resolve(withResult: true)
      }
    }
    return promise
  }
}

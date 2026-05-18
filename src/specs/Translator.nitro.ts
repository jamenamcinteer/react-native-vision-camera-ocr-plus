import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Nitro HybridObject for ML Kit on-device text translation.
 * Handles downloading language models, translating text, and removing models.
 */
export interface Translator extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  /**
   * Translate text from one language to another.
   * Downloads the required model on first use if not already present.
   */
  translate(text: string, from: string, to: string): Promise<string>;

  /**
   * Remove a downloaded translation language model to free device storage.
   */
  removeLanguageModel(languageCode: string): Promise<boolean>;
}

import { NitroModules } from 'react-native-nitro-modules';
/**
 * Remove a downloaded ML Kit translation language model.
 *
 * Uses the Nitro Translator HybridObject.
 *
 * @param code BCP-47 language code, e.g. 'fr', 'de', 'zh'
 */
export async function RemoveLanguageModel(code) {
  const translator = NitroModules.createHybridObject('Translator');
  return translator.removeLanguageModel(code);
}

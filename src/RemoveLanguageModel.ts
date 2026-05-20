import { NitroModules } from 'react-native-nitro-modules';
import type { Translator } from './specs/Translator.nitro';
import type { Languages } from './types';

/**
 * Remove a downloaded ML Kit translation language model.
 *
 * Uses the Nitro Translator HybridObject.
 *
 * @param code BCP-47 language code, e.g. 'fr', 'de', 'zh'
 */
export async function RemoveLanguageModel(code: Languages): Promise<boolean> {
  const translator = NitroModules.createHybridObject<Translator>('Translator');
  return translator.removeLanguageModel(code);
}

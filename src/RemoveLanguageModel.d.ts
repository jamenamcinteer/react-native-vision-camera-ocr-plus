import type { Languages } from './types';
/**
 * Remove a downloaded ML Kit translation language model.
 *
 * Uses the Nitro Translator HybridObject.
 *
 * @param code BCP-47 language code, e.g. 'fr', 'de', 'zh'
 */
export declare function RemoveLanguageModel(code: Languages): Promise<boolean>;

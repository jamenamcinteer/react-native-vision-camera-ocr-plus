import type { TextRecognizer } from './specs/TextRecognizer.nitro';
import type { Translator } from './specs/Translator.nitro';
import type { TranslatorPlugin, TranslatorOptions } from './types';
export type TranslatorHandle = TranslatorPlugin & {
    /** Nitro TextRecognizer HybridObject - safe to capture directly in worklets. */
    recognizer: TextRecognizer;
    /** Nitro Translator HybridObject - call translate() on the JS thread. */
    translator: Translator;
    /** BCP-47 source language. */
    from: string;
    /** BCP-47 target language. */
    to: string;
};
/**
 * Creates a plugin for live frame OCR + translation.
 *
 * The returned `scanText` worklet function performs synchronous OCR on the UI
 * thread. Dispatch the resulting text to `translator.translate()` on the JS
 * thread via `runOnJS`.
 */
export declare function createTranslatorPlugin(options?: TranslatorOptions): TranslatorHandle;

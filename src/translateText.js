import { NitroModules } from 'react-native-nitro-modules';
/**
 * Creates a plugin for live frame OCR + translation.
 *
 * The returned `scanText` worklet function performs synchronous OCR on the UI
 * thread. Dispatch the resulting text to `translator.translate()` on the JS
 * thread via `runOnJS`.
 */
export function createTranslatorPlugin(options) {
    const recognizerConfig = {
        language: 'latin',
        frameSkipThreshold: 1,
        useLightweightMode: false,
    };
    const recognizer = NitroModules.createHybridObject('TextRecognizer');
    recognizer.configure(recognizerConfig);
    const translator = NitroModules.createHybridObject('Translator');
    const from = options?.from ?? 'en';
    const to = options?.to ?? 'en';
    return {
        recognizer,
        translator,
        from,
        to,
        scanText: (frame) => {
            'worklet';
            const nb = frame.getNativeBuffer();
            const orientation = frame.orientation ?? 'up';
            let result;
            try {
                result = recognizer.scanFrame(nb.pointer, orientation);
            }
            finally {
                nb.release();
            }
            return result ?? { resultText: '', blocks: [] };
        },
        translate: (text) => {
            if (!text)
                return Promise.resolve('');
            return translator.translate(text, from, to);
        },
    };
}

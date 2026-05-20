import { NitroModules } from 'react-native-nitro-modules';
/**
 * Creates a plugin for live frame OCR + translation.
 *
 * The returned `scanText` worklet function is non-blocking and returns the
 * last completed OCR result while the current frame is processed on a native
 * background queue. Dispatch the resulting text to `translator.translate()`
 * on the JS thread via `runOnJS`.
 */
export function createTranslatorPlugin(options) {
  const recognizerConfig = {
    language: 'latin',
    frameSkipThreshold: 10,
    useLightweightMode: false,
    ...(options?.scanRegion && {
      scanRegion: {
        left: parseFloat(options.scanRegion.left),
        top: parseFloat(options.scanRegion.top),
        width: parseFloat(options.scanRegion.width),
        height: parseFloat(options.scanRegion.height),
      },
    }),
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
      } finally {
        nb.release();
      }
      return result ?? { resultText: '', blocks: [] };
    },
    translate: (text) => {
      if (!text) return Promise.resolve('');
      return translator.translate(text, from, to);
    },
  };
}

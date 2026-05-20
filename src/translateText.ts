import { NitroModules } from 'react-native-nitro-modules';
import type { TextRecognizer } from './specs/TextRecognizer.nitro';
import type { Translator } from './specs/Translator.nitro';
import type { TranslatorPlugin, TranslatorOptions, Text, Frame } from './types';

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
 * The returned `scanText` worklet function is non-blocking and returns the
 * last completed OCR result while the current frame is processed on a native
 * background queue. Dispatch the resulting text to `translator.translate()`
 * on the JS thread via `runOnJS`.
 */
export function createTranslatorPlugin(
  options?: TranslatorOptions
): TranslatorHandle {
  const recognizerConfig = {
    language: 'latin' as const,
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

  const recognizer =
    NitroModules.createHybridObject<TextRecognizer>('TextRecognizer');
  recognizer.configure(recognizerConfig);

  const translator = NitroModules.createHybridObject<Translator>('Translator');

  const from: string = options?.from ?? 'en';
  const to: string = options?.to ?? 'en';

  return {
    recognizer,
    translator,
    from,
    to,

    scanText: (frame: Frame): Text => {
      'worklet';
      const nb = (frame as any).getNativeBuffer() as {
        pointer: bigint;
        release: () => void;
      };
      const orientation: string = (frame as any).orientation ?? 'up';
      let result: Text | undefined | null;
      try {
        result = (recognizer as any).scanFrame(nb.pointer, orientation) as
          | Text
          | undefined
          | null;
      } finally {
        nb.release();
      }
      return result ?? ({ resultText: '', blocks: [] } as unknown as Text);
    },

    translate: (text: string): Promise<string> => {
      if (!text) return Promise.resolve('');
      return (translator as any).translate(text, from, to) as Promise<string>;
    },
  };
}

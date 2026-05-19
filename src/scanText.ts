import { NitroModules } from 'react-native-nitro-modules';
import type { TextRecognizer } from './specs/TextRecognizer.nitro';
import type {
  TextRecognitionPlugin,
  TextRecognitionOptions,
  Text,
  Frame,
} from './types';

export type TextRecognitionHandle = TextRecognitionPlugin & {
  /** The raw Nitro HybridObject - safe to capture directly in worklets. */
  recognizer: TextRecognizer;
};

/**
 * Creates a plugin that synchronously recognizes text in a VisionCamera v5 frame.
 *
 * The returned `scanText` function has the 'worklet' directive so it can be
 * captured and called synchronously from any worklet closure.
 * The `recognizer` HybridObject is also exposed for direct inline use.
 */
export function createTextRecognitionPlugin(
  options?: TextRecognitionOptions
): TextRecognitionHandle {
  const config = {
    language: options?.language ?? 'latin',
    frameSkipThreshold: options?.frameSkipThreshold ?? 10,
    useLightweightMode: options?.useLightweightMode ?? false,
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
  recognizer.configure(config);

  return {
    recognizer,
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
  };
}

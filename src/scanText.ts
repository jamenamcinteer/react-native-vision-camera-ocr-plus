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
 * Creates a plugin that schedules OCR for VisionCamera v5 frames.
 *
 * The returned `scanText` function has the 'worklet' directive so it can be
 * captured and called from any worklet closure.
 * `scanText` is non-blocking and returns the last completed OCR result while
 * the current frame is processed on a native background queue.
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

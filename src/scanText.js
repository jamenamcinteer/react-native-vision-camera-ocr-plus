import { NitroModules } from 'react-native-nitro-modules';
/**
 * Creates a plugin that schedules OCR for VisionCamera v5 frames.
 *
 * The returned `scanText` function has the 'worklet' directive so it can be
 * captured and called from any worklet closure.
 * `scanText` is non-blocking and returns the last completed OCR result while
 * the current frame is processed on a native background queue.
 * The `recognizer` HybridObject is also exposed for direct inline use.
 */
export function createTextRecognitionPlugin(options) {
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
  const recognizer = NitroModules.createHybridObject('TextRecognizer');
  recognizer.configure(config);
  return {
    recognizer,
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
  };
}

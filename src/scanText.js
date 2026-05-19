import { NitroModules } from 'react-native-nitro-modules';
/**
 * Creates a plugin that synchronously recognizes text in a VisionCamera v5 frame.
 *
 * The returned `scanText` function has the 'worklet' directive so it can be
 * captured and called synchronously from any worklet closure.
 * The `recognizer` HybridObject is also exposed for direct inline use.
 */
export function createTextRecognitionPlugin(options) {
  const config = {
    language: options?.language ?? 'latin',
    frameSkipThreshold: options?.frameSkipThreshold ?? 1,
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

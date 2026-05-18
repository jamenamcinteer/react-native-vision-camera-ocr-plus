import type { TextRecognizer } from './specs/TextRecognizer.nitro';
import type { TextRecognitionPlugin, TextRecognitionOptions } from './types';
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
export declare function createTextRecognitionPlugin(
  options?: TextRecognitionOptions
): TextRecognitionHandle;

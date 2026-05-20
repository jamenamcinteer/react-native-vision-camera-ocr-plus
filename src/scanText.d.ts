import type { TextRecognizer } from './specs/TextRecognizer.nitro';
import type { TextRecognitionPlugin, TextRecognitionOptions } from './types';
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
export declare function createTextRecognitionPlugin(
  options?: TextRecognitionOptions
): TextRecognitionHandle;

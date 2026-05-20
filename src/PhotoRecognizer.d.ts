import type { PhotoOptions, Text } from './types';
/**
 * Recognize text in a still photo.
 *
 * Uses the Nitro TextRecognizer HybridObject for efficient native OCR via ML Kit.
 *
 * @example
 * const result = await PhotoRecognizer({ uri: 'file:///path/to/photo.jpg' });
 * console.log(result.resultText);
 */
export declare function PhotoRecognizer(options: PhotoOptions): Promise<Text>;

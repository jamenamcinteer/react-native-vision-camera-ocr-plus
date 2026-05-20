import type { HybridObject, UInt64 } from 'react-native-nitro-modules';
export interface CornerPoint {
  x: number;
  y: number;
}
export interface BoundingFrame {
  boundingCenterX: number;
  boundingCenterY: number;
  height: number;
  width: number;
  x: number;
  y: number;
}
export interface TextElement {
  elementText: string;
  elementFrame: BoundingFrame;
  elementCornerPoints: CornerPoint[];
}
export interface TextLine {
  lineText: string;
  lineFrame: BoundingFrame;
  lineCornerPoints: CornerPoint[];
  lineLanguages: string[];
  elements: TextElement[];
}
export interface TextBlock {
  blockText: string;
  blockFrame: BoundingFrame;
  blockCornerPoints: CornerPoint[];
  lines: TextLine[];
}
export interface RecognizedText {
  resultText: string;
  blocks: TextBlock[];
}
export interface ScanRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface TextRecognitionConfig {
  language: string;
  scanRegion?: ScanRegion;
  frameSkipThreshold: number;
  useLightweightMode: boolean;
}
/**
 * Nitro HybridObject for OCR text recognition.
 * Handles both still-photo recognition and live-frame processing.
 */
export interface TextRecognizer extends HybridObject<{
  ios: 'swift';
  android: 'kotlin';
}> {
  /**
   * Recognize text in a still photo by URI.
   */
  recognizePhoto(uri: string, orientation: string): Promise<RecognizedText>;
  /**
   * Schedule OCR for a live camera frame and return the last completed result.
   * This method is non-blocking: native code enqueues OCR work on a background
   * queue and immediately returns the most recently completed recognition output.
   * On iOS the pointer is a CVPixelBufferRef with retain count +1;
   * callers must call NativeBuffer.release() after this returns.
   * On Android the pointer is an AHardwareBuffer*.
   */
  scanFrame(
    nativeBufferPointer: UInt64,
    orientation: string
  ): RecognizedText | undefined;
  /**
   * Configure the recognizer (language, scan region, etc.).
   */
  configure(config: TextRecognitionConfig): void;
}

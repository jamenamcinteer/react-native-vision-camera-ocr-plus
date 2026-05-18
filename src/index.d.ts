export type {
  TextRecognizer,
  RecognizedText,
  TextBlock,
  TextLine,
  TextElement,
  BoundingFrame,
  CornerPoint,
  ScanRegion as NitroScanRegion,
  TextRecognitionConfig,
} from './specs/TextRecognizer.nitro';
export type { Translator } from './specs/Translator.nitro';
export { Camera, useTextRecognition, useTranslate } from './Camera';
export { PhotoRecognizer } from './PhotoRecognizer';
export { RemoveLanguageModel } from './RemoveLanguageModel';
export * from './types';

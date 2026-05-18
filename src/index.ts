// Nitro HybridObject specs
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
} from './specs/TextRecognizer.nitro'
export type { Translator } from './specs/Translator.nitro'

// React Camera component and hooks
export { Camera, useTextRecognition, useTranslate } from './Camera'

// Standalone async utilities
export { PhotoRecognizer } from './PhotoRecognizer'
export { RemoveLanguageModel } from './RemoveLanguageModel'

// Shared TypeScript types
export * from './types'

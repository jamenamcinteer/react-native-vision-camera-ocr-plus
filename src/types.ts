export type {
  Frame,
  ReadonlyFrameProcessor,
  FrameProcessorPlugin,
  FrameInternal,
  CameraProps,
  CameraDevice,
} from 'react-native-vision-camera';
export type { ForwardedRef } from 'react';
import type { CameraProps, Frame } from 'react-native-vision-camera';

export type Languages =
  | 'af'
  | 'sq'
  | 'ar'
  | 'be'
  | 'bn'
  | 'bg'
  | 'ca'
  | 'zh'
  | 'cs'
  | 'da'
  | 'nl'
  | 'en'
  | 'eo'
  | 'et'
  | 'fi'
  | 'fr'
  | 'gl'
  | 'ka'
  | 'de'
  | 'el'
  | 'gu'
  | 'ht'
  | 'he'
  | 'hi'
  | 'hu'
  | 'is'
  | 'id'
  | 'ga'
  | 'it'
  | 'ja'
  | 'kn'
  | 'ko'
  | 'lv'
  | 'lt'
  | 'mk'
  | 'ms'
  | 'mt'
  | 'mr'
  | 'no'
  | 'fa'
  | 'pl'
  | 'pt'
  | 'ro'
  | 'ru'
  | 'sk'
  | 'sl'
  | 'es'
  | 'sw'
  | 'tl'
  | 'ta'
  | 'te'
  | 'th'
  | 'tr'
  | 'uk'
  | 'ur'
  | 'vi'
  | 'cy';

export type TextRecognitionOptions = {
  /**
   * Language to recognize
   * @default 'latin'
   */
  language?: 'latin' | 'chinese' | 'devanagari' | 'japanese' | 'korean';
  /**
   * Performance optimization: Skip frames to reduce processing load
   * Higher values = better performance, lower accuracy
   * @default 10
   */
  frameSkipThreshold?: number;
  /**
   * Use lightweight processing for better performance (Android only)
   * Skips corner points, languages, and element processing for better performance
   * Has no effect on iOS - iOS always returns full data structure
   * @default false
   */
  useLightweightMode?: boolean;
};

export type TranslatorOptions = {
  from: Languages;
  to: Languages;
};

export type CameraTypes = {
  callback: (data: string | Text[]) => void;
  mode: 'translate' | 'recognize';
} & CameraProps &
  (
    | { mode: 'recognize'; options: TextRecognitionOptions }
    | { mode: 'translate'; options: TranslatorOptions }
  );

export type TextRecognitionPlugin = {
  scanText: (frame: Frame) => Text[];
};
export type TranslatorPlugin = {
  translate: (frame: Frame) => string;
};

export type Text = {
  blocks: BlockData[];
  resultText: string;
};

type BlockData = {
  blockText: string;
  blockCornerPoints?: CornerPointsType; // Always present on iOS, omitted on Android when useLightweightMode is true
  blockFrame: FrameType;
  lines: LineData[];
};

type CornerPointsType = { x: number; y: number }[];

type FrameType = {
  boundingCenterX: number;
  boundingCenterY: number;
  height: number;
  width: number;
  x: number;
  y: number;
};

type LineData = {
  lineText: string;
  lineCornerPoints?: CornerPointsType; // Always present on iOS, omitted on Android when useLightweightMode is true
  lineFrame: FrameType;
  lineLanguages?: string[]; // Always present on iOS, omitted on Android when useLightweightMode is true
  elements: ElementData[]; // Always populated on iOS, empty array on Android when useLightweightMode is true
};

type ElementData = {
  elementText: string;
  elementCornerPoints?: CornerPointsType; // Always present on iOS, may be present on Android
  elementFrame: FrameType;
};

export type PhotoOptions = {
  uri: string;
  orientation?:
    | 'landscapeRight'
    | 'portrait'
    | 'portraitUpsideDown'
    | 'landscapeLeft';
};

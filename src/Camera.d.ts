import React from 'react';
import { type TextRecognitionHandle } from './scanText';
import { type TranslatorHandle } from './translateText';
import type { TextRecognitionOptions, TranslatorOptions } from './types';
/**
 * A drop-in replacement for VisionCamera's `<Camera />` that automatically
 * runs OCR or translation on every frame and fires a `callback` with the result.
 *
 * @example — Recognize text
 * ```tsx
 * <Camera
 *   device={device}
 *   isActive
 *   mode="recognize"
 *   options={{ language: 'latin', frameSkipThreshold: 5 }}
 *   callback={(data) => console.log((data as Text).resultText)}
 * />
 * ```
 *
 * @example — Translate text
 * ```tsx
 * <Camera
 *   device={device}
 *   isActive
 *   mode="translate"
 *   options={{ from: 'fr', to: 'en' }}
 *   callback={(translated) => console.log(translated as string)}
 * />
 * ```
 */
export declare const Camera: React.ForwardRefExoticComponent<any>;
/**
 * React hook that creates and memoizes a text recognition handle.
 */
export declare function useTextRecognition(
  options?: TextRecognitionOptions
): TextRecognitionHandle;
/**
 * React hook that creates and memoizes a translator handle.
 */
export declare function useTranslate(
  options?: TranslatorOptions
): TranslatorHandle;

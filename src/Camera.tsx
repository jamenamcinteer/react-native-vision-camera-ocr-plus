import React, { forwardRef, type ForwardedRef, useMemo } from 'react';
import * as VisionCameraModule from 'react-native-vision-camera';
import {
  createTextRecognitionPlugin,
  type TextRecognitionHandle,
} from './scanText';
import { createTranslatorPlugin, type TranslatorHandle } from './translateText';
import { runOnJS } from 'react-native-worklets';
import type {
  CameraTypes,
  Text,
  Frame,
  ReadonlyFrameProcessor,
  TextRecognitionOptions,
  TranslatorOptions,
} from './types';

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
export const Camera = forwardRef(function Camera(
  props: CameraTypes,
  ref: ForwardedRef<any>
) {
  const NativeCamera = (VisionCameraModule as any).Camera;
  const useFrameProcessor = (VisionCameraModule as any).useFrameProcessor as (
    processor: (frame: Frame) => void,
    deps?: ReadonlyArray<unknown>
  ) => ReadonlyFrameProcessor;

  const { device, callback, options, mode, ...p } = props;

  const recognizerHandle = useTextRecognition(
    mode === 'recognize' ? (options as TextRecognitionOptions) : undefined
  );
  const translatorHandle = useTranslate(
    mode === 'translate' ? (options as TranslatorOptions) : undefined
  );

  // Pull the raw Nitro HybridObjects out so the worklet compiler can capture
  // them directly. Nitro HybridObjects are JSI HostObjects — they are worklet-
  // safe and can be called synchronously on the UI thread without any wrapper.
  const recognizer =
    mode === 'translate'
      ? translatorHandle.recognizer
      : recognizerHandle.recognizer;
  const translator = translatorHandle.translator;
  const fromLang = translatorHandle.from;
  const toLang = translatorHandle.to;

  // JS-thread handler for recognize mode
  const runData = useMemo(
    () => runOnJS((data: Text) => callback(data)),
    [callback]
  );

  // JS-thread handler for translate mode
  const runTranslate = useMemo(
    () =>
      runOnJS((text: string) => {
        if (!text) return;
        (translator as any)
          .translate(text, fromLang, toLang)
          .then((translated: string) => callback(translated));
      }),
    [translator, fromLang, toLang, callback]
  );

  const processFrame = (frame: Frame): void => {
    'worklet';
    // Call the Nitro HybridObject directly — no wrapper function involved.
    const nb = (frame as any).getNativeBuffer() as {
      pointer: bigint;
      release: () => void;
    };
    const orientation: string = (frame as any).orientation ?? 'up';
    let ocrResult: Text | undefined | null;
    try {
      ocrResult = (recognizer as any).scanFrame(nb.pointer, orientation) as
        | Text
        | undefined
        | null;
    } finally {
      nb.release();
    }
    const result: Text = ocrResult ?? { resultText: '', blocks: [] };
    if (mode === 'translate') {
      if (result.resultText) {
        runTranslate(result.resultText);
      }
    } else {
      runData(result);
    }
    (frame as any).dispose?.();
  };

  const frameProcessor = useFrameProcessor(processFrame, [
    recognizer,
    translator,
    fromLang,
    toLang,
    runData,
    runTranslate,
    mode,
  ]);

  return (
    <>
      {!!device && (
        <NativeCamera
          pixelFormat="yuv"
          ref={ref}
          device={device}
          frameProcessor={frameProcessor}
          {...p}
        />
      )}
    </>
  );
});

/**
 * React hook that creates and memoizes a text recognition handle.
 */
export function useTextRecognition(
  options?: TextRecognitionOptions
): TextRecognitionHandle {
  return useMemo(() => createTextRecognitionPlugin(options), [options]);
}

/**
 * React hook that creates and memoizes a translator handle.
 */
export function useTranslate(options?: TranslatorOptions): TranslatorHandle {
  return useMemo(() => createTranslatorPlugin(options), [options]);
}

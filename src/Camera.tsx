import React, { forwardRef, type ForwardedRef, useMemo } from 'react';
import { Platform } from 'react-native';
import * as VisionCameraModule from 'react-native-vision-camera';
import {
  createTextRecognitionPlugin,
  type TextRecognitionHandle,
} from './scanText';
import { createTranslatorPlugin, type TranslatorHandle } from './translateText';
import { scheduleOnRN } from 'react-native-worklets';
import type {
  CameraTypes,
  Text,
  Frame,
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
  const useFrameOutput = (VisionCameraModule as any).useFrameOutput as (opts: {
    onFrame?: (frame: Frame) => void;
    pixelFormat?: string;
  }) => any;

  const {
    device,
    callback,
    options,
    mode,
    outputs: externalOutputs,
    ...p
  } = props as CameraTypes & { outputs?: any[] };
  const hasManagedOutput =
    typeof callback === 'function' &&
    (mode === 'recognize' || mode === 'translate');

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

  // JS-thread handler for translate mode
  const runTranslate = useMemo(() => {
    const translationState = {
      inFlight: false,
      lastRequestedText: '',
      requestId: 0,
    };

    return (text: string) => {
      if (!text) return;
      if (
        translationState.inFlight ||
        text === translationState.lastRequestedText
      )
        return;

      translationState.inFlight = true;
      translationState.lastRequestedText = text;
      const requestId = ++translationState.requestId;

      (translator as any)
        .translate(text, fromLang, toLang)
        .then((translated: string) => {
          if (requestId === translationState.requestId) {
            translationState.lastRequestedText = text;
            callback(translated);
          }
        })
        .catch((error: unknown) => {
          if (requestId === translationState.requestId) {
            translationState.lastRequestedText = '';
          }
          console.warn(
            '[react-native-vision-camera-ocr-plus] Translation failed',
            error
          );
        })
        .finally(() => {
          if (requestId === translationState.requestId) {
            translationState.inFlight = false;
          }
        });
    };
  }, [translator, fromLang, toLang, callback]);

  const onFrame = useMemo(
    () =>
      (frame: Frame): void => {
        'worklet';
        // Call the Nitro HybridObject directly — no wrapper function involved.
        const nb = (frame as any).getNativeBuffer() as {
          pointer: bigint;
          release: () => void;
        };
        const orientation: string = (frame as any).orientation ?? 'unknown';
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
            scheduleOnRN(runTranslate, result.resultText);
          }
        } else {
          if (hasManagedOutput) {
            scheduleOnRN(callback, result);
          }
        }
        frame.dispose();
      },
    [recognizer, runTranslate, mode, callback, hasManagedOutput]
  );

  const frameOutput = useFrameOutput({
    onFrame,
    pixelFormat: Platform.OS === 'android' ? 'rgb' : 'yuv',
  });

  return (
    <>
      {!!device && (
        <NativeCamera
          {...p}
          ref={ref}
          device={device}
          outputs={hasManagedOutput ? [frameOutput] : externalOutputs}
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

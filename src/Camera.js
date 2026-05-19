import React, { forwardRef, useMemo } from 'react';
import { Platform } from 'react-native';
import * as VisionCameraModule from 'react-native-vision-camera';
import { createTextRecognitionPlugin } from './scanText';
import { createTranslatorPlugin } from './translateText';
import { runOnJS } from 'react-native-worklets';
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
export const Camera = forwardRef(function Camera(props, ref) {
  const NativeCamera = VisionCameraModule.Camera;
  const useFrameProcessor = VisionCameraModule.useFrameProcessor;
  const { device, callback, options, mode, ...p } = props;
  const recognizerHandle = useTextRecognition(
    mode === 'recognize' ? options : undefined
  );
  const translatorHandle = useTranslate(
    mode === 'translate' ? options : undefined
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
  const runData = useMemo(() => runOnJS((data) => callback(data)), [callback]);
  // JS-thread handler for translate mode
  const runTranslate = useMemo(() => {
    const translationState = {
      inFlight: false,
      lastRequestedText: '',
      requestId: 0,
    };
    return runOnJS((text) => {
      if (!text) return;
      if (
        translationState.inFlight ||
        text === translationState.lastRequestedText
      )
        return;
      translationState.inFlight = true;
      translationState.lastRequestedText = text;
      const requestId = ++translationState.requestId;
      translator
        .translate(text, fromLang, toLang)
        .then((translated) => {
          if (requestId === translationState.requestId) {
            callback(translated);
          }
        })
        .catch((error) => {
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
    });
  }, [translator, fromLang, toLang, callback]);
  const processFrame = (frame) => {
    'worklet';
    // Call the Nitro HybridObject directly — no wrapper function involved.
    const nb = frame.getNativeBuffer();
    const orientation = frame.orientation ?? 'up';
    let ocrResult;
    try {
      ocrResult = recognizer.scanFrame(nb.pointer, orientation);
    } finally {
      nb.release();
    }
    const result = ocrResult ?? { resultText: '', blocks: [] };
    if (mode === 'translate') {
      if (result.resultText) {
        runTranslate(result.resultText);
      }
    } else {
      runData(result);
    }
    frame.dispose?.();
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
  return React.createElement(
    React.Fragment,
    null,
    !!device &&
      React.createElement(NativeCamera, {
        pixelFormat: Platform.OS === 'android' ? 'rgb' : 'yuv',
        ref: ref,
        device: device,
        frameProcessor: frameProcessor,
        ...p,
      })
  );
});
/**
 * React hook that creates and memoizes a text recognition handle.
 */
export function useTextRecognition(options) {
  return useMemo(() => createTextRecognitionPlugin(options), [options]);
}
/**
 * React hook that creates and memoizes a translator handle.
 */
export function useTranslate(options) {
  return useMemo(() => createTranslatorPlugin(options), [options]);
}

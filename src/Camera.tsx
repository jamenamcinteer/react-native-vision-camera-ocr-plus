import React, { forwardRef, type ForwardedRef, useMemo } from 'react';
import {
  Camera as VisionCamera,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { createTextRecognitionPlugin } from './scanText';
import { useRunOnJS } from 'react-native-worklets-core';
import type {
  CameraTypes,
  Text,
  Frame,
  ReadonlyFrameProcessor,
  TextRecognitionPlugin,
  TranslatorPlugin,
  TextRecognitionOptions,
  TranslatorOptions,
} from './types';
import { createTranslatorPlugin } from './translateText';

export const Camera = forwardRef(function Camera(
  props: CameraTypes,
  ref: ForwardedRef<any>
) {
  const { device, callback, options, mode, ...p } = props;

  const { scanText } = useTextRecognition(
    mode === 'recognize' ? options : undefined
  );
  const { translate } = useTranslate(
    mode === 'translate' ? options : undefined
  );

  const plugin:
    | TranslatorPlugin['translate']
    | TextRecognitionPlugin['scanText'] = useMemo(
    () => (mode === 'translate' ? translate : scanText),
    [mode, scanText, translate]
  );

  const runOnJS = useRunOnJS(
    (data): void => {
      callback(data);
    },
    [callback]
  );
  const frameProcessor: ReadonlyFrameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';
      const data: Text | string = plugin(frame);
      runOnJS(data);
    },
    [plugin, runOnJS, mode, options]
  );
  return (
    <>
      {!!device && (
        <VisionCamera
          pixelFormat="yuv"
          ref={ref}
          frameProcessor={frameProcessor}
          device={device}
          {...p}
        />
      )}
    </>
  );
});

export function useTextRecognition(
  options?: TextRecognitionOptions
): TextRecognitionPlugin {
  return useMemo(() => createTextRecognitionPlugin(options), [options]);
}
export function useTranslate(options?: TranslatorOptions): TranslatorPlugin {
  return useMemo(() => createTranslatorPlugin(options), [options]);
}

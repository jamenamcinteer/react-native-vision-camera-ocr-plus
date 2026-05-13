import React, { forwardRef, type ForwardedRef, useMemo } from 'react';
import * as VisionCameraModule from 'react-native-vision-camera';
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
  const VisionCamera = (VisionCameraModule as any).Camera;
  const createFrameProcessor = (VisionCameraModule as any)
    .useFrameProcessor as
    | ((
        processor: (frame: Frame) => void,
        deps?: ReadonlyArray<unknown>
      ) => ReadonlyFrameProcessor)
    | undefined;
  const createFrameOutput = (VisionCameraModule as any).useFrameOutput as
    | ((props: { onFrame: (frame: Frame) => void }) => unknown)
    | undefined;

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
  const frameProcessor = createFrameProcessor?.(
    (frame: Frame) => {
      'worklet';
      const data: Text | string = plugin(frame);
      runOnJS(data);
    },
    [plugin, runOnJS, mode, options]
  ) as ReadonlyFrameProcessor | undefined;

  const frameOutput = createFrameOutput?.({
    onFrame: (frame: Frame) => {
      'worklet';
      const data: Text | string = plugin(frame);
      runOnJS(data);
      (frame as any).dispose?.();
    },
  });

  const cameraProcessingProps = frameOutput
    ? { outputs: [frameOutput] }
    : { frameProcessor };

  return (
    <>
      {!!device && (
        <VisionCamera
          pixelFormat="yuv"
          ref={ref}
          device={device}
          {...cameraProcessingProps}
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

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

  let plugin: TranslatorPlugin['translate'] | TextRecognitionPlugin['scanText'];
  if (mode === 'translate') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { translate } = useTranslate(options);

    plugin = translate;
  } else {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { scanText } = useTextRecognition(options);
    plugin = scanText;
  }

  const runOnJS = useRunOnJS(
    (data): void => {
      callback(data);
    },
    [options]
  );
  const frameProcessor: ReadonlyFrameProcessor = useFrameProcessor(
    (frame: Frame) => {
      'worklet';
      const data: Text[] | string = plugin(frame);
      runOnJS(data);
    },
    []
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
  // Apply performance defaults for Android to reduce camera lag
  const optimizedOptions = useMemo(
    () => ({
      frameSkipThreshold: 10, // Process every 10th frame
      useLightweightMode: true, // Use lightweight data structures
      language: options?.language ?? 'latin',
      ...options,
    }),
    [options]
  );

  return useMemo(
    () => createTextRecognitionPlugin(optimizedOptions),
    [optimizedOptions]
  );
}
export function useTranslate(options?: TranslatorOptions): TranslatorPlugin {
  return useMemo(() => createTranslatorPlugin(options), [options]);
}

import { VisionCameraProxy } from 'react-native-vision-camera';
import type {
  Frame,
  TextRecognitionPlugin,
  TextRecognitionOptions,
  Text,
} from './types';

const LINKING_ERROR = `Can't load plugin scanText.Try cleaning cache or reinstall plugin.`;

export function createTextRecognitionPlugin(
  options?: TextRecognitionOptions
): TextRecognitionPlugin {
  const defaultOptions = {
    frameSkipThreshold: 10,
    useLightweightMode: false,
    language: 'latin' as const,
    ...options,
    ...(options?.scanRegion && {
      scanRegion: {
        left: parseFloat(options.scanRegion.left),
        top: parseFloat(options.scanRegion.top),
        width: parseFloat(options.scanRegion.width),
        height: parseFloat(options.scanRegion.height),
      },
    }),
  };

  const plugin = VisionCameraProxy.initFrameProcessorPlugin('scanText', {
    ...defaultOptions,
  });
  if (!plugin) {
    throw new Error(LINKING_ERROR);
  }
  return {
    scanText: (frame: Frame): Text => {
      'worklet';
      // @ts-ignore
      return plugin.call(frame) as Text;
    },
  };
}

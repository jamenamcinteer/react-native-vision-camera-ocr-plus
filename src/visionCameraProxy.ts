import * as VisionCameraModule from 'react-native-vision-camera';

type FrameProcessorPluginInstance = { call: (frame: unknown) => unknown };

type VisionCameraProxyLike = {
  initFrameProcessorPlugin: (
    name: string,
    options: Record<string, unknown>
  ) => FrameProcessorPluginInstance | null | undefined;
};

export function getVisionCameraProxy(): VisionCameraProxyLike {
  const moduleProxy = (VisionCameraModule as any).VisionCameraProxy;
  if (moduleProxy?.initFrameProcessorPlugin) {
    return moduleProxy as VisionCameraProxyLike;
  }

  const globalProxy = (globalThis as any).VisionCameraProxy;
  if (globalProxy?.initFrameProcessorPlugin) {
    return globalProxy as VisionCameraProxyLike;
  }

  throw new Error(
    'VisionCameraProxy is unavailable. Ensure frame processor bindings are installed for your VisionCamera version.'
  );
}

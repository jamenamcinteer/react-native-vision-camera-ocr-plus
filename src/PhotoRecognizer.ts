import { NativeModules, Platform } from 'react-native';
import type { PhotoOptions, Text } from './types';

export async function PhotoRecognizer(options: PhotoOptions): Promise<Text> {
  const { PhotoRecognizerModule } = NativeModules;
  const { uri, orientation } = options;

  if (!uri) {
    throw new Error("Can't resolve img uri");
  }

  // Check if the native module is properly linked
  if (
    !PhotoRecognizerModule ||
    typeof PhotoRecognizerModule.process !== 'function'
  ) {
    throw new Error(
      'PhotoRecognizerModule is not properly linked. Please ensure react-native-vision-camera-ocr is correctly installed and linked. ' +
        'For React Native 0.60+, try running "npx react-native clean" and "npx react-native run-android" (or run-ios). ' +
        'For older versions, check if the module is manually linked.'
    );
  }

  // Normalize the URI for different platforms
  let processUri = uri;

  if (Platform.OS === 'ios') {
    // iOS: Remove file:// prefix if present
    processUri = uri.replace('file://', '');
    return await PhotoRecognizerModule.process(
      processUri,
      orientation || 'portrait'
    );
  } else {
    // Android: Ensure proper file:// prefix for absolute file paths without any scheme
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(processUri);
    if (!hasScheme) {
      processUri = `file://${processUri}`;
    }
    return await PhotoRecognizerModule.process(processUri);
  }
}

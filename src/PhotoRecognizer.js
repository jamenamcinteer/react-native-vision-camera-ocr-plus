import { NitroModules } from 'react-native-nitro-modules';
import { Platform as RNPlatform } from 'react-native';
/**
 * Recognize text in a still photo.
 *
 * Uses the Nitro TextRecognizer HybridObject for efficient native OCR via ML Kit.
 *
 * @example
 * const result = await PhotoRecognizer({ uri: 'file:///path/to/photo.jpg' });
 * console.log(result.resultText);
 */
export async function PhotoRecognizer(options) {
  const { uri, orientation = 'portrait' } = options;
  if (!uri) {
    throw new Error("Can't resolve img uri");
  }
  const recognizer = NitroModules.createHybridObject('TextRecognizer');
  // Normalize URI per platform
  let processUri = uri;
  if (RNPlatform.OS === 'ios') {
    processUri = uri.replace('file://', '');
  } else {
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(processUri);
    if (!hasScheme) {
      processUri = `file://${processUri}`;
    }
  }
  return recognizer.recognizePhoto(processUri, orientation);
}

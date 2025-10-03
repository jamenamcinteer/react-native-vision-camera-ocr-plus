import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import { useTextRecognition } from 'react-native-vision-camera-ocr';

// TODO: Improve types in library
type TextRecognitionResult = {
  blocks: unknown;
  resultText: string;
};

export default function App() {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [detectedText, setDetectedText] = React.useState<string>();

  React.useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const onText = React.useMemo(
    () =>
      Worklets.createRunOnJS((items: string) => {
        setDetectedText(items);
      }),
    []
  );

  const { scanText } = useTextRecognition();

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const scannedText = scanText(frame) as unknown as TextRecognitionResult;
      if (scannedText?.resultText) {
        onText(scannedText.resultText);
      }
    },
    [scanText, onText]
  );

  if (!device || !hasPermission) {
    return (
      <View style={styles.center}>
        <Text>
          {!device ? 'No camera device' : 'Requesting camera permission…'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        frameProcessor={frameProcessor}
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>Detected text:</Text>
        <Text style={styles.line}>{detectedText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 12,
  },
  title: { color: 'white', fontWeight: '600', marginBottom: 8 },
  line: { color: 'white' },
});

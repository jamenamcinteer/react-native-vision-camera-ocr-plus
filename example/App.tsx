import * as React from 'react';
import {
  Alert,
  Button,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';
import {
  PhotoRecognizer,
  useTextRecognition,
} from 'react-native-vision-camera-ocr';
import * as ImagePicker from 'expo-image-picker';

// TODO: Improve types in library
type TextRecognitionResult = {
  blocks: unknown;
  resultText: string;
};

export default function App() {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [detectedText, setDetectedText] = React.useState<string>();
  const [image, setImage] = React.useState<string | null>(null);
  const [imageText, setImageText] = React.useState<string>('');

  React.useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  React.useEffect(() => {
    const readImage = async () => {
      setImageText('');
      try {
        const result = await PhotoRecognizer({
          uri: image || '',
          orientation: 'portrait',
        });
        setImageText(result.resultText || '');
      } catch (error) {
        Alert.alert('Error reading image', (error as Error).message);
      }
    };

    if (image) {
      readImage();
    }
  }, [image]);

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

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Permission required',
        'Permission to access the media library is required.'
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
      allowsMultipleSelection: false,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

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
      <View style={styles.buttonContainer}>
        <Button title="Photo Recognizer" onPress={pickImage} />
      </View>
      <Modal visible={!!image} animationType="slide">
        <View style={styles.modalContainer}>
          {image && (
            <Image
              source={{ uri: image }}
              style={styles.image}
              resizeMode="contain"
            />
          )}
          <View style={styles.overlay}>
            <Text style={styles.title}>Detected text from image:</Text>
            <Text style={styles.line}>{imageText}</Text>
          </View>
          <View style={styles.buttonContainer}>
            <Button title="Close" onPress={() => setImage(null)} />
          </View>
        </View>
      </Modal>
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
    bottom: 56,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 12,
  },
  title: { color: 'white', fontWeight: '600', marginBottom: 8 },
  line: { color: 'white' },
  modalContainer: { backgroundColor: 'black', flex: 1 },
  buttonContainer: { position: 'absolute', top: 48, right: 16 },
  image: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});

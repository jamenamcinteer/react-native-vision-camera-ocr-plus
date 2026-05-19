import * as React from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
} from 'react-native-vision-camera';
import { scheduleOnRN } from 'react-native-worklets';
import {
  PhotoRecognizer,
  useTranslate,
} from 'react-native-vision-camera-ocr-plus';
import type {
  Languages,
  ScanRegion,
} from 'react-native-vision-camera-ocr-plus';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const scanRegion = {
  left: '25%',
  top: '30%',
  width: '50%',
  height: '23%',
} as ScanRegion;

type LanguageOption = { label: string; value: Languages };

const LANGUAGES: LanguageOption[] = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Russian', value: 'ru' },
  { label: 'Chinese', value: 'zh' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Dutch', value: 'nl' },
  { label: 'Polish', value: 'pl' },
  { label: 'Turkish', value: 'tr' },
];

export default function App() {
  const insets = useSafeAreaInsets();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [detectedText, setDetectedText] = React.useState<string>();
  const [image, setImage] = React.useState<string | null>(null);
  const [imageText, setImageText] = React.useState<string>('');
  const [targetLanguage, setTargetLanguage] = React.useState<Languages>('en');
  const [langPickerVisible, setLangPickerVisible] = React.useState(false);

  const selectedLabel =
    LANGUAGES.find((l) => l.value === targetLanguage)?.label ?? targetLanguage;

  const translatorOptions = React.useMemo(
    () => ({ from: 'en' as Languages, to: targetLanguage, scanRegion }),
    [targetLanguage]
  );

  const { scanText, translate } = useTranslate(translatorOptions);

  React.useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  React.useEffect(() => {
    const readImage = async () => {
      setImageText('');
      try {
        const ocrResult = await PhotoRecognizer({
          uri: image || '',
          orientation: 'portrait',
        });
        const rawText = ocrResult.resultText || '';
        if (rawText) {
          const translated = await translate(rawText);
          setImageText(translated || rawText);
        }
      } catch (error) {
        Alert.alert('Error reading image', (error as Error).message);
      }
    };

    if (image) {
      readImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, targetLanguage]);

  const translateAndSet = React.useCallback(
    (text: string) => {
      if (targetLanguage === 'en') {
        setDetectedText(text);
        return;
      }
      translate(text)
        .then((translated) => setDetectedText(translated || text))
        .catch(() => setDetectedText(text));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translate]
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'rgb',
    onFrame: (frame) => {
      'worklet';
      const scannedText = scanText(frame);
      if (scannedText?.resultText) {
        scheduleOnRN(translateAndSet, scannedText.resultText);
      } else {
        scheduleOnRN(setDetectedText, undefined);
      }
      frame.dispose();
    },
  });

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
      setImage(result.assets[0]!.uri);
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
        outputs={[frameOutput]}
      />
      <View style={styles.scanRegion} />

      {/* Language picker button */}
      <Pressable
        style={styles.leftButton}
        onPress={() => setLangPickerVisible(true)}
      >
        <Text style={styles.buttonText}>🌐 Translate to: {selectedLabel}</Text>
      </Pressable>

      {/* Photo recognizer button */}
      <Pressable style={styles.rightButton} onPress={pickImage}>
        <Text style={styles.buttonText}>📷 Photo Recognizer</Text>
      </Pressable>

      <View style={styles.overlay}>
        <Text style={styles.title}>Detected text (→ {selectedLabel}):</Text>
        <Text style={styles.line}>{detectedText}</Text>
      </View>

      {/* Language selection modal */}
      <Modal
        visible={langPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLangPickerVisible(false)}
      >
        <Pressable
          style={styles.langModalBackdrop}
          onPress={() => setLangPickerVisible(false)}
        >
          <View
            style={[
              styles.langModalSheet,
              { paddingBottom: insets.bottom + 8 },
            ]}
          >
            <Text style={styles.langModalTitle}>Select target language</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.langOption,
                    item.value === targetLanguage && styles.langOptionSelected,
                  ]}
                  onPress={() => {
                    setTargetLanguage(item.value);
                    setLangPickerVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.langOptionText,
                      item.value === targetLanguage &&
                        styles.langOptionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Photo recognizer result modal */}
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
            <Text style={styles.title}>
              Translated text from image (→ {selectedLabel}):
            </Text>
            <Text style={styles.line}>{imageText}</Text>
          </View>
          <Pressable style={styles.rightButton} onPress={() => setImage(null)}>
            <Text style={styles.buttonText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanRegion: {
    ...scanRegion,
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'red',
  },
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
  image: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  rightButton: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  leftButton: {
    position: 'absolute',
    top: 56,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: { color: 'white', fontSize: 14, fontWeight: '500' },
  langModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  langModalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  langModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  langOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  langOptionSelected: { backgroundColor: '#007AFF20' },
  langOptionText: { fontSize: 15, color: '#333' },
  langOptionTextSelected: { color: '#007AFF', fontWeight: '600' },
});

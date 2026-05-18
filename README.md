# react-native-vision-camera-ocr-plus

On-device OCR and text translation for React Native, powered by [VisionCamera](https://github.com/mrousavy/react-native-vision-camera) and [Nitro Modules](https://github.com/mrousavy/nitro). Uses Google ML Kit under the hood for both text recognition and on-device translation.

## Features

- **Live OCR** — read text from every camera frame via a VisionCamera frame processor
- **Live translation** — recognize and translate camera frame text in real time
- **Photo OCR** — recognize text asynchronously from a still image URI
- **Model management** — remove downloaded translation language models to free storage
- Supports Latin, Chinese, Devanagari, Japanese, and Korean scripts
- Optional scan-region cropping to focus recognition on a sub-area of the frame
- Configurable frame skipping for performance tuning

## Installation

```sh
npm install react-native-vision-camera-ocr-plus react-native-nitro-modules
```

### Peer dependencies

| Package | Version |
|---|---|
| `react-native-vision-camera` | `>=4.0.0` |
| `react-native-nitro-modules` | `*` |
| `react-native-worklets-core` | `*` |

### iOS

```sh
cd ios && pod install
```

### Android

No additional steps — the library is auto-linked.

---

## Usage

### `<Camera />` — live OCR

Renders a VisionCamera `<Camera>` and fires `callback` with recognized text on every processed frame.

```tsx
import { Camera, type Text } from 'react-native-vision-camera-ocr-plus'
import { useCameraDevice } from 'react-native-vision-camera'

export default function App() {
  const device = useCameraDevice('back')

  return (
    <Camera
      style={{ flex: 1 }}
      device={device}
      isActive
      mode="recognize"
      options={{
        language: 'latin',        // 'latin' | 'chinese' | 'devanagari' | 'japanese' | 'korean'
        frameSkipThreshold: 10,   // process every 10th frame
        useLightweightMode: false, // Android only
        // scanRegion: { left: '10%', top: '20%', width: '80%', height: '30%' },
      }}
      callback={(data) => {
        const text = data as Text
        console.log(text.resultText)
        console.log(text.blocks) // array of TextBlock
      }}
    />
  )
}
```

### `<Camera />` — live translation

```tsx
import { Camera } from 'react-native-vision-camera-ocr-plus'
import { useCameraDevice } from 'react-native-vision-camera'

export default function App() {
  const device = useCameraDevice('back')

  return (
    <Camera
      style={{ flex: 1 }}
      device={device}
      isActive
      mode="translate"
      options={{ from: 'fr', to: 'en' }}
      callback={(data) => console.log(data as string)}
    />
  )
}
```

### Hooks — build your own frame processor

Use `useTextRecognition` or `useTranslate` to integrate the plugins into a custom frame processor.

```tsx
import { useTextRecognition, useTranslate, type Text } from 'react-native-vision-camera-ocr-plus'
import { useFrameProcessor, Camera } from 'react-native-vision-camera'
import { useRunOnJS } from 'react-native-worklets-core'

function MyCamera() {
  const { scanText } = useTextRecognition({ language: 'latin' })

  const onResult = useRunOnJS((text: Text) => {
    console.log(text.resultText)
  }, [])

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'
    const result = scanText(frame)
    onResult(result)
  }, [scanText, onResult])

  return <Camera device={device} isActive frameProcessor={frameProcessor} />
}
```

### `PhotoRecognizer` — still image OCR

```tsx
import { PhotoRecognizer, type Text } from 'react-native-vision-camera-ocr-plus'

const result: Text = await PhotoRecognizer({
  uri: 'file:///path/to/photo.jpg',
  orientation: 'portrait', // 'portrait' | 'landscapeLeft' | 'landscapeRight' | 'portraitUpsideDown'
})

console.log(result.resultText)
```

### `RemoveLanguageModel` — free storage

Removes a downloaded ML Kit translation model from the device.

```tsx
import { RemoveLanguageModel } from 'react-native-vision-camera-ocr-plus'

const success = await RemoveLanguageModel('fr')
```

---

## API Reference

### Types

```ts
type Text = {
  resultText: string
  blocks: BlockData[]
}

type BlockData = {
  blockText: string
  blockFrame: FrameType
  blockCornerPoints?: CornerPointsType
  lines: LineData[]
}

type LineData = {
  lineText: string
  lineFrame: FrameType
  lineCornerPoints?: CornerPointsType
  lineLanguages?: string[]
  elements: ElementData[]
}

type ElementData = {
  elementText: string
  elementFrame: FrameType
  elementCornerPoints?: CornerPointsType
}

type FrameType = {
  boundingCenterX: number
  boundingCenterY: number
  height: number
  width: number
  x: number
  y: number
}

type ScanRegion = {
  left: Percentage   // e.g. "10%"
  top: Percentage
  width: Percentage
  height: Percentage
}

type TextRecognitionOptions = {
  language?: 'latin' | 'chinese' | 'devanagari' | 'japanese' | 'korean'
  scanRegion?: ScanRegion
  frameSkipThreshold?: number   // default: 10
  useLightweightMode?: boolean  // Android only, default: false
}

type TranslatorOptions = {
  from: Languages
  to: Languages
}
```

`Languages` is a union of BCP-47 language codes: `'af' | 'sq' | 'ar' | 'be' | 'bn' | 'bg' | 'ca' | 'zh' | 'cs' | 'da' | 'nl' | 'en' | ...` (full list in [types.ts](src/types.ts)).

---

## Structure

```
android/           Kotlin HybridObject implementations (HybridTextRecognizer, HybridTranslator)
ios/               Swift HybridObject implementations
src/
  specs/
    TextRecognizer.nitro.ts   Nitro HybridObject spec for OCR
    Translator.nitro.ts       Nitro HybridObject spec for translation
  Camera.tsx                  <Camera> component + useTextRecognition / useTranslate hooks
  scanText.ts                 createTextRecognitionPlugin (frame processor factory)
  translateText.ts            createTranslatorPlugin (frame processor factory)
  PhotoRecognizer.ts          Async still-photo OCR
  RemoveLanguageModel.ts      Delete downloaded translation models
  types.ts                    All shared TypeScript types
  index.ts                    Public API surface
nitro.json         Nitrogen config — registers HybridTextRecognizer & HybridTranslator
```


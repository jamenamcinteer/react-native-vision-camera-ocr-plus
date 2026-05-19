# Migration Guide — v1.x → v2.0.0

v2.0.0 is a full rewrite of the native layer. The JavaScript API is mostly compatible but there are several **breaking changes** to be aware of.

---

## Table of Contents

1. [What changed](#what-changed)
2. [Platform & environment requirements](#platform--environment-requirements)
3. [Dependencies](#dependencies)
4. [VisionCamera v4 → v5](#visioncamera-v4--v5)
5. [Hooks — return type changes](#hooks--return-type-changes)
6. [Frame processors — custom integrations](#frame-processors--custom-integrations)
7. [TranslatorPlugin — `translate` signature changed](#translatorplugin--translate-signature-changed)
8. [PhotoRecognizer — no behavioral change, but new backing](#photorecognizer--no-behavioral-change-but-new-backing)
9. [RemoveLanguageModel — no behavioral change, but new backing](#removelanguagemodel--no-behavioral-change-but-new-backing)
10. [Worklets package change](#worklets-package-change)
11. [Type exports — now public](#type-exports--now-public)
12. [iOS Simulator caveat](#ios-simulator-caveat)
13. [Quick checklist](#quick-checklist)

---

## What changed

The v1 implementation used VisionCamera's `VisionCameraProxy.initFrameProcessorPlugin` API along with `NativeModules` for photo OCR and model management. v2 replaces all of this with **[Nitro Modules](https://github.com/mrousavy/nitro)** — a JSI-based native module system that exposes `TextRecognizer` and `Translator` as first-class HybridObjects. This eliminates the old frame processor plugin registration and the separate `NativeModules` bridge for `PhotoRecognizer` / `RemoveLanguageModel`.

---

## Platform & environment requirements

v2 raises the minimum supported versions across the board. Ensure your project meets these before upgrading:

| Requirement | Minimum version |
|---|---|
| React Native | 0.78 |
| iOS | 15.1 |
| Android Minimum SDK | 26 |
| Android Target SDK | 36 |
| react-native-vision-camera | 5.0.0 |
| react-native-worklets | 6.0.0 |
| Expo (if used) | 54 |

If your project targets Android SDK < 26 or iOS < 15.1, you will need to raise those targets before upgrading. In your `android/build.gradle` set `minSdkVersion = 26`; in your iOS Podfile ensure `platform :ios, '15.1'` (or higher).

> **Firebase users:** If your project includes Firebase, you must set the iOS Deployment Target to **at least 16.0**.

---

## Dependencies

### Remove

```sh
# no longer needed as a peer dependency
yarn remove react-native-worklets-core
```

### Add

```sh
yarn add react-native-nitro-modules react-native-vision-camera-worklets react-native-worklets
```

### peer dependencies for v2

| Package | Version |
|---|---|
| `react-native-vision-camera` | `>=5.0.0` |
| `react-native-nitro-modules` | `*` |
| `react-native-vision-camera-worklets` | `*` |
| `react-native-worklets` | `*` |

`react-native-worklets-core` is no longer required.

---

## VisionCamera v4 → v5

v2 requires **VisionCamera v5** (`>=5.0.0`). The most notable API change that affects this library's users directly is how `pixelFormat` is set — in v5 it is configured on the frame output, not on the `<Camera>` component.

If you are using the `<Camera>` component or the low-level hooks from this library you do **not** need to set `pixelFormat` yourself — the library handles it internally. However, if you build your own frame processor with `useFrameOutput`, you must set `pixelFormat: 'rgb'` on Android:

```tsx
// v5 custom frame output — Android requires pixelFormat: 'rgb'
const frameOutput = useFrameOutput({
  pixelFormat: 'rgb',
  onFrame: (frame) => { ... },
})
```

See the [VisionCamera v5 migration guide](https://react-native-vision-camera.com/docs/guides/migration/v4) for the full list of VisionCamera-level changes.

---

## Hooks — return type changes

### `useTextRecognition`

The return type changed from `TextRecognitionPlugin` to `TextRecognitionHandle`.

`TextRecognitionHandle` extends `TextRecognitionPlugin` (still exposes `scanText`) and adds a `recognizer` property — the raw Nitro `TextRecognizer` HybridObject.

```ts
// v1
const { scanText }: TextRecognitionPlugin = useTextRecognition({ language: 'latin' })

// v2
const { scanText, recognizer }: TextRecognitionHandle = useTextRecognition({ language: 'latin' })
```

### `useTranslate`

The return type changed from `TranslatorPlugin` to `TranslatorHandle`.

`TranslatorHandle` exposes `scanText`, the async `translate`, and the raw HybridObjects `recognizer` / `translator`, plus the resolved `from` / `to` language strings.

```ts
// v1
const { translate }: TranslatorPlugin = useTranslate({ from: 'fr', to: 'en' })

// v2
const { scanText, translate, recognizer, translator, from, to }: TranslatorHandle =
  useTranslate({ from: 'fr', to: 'en' })
```

---

## Frame processors — custom integrations

The biggest breaking change is how frames are consumed inside worklets. In v1, `scanText(frame)` or `translate(frame)` were called with the `frame` argument and both OCR and translation happened synchronously in the worklet. In v2, **translation is async** and the two steps are separated.

### v1 — single `translate(frame)` call in the worklet

```tsx
// v1
const { translate } = useTranslate({ from: 'fr', to: 'en' })

const frameProcessor = useFrameProcessor((frame) => {
  'worklet'
  const translated: string = translate(frame)  // ← OCR + translate, all sync
  runOnJS(setTranslated)(translated)
}, [translate])
```

### v2 — `scanText` in the worklet, `translate()` on the JS thread

```tsx
import { useTranslate } from 'react-native-vision-camera-ocr-plus'
import { useFrameOutput, useCameraDevice } from 'react-native-vision-camera'
import { scheduleOnRN } from 'react-native-worklets'

const { scanText, translate } = useTranslate({ from: 'fr', to: 'en' })

const frameOutput = useFrameOutput({
  pixelFormat: 'rgb', // required on Android
  onFrame: (frame) => {
    'worklet'
    const result = scanText(frame)     // synchronous OCR — worklet-safe
    if (result.resultText) {
      translate(result.resultText)     // async translation — JS thread
        .then((translated) => scheduleOnRN(setTranslated, translated))
    }
    frame.dispose()
  },
})
```

Similarly, for OCR-only custom processors, `useFrameProcessor` is replaced by `useFrameOutput` in VisionCamera v5:

```tsx
// v1
const { scanText } = useTextRecognition({ language: 'latin' })

const frameProcessor = useFrameProcessor((frame) => {
  'worklet'
  const text = scanText(frame)
  runOnJS(setText)(text.resultText)
}, [scanText])
```

```tsx
// v2
import { scheduleOnRN } from 'react-native-worklets'

const { scanText } = useTextRecognition({ language: 'latin' })

const frameOutput = useFrameOutput({
  pixelFormat: 'rgb', // required on Android
  onFrame: (frame) => {
    'worklet'
    const result = scanText(frame)
    if (result.resultText) {
      scheduleOnRN(setText, result.resultText)
    }
    frame.dispose()
  },
})
```

---

## TranslatorPlugin — `translate` signature changed

The `translate` function on `TranslatorPlugin` / `TranslatorHandle` changed from a synchronous frame-accepting worklet to an **async JS-thread function** that accepts a plain string.

```ts
// v1 TranslatorPlugin
translate: (frame: Frame) => string   // synchronous, worklet-safe

// v2 TranslatorPlugin / TranslatorHandle
translate: (text: string) => Promise<string>  // async, JS thread
```

If you were calling `translate(frame)` in a worklet you must split the work into `scanText(frame)` (worklet) followed by `translate(text)` (JS thread via `runOnJS` / `scheduleOnRN`).

---

## PhotoRecognizer — no behavioral change, but new backing

`PhotoRecognizer` now uses the Nitro `TextRecognizer` HybridObject instead of `NativeModules.PhotoRecognizerModule`. The **public API is unchanged** — the call signature and return type are the same:

```ts
const result: Text = await PhotoRecognizer({
  uri: 'file:///path/to/photo.jpg',
  orientation: 'portrait',
})
```

No migration needed unless you were accessing the old `PhotoRecognizerModule` directly via `NativeModules`.

---

## RemoveLanguageModel — no behavioral change, but new backing

`RemoveLanguageModel` now uses the Nitro `Translator` HybridObject instead of `NativeModules.RemoveLanguageModel`. The public API is unchanged:

```ts
const success: boolean = await RemoveLanguageModel('fr')
```

No migration needed unless you were accessing the old `NativeModules.RemoveLanguageModel` directly.

---

## Worklets package change

The worklet helper import changed from `react-native-worklets-core` to `react-native-worklets`:

```ts
// v1
import { useRunOnJS } from 'react-native-worklets-core'

// v2
import { scheduleOnRN, runOnJS } from 'react-native-worklets'
```

---

## Type exports — now public

Several types that were previously module-internal are now exported publicly. You can now import them directly:

```ts
import type {
  BlockData,
  LineData,
  ElementData,
  FrameType,
  CornerPointsType,
  // Nitro spec types
  TextRecognizer,
  Translator,
  RecognizedText,
  TextBlock,
  TextLine,
  TextElement,
  BoundingFrame,
  CornerPoint,
  NitroScanRegion,
  TextRecognitionConfig,
} from 'react-native-vision-camera-ocr-plus'
```

---

## iOS Simulator caveat

Building for the **iOS Simulator on Apple Silicon (arm64)** may fail due to a known limitation in Google ML Kit which does not ship an `arm64-simulator` slice for some frameworks. The library works on **physical iOS devices** and on the **iOS Simulator under Rosetta**. See [issue #91](https://github.com/jamenamcinteer/react-native-vision-camera-ocr-plus/issues/91#issuecomment-3768407842) for details.

If you have Firebase in your project, set your iOS Deployment Target to **at least 16.0**.

---

## Quick checklist

- [ ] Verify minimum platform versions: React Native ≥ 0.78, iOS ≥ 15.1, Android `minSdkVersion` ≥ 26 (targetSdkVersion ≥ 36), Expo ≥ 54 (if used)
- [ ] Remove `react-native-worklets-core`, add `react-native-nitro-modules`, `react-native-vision-camera-worklets`, and `react-native-worklets`
- [ ] Upgrade `react-native-vision-camera` to `>=5.0.0`
- [ ] Run `cd ios && pod install`
- [ ] Replace `useRunOnJS` from `react-native-worklets-core` with `runOnJS` / `scheduleOnRN` from `react-native-worklets`
- [ ] Replace `useFrameProcessor` usage with `useFrameOutput` (VisionCamera v5)
- [ ] In translate mode: split `translate(frame)` into `scanText(frame)` (worklet) + `translate(text)` (JS thread)
- [ ] Add `pixelFormat: 'rgb'` to `useFrameOutput` on Android
- [ ] Update any TypeScript types that referenced `TextRecognitionPlugin` / `TranslatorPlugin` — the hook return types are now `TextRecognitionHandle` / `TranslatorHandle`

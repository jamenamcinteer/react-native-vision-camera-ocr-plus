# 📷 react-native-vision-camera-ocr-plus

[![CI Status](https://github.com/jamenamcinteer/react-native-vision-camera-ocr-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/jamenamcinteer/react-native-vision-camera-ocr-plus/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/react-native-vision-camera-ocr-plus.svg)](https://www.npmjs.com/package/react-native-vision-camera-ocr-plus)

A **React Native Vision Camera** frame processor for **on-device text recognition (OCR)** and **translation** using **ML Kit**.

✨ Actively maintained fork of [`react-native-vision-camera-text-recognition`](https://www.npmjs.com/package/react-native-vision-camera-text-recognition), with modern improvements, bug fixes, and support for the latest Vision Camera and React Native versions.

---

## 🌟 Why Use This Fork?

The original packages are **no longer actively maintained**.  
This fork provides:

- ✅ Ongoing maintenance and compatibility with **React Native 0.76+** and **Vision Camera v4+**  
- 🧠 **Translation support** (not just OCR) powered by ML Kit  
- 🛠 **Improved stability and error handling**  
- 🚀 **Faster processing** and frame optimization  
- 📦 **TypeScript definitions** included  
- 🧩 Consistent API that works seamlessly with modern React Native projects

---

## 🚀 Features

- 🧩 Simple drop-in API  
- ⚡ Fast, accurate on-device OCR  
- 📱 Works on **Android** and **iOS**  
- 🌐 Built-in translation via ML Kit  
- 📸 Recognize text from live camera or static photos  
- 🪄 Written in **Kotlin** and **Swift**  
- 🔧 Compatible with `react-native-vision-camera` and `react-native-worklets-core`

---

## 💻 Installation

> **Peer dependencies:**  
> You must have `react-native-vision-camera` and `react-native-worklets-core` installed.

```bash
npm install react-native-vision-camera-ocr-plus
# or
yarn add react-native-vision-camera-ocr-plus
```

---

## 🔄 Migration

| Previous Package | Replacement | Notes |
|------------------|-------------|-------|
| `react-native-vision-camera-text-recognition` | ✅ `react-native-vision-camera-ocr-plus` | Drop-in replacement with fixes and updates |
| `vision-camera-ocr` | ✅ `react-native-vision-camera-ocr-plus` | Actively maintained alternative |

---

## 💡 Usage

👉 See the [example app](https://github.com/jamenamcinteer/react-native-vision-camera-ocr-plus/tree/main/example) for a working demo.

### 📚 Live Text Recognition

```jsx
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useCameraDevice } from 'react-native-vision-camera';
import { Camera } from 'react-native-vision-camera-ocr-plus';

export default function App() {
  const [data, setData] = useState(null);
  const device = useCameraDevice('back');

  return (
    <>
      {!!device && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          mode="recognize"
          options={{ language: 'latin' }}
          callback={(result) => setData(result)}
        />
      )}
    </>
  );
}
```

---

### 🌍 Translate Text in Real Time

```jsx
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useCameraDevice } from 'react-native-vision-camera';
import { Camera } from 'react-native-vision-camera-ocr-plus';

export default function App() {
  const [data, setData] = useState(null);
  const device = useCameraDevice('back');

  return (
    <>
      {!!device && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          mode="translate"
          options={{ from: 'en', to: 'de' }}
          callback={(result) => setData(result)}
        />
      )}
    </>
  );
}
```

---

### ⚙️ Using a Frame Processor

```jsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useTextRecognition } from 'react-native-vision-camera-ocr-plus';

export default function App() {
  const device = useCameraDevice('back');
  const { scanText } = useTextRecognition({ language: 'latin' });

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    const data = scanText(frame);
    console.log('Detected text:', data);
  }, []);

  return (
    <>
      {!!device && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          frameProcessor={frameProcessor}
          mode="recognize"
        />
      )}
    </>
  );
}
```

---

## ⚙️ Options

| Option | Type | Values | Default |
|:-------|:-----|:--------|:---------|
| `language` | `string` | `latin`, `chinese`, `devanagari`, `japanese`, `korean` | `latin` |
| `mode` | `string` | `recognize`, `translate` | `recognize` |
| `from`, `to` | `string` | See [Supported Languages](#-supported-languages) | `en`, `de` |

---

## 🖼 Recognize Text from a Photo

```js
import { PhotoRecognizer } from 'react-native-vision-camera-ocr-plus';

const result = await PhotoRecognizer({
  uri: asset.uri,
  orientation: 'portrait',
});

console.log(result);
```

> ⚠️ **Note (iOS only):**  
> The `orientation` option is available only on iOS and is recommended when using photos captured via the camera.

| Property | Type | Values | Required | Default | Platform |
|:----------|:------|:--------|:----------|:----------|:-----------|
| `uri` | `string` | — | ✅ Yes | — | Android, iOS |
| `orientation` | `string` | `portrait`, `portraitUpsideDown`, `landscapeLeft`, `landscapeRight` | ❌ No | `portrait` | iOS only |

---

## 🧹 Remove Unused Translation Models

```js
import { RemoveLanguageModel } from 'react-native-vision-camera-ocr-plus';

await RemoveLanguageModel('en');
```

---

## 🌍 Supported Languages

| Language | Code | Flag |
|:----------|:------|:------|
| Afrikaans | `af` | 🇿🇦 |
| Arabic | `ar` | 🇸🇦 |
| Bengali | `bn` | 🇧🇩 |
| Chinese | `zh` | 🇨🇳 |
| English | `en` | 🇺🇸🇬🇧 |
| French | `fr` | 🇫🇷 |
| German | `de` | 🇩🇪 |
| Hindi | `hi` | 🇮🇳 |
| Japanese | `ja` | 🇯🇵 |
| Korean | `ko` | 🇰🇷 |
| Portuguese | `pt` | 🇵🇹 |
| Russian | `ru` | 🇷🇺 |
| Spanish | `es` | 🇪🇸 |

---

## 🧠 Contributing

Contributions, feature requests, and bug reports are always welcome!  
Please open an [issue](https://github.com/jamenamcinteer/react-native-vision-camera-ocr-plus/issues) or [pull request](https://github.com/jamenamcinteer/react-native-vision-camera-ocr-plus/pulls).

---

## ☕ Support the Project

If this library helps you build awesome apps, consider supporting future maintenance and development 💛

- [💖 Sponsor on GitHub](https://github.com/sponsors/jamenamcinteer)

Your support helps keep the package updated and open source ❤️

---

## 📄 License

MIT © [Jamena McInteer](https://github.com/jamenamcinteer)

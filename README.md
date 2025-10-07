# @jamenamcinteer/react-native-vision-camera-ocr

[![Lint and Test](https://github.com/jamenamcinteer/react-native-vision-camera-ocr/actions/workflows/ci.yml/badge.svg)](https://github.com/jamenamcinteer/react-native-vision-camera-ocr/actions/workflows/ci.yml)

📷 A [React Native Vision Camera](https://github.com/mrousavy/react-native-vision-camera) frame processor for text recognition (OCR) and translation using ML Kit. 

✨ Maintained fork of [react-native-vision-camera-text-recognition](https://www.npmjs.com/package/react-native-vision-camera-text-recognition).  

## 💻 Installation

**Requires react-native-vision-camera and react-native-worklets-core**

```sh
npm install @jamenamcinteer/react-native-vision-camera-ocr
yarn add @jamenamcinteer/react-native-vision-camera-ocr
```

## Migrating
- If you were using `react-native-vision-camera-text-recognition`, switch to this package for updates and fixes. This package is an easy replacement.
- If you were using `vision-camera-ocr`, this is an actively maintained replacement.

## 👷Features
*    Easy to use.
*    Works with React Native Vision Camera.
*    Works for Both Cameras.
*    Fast text recognition.
*    Works with Android 🤖 and iOS.📱
*    Writen with Kotlin and Swift.
*    Can recognize text from photo. 📸
*    Can translate text. 🌍

## 💡 Usage

* [Example](https://github.com/jamenamcinteer/react-native-vision-camera-ocr/tree/next-release/example)

### 📚 For Live Recognition of Text
```js
import React, { useState } from 'react'
import { useCameraDevice } from 'react-native-vision-camera'
import { Camera } from '@jamenamcinteer/react-native-vision-camera-ocr';

function App (){
  const [data,setData] = useState(null)
  const device = useCameraDevice('back');
  console.log(data)
  return(
    <>
      {!!device && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          options={{
            language: 'latin'
          }}
          mode={'recognize'}
          callback={(d) => setData(d)}
        />
      )}
    </>
  )
}

export default App;



```

### 🌍 For Translating Text
```js
import React, { useState } from 'react'
import { useCameraDevice } from 'react-native-vision-camera'
import { Camera } from '@jamenamcinteer/react-native-vision-camera-ocr';

function App (){
  const [data,setData] = useState(null)
  const device = useCameraDevice('back');
  console.log(data)
  return(
    <>
      {!!device && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          options={{
            from: 'en',
            to: 'de'
          }}
          mode={'translate'}
          callback={(d) => setData(d)}
        />
      )}
    </>
  )
}

export default App;

```

### Or

```js
import React from 'react';
import { StyleSheet } from "react-native";
import {
  Camera,
  useCameraDevice,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useTextRecognition } from "@jamenamcinteer/react-native-vision-camera-ocr";

function App() {
  const device = useCameraDevice('back');
  const options = { language : 'latin' }
  const {scanText} = useTextRecognition(options)
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'
    const data = scanText(frame)
    console.log(data, 'data')
  }, [])
  return (
    <>
      {!!device && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          mode={'recognize'}
          frameProcessor={frameProcessor}
        />
      )}
    </>
  );
}
export default App;


```
---
## ⚙️ Options

|   Name   |  Type    |                    Values                    |  Default  |
|:--------:| :---: |:--------------------------------------------:|:---------:|
| language | string | latin, chinese, devanagari, japanese, korean |   latin   |
|   mode   | string |             recognize, translate             | recognize |
| from,to  | string |                  See Below                   |   en,de   |


##  Recognize By Photo 📸

```js
import { PhotoRecognizer } from "@jamenamcinteer/react-native-vision-camera-ocr";

const result = await PhotoRecognizer({
    uri:assets.uri,
    orientation: "portrait"
})
console.log(result);

```
<h4>🚨 Orientation available only for iOS. It is suggested to use it when you are using Camera.

|    Name     |  Type  |                           Values                            | Required | Default  |   Platform   |
|:-----------:|:------:|:-----------------------------------------------------------:|:--------:|:--------:|:------------:|
|     uri     | string |                                                             |   yes    |          | android, iOS |
| orientation | string | portrait, portraitUpsideDown, landscapeLeft, landscapeRight |    no    | portrait |     iOS      |




### You can also remove unnecessary translation model



```js
import { RemoveLanguageModel } from "@jamenamcinteer/react-native-vision-camera-ocr";

const bool = await RemoveLanguageModel("en")
```
<h2>Supported Languages</h2>

```
Afrikaans: 🇿🇦, 🇨🇫 <---> code : "af"
Albanian: 🇦🇱 <---> code : "sq"
Arabic: 🇦🇪, 🇸🇦 <---> code : "ar"
Belarusian: 🇧🇾 <---> code : "be"
Bulgarian: 🇧🇬 <---> code : "bn"
Bengali: 🇧🇩 <---> code : "bg"
Catalan: 🏴 <---> code : "ca"
Czech: 🇨🇿 <---> code : "cs"
Welsh: 🏴󠁧󠁢󠁷󠁬󠁳󠁿 <---> code : "cy"
Danish: 🇩🇰 <---> code : "da"
German: 🇩🇪 <---> code : "de"
Greek: 🇬🇷 <---> code : "el"
English: 🇬🇧, 🇺🇸 <---> code : "en"
Esperanto: 🌍 <---> code : "eo"
Spanish: 🇪🇸 <---> code : "es"
Estonian: 🇪🇪 <---> code : "et"
Persian: 🇮🇷 <---> code : "fa"
Finnish: 🇫🇮 <---> code : "fi"
French: 🇫🇷 <---> code : "fr"
Irish: 🇮🇪 <---> code : "ga"
Galician: 🏴 <---> code : "gl"
Gujarati: 🏴 <---> code : "gu"
Hebrew: 🇮🇱 <---> code : "he"
Hindi: 🇮🇳 <---> code : "hi"
Croatian: 🇭🇷 <---> code : "hr"
Haitian: 🇭🇹 <---> code : "ht"
Hungarian: 🇭🇺 <---> code : "hu"
Indonesian: 🇮🇩 <---> code : "id"
Icelandic: 🇮🇸 <---> code : "is"
Italian: 🇮🇹 <---> code : "it"
Japanese: 🇯🇵 <---> code : "ja"
Georgian: 🇬🇪 <---> code : "ka"
Kannada: 🇨🇦 <---> code : "kn"
Korean: 🇰🇷, 🇰🇵 <---> code : "ko"
Lithuanian: 🇱🇹 <---> code : "lt"
Latvian: 🇱🇻 <---> code : "lv"
Macedonian: 🇲🇰 <---> code : "mk"
Marathi: 🇮🇳 <---> code : "mr"
Malay: 🇲🇾 <---> code : "ms"
Maltese: 🇲🇹 <---> code : "mt"
Dutch: 🇳🇱 <---> code : "nl"
Norwegian: 🇳🇴 <---> code : "no"
Polish: 🇵🇱 <---> code : "pl"
Portuguese: 🇵🇹 <---> code : "pt"
Romanian: 🇷🇴 <---> code : "ro"
Russian: 🇷🇺 <---> code : "ru"
Slovak: 🇸🇰 <---> code : "sk"
Slovenian: 🇸🇮 <---> code : "sl"
Swedish: 🇸🇪 <---> code : "sv"
Swahili: 🇰🇪 <---> code : "sw"
Tamil: 🇱🇰 <---> code : "ta"
Telugu: 🇮🇳 <---> code : "te"
Thai: 🇹🇭 <---> code : "th"
Tagalog: 🇵🇭 <---> code : "tl"
Turkish: 🇹🇷 <---> code : "tr"
Ukrainian: 🇺🇦 <---> code : "uk"
Urdu: 🇵🇰 <---> code : "ur"
Vietnamese: 🇻🇳 <---> code : "vi"
Chinese: 🇨🇳 <---> code : "zh"

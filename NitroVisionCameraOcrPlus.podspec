require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroVisionCameraOcrPlus"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported, :visionos => 1.0 }
  s.source       = { :git => "https://github.com/jamenamcinteer/react-native-vision-camera-ocr-plus.git", :tag => "#{s.version}" }
  s.static_framework = true

  # Opt-out via env var or Podfile.properties.json ("visionCameraOcrPlus.disableTranslate": "true").
  podfile_props_path = File.join(Pod::Config.instance.installation_root.to_s, 'Podfile.properties.json')
  podfile_props = File.exist?(podfile_props_path) ? (JSON.parse(File.read(podfile_props_path)) rescue {}) : {}
  translate_disabled = ENV['VISION_CAMERA_OCR_PLUS_DISABLE_TRANSLATE'] == '1' ||
    podfile_props['visionCameraOcrPlus.disableTranslate'].to_s == 'true'
  non_latin_text_recognition_disabled = ENV['VISION_CAMERA_OCR_PLUS_DISABLE_NON_LATIN_TEXT_RECOGNITION'] == '1' ||
    podfile_props['visionCameraOcrPlus.disableNonLatinTextRecognition'].to_s == 'true'

  xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_VERSION'  => '5.0',
  }
  if translate_disabled
    xcconfig['OTHER_SWIFT_FLAGS'] = '$(inherited) -DOCR_PLUS_NO_TRANSLATE'
  end
  if non_latin_text_recognition_disabled
    xcconfig['OTHER_SWIFT_FLAGS'] = [xcconfig['OTHER_SWIFT_FLAGS'] || '$(inherited)', '-DOCR_PLUS_NO_NON_LATIN'].join(' ')
  end
  s.pod_target_xcconfig = xcconfig

  s.source_files = [
    # Implementation (Swift)
    "ios/**/*.{swift}",
    # Autolinking/Registration (Objective-C++)
    "ios/**/*.{m,mm}",
    # Implementation (C++ objects)
    "cpp/**/*.{hpp,cpp}",
  ]

  load 'nitrogen/generated/ios/NitroVisionCameraOcrPlus+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'

  if min_ios_version_supported.to_f >= 16.0
    s.dependency "GoogleMLKit/TextRecognition", '>= 8.0.0'
    unless non_latin_text_recognition_disabled
      s.dependency "GoogleMLKit/TextRecognitionChinese", '>= 5.0.0'
      s.dependency "GoogleMLKit/TextRecognitionDevanagari", '>= 5.0.0'
      s.dependency "GoogleMLKit/TextRecognitionJapanese", '>= 5.0.0'
      s.dependency "GoogleMLKit/TextRecognitionKorean", '>= 5.0.0'
    end
    s.dependency "GoogleMLKit/Translate", '>= 7.0.0' unless translate_disabled
  else
    s.dependency "GoogleMLKit/TextRecognition"
    unless non_latin_text_recognition_disabled
      s.dependency "GoogleMLKit/TextRecognitionChinese"
      s.dependency "GoogleMLKit/TextRecognitionDevanagari"
      s.dependency "GoogleMLKit/TextRecognitionJapanese"
      s.dependency "GoogleMLKit/TextRecognitionKorean"
    end
    s.dependency "GoogleMLKit/Translate" unless translate_disabled
  end

  install_modules_dependencies(s)
end

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

Pod::Spec.new do |s|
  s.name         = "RNVisionCameraOCR"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/jamenamcinteer/react-native-vision-camera-ocr.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.dependency "React-Core"
  s.dependency "VisionCamera"

  if min_ios_version_supported.to_f >= 16.0
    s.dependency "GoogleMLKit/TextRecognition", '>= 8.0.0'
    s.dependency "GoogleMLKit/TextRecognitionChinese", '>= 5.0.0'
    s.dependency "GoogleMLKit/TextRecognitionDevanagari", '>= 5.0.0'
    s.dependency "GoogleMLKit/TextRecognitionJapanese", '>= 5.0.0'
    s.dependency "GoogleMLKit/TextRecognitionKorean", '>= 5.0.0'
    s.dependency "GoogleMLKit/Translate", '>= 7.0.0'
  else
    s.dependency "GoogleMLKit/TextRecognition"
    s.dependency "GoogleMLKit/TextRecognitionChinese"
    s.dependency "GoogleMLKit/TextRecognitionDevanagari"
    s.dependency "GoogleMLKit/TextRecognitionJapanese"
    s.dependency "GoogleMLKit/TextRecognitionKorean"
    s.dependency "GoogleMLKit/Translate"
  end
end

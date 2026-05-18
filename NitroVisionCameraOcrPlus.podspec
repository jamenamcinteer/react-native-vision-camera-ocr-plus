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
  s.source       = { :git => "https://github.com/mrousavy/nitro.git", :tag => "#{s.version}" }

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_VERSION'  => '5.0',
  }

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
  # s.dependency 'GoogleMLKit/TextRecognitionChinese', '~> 7.0'
  # s.dependency 'GoogleMLKit/TextRecognitionDevanagari', '~> 7.0'
  # s.dependency 'GoogleMLKit/TextRecognitionJapanese', '~> 7.0'
  # s.dependency 'GoogleMLKit/TextRecognitionKorean', '~> 7.0'
  # s.dependency 'GoogleMLKit/Translate', '~> 7.0'

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

  install_modules_dependencies(s)
end

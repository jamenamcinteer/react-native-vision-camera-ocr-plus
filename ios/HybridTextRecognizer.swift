import Foundation
import UIKit
import CoreImage
import NitroModules
import MLKitVision
import MLKitTextRecognition
import MLKitTextRecognitionChinese
import MLKitTextRecognitionDevanagari
import MLKitTextRecognitionJapanese
import MLKitTextRecognitionKorean
import MLKitCommon

/// Nitro HybridObject implementation for on-device OCR text recognition.
/// Supports still-photo recognition and can be configured for frame-level use.
class HybridTextRecognizer: HybridTextRecognizerSpec {

  private static let latinOptions = TextRecognizerOptions()
  private static let chineseOptions = ChineseTextRecognizerOptions()
  private static let devanagariOptions = DevanagariTextRecognizerOptions()
  private static let japaneseOptions = JapaneseTextRecognizerOptions()
  private static let koreanOptions = KoreanTextRecognizerOptions()

  private var textRecognizer: TextRecognizer = TextRecognizer.textRecognizer(options: TextRecognizerOptions())
  private var scanRegion: ScanRegion? = nil
  private var frameSkipThreshold: Int = 3
  private var useLightweightMode: Bool = false
  private var frameCounter: Int = 0
  // Use GPU-backed rendering for fast CVPixelBuffer → CGImage conversion
  private let ciContext = CIContext(options: [.useSoftwareRenderer: false])

  // Background OCR: a dedicated serial queue so OCR never blocks the frame thread.
  // scanFrame returns the last completed result immediately and enqueues a new OCR
  // job only when the queue is idle (isBusy == false).
  private let ocrQueue = DispatchQueue(label: "com.rnvcocr.ocr", qos: .userInitiated)
  private let stateLock = NSLock()
  private var isBusy: Bool = false
  private var lastResult: RecognizedText? = nil

  // MARK: - HybridTextRecognizerSpec

  func configure(config: TextRecognitionConfig) throws {
    // A threshold of 0 or 1 means process every frame; higher values skip frames for performance
    frameSkipThreshold = max(1, Int(config.frameSkipThreshold))
    useLightweightMode = config.useLightweightMode
    scanRegion = config.scanRegion

    // Ensure UIDevice orientation updates are flowing so deviceOrientation() doesn't
    // return .unknown (which would default to portrait and misrotate landscape frames).
    DispatchQueue.main.async {
      UIDevice.current.beginGeneratingDeviceOrientationNotifications()
    }

    // When useLightweightMode is requested, prefer the plain Latin recogniser which
    // is faster even for non-Latin scripts; otherwise use the script-specific model.
    if useLightweightMode {
      textRecognizer = TextRecognizer.textRecognizer(options: HybridTextRecognizer.latinOptions)
      return
    }

    switch config.language {
    case "chinese":
      textRecognizer = TextRecognizer.textRecognizer(options: HybridTextRecognizer.chineseOptions)
    case "devanagari":
      textRecognizer = TextRecognizer.textRecognizer(options: HybridTextRecognizer.devanagariOptions)
    case "japanese":
      textRecognizer = TextRecognizer.textRecognizer(options: HybridTextRecognizer.japaneseOptions)
    case "korean":
      textRecognizer = TextRecognizer.textRecognizer(options: HybridTextRecognizer.koreanOptions)
    default:
      textRecognizer = TextRecognizer.textRecognizer(options: HybridTextRecognizer.latinOptions)
    }
  }

  func scanFrame(nativeBufferPointer: UInt64, orientation: String) throws -> RecognizedText? {
    // Apply frame-skip for performance
    frameCounter += 1
    if frameCounter % max(1, frameSkipThreshold) != 0 {
      return getLastResult()
    }

    // If the OCR queue is still processing the previous frame, skip this one.
    // This is the key fix: we never block the frame thread waiting for MLKit.
    guard startOCRIfIdle() else {
      return getLastResult()
    }

    // Reconstruct CVPixelBuffer from the pointer (retain count +1 from caller)
    guard let rawPtr = UnsafeRawPointer(bitPattern: UInt(nativeBufferPointer)) else {
      finishOCR()
      return getLastResult()
    }
    let pixelBuffer: CVPixelBuffer = Unmanaged<CVPixelBuffer>.fromOpaque(rawPtr).takeUnretainedValue()

    // --- Fast path: convert pixel buffer → correctly-oriented UIImage on the frame thread.
    // Lock the pixel buffer for read-only access so the camera session doesn't
    // mutate it underneath us while we're creating the CGImage.
    CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
    let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
    // Force BGRA8 + DeviceRGB so MLKit always receives a well-understood pixel format.
    guard let cgImage = ciContext.createCGImage(
      ciImage,
      from: ciImage.extent,
      format: .BGRA8,
      colorSpace: CGColorSpaceCreateDeviceRGB()
    ) else {
      CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly)
      finishOCR()
      return getLastResult()
    }
    CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly)

    // Read device orientation directly — do NOT trust the JS-passed string.
    // VisionCamera worklets frequently deliver orientation as undefined, which
    // collapses to 'up' in JS and causes the sensor image to be fed to MLKit
    // sideways (the raw CVPixelBuffer is always in the sensor's native
    // landscape layout regardless of how the phone is held).
    let uiOrient = deviceOrientation()
    let rawImage = UIImage(cgImage: cgImage, scale: 1.0, orientation: uiOrient)
    let normalizedImage = normalizeOrientation(rawImage)

    // Build the (optionally cropped) UIImage before leaving the frame thread.
    // Crop coordinates are now in the same portrait/landscape space the user specified.
    let capturedImage: UIImage
    if let region = scanRegion, let normalizedCG = normalizedImage.cgImage {
      let imgWidth = Double(normalizedCG.width)
      let imgHeight = Double(normalizedCG.height)
      let cropRect = CGRect(
        x: region.left / 100.0 * imgWidth,
        y: region.top / 100.0 * imgHeight,
        width: region.width / 100.0 * imgWidth,
        height: region.height / 100.0 * imgHeight
      )
      if let croppedCG = normalizedCG.cropping(to: cropRect) {
        capturedImage = UIImage(cgImage: croppedCG)
      } else {
        capturedImage = normalizedImage
      }
    } else {
      capturedImage = normalizedImage
    }

    // --- Slow path: run MLKit OCR off the frame thread.
    let recognizer = textRecognizer
    ocrQueue.async { [weak self] in
      guard let self = self else { return }
      // capturedImage is already normalised to .up — no orientation hint needed.
      let visionImage = VisionImage(image: capturedImage)
      visionImage.orientation = uiOrientation(from: orientation)
      if let result = try? recognizer.results(in: visionImage) {
        let recognized = self.buildRecognizedText(from: result)
        self.setLastResult(recognized)
      }
      self.finishOCR()
    }

    // Return the last completed result immediately — the frame thread is never blocked.
    return getLastResult()
  }

  func recognizePhoto(uri: String, orientation: String) throws -> Promise<RecognizedText> {
    return Promise.async {
      guard let image = UIImage(contentsOfFile: uri) else {
        throw NSError(domain: "HybridTextRecognizer", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Can't find photo at URI: \(uri)"])
      }

      // Normalise the loaded image so pixel data matches its display orientation.
      // UIImage(contentsOfFile:) honours EXIF rotation metadata, so imageOrientation
      // is the authoritative source; rotating the pixel data to .up means crop
      // coordinates and VisionImage always operate in the displayed coordinate space.
      let normalizedImage = self.normalizeOrientation(image)

      let visionImage: VisionImage
      if let region = self.scanRegion, let cgImage = normalizedImage.cgImage {
        let imgWidth = Double(cgImage.width)
        let imgHeight = Double(cgImage.height)
        let cropRect = CGRect(
          x: region.left / 100.0 * imgWidth,
          y: region.top / 100.0 * imgHeight,
          width: region.width / 100.0 * imgWidth,
          height: region.height / 100.0 * imgHeight
        )
        if let croppedCGImage = cgImage.cropping(to: cropRect) {
          visionImage = VisionImage(image: UIImage(cgImage: croppedCGImage))
        } else {
          visionImage = VisionImage(image: normalizedImage)
        }
      } else {
        visionImage = VisionImage(image: normalizedImage)
      }
      visionImage.orientation = .up

      let result = try self.textRecognizer.results(in: visionImage)
      return self.buildRecognizedText(from: result)
    }
  }

  // MARK: - Private helpers

  private func buildRecognizedText(from result: MLKitTextRecognition.Text) -> RecognizedText {
    let blocks: [TextBlock] = result.blocks.map { (block: MLKitTextRecognition.TextBlock) -> TextBlock in
      let lines: [TextLine] = block.lines.map { (line: MLKitTextRecognition.TextLine) -> TextLine in
        let elements: [TextElement] = line.elements.map { (element: MLKitTextRecognition.TextElement) -> TextElement in
          TextElement(
            elementText: element.text,
            elementFrame: boundingFrame(from: element.frame),
            elementCornerPoints: cornerPoints(from: element.cornerPoints)
          )
        }
        let languages = line.recognizedLanguages.compactMap { lang -> String? in
          guard let code = lang.languageCode, !code.isEmpty else { return "und" }
          return code
        }
        return TextLine(
          lineText: line.text,
          lineFrame: boundingFrame(from: line.frame),
          lineCornerPoints: cornerPoints(from: line.cornerPoints),
          lineLanguages: languages,
          elements: elements
        )
      }
      return TextBlock(
        blockText: block.text,
        blockFrame: boundingFrame(from: block.frame),
        blockCornerPoints: cornerPoints(from: block.cornerPoints),
        lines: lines
      )
    }
    return RecognizedText(resultText: result.text, blocks: blocks)
  }

  private func boundingFrame(from rect: CGRect) -> BoundingFrame {
    let offsetX = (rect.midX - ceil(rect.width)) / 2.0
    let offsetY = (rect.midY - ceil(rect.height)) / 2.0
    let x = rect.maxX + offsetX
    let y = rect.minY + offsetY
    return BoundingFrame(
      boundingCenterX: Double(rect.midX),
      boundingCenterY: Double(rect.midY),
      height: Double(rect.height),
      width: Double(rect.width),
      x: Double(rect.midX + (rect.midX - x)),
      y: Double(rect.midY + (y - rect.midY))
    )
  }

  private func cornerPoints(from nsValues: [NSValue]) -> [CornerPoint] {
    return nsValues.compactMap { $0.cgPointValue }.map {
      CornerPoint(x: Double($0.x), y: Double($0.y))
    }
  }

  private func getLastResult() -> RecognizedText? {
    stateLock.lock()
    defer { stateLock.unlock() }
    return lastResult
  }

  private func setLastResult(_ result: RecognizedText) {
    stateLock.lock()
    defer { stateLock.unlock() }
    lastResult = result
  }

  private func startOCRIfIdle() -> Bool {
    stateLock.lock()
    defer { stateLock.unlock() }
    guard !isBusy else {
      return false
    }
    isBusy = true
    return true
  }

  private func finishOCR() {
    stateLock.lock()
    defer { stateLock.unlock() }
    isBusy = false
  }

  private func uiOrientation(from string: String) -> UIImage.Orientation {
    switch string {
    case "portrait":           return .right
    case "landscapeLeft":      return .up
    case "portraitUpsideDown": return .left
    case "landscapeRight":     return .down
    default:                   return .up
    }
  }

  /// Reads the physical device orientation directly, bypassing the JS-layer
  /// orientation string which is frequently undefined in VisionCamera worklets
  /// (causing a fallback to 'up' that leaves the image in sensor-landscape layout).
  ///
  /// VisionCamera v5 always delivers CVPixelBuffers in the camera sensor's native
  /// landscape layout (width > height). The device orientation tells us how much
  /// to rotate that raw buffer so pixels align with the display.
  private func deviceOrientation() -> UIImage.Orientation {
    // UIDevice.current.orientation is safe to read from the camera queue in practice.
    switch UIDevice.current.orientation {
    case .portrait:           return .right   // rotate 90° CW
    case .landscapeLeft:      return .up      // sensor already matches (home on right = landscape-right video)
    case .landscapeRight:     return .down    // rotate 180°
    case .portraitUpsideDown: return .left    // rotate 90° CCW
    default:                  return .right   // assume portrait for flat/unknown
    }
  }

  /// Redraws `image` into a new UIImage with orientation=.up (pixel data physically
  /// rotated), using scale=1.0 so CGImage dimensions are exactly the display
  /// pixel dimensions with no retina scale inflation.
  private func normalizeOrientation(_ image: UIImage) -> UIImage {
    guard image.imageOrientation != .up else { return image }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1.0  // CRITICAL: prevents 2x/3x screen scale enlarging the image
    format.opaque = true
    let size = image.size  // UIImage.size respects orientation, giving correct display dims
    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    return renderer.image { _ in
      image.draw(in: CGRect(origin: .zero, size: size))
    }
  }
}

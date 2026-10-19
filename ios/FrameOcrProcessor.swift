import Foundation

/// Owns live-frame work and its result independently of the camera buffer.
final class FrameOcrProcessor<Value> {
  private let queue: DispatchQueue
  private let lock = NSLock()
  private var busy = false
  private var closed = false
  private var failed = false
  private var lastResult: Value?

  init(queue: DispatchQueue = DispatchQueue(label: "com.rnvcocr.ocr", qos: .userInitiated)) {
    self.queue = queue
  }

  func result() throws -> Value? {
    lock.lock()
    defer { lock.unlock() }
    guard !closed else { return nil }
    try reportFailure()
    return lastResult
  }

  func reserve() throws -> Bool {
    lock.lock()
    defer { lock.unlock() }
    guard !closed else { return false }
    try reportFailure()
    guard !busy else { return false }
    busy = true
    return true
  }

  /// Releases a reservation when frame preparation produces no image.
  func cancel() {
    lock.lock()
    busy = false
    lock.unlock()
  }

  func submit(operation: @escaping () throws -> Value, cleanup: @escaping () -> Void) {
    // Keep ownership until cleanup finishes, even if the recognizer is disposed.
    queue.async {
      self.lock.lock()
      let shouldRun = !self.closed
      self.lock.unlock()
      let outcome = shouldRun ? Result(catching: operation) : nil
      cleanup()
      self.lock.lock()
      defer { self.lock.unlock() }
      if !self.closed, let outcome = outcome {
        switch outcome {
        case .success(let value): self.lastResult = value
        case .failure:
          self.lastResult = nil
          self.failed = true
        }
      }
      self.busy = false
    }
  }

  func close() {
    lock.lock()
    closed = true
    lastResult = nil
    failed = false
    lock.unlock()
  }

  // Called only with the lock held. Acknowledging an error permits the next retry.
  private func reportFailure() throws {
    if failed {
      failed = false
      throw NSError(domain: "VisionCameraOCR", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "OCR frame recognition failed"])
    }
  }
}

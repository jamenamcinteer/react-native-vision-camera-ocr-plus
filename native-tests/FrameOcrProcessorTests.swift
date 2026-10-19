import Foundation

private enum PrivateFailure: Error { case imageAndTextDetails }
private func require(_ condition: @autoclosure () throws -> Bool, _ message: String = "regression assertion failed") throws {
  let satisfied = try condition()
  precondition(satisfied, message)
}
private func wait(_ semaphore: DispatchSemaphore) {
  precondition(semaphore.wait(timeout: .now() + 5) == .success, "worker timed out")
}
private func expectFailure(_ operation: () throws -> Void) {
  var caught = false
  do { try operation() } catch {
    caught = true
    let error = error as NSError
    precondition(error.localizedDescription == "OCR frame recognition failed")
    precondition(error.userInfo[NSUnderlyingErrorKey] == nil, "native cause escaped")
  }
  precondition(caught, "worker failure was silently swallowed")
}

@main struct FrameOcrProcessorTests {
  static func main() throws {
    let queue = DispatchQueue(label: "ocr.regression")
    let worker = FrameOcrProcessor<String>(queue: queue)
    var cleaned = 0
    func submit(_ operation: @escaping () throws -> String) throws {
      try require(try worker.reserve())
      worker.submit(operation: operation, cleanup: { cleaned += 1 })
      queue.sync {}
    }
    try submit { "previous result" }
    try require(try worker.result() == "previous result")
    try submit { throw PrivateFailure.imageAndTextDetails }
    expectFailure { _ = try worker.result() }
    try require(try worker.result() == nil, "failed frame retained stale text")
    try submit { "recovered" }
    try require(try worker.result() == "recovered", "same recognizer cannot retry")
    try submit { "" }
    try require(try worker.result() == "", "blank text became an error")
    precondition(cleaned == 4)

    // Failure before any success, including acknowledgement during reservation.
    let fresh = FrameOcrProcessor<String>(queue: queue)
    try require(try fresh.reserve())
    fresh.submit(operation: { throw PrivateFailure.imageAndTextDetails }, cleanup: {})
    queue.sync {}
    expectFailure { _ = try fresh.reserve() }
    try require(try fresh.reserve())
    fresh.cancel()

    // Completion must wait for cleanup, and calls while busy must not block.
    let started = DispatchSemaphore(value: 0)
    let finish = DispatchSemaphore(value: 0)
    let cleaning = DispatchSemaphore(value: 0)
    let finishCleanup = DispatchSemaphore(value: 0)
    try require(try worker.reserve())
    worker.submit(operation: {
      started.signal(); wait(finish)
      throw PrivateFailure.imageAndTextDetails
    }, cleanup: {
      cleaning.signal(); wait(finishCleanup)
      cleaned += 1
    })
    wait(started)
    try require(try !worker.reserve())
    try require(try worker.result() == "")
    finish.signal(); wait(cleaning)
    try require(try !worker.reserve(), "admitted work before cleanup")
    finishCleanup.signal(); queue.sync {}
    expectFailure { _ = try worker.result() }

    // A failure after close must neither resurrect an error nor lose cleanup.
    let closing = FrameOcrProcessor<String>(queue: queue)
    let running = DispatchSemaphore(value: 0)
    let release = DispatchSemaphore(value: 0)
    try require(try closing.reserve())
    closing.submit(operation: {
      running.signal(); wait(release)
      throw PrivateFailure.imageAndTextDetails
    }, cleanup: { cleaned += 1 })
    wait(running); closing.close(); release.signal(); queue.sync {}
    try require(try closing.result() == nil)
    try require(try !closing.reserve())
    precondition(cleaned == 6)

    // Closing during preparation skips recognition and still releases resources.
    let prepared = FrameOcrProcessor<String>(queue: queue)
    try require(try prepared.reserve())
    prepared.close()
    prepared.submit(operation: { preconditionFailure("closed work executed") },
                    cleanup: { cleaned += 1 })
    queue.sync {}
    precondition(cleaned == 7)
    try require(try prepared.result() == nil)
    // Accepted queued work still owns cleanup after close and owner release.
    let blocked = DispatchSemaphore(value: 0)
    let unblock = DispatchSemaphore(value: 0)
    queue.async { blocked.signal(); wait(unblock) }
    wait(blocked)
    var queued: FrameOcrProcessor<String>? = FrameOcrProcessor(queue: queue)
    try require(try queued!.reserve())
    queued!.submit(operation: { preconditionFailure("disposed queued work executed") },
                   cleanup: { cleaned += 1 })
    queued!.close()
    queued = nil
    unblock.signal(); queue.sync {}
    precondition(cleaned == 8, "queued cleanup lost with owner")

    let successAfterClose = FrameOcrProcessor<String>(queue: queue)
    let successStarted = DispatchSemaphore(value: 0)
    let finishSuccess = DispatchSemaphore(value: 0)
    try require(try successAfterClose.reserve())
    successAfterClose.submit(operation: {
      successStarted.signal(); wait(finishSuccess); return "late text"
    }, cleanup: { cleaned += 1 })
    wait(successStarted); successAfterClose.close(); finishSuccess.signal(); queue.sync {}
    try require(try successAfterClose.result() == nil, "disposed worker published text")
    precondition(cleaned == 9)

    print("Swift: failure delivery, stale cache, retry, blank text, cleanup and disposal passed")
  }
}

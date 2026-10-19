package com.margelo.nitro.visioncameraocrplus

import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

private fun wait(latch: CountDownLatch) = check(latch.await(5, TimeUnit.SECONDS)) { "worker timed out" }
private fun expectFailure(operation: () -> Unit) {
  var caught = false
  try { operation() } catch (error: IllegalStateException) {
    caught = true
    check(error.message == "OCR frame recognition failed")
    check(error.cause == null) { "native cause escaped" }
  }
  check(caught) { "worker failure was silently swallowed" }
}

private fun regressions() {
  val executor = Executors.newSingleThreadExecutor()
  val worker = FrameOcrProcessor<String>(executor)
  val cleaned = AtomicInteger()
  fun drain() { executor.submit {}.get(5, TimeUnit.SECONDS) }
  fun submit(operation: () -> String) {
    check(worker.reserve())
    worker.submit(operation) { cleaned.incrementAndGet() }
    drain()
  }
  try {
    submit { "previous result" }
    check(worker.result() == "previous result")
    submit { throw IllegalArgumentException("private image and text details") }
    expectFailure { worker.result() }
    check(worker.result() == null) { "failed frame retained stale text" }
    submit { "recovered" }
    check(worker.result() == "recovered") { "same recognizer cannot retry" }
    submit { "" }
    check(worker.result() == "") { "blank text became an error" }
    check(cleaned.get() == 4)

    val started = CountDownLatch(1)
    val finish = CountDownLatch(1)
    val cleaning = CountDownLatch(1)
    val finishCleanup = CountDownLatch(1)
    check(worker.reserve())
    worker.submit({
      started.countDown(); wait(finish)
      throw IllegalArgumentException("private details")
    }, {
      cleaning.countDown(); wait(finishCleanup); cleaned.incrementAndGet()
    })
    wait(started)
    check(!worker.reserve() && worker.result() == "")
    finish.countDown(); wait(cleaning)
    check(!worker.reserve()) { "admitted work before cleanup" }
    finishCleanup.countDown(); drain()
    expectFailure { worker.result() }

    val running = CountDownLatch(1)
    val release = CountDownLatch(1)
    check(worker.reserve())
    worker.submit({
      running.countDown(); wait(release)
      throw IllegalArgumentException("late failure")
    }, { cleaned.incrementAndGet() })
    wait(running); worker.close(); release.countDown()
    check(executor.awaitTermination(5, TimeUnit.SECONDS))
    check(worker.result() == null && !worker.reserve())
    check(cleaned.get() == 6)
  } finally { worker.close() }

  val freshExecutor = Executors.newSingleThreadExecutor()
  val fresh = FrameOcrProcessor<String>(freshExecutor)
  try {
    check(fresh.reserve())
    fresh.submit({ throw IllegalArgumentException("first frame") }, {})
    freshExecutor.submit {}.get(5, TimeUnit.SECONDS)
    expectFailure { fresh.reserve() }
    check(fresh.reserve()); fresh.cancel()
    check(fresh.reserve()); fresh.close()
    fresh.submit({ error("closed work executed") }, { cleaned.incrementAndGet() })
    check(cleaned.get() == 7 && fresh.result() == null)
  } finally { fresh.close() }

  val rejectedExecutor = Executors.newSingleThreadExecutor()
  val rejected = FrameOcrProcessor<String>(rejectedExecutor)
  check(rejected.reserve()); rejectedExecutor.shutdown()
  rejected.submit({ error("rejected work executed") }, { cleaned.incrementAndGet() })
  expectFailure { rejected.result() }
  check(cleaned.get() == 8)
  rejected.close()
  val queuedExecutor = Executors.newSingleThreadExecutor()
  val blocked = CountDownLatch(1)
  val unblock = CountDownLatch(1)
  queuedExecutor.execute { blocked.countDown(); wait(unblock) }
  wait(blocked)
  val queued = FrameOcrProcessor<String>(queuedExecutor)
  check(queued.reserve())
  queued.submit({ error("disposed queued work executed") }, { cleaned.incrementAndGet() })
  queued.close(); unblock.countDown()
  check(queuedExecutor.awaitTermination(5, TimeUnit.SECONDS))
  check(cleaned.get() == 9 && queued.result() == null)

  val successExecutor = Executors.newSingleThreadExecutor()
  val successAfterClose = FrameOcrProcessor<String>(successExecutor)
  val successStarted = CountDownLatch(1)
  val finishSuccess = CountDownLatch(1)
  check(successAfterClose.reserve())
  successAfterClose.submit({
    successStarted.countDown(); wait(finishSuccess); "late text"
  }, { cleaned.incrementAndGet() })
  wait(successStarted); successAfterClose.close(); finishSuccess.countDown()
  check(successExecutor.awaitTermination(5, TimeUnit.SECONDS))
  check(successAfterClose.result() == null) { "disposed worker published text" }
  check(cleaned.get() == 10)
  println("Kotlin: failure delivery, stale cache, retry, blank text, cleanup, disposal and rejection passed")
}

fun main() {
  try { regressions() } catch (failure: Throwable) {
    failure.printStackTrace()
    kotlin.system.exitProcess(1)
  }
}

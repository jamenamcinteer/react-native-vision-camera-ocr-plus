package com.margelo.nitro.visioncameraocrplus

import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

/** Owns live-frame work and its result independently of the camera buffer. */
internal class FrameOcrProcessor<T>(
  private val executor: ExecutorService = Executors.newSingleThreadExecutor()
) {
  private val lock = Any()
  private var busy = false
  private var closed = false
  private var failed = false
  private var lastResult: T? = null

  fun result(): T? = synchronized(lock) {
    if (closed) return@synchronized null
    reportFailure()
    lastResult
  }

  fun reserve(): Boolean = synchronized(lock) {
    if (closed) return@synchronized false
    reportFailure()
    if (busy) return@synchronized false
    busy = true
    true
  }

  fun cancel() = synchronized(lock) { busy = false }

  fun submit(operation: () -> T, cleanup: () -> Unit) {
    try {
      executor.execute {
        var value: T? = null
        var didFail = false
        try {
          if (synchronized(lock) { !closed }) value = operation()
        } catch (_: Exception) {
          didFail = true
        } finally {
          try {
            cleanup()
          } finally {
            synchronized(lock) {
              if (!closed) {
                if (didFail) {
                  lastResult = null
                  failed = true
                } else {
                  lastResult = value
                }
              }
              busy = false
            }
          }
        }
      }
    } catch (_: RejectedExecutionException) {
      try {
        cleanup()
      } finally {
        synchronized(lock) {
          if (!closed) {
            lastResult = null
            failed = true
          }
          busy = false
        }
      }
    }
  }

  fun close() {
    synchronized(lock) {
      closed = true
      lastResult = null
      failed = false
    }
    // Accepted jobs retain cleanup ownership, including jobs not yet started.
    executor.shutdown()
  }

  // Called only with the lock held. Acknowledging an error permits the next retry.
  private fun reportFailure() {
    if (failed) {
      failed = false
      throw IllegalStateException("OCR frame recognition failed")
    }
  }
}

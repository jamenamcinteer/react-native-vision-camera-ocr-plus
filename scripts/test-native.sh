#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p build/native-tests
swiftc -swift-version 5 -parse-as-library ios/FrameOcrProcessor.swift \
  native-tests/FrameOcrProcessorTests.swift -o build/native-tests/swift-tests
build/native-tests/swift-tests
"${KOTLINC:-kotlinc}" android/src/main/java/com/margelo/nitro/visioncameraocrplus/FrameOcrProcessor.kt \
  native-tests/FrameOcrProcessorTests.kt -d build/native-tests/kotlin-tests.jar
"${KOTLIN:-kotlin}" -classpath build/native-tests/kotlin-tests.jar \
  com.margelo.nitro.visioncameraocrplus.FrameOcrProcessorTestsKt

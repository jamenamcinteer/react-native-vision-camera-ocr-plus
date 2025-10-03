package com.rnvisioncameraocr

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.bridge.NativeModule
import com.mrousavy.camera.frameprocessors.FrameProcessorPluginRegistry

class RNVisionCameraOCRPackage : ReactPackage {
    companion object {
        init {
            FrameProcessorPluginRegistry.addFrameProcessorPlugin("scanText") { proxy, options ->
                RNVisionCameraOCRPlugin(proxy, options)
            }
            FrameProcessorPluginRegistry.addFrameProcessorPlugin("translate") { proxy, options ->
                VisionCameraTranslatorPlugin(proxy, options)
            }
        }
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
            return listOf(
                 RemoveLanguageModel(reactContext),
                 PhotoRecognizerModule(reactContext)
             )
    }
}


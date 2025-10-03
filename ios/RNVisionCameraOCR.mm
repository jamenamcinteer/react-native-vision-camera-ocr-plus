#import <Foundation/Foundation.h>
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>


#if __has_include("RNVisionCameraOCR/RNVisionCameraOCR-Swift.h")
#import "RNVisionCameraOCR/RNVisionCameraOCR-Swift.h"
#else
#import "RNVisionCameraOCR-Swift.h"
#endif

@interface RNVisionCameraOCR (FrameProcessorPluginLoader)
@end

@implementation RNVisionCameraOCR (FrameProcessorPluginLoader)
+ (void) load {
  [FrameProcessorPluginRegistry addFrameProcessorPlugin:@"scanText"
    withInitializer:^FrameProcessorPlugin*(VisionCameraProxyHolder* proxy, NSDictionary* options) {
    return [[RNVisionCameraOCR alloc] initWithProxy:proxy withOptions:options];
  }];
}
@end



@interface VisionCameraTranslator (FrameProcessorPluginLoader)
@end

@implementation VisionCameraTranslator (FrameProcessorPluginLoader)
+ (void) load {
  [FrameProcessorPluginRegistry addFrameProcessorPlugin:@"translate"
    withInitializer:^FrameProcessorPlugin*(VisionCameraProxyHolder* proxy, NSDictionary* options) {
    return [[VisionCameraTranslator alloc] initWithProxy:proxy withOptions:options];
  }];
}
@end





#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(RemoveLanguageModel, NSObject)

RCT_EXTERN_METHOD(remove:(NSString *)code
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end

@interface RCT_EXTERN_MODULE(PhotoRecognizerModule, NSObject)

RCT_EXTERN_METHOD(process:(NSString *)uri
                  orientation:(NSString *)orientation
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)


+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end

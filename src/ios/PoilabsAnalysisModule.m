#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PoilabsAnalysisModule, NSObject)

RCT_EXTERN_METHOD(startPoilabsAnalysis:(NSString *)applicationId
                  applicationSecret:(NSString *)applicationSecret
                  uniqueId:(NSString *)uniqueId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopPoilabsAnalysis:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateUniqueId:(NSString *)uniqueId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
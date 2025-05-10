#import <Foundation/Foundation.h>
#import "PoilabsAnalysisModule.h"

@implementation PoilabsAnalysisModule

RCT_EXPORT_MODULE(PoilabsAnalysisModule);

RCT_EXPORT_METHOD(startPoilabsAnalysis:(NSString *)applicationId
                  applicationSecret:(NSString *)secret
                  uniqueIdentifier:(NSString *)uniqueId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  [[PLAnalysisSettings sharedInstance] setApplicationId:applicationId];
  [[PLAnalysisSettings sharedInstance] setApplicationSecret:secret];
  [[PLAnalysisSettings sharedInstance] setAnalysisUniqueIdentifier:uniqueId];

  __block BOOL promiseSettled = NO; 

  [[PLConfigManager sharedInstance] getReadyForTrackingWithCompletionHandler:^(PLError *error) {
    if (promiseSettled) {
      return; 
    }
    promiseSettled = YES;

    if (error) {
      NSLog(@"Poilabs init error: %@", error.errorDescription);
      reject(@"PoilabsInitError", error.errorDescription, error);
    } else {
      [[PLSuspendedAnalysisManager sharedInstance] stopBeaconMonitoring];
      [[PLStandardAnalysisManager sharedInstance] startBeaconMonitoring];
      [[PLStandardAnalysisManager sharedInstance] setDelegate:self];
      resolve(@YES);
    }
  }];
}

RCT_EXPORT_METHOD(stopPoilabsAnalysis:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [[PLAnalysisSettings sharedInstance] closeAllActions];
  resolve(@YES);
}

RCT_EXPORT_METHOD(updateUniqueId:(NSString *)uniqueId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  [[PLAnalysisSettings sharedInstance] setAnalysisUniqueIdentifier:uniqueId];
  resolve(@YES);
}

#pragma mark – PLAnalysisManagerDelegate

- (void)analysisManagerDidFailWithPoiError:(PLError *)error
{
  NSLog(@"Poilabs error: %@", error);
}

- (void)analysisManagerResponseForBeaconMonitoring:(NSDictionary *)response
{
  NSLog(@"Poilabs response: %@", response);
}

@end

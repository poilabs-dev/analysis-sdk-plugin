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
  [[PLConfigManager sharedInstance] getReadyForTrackingWithCompletionHandler:^(PLError *error) {
      if (error) {
          NSLog(@"Error Desc %@",error.errorDescription);
          resolve(@NO);
      }
      else {
          [[PLSuspendedAnalysisManager sharedInstance] stopBeaconMonitoring];
          [[PLStandardAnalysisManager sharedInstance] startBeaconMonitoring];
          [[PLStandardAnalysisManager sharedInstance] setDelegate:self];
          resolve(@YES);
      }
  }];
}

RCT_EXPORT_METHOD(stopPoilabsAnalysis:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  [[PLAnalysisSettings sharedInstance] closeAllActions];
  resolve(@YES);
}

RCT_EXPORT_METHOD(updateUniqueId:(NSString *)uniqueId
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  [[PLAnalysisSettings sharedInstance] setAnalysisUniqueIdentifier:uniqueId];
  resolve(@YES);
}

-(void)analysisManagerDidFailWithPoiError:(PLError *)error
{
    NSLog(@"Error Desc %@",error);
}

-(void)analysisManagerResponseForBeaconMonitoring:(NSDictionary *)response
{
    NSLog(@"Response %@",response);
}

@end
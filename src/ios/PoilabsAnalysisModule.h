#ifndef PoilabsAnalysisModule_h
#define PoilabsAnalysisModule_h

#import "PoilabsAnalysis/PoilabsAnalysis.h"
#import <React/RCTBridgeModule.h>

@interface PoilabsAnalysisModule : NSObject <RCTBridgeModule, PLAnalysisManagerDelegate>
@end

#endif

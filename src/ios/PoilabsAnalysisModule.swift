import PoilabsAnalysis
import React

@objc(PoilabsAnalysisModule)
class PoilabsAnalysisModule: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc
  func startPoilabsAnalysis(_ applicationId: String, applicationSecret: String, uniqueId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    var promiseResolved = false
    
    DispatchQueue.main.async {
      PLAnalysisSettings.sharedInstance().applicationId = applicationId
      PLAnalysisSettings.sharedInstance().applicationSecret = applicationSecret
      PLAnalysisSettings.sharedInstance().analysisUniqueIdentifier = uniqueId
      
      PLConfigManager.sharedInstance().getReadyForTracking { error in
        if !promiseResolved {
          promiseResolved = true
          
          if let error = error {
            print("Poilabs Error: \(error)")
            resolver(false)
          } else {
            print("Poilabs initialized successfully")
            PLSuspendedAnalysisManager.sharedInstance()?.stopBeaconMonitoring()
            PLStandardAnalysisManager.sharedInstance()?.startBeaconMonitoring()
            PLStandardAnalysisManager.sharedInstance().delegate = PoilabsAnalysisDelegate.shared
            resolver(true)
          }
        }
      }
    }
  }
    
  @objc
  func stopPoilabsAnalysis(_ resolve: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      PLAnalysisSettings.sharedInstance().closeAllActions()
      resolve(true)
    }
  }
  
  @objc
  func updateUniqueId(_ uniqueId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      PLAnalysisSettings.sharedInstance().analysisUniqueIdentifier = uniqueId
      resolver(true)
    }
  }
}
import Foundation
import PoilabsAnalysis

@objc(PoilabsAnalysisDelegate)
class PoilabsAnalysisDelegate: NSObject, PLAnalysisManagerDelegate {
    static let shared = PoilabsAnalysisDelegate()
    
    override init() {
        super.init()
    }
    
    @objc func analysisManagerResponse(forBeaconMonitoring response: [AnyHashable : Any]!) {
        print("Beacon monitoring response: \(String(describing: response))")
    }
}
const { withInfoPlist, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withPoilabsInfoPlist(config) {
  return withInfoPlist(config, (mod) => {
    const plist = mod.modResults;

    plist.NSLocationWhenInUseUsageDescription =
      "We use your location to detect nearby beacons.";
    plist.NSLocationAlwaysUsageDescription =
      "We use your location even in the background for beacon scanning.";
    plist.NSLocationAlwaysAndWhenInUseUsageDescription =
      "We use your location to detect nearby beacons even in the background.";

    plist.NSBluetoothAlwaysUsageDescription =
      "Bluetooth is required to scan beacons nearby.";
    plist.NSBluetoothPeripheralUsageDescription =
      "Bluetooth is required to scan beacons nearby.";

    return mod;
  });
}

function withPoilabsBackgroundModes(config) {
  return withInfoPlist(config, (mod) => {
    const plist = mod.modResults;
    const UIBackgroundModes = plist.UIBackgroundModes || [];

    if (!UIBackgroundModes.includes("bluetooth-central")) {
      UIBackgroundModes.push("bluetooth-central");
    }

    if (!UIBackgroundModes.includes("location")) {
      UIBackgroundModes.push("location");
    }

    plist.UIBackgroundModes = UIBackgroundModes;
    return mod;
  });
}

function withPoilabsPodfile(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const podfile = path.join(
        modConfig.modRequest.projectRoot,
        "ios/Podfile"
      );
      if (fs.existsSync(podfile)) {
        let podText = fs.readFileSync(podfile, "utf8");

        if (!podText.includes("use_frameworks! :linkage => :static")) {
          podText = podText.replace(
            /platform :ios[^\n]*\n/,
            (match) => `${match}use_frameworks! :linkage => :static\n\n`
          );
        }

        if (!podText.includes("pod 'PoilabsAnalysis'")) {
          podText = podText.replace(
            /target ['"][^'"]+['"] do/,
            (m) => `${m}\n  pod 'PoilabsAnalysis'`
          );
        }

        fs.writeFileSync(podfile, podText);
      }
      return modConfig;
    },
  ]);
}

function withPoilabsNativeModules(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const root = modConfig.modRequest.projectRoot;
      const projectName = modConfig.modRequest.projectName;

      const appDelegateSwiftFile = path.join(
        root,
        "ios",
        projectName,
        "AppDelegate.swift"
      );

      const appDelegateMMFile = path.join(
        root,
        "ios",
        projectName,
        "AppDelegate.mm"
      );

      const appDelegateMFile = path.join(
        root,
        "ios",
        projectName,
        "AppDelegate.m"
      );

      const isSwiftProject = fs.existsSync(appDelegateSwiftFile);
      const appDelegateFile = isSwiftProject
        ? appDelegateSwiftFile
        : fs.existsSync(appDelegateMMFile)
        ? appDelegateMMFile
        : fs.existsSync(appDelegateMFile)
        ? appDelegateMFile
        : null;

      const moduleDir = path.join(root, "ios", projectName, "PoilabsModule");
      if (!fs.existsSync(moduleDir)) {
        fs.mkdirSync(moduleDir, { recursive: true });
      }

      if (isSwiftProject) {
        if (appDelegateFile && fs.existsSync(appDelegateFile)) {
          let appDelegate = fs.readFileSync(appDelegateFile, "utf8");

          if (!appDelegate.includes("import PoilabsAnalysis")) {
            const importMatch = appDelegate.match(/^import.*$/gm);
            if (importMatch && importMatch.length > 0) {
              const lastImport = importMatch[importMatch.length - 1];
              appDelegate = appDelegate.replace(
                lastImport,
                `${lastImport}\nimport PoilabsAnalysis`
              );
            }
          }

          if (!appDelegate.includes("PLSuspendedAnalysisManager")) {
            const returnRegex =
              /return\s+super\.application\s*\(\s*application\s*,\s*didFinishLaunchingWithOptions\s*:\s*launchOptions\s*\)/;

            if (returnRegex.test(appDelegate)) {
              const poilabsCode = `
  if let options = launchOptions, options[UIApplication.LaunchOptionsKey.location] != nil {
    if application.applicationState == .background {
      PLSuspendedAnalysisManager.sharedInstance()?.startBeaconMonitoring()
    }
  }
    `;
              appDelegate = appDelegate.replace(
                returnRegex,
                `${poilabsCode}return super.application(application, didFinishLaunchingWithOptions: launchOptions)`
              );
            } else {
              const appDelegatePattern =
                /public\s+override\s+func\s+application\s*\(\s*_\s+application\s*:\s*UIApplication\s*,\s*didFinishLaunchingWithOptions\s+launchOptions\s*:.*?\)\s*->\s*Bool\s*\{/s;

              if (appDelegatePattern.test(appDelegate)) {
                const match = appDelegatePattern.exec(appDelegate);
                if (match) {
                  const methodStart = match.index + match[0].length;
                  let openBraces = 1;
                  let closeBraces = 0;
                  let endIndex = methodStart;

                  for (let i = methodStart; i < appDelegate.length; i++) {
                    if (appDelegate[i] === "{") openBraces++;
                    if (appDelegate[i] === "}") closeBraces++;

                    if (openBraces === closeBraces + 1) {
                      endIndex = i;
                      break;
                    }
                  }

                  if (endIndex > methodStart) {
                    const poilabsCode = `
  if let options = launchOptions, options[UIApplication.LaunchOptionsKey.location] != nil {
    if application.applicationState == .background {
      PLSuspendedAnalysisManager.sharedInstance()?.startBeaconMonitoring()
    }
  }
    `;
                    appDelegate =
                      appDelegate.substring(0, endIndex) +
                      poilabsCode +
                      appDelegate.substring(endIndex);
                  }
                }
              }
            }
          }

          fs.writeFileSync(appDelegateFile, appDelegate);
        }

        const swiftModuleContent = `
import Foundation
import PoilabsAnalysis
import React

@objc(PoilabsAnalysisModule)
class PoilabsAnalysisModule: NSObject, PLAnalysisManagerDelegate {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func startPoilabsAnalysis(_ applicationId: String, applicationSecret: String, uniqueIdentifier: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) -> Void {
        PLAnalysisSettings.sharedInstance().applicationId = applicationId
        PLAnalysisSettings.sharedInstance().applicationSecret = applicationSecret
        PLAnalysisSettings.sharedInstance().analysisUniqueIdentifier = uniqueIdentifier
        
        PLConfigManager.sharedInstance().getReadyForTracking { [weak self] error in
            if error != nil {
                print("Poilabs Error: \\(error!)")
                resolver(false)
            } else {
                print("Poilabs SDK initialized successfully")
                PLSuspendedAnalysisManager.sharedInstance()?.stopBeaconMonitoring()
                PLStandardAnalysisManager.sharedInstance()?.startBeaconMonitoring()
                PLStandardAnalysisManager.sharedInstance()?.delegate = self
                resolver(true)
            }
        }
    }
    
    @objc
    func stopPoilabsAnalysis(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) -> Void {
        PLAnalysisSettings.sharedInstance()?.closeAllActions()
        resolver(true)
    }
    
    @objc
    func updateUniqueId(_ uniqueId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) -> Void {
        PLAnalysisSettings.sharedInstance()?.analysisUniqueIdentifier = uniqueId
        resolver(true)
    }
}
`;

        const objcModuleContent = `
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PoilabsAnalysisModule, NSObject)

RCT_EXTERN_METHOD(startPoilabsAnalysis:(NSString *)applicationId
                  applicationSecret:(NSString *)applicationSecret
                  uniqueIdentifier:(NSString *)uniqueIdentifier
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopPoilabsAnalysis:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateUniqueId:(NSString *)uniqueId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
`;

        fs.writeFileSync(
          path.join(moduleDir, "PoilabsAnalysisModule.swift"),
          swiftModuleContent
        );

        fs.writeFileSync(
          path.join(moduleDir, "PoilabsAnalysisModule.m"),
          objcModuleContent
        );

        const bridgingHeaderPath = path.join(
          root,
          "ios",
          projectName,
          `${projectName}-Bridging-Header.h`
        );
        let bridgingHeaderContent = "";

        if (fs.existsSync(bridgingHeaderPath)) {
          bridgingHeaderContent = fs.readFileSync(bridgingHeaderPath, "utf8");
        }

        if (
          !bridgingHeaderContent.includes(
            "#import <PoilabsAnalysis/PoilabsAnalysis.h>"
          )
        ) {
          bridgingHeaderContent +=
            "\n#import <PoilabsAnalysis/PoilabsAnalysis.h>\n";
        }

        if (
          !bridgingHeaderContent.includes("#import <React/RCTBridgeModule.h>")
        ) {
          bridgingHeaderContent += "\n#import <React/RCTBridgeModule.h>\n";
        }

        if (!bridgingHeaderContent.includes("#import <React/RCTUtils.h>")) {
          bridgingHeaderContent += "\n#import <React/RCTUtils.h>\n";
        }

        fs.writeFileSync(bridgingHeaderPath, bridgingHeaderContent);
      } else {
        if (appDelegateFile && fs.existsSync(appDelegateFile)) {
          let appDelegate = fs.readFileSync(appDelegateFile, "utf8");

          if (
            !appDelegate.includes("#import <PoilabsAnalysis/PoilabsAnalysis.h>")
          ) {
            appDelegate = appDelegate.replace(
              /#import "AppDelegate.h"/,
              `#import "AppDelegate.h"\n#import <PoilabsAnalysis/PoilabsAnalysis.h>`
            );
          }

          if (!appDelegate.includes("PLSuspendedAnalysisManager")) {
            appDelegate = appDelegate.replace(
              /- \(BOOL\)application:\(UIApplication \*\)application didFinishLaunchingWithOptions:\(NSDictionary \*\)launchOptions\s*{/,
              `- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  if (launchOptions[UIApplicationLaunchOptionsLocationKey]) {
    if (application.applicationState == UIApplicationStateBackground) {
      [[PLSuspendedAnalysisManager sharedInstance] startBeaconMonitoring];
    }
  }`
            );
          }

          fs.writeFileSync(appDelegateFile, appDelegate);
        }

        const sourceDir = path.join(
          root,
          "node_modules/@poilabs-dev/analysis-sdk-plugin/src/ios"
        );

        const moduleFiles = [
          "PoilabsAnalysisModule.h",
          "PoilabsAnalysisModule.m",
        ];

        moduleFiles.forEach((file) => {
          const sourcePath = path.join(sourceDir, file);
          const destPath = path.join(moduleDir, file);

          if (fs.existsSync(sourcePath)) {
            const content = fs.readFileSync(sourcePath, "utf8");
            fs.writeFileSync(destPath, content, "utf8");
          } else {
            console.warn(`Kaynak dosya bulunamadı: ${sourcePath}`);
          }
        });
      }

      return modConfig;
    },
  ]);
}

function withPoilabsXcodeProject(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      return modConfig;
    },
  ]);
}

function withPoilabsIOS(config) {
  config = withPoilabsInfoPlist(config);
  config = withPoilabsBackgroundModes(config);
  config = withPoilabsPodfile(config);
  config = withPoilabsNativeModules(config);
  config = withPoilabsXcodeProject(config);
  return config;
}

module.exports = withPoilabsIOS;

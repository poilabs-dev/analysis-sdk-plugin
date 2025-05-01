const {
  withInfoPlist,
  withDangerousMod,
  withAndroidManifest,
  createRunOncePlugin,
} = require("@expo/config-plugins");
const {
  withEntitlementsPlist,
} = require("@expo/config-plugins/build/plugins/ios-plugins");
const fs = require("fs");
const path = require("path");

const ANDROID_PERMISSIONS = [
  "android.permission.INTERNET",
  "android.permission.BLUETOOTH",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.BLUETOOTH_CONNECT",
  "android.permission.BLUETOOTH_SCAN",
  "android.permission.FOREGROUND_SERVICE",
];

function addNativeModules(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const root = modConfig.modRequest.projectRoot;
      const pkgName =
        config.android?.package || config.android?.packageName || config.slug;
      if (!pkgName)
        throw new Error("No Android package name found in app.json");
      const pkgPath = pkgName.replace(/\./g, "/");
      const dest = path.join(root, "android/app/src/main/java", pkgPath);
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      const templateDir = path.join(__dirname, "templates");
      ["PoilabsAnalysisModule.kt", "PoilabsPackage.kt"].forEach((file) => {
        const src = path.join(templateDir, file);
        let content = fs.readFileSync(src, "utf8");
        content = content.replace(/__PACKAGE_NAME__/g, pkgName);
        const out = path.join(dest, file);
        if (!fs.existsSync(out)) fs.writeFileSync(out, content, "utf8");
      });
      return modConfig;
    },
  ]);
}

const analysisAndroidManifest = (config) => {
  return withAndroidManifest(config, (mod) => {
    const { manifest } = mod.modResults;

    const permissions = manifest["uses-permission"] || [];
    ANDROID_PERMISSIONS.forEach((permission) => {
      if (!permissions.some((p) => p["$"]["android:name"] === permission)) {
        if (permission === "android.permission.FOREGROUND_SERVICE") {
          permissions.push({
            $: {
              "android:name": permission,
              "android:foregroundServiceType": "location",
            },
          });
        } else {
          permissions.push({ $: { "android:name": permission } });
        }
      }
    });
    manifest["uses-permission"] = permissions;

    return mod;
  });
};

function addIOSNativeModules(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const root = modConfig.modRequest.projectRoot;
      const projectName = modConfig.modRequest.projectName;
      const modulesDir = path.join(root, "ios", projectName, "PoilabsModule");

      if (!fs.existsSync(modulesDir)) {
        fs.mkdirSync(modulesDir, { recursive: true });
      }

      const bridgingHeaderPath = path.join(
        root,
        "ios",
        projectName,
        `${projectName}-Bridging-Header.h`
      );
      const bridgingHeaderContent = `
      #import <React/RCTBridgeModule.h>
      #import <React/RCTEventEmitter.h>
      `;

      if (!fs.existsSync(bridgingHeaderPath)) {
        fs.writeFileSync(bridgingHeaderPath, bridgingHeaderContent);
      } else {
        let bridgingHeader = fs.readFileSync(bridgingHeaderPath, "utf8");
        if (!bridgingHeader.includes("#import <React/RCTBridgeModule.h>")) {
          bridgingHeader += "\n#import <React/RCTBridgeModule.h>";
          fs.writeFileSync(bridgingHeaderPath, bridgingHeader);
        }
      }

      const objcWrapperPath = path.join(modulesDir, "PoilabsAnalysisModule.m");
      const objcWrapperContent = `
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
`;
      fs.writeFileSync(objcWrapperPath, objcWrapperContent);

      const moduleContent = `
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
`;

      fs.writeFileSync(
        path.join(modulesDir, "PoilabsAnalysisModule.swift"),
        moduleContent
      );

      const delegateContent = `
import Foundation
import PoilabsAnalysis

@objc(PoilabsAnalysisDelegate)
class PoilabsAnalysisDelegate: NSObject, PLAnalysisManagerDelegate {
    static let shared = PoilabsAnalysisDelegate()
    
    override init() {
        super.init()
    }
    
    @objc func analysisManagerResponse(forBeaconMonitoring response: [AnyHashable : Any]!) {
        print("Beacon monitoring response: \\(String(describing: response))")
    }
}
`;

      fs.writeFileSync(
        path.join(modulesDir, "PoilabsAnalysisDelegate.swift"),
        delegateContent
      );

      const pbxprojPath = path.join(
        root,
        "ios",
        `${projectName}.xcodeproj`,
        "project.pbxproj"
      );
      if (fs.existsSync(pbxprojPath)) {
        let pbxproj = fs.readFileSync(pbxprojPath, "utf8");

        if (!pbxproj.includes("SWIFT_OBJC_BRIDGING_HEADER")) {
          const buildConfigurationBlockRegex =
            /\/\* Debug \*\/ = {[\s\S]*?buildSettings = {([\s\S]*?)};/g;
          let match;
          let updated = false;

          while (
            (match = buildConfigurationBlockRegex.exec(pbxproj)) !== null
          ) {
            const bridgingHeaderSetting = `\n\t\t\t\tSWIFT_OBJC_BRIDGING_HEADER = "${projectName}/${projectName}-Bridging-Header.h";`;

            if (!match[1].includes("SWIFT_OBJC_BRIDGING_HEADER")) {
              const updatedBuildSettings = match[1] + bridgingHeaderSetting;
              pbxproj = pbxproj.replace(match[1], updatedBuildSettings);
              updated = true;
            }
          }

          if (updated) {
            fs.writeFileSync(pbxprojPath, pbxproj);
          }
        }
      }

      const appDelegateFile = path.join(
        root,
        "ios",
        projectName,
        "AppDelegate.mm"
      );
      if (fs.existsSync(appDelegateFile)) {
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

      return modConfig;
    },
  ]);
}

function analysisIOSPermissions(config) {
  return withInfoPlist(config, (mod) => {
    const plist = mod.modResults;

    if (plist.NSLocationWhenInUseUsageDescription) {
      delete plist.NSLocationWhenInUseUsageDescription;
    }
    if (plist.NSLocationAlwaysUsageDescription) {
      delete plist.NSLocationAlwaysUsageDescription;
    }
    if (plist.NSLocationAlwaysAndWhenInUseUsageDescription) {
      delete plist.NSLocationAlwaysAndWhenInUseUsageDescription;
    }

    plist.NSBluetoothAlwaysUsageDescription =
      "Bluetooth is required to scan beacons nearby.";
    plist.NSBluetoothPeripheralUsageDescription =
      "Bluetooth is required to scan beacons nearby.";

    return mod;
  });
}

function addIOSBackgroundModes(config) {
  return withEntitlementsPlist(config, (mod) => {
    const ent = mod.modResults;
    const modes = ent.UIBackgroundModes || [];
    if (!modes.includes("location")) modes.push("location");
    if (!modes.includes("bluetooth-central")) modes.push("bluetooth-central");
    ent.UIBackgroundModes = modes;
    return mod;
  });
}

function analysisGradle(config, { jitpackToken }) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const root = modConfig.modRequest.projectRoot;
      const buildScript = path.join(root, "android/build.gradle");
      let text = fs.readFileSync(buildScript, "utf8");

      const hasJitpackWithCredentials =
        text.includes('url "https://jitpack.io"') &&
        text.includes("credentials { username =");
      const hasPlainJitpack = text.includes("url 'https://www.jitpack.io'");

      if (!hasJitpackWithCredentials) {
        const repo = `
        jcenter()
        maven {
          url "https://jitpack.io"
          credentials { username = '${jitpackToken}' }
        }`;

        text = text.replace(
          /allprojects\s*{[\s\S]*?repositories\s*{([\s\S]*?)}/,
          (m, block) =>
            block.includes("jitpack.io")
              ? m.replace(
                  block,
                  block.replace(
                    /maven\s*{\s*url\s*['"]https:\/\/www\.jitpack\.io['"].*?}/g,
                    ""
                  )
                )
              : m.replace(block, `${block}\n${repo}`)
        );
      } else if (hasPlainJitpack) {
        text = text.replace(
          /maven\s*{\s*url\s*['"]https:\/\/www\.jitpack\.io['"].*?}/g,
          ""
        );
      }

      fs.writeFileSync(buildScript, text);

      const appGradle = path.join(root, "android/app/build.gradle");
      let appText = fs.readFileSync(appGradle, "utf8");
      if (!appText.includes("multiDexEnabled true")) {
        appText = appText.replace(
          /defaultConfig\s*{[^}]*\n/,
          (m) => `${m}        multiDexEnabled true\n`
        );
      }
      if (!appText.includes("androidx.multidex:multidex")) {
        appText = appText.replace(
          /dependencies\s*{[^}]*\n/,
          (m) => `${m}    implementation 'androidx.multidex:multidex:2.0.1'\n`
        );
      }
      if (!appText.includes("com.github.poiteam:Android-Analysis-SDK")) {
        appText = appText.replace(
          /dependencies\s*{[^}]*\n/,
          (m) =>
            `${m}    implementation 'com.github.poiteam:Android-Analysis-SDK:v3.11.4'\n`
        );
      }
      fs.writeFileSync(appGradle, appText);
      return modConfig;
    },
  ]);
}

function analysisPodfile(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const podfile = path.join(
        modConfig.modRequest.projectRoot,
        "ios/Podfile"
      );
      if (fs.existsSync(podfile)) {
        let podText = fs.readFileSync(podfile, "utf8");

        if (!podText.includes("pod 'PoilabsAnalysis'")) {
          podText = podText.replace(
            /target ['"][^'"]+['"] do/,
            (m) => `${m}\n  pod 'PoilabsAnalysis'`
          );
        }

        if (!podText.includes("use_frameworks!")) {
          if (podText.match(/use_frameworks! :linkage =>/g)?.length === 1) {
          } else {
            podText = podText.replace(
              /use_frameworks! :linkage => :static\n/g,
              ""
            );
            podText = podText.replace(
              /use_react_native!\(/,
              `use_frameworks! :linkage => :static\n\n  use_react_native!(`
            );
          }
        }

        fs.writeFileSync(podfile, podText);
      }
      return modConfig;
    },
  ]);
}

const withPoilabsAnalysisSDK = (config, props) => {
  // Android
  config = analysisAndroidManifest(config);
  config = analysisGradle(config, props);
  config = addNativeModules(config);

  // iOS
  config = analysisIOSPermissions(config);
  config = addIOSBackgroundModes(config);
  config = analysisPodfile(config);
  config = addIOSNativeModules(config);

  return config;
};

const pkg = {
  name: "@poilabs-dev/analysis-sdk-plugin",
  version: "1.0.34",
};

module.exports = createRunOncePlugin(
  withPoilabsAnalysisSDK,
  pkg.name,
  pkg.version
);

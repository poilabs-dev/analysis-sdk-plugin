const {
  withInfoPlist,
  withDangerousMod,
  withEntitlementsPlist,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withPoilabsInfoPlist(config) {
  return withInfoPlist(config, (mod) => {
    const plist = mod.modResults;

    plist.NSBluetoothAlwaysUsageDescription =
      "Bluetooth is required to scan beacons nearby.";
    plist.NSBluetoothPeripheralUsageDescription =
      "Bluetooth is required to scan beacons nearby.";

    return mod;
  });
}

function withPoilabsBackgroundModes(config) {
  return withEntitlementsPlist(config, (mod) => {
    const ent = mod.modResults;
    const modes = ent.UIBackgroundModes || [];
    if (!modes.includes("bluetooth-central")) modes.push("bluetooth-central");
    ent.UIBackgroundModes = modes;
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

function withPoilabsNativeModules(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const root = modConfig.modRequest.projectRoot;
      const projectName = modConfig.modRequest.projectName;
      const modulesDir = path.join(root, "ios", projectName, "PoilabsModule");

      if (!fs.existsSync(modulesDir)) {
        fs.mkdirSync(modulesDir, { recursive: true });
      }

      const sourceDir = path.join(
        root,
        "node_modules/@poilabs-dev/analysis-sdk-plugin/src/ios"
      );

      const moduleFiles = [
        "PoilabsAnalysisModule.swift",
        "PoilabsAnalysisModule.m",
        "PoilabsAnalysisDelegate.swift",
      ];

      moduleFiles.forEach((file) => {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(modulesDir, file);

        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
        } else {
          console.warn(`Source file not found: ${sourcePath}`);
        }
      });

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

      // AppDelegate güncelleme
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
  if (application.applicationState == UIApplicationStateBackground) {
    [[PLSuspendedAnalysisManager sharedInstance] startBeaconMonitoring];
  }`
          );
        }

        fs.writeFileSync(appDelegateFile, appDelegate);
      }

      return modConfig;
    },
  ]);
}

function withPoilabsIOS(config) {
  config = withPoilabsInfoPlist(config);
  config = withPoilabsBackgroundModes(config);
  config = withPoilabsPodfile(config);
  config = withPoilabsNativeModules(config);
  return config;
}

module.exports = withPoilabsIOS;

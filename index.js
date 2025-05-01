import { NativeModules, Platform } from "react-native";
import {
  requestRequiredPermissions,
  checkAllPermissions,
  startScanIfPermissionsGranted,
  checkBluetoothPermission,
  askRuntimePermissionsIfNeeded,
} from "./permission";

export async function startPoilabsAnalysis(config = {}) {
  try {
    const { applicationId, applicationSecret, uniqueId } = config;

    if (!applicationId || !applicationSecret || !uniqueId) {
      console.error(
        "Missing configuration: applicationId, applicationSecret, and uniqueId are required"
      );
      return false;
    }

    const permissionsGranted = await requestRequiredPermissions();

    if (!permissionsGranted) {
      console.warn("Required permissions not granted");
      return false;
    }

    const { PoilabsAnalysisModule } = NativeModules;

    if (PoilabsAnalysisModule && PoilabsAnalysisModule.startPoilabsAnalysis) {
      PoilabsAnalysisModule.startPoilabsAnalysis(
        applicationId,
        applicationSecret,
        uniqueId
      );
      return true;
    } else {
      console.error("PoilabsAnalysisModule not found");
      return false;
    }
  } catch (error) {
    console.error("SDK initialization error:", error);
    return false;
  }
}

export function stopPoilabsAnalysis() {
  try {
    const { PoilabsAnalysisModule } = NativeModules;

    if (PoilabsAnalysisModule && PoilabsAnalysisModule.stopPoilabsAnalysis) {
      PoilabsAnalysisModule.stopPoilabsAnalysis();
      return true;
    }
    return false;
  } catch (error) {
    console.error("SDK Stop Error", error);
    return false;
  }
}

export async function configureAnalysisSDK(options = {}) {
  try {
    if (Platform.OS !== "android") {
      console.log("configureAnalysisSDK is only available on Android");
      return false;
    }

    const { PoilabsAnalysisModule } = NativeModules;

    if (PoilabsAnalysisModule && PoilabsAnalysisModule.configureAnalysis) {
      return await PoilabsAnalysisModule.configureAnalysis(options);
    } else {
      console.error(
        "configureAnalysis method not found in PoilabsAnalysisModule"
      );
      return false;
    }
  } catch (error) {
    console.error("SDK configuration error:", error);
    return false;
  }
}

export async function updateUniqueId(uniqueId) {
  try {
    if (!uniqueId) {
      console.error("Missing uniqueId parameter");
      return false;
    }

    const { PoilabsAnalysisModule } = NativeModules;

    if (PoilabsAnalysisModule && PoilabsAnalysisModule.updateUniqueId) {
      return await PoilabsAnalysisModule.updateUniqueId(uniqueId);
    } else {
      console.error("updateUniqueId method not found in PoilabsAnalysisModule");
      return false;
    }
  } catch (error) {
    console.error("Unique ID update error:", error);
    return false;
  }
}

export {
  requestRequiredPermissions,
  checkAllPermissions,
  checkBluetoothPermission,
  askRuntimePermissionsIfNeeded,
  startScanIfPermissionsGranted,
};

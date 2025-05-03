import { NativeModules } from "react-native";
import {
  requestRequiredPermissions,
  checkAllPermissions,
  startScanIfPermissionsGranted,
  checkBluetoothPermission,
  askRuntimePermissionsIfNeeded,
} from "./permission";

const { PoilabsAnalysisModule } = NativeModules;

export async function startPoilabsAnalysis(config = {}) {
  try {
    const { applicationId, applicationSecret, uniqueId } = config;

    if (!applicationId || !applicationSecret || !uniqueId) {
      return false;
    }

    const permissionsGranted = await requestRequiredPermissions();

    if (!permissionsGranted) {
      return false;
    }

    if (PoilabsAnalysisModule && PoilabsAnalysisModule.startPoilabsAnalysis) {
      const result = await PoilabsAnalysisModule.startPoilabsAnalysis(
        applicationId,
        applicationSecret,
        uniqueId
      );

      return result;
    } else {
      console.error("PoilabsAnalysisModule not found.");
      return false;
    }
  } catch (error) {
    console.error("Poilabs SDK starting error:", error);
    return false;
  }
}

export async function stopPoilabsAnalysis() {
  try {
    if (PoilabsAnalysisModule && PoilabsAnalysisModule.stopPoilabsAnalysis) {
      await PoilabsAnalysisModule.stopPoilabsAnalysis();
      return true;
    }
    return false;
  } catch (error) {
    console.error("SDK stopping error::", error);
    return false;
  }
}

export async function updateUniqueId(uniqueId) {
  try {
    if (!uniqueId) {
      console.error("Unique ID is required.");
      return false;
    }

    if (PoilabsAnalysisModule && PoilabsAnalysisModule.updateUniqueId) {
      const result = await PoilabsAnalysisModule.updateUniqueId(uniqueId);
      return result;
    } else {
      console.error("UpdateUniqueId method not found in PoilabsAnalysisModule.");
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

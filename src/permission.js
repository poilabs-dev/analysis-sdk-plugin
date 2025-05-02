import {
  Platform,
  PermissionsAndroid,
  NativeModules,
} from "react-native";
import * as Location from "expo-location";

const TAG = "MainActivity";

export async function askRuntimePermissionsIfNeeded() {
  try {
    if (Platform.OS === "ios") {
      return true;
    }

    if (Platform.OS !== "android") {
      const { status: fineStatus } =
        await Location.requestForegroundPermissionsAsync();
      console.log(
        `[${TAG}] Foreground location permission status: ${fineStatus}`
      );
      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      console.log(
        `[${TAG}] Background location permission status: ${backgroundStatus}`
      );
      return true;
    }

    const sdk = parseInt(Platform.Version, 10);

    // Android 10+ (API 29 and above)
    if (sdk >= 29) {
      let res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message:
            "We need location permission to detect beacon devices near you.",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        }
      );
      console.log(`[${TAG}] ACCESS_FINE_LOCATION: ${res}`);

      res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: "Background Location Permission",
          message:
            "We need location permission for beacon scanning while the app is in the background.",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        }
      );
      console.log(`[${TAG}] ACCESS_BACKGROUND_LOCATION: ${res}`);
    } else {
      // Android 9 and below: coarse location
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        {
          title: "Location Permission",
          message:
            "We need location permission to detect beacon devices near you.",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        }
      );
    }

    // Android 12+ (API 31 and above): Bluetooth connect and scan
    if (sdk >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ]);
    }

    return await startScanIfPermissionsGranted();
  } catch (error) {
    console.error(`[${TAG}] askRuntimePermissionsIfNeeded error:`, error);
    return false;
  }
}

export async function checkAllPermissions() {
  try {
    if (Platform.OS === "ios") {
      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();

      const foregroundGranted = fg.status === "granted";
      const backgroundGranted = bg.status === "granted";

      if (!foregroundGranted) {
        console.log(`[${TAG}] Foreground location permission missing`);
      }
      if (!backgroundGranted) {
        console.log(`[${TAG}] Background location permission missing`);
      }

      return foregroundGranted;
    }

    if (Platform.OS !== "android") {
      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();
      return fg.status === "granted" && bg.status === "granted";
    }
    const sdk = parseInt(Platform.Version, 10);
    // Android 12+
    if (sdk >= 31) {
      const ok = await Promise.all([
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ),
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        ),
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        ),
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN),
      ]);
      return ok.every(Boolean);
    }
    // Android 10+
    if (sdk >= 29) {
      const ok = await Promise.all([
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ),
        PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        ),
      ]);
      return ok.every(Boolean);
    }
    // Android 9 and below
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
    );
  } catch (error) {
    console.error(`[${TAG}] checkAllPermissions error:`, error);
    return false;
  }
}

export async function requestRequiredPermissions() {
  return await askRuntimePermissionsIfNeeded();
}

export async function startScanIfPermissionsGranted() {
  const granted = await checkAllPermissions();
  if (granted) {
    return startPoiSdk();
  }
  return false;
}

function startPoiSdk() {
  try {
    const { PoilabsAnalysisModule } = NativeModules;

    if (!PoilabsAnalysisModule) {
      console.error(`[${TAG}] PoilabsAnalysisModule not found`);
      return false;
    }

    console.log(`[${TAG}] PoilabsAnalysisModule found successfully`);
    return true;
  } catch (error) {
    console.error(`[${TAG}] Error accessing SDK:`, error);
    return false;
  }
}

export async function checkBluetoothPermission() {
  if (Platform.OS !== "android" || parseInt(Platform.Version, 10) < 31) {
    return true;
  }

  try {
    const hasConnectPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
    );
    const hasScanPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
    );

    if (!hasConnectPermission || !hasScanPermission) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ]);

      const connectGranted =
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const scanGranted =
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED;

      return connectGranted && scanGranted;
    }

    return true;
  } catch (error) {
    console.error(`[${TAG}] checkBluetoothPermission error:`, error);
    return false;
  }
}

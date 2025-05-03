# @poilabs-dev/analysis-sdk-plugin

Official **Expo Config Plugin** for integrating the [Poilabs Analysis SDK](https://www.poilabs.com/en/analysis-sdk/) into Expo (prebuild) projects.

> 🚀 Automatically links native dependencies and modifies required iOS/Android files.

---

## ✨ What this plugin does

When used with `expo prebuild`, this plugin:

- ✅ Adds required Android permissions to `AndroidManifest.xml`
- ✅ Adds `android:foregroundServiceType="location"` to the `FOREGROUND_SERVICE` permission
- ✅ Adds Poilabs SDK dependency to `android/app/build.gradle`
- ✅ Adds JitPack repository to `android/build.gradle`
- ✅ Adds `pod 'PoilabsAnalysis'` to the iOS Podfile
- ✅ Adds `Info.plist` keys for Location and Bluetooth usage

---

## 📦 Installation

Install the plugin to your Expo project:

```bash
npm install @poilabs-dev/analysis-sdk-plugin
# or
yarn add @poilabs-dev/analysis-sdk-plugin
```

Also install the required dependencies:

```bash
npx expo install expo-location expo-device
```

## ⚙️ Configuration

Add the plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@poilabs-dev/analysis-sdk-plugin",
        {
          "jitpackToken": "YOUR_JITPACK_TOKEN" // Get this from Poilabs
        }
      ]
    ]
  }
}
```

Then run the prebuild command:

```bash
npx expo prebuild
```

### Additional Setup Required

After running `expo prebuild`, you need to perform these additional steps:

#### Android Setup

1. Open your project's `MainApplication.kt` file and add the following import:

   ```kotlin
   import com.anonymous.<APPNAME>.PoilabsPackage
   ```

2. Find the `getPackages()` method and add the PoilabsPackage:

   ```kotlin
   override fun getPackages(): List<ReactPackage> {
      val packages = PackageList(this).packages
        // add this line
      packages.add(PoilabsPackage())
      return packages
    }
   ```

3. Clean and rebuild your Android project:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx expo run:android
   ```

## ⚠️ Android local.properties Warning

- You should create local.properties to android root
- and you should add this => sdk.dir=/Users/USERNAME/Library/Android/sdk

#### iOS Setup

For iOS, you need to ensure the plugin files are properly included in your Xcode project:

1. Open your Xcode project
2. In Xcode, verify that the PoilabsModule files are added to your project
3. Check that the files appear in the "Build Phases > Compile Sources" section
4. Find + button and click. Then you should "add other".
5. If files are missing, you may need to manually add them from the iOS/<project-name>/PoilabsModule directory:
   - PoilabsAnalysisModule.h
   - PoilabsAnalysisModule.m

## ⚠️ iOS ARM64 Warning

**Note:** When developing for iOS, there's an important consideration regarding ARM64 architecture:

- If you're integrating into an existing project (which already has ARM64 support), you shouldn't encounter any issues.
- However, if you're creating a project from scratch, you need to remove the ARM64 reference from the Build Settings in Xcode. Otherwise, you might face compilation errors.

This setting is particularly important when developing on M series (Apple Silicon) Mac computers.

Then build and run your iOS project:

```bash
npx expo run:ios
```

## 🚀 Usage

After the prebuild process, you can use the SDK in your application:

```javascript
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Platform, StyleSheet } from "react-native";

import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import {
  configureAnalysisSDK,
  startPoilabsAnalysis,
  stopPoilabsAnalysis,
} from "@poilabs-dev/analysis-sdk-plugin";

export default function HomeScreen() {
  const [sdkStatus, setSdkStatus] = useState("Initializing...");

  useEffect(() => {
    const initAnalysis = async () => {
      try {
        // Start Poilabs SDK
        const success = await startPoilabsAnalysis({
          applicationId: "YOUR_APPLICATION_ID", // Get from Poilabs
          applicationSecret: "YOUR_APPLICATION_SECRET", // Get from Poilabs
          uniqueId: "USER_UNIQUE_ID", // A unique identifier for the user
        });

        setSdkStatus(success ? "Running ✅" : "Failed to start ❌");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setSdkStatus("Error: " + errorMessage);
      }
    };

    initAnalysis();

    return () => {
      stopPoilabsAnalysis();
    };
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* SDK Status Indicator */}
      <ThemedView style={styles.sdkStatusContainer}>
        <ThemedText type="subtitle">Poilabs SDK: {sdkStatus}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit{" "}
          <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText>{" "}
          to see changes. Press{" "}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: "cmd + d",
              android: "cmd + m",
              web: "F12",
            })}
          </ThemedText>{" "}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">
            npm run reset-project
          </ThemedText> to get a fresh <ThemedText type="defaultSemiBold">
            app
          </ThemedText> directory. This will move the current <ThemedText type="defaultSemiBold">
            app
          </ThemedText> to <ThemedText type="defaultSemiBold">
            app-example
          </ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  sdkStatusContainer: {
    marginVertical: 16,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
});
```

## 📝 API Reference

### `startPoilabsAnalysis(config)`

Starts the Poilabs Analysis SDK with the given configuration.

#### Parameters

- `config` (Object):
  - `applicationId` (String): The application ID provided by Poilabs
  - `applicationSecret` (String): The application secret provided by Poilabs
  - `uniqueId` (String): A unique identifier for the user

#### Returns

- `Promise<boolean>`: Resolves to `true` if SDK was started successfully, `false` otherwise

### `stopPoilabsAnalysis()`

Stops the Poilabs Analysis SDK.

#### Returns

- `boolean`: `true` if SDK was stopped successfully, `false` otherwise

### `updateUniqueId(uniqueId)`

Updates the unique identifier in the SDK after initialization.

#### Parameters

- `uniqueId` (String): New unique identifier for the user

#### Returns

- `Promise<boolean>`: Resolves to `true` if update was successful

### `requestRequiredPermissions()`

Requests all the required permissions for the SDK to work properly.

#### Returns

- `Promise<boolean>`: Resolves to `true` if all required permissions are granted, `false` otherwise

### `checkAllPermissions()`

Checks if all required permissions are granted.

#### Returns

- `Promise<boolean>`: `true` if all required permissions are granted, `false` otherwise

### `checkBluetoothPermission()`

Checks if Bluetooth permissions are granted (relevant for Android 12+).

#### Returns

- `Promise<boolean>`: `true` if Bluetooth permissions are granted, `false` otherwise

## 📋 Required Permissions

The plugin automatically adds these permissions:

### Android

- `INTERNET` - For network communication
- `ACCESS_FINE_LOCATION` - For precise location
- `ACCESS_COARSE_LOCATION` - For approximate location (Android 9 and below)
- `ACCESS_BACKGROUND_LOCATION` - For background location tracking (Android 10+)
- `BLUETOOTH_CONNECT` - For Bluetooth connectivity (Android 12+)
- `BLUETOOTH_SCAN` - For Bluetooth scanning (Android 12+)
- `FOREGROUND_SERVICE` with `foregroundServiceType="location"` - For background operations

### iOS

- `NSLocationWhenInUseUsageDescription` - Location permission when app is in use
- `NSLocationAlwaysUsageDescription` - Location permission even when app is not in use
- `NSBluetoothAlwaysUsageDescription` - Bluetooth permission

## ❓ Troubleshooting

### Module not found error

If you see `PoilabsAnalysisModule` not found error:

1. Make sure you have run `npx expo prebuild`
2. Verify you've completed the additional setup steps for Android/iOS
3. Run `npx expo run:android` or `npx expo run:ios` to build and run the native project
4. For Expo Go, this plugin will not work because it requires native modules

### iOS Integration Issues

If you're having issues with iOS integration:

1. Make sure the Podfile is correctly updated with `pod 'PoilabsAnalysis'`
2. Verify that `use_frameworks! :linkage => :static` is in your Podfile
3. Check that the Swift files are properly added to your project
4. Run `pod install --repo-update` from the ios directory

### Permission issues

If the SDK is not working due to permission issues:

1. Make sure you have requested all the necessary permissions
2. For Android 10+, background location permission needs to be requested separately

## 📞 Support

If you encounter any issues, please contact Poilabs support or open an issue on GitHub.

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
expo install expo-location expo-device
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

#### iOS Setup

For iOS, you need to ensure the plugin files are properly included in your Xcode project:

1. Open your Xcode project
2. In Xcode, verify that the PoilabsModule files are added to your project
3. Check that the files appear in the "Build Phases > Compile Sources" section
4. If files are missing, you may need to manually add them from the iOS/<project-name>/PoilabsModule directory:
   - PoilabsAnalysisModule.swift
   - PoilabsAnalysisModule.m
   - PoilabsAnalysisDelegate.swift

Then build and run your iOS project:
```bash
npx expo run:ios
```

## 🚀 Usage

After the prebuild process, you can use the SDK in your application:

```javascript
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { 
  startPoilabsAnalysis, 
  stopPoilabsAnalysis,
  configureAnalysisSDK // Android only
} from '@poilabs-dev/analysis-sdk-plugin';

export default function App() {
  useEffect(() => {
    const initAnalysis = async () => {
      // For Android: Configure additional options (optional)
      if (Platform.OS === 'android') {
        await configureAnalysisSDK({
          enableForegroundService: true,
          serviceNotificationTitle: "Beacon Scanning",
          notificationChannelName: "Beacon Scanner",
          notificationChannelDescription: "Scanning for nearby beacons"
        });
      }
      
      // Start Poilabs Analysis SDK
      const success = await startPoilabsAnalysis({
        applicationId: 'YOUR_APPLICATION_ID', // Get from Poilabs
        applicationSecret: 'YOUR_APPLICATION_SECRET', // Get from Poilabs
        uniqueId: 'USER_UNIQUE_ID' // A unique identifier for the user
      });
      
      if (success) {
        console.log('Poilabs Analysis SDK started successfully');
      } else {
        console.log('Failed to start Poilabs Analysis SDK');
      }
    };
    
    initAnalysis();
    
    // Clean up when component unmounts
    return () => {
      stopPoilabsAnalysis();
    };
  }, []);
  
  return (
    <View>
      <Text>Poilabs Analysis SDK Example</Text>
    </View>
  );
}
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

### `configureAnalysisSDK(options)` (Android only)

Configures additional Android-specific options for the SDK.

#### Parameters

- `options` (Object):
  - `enabled` (Boolean): Enable or disable the SDK
  - `openSystemBluetooth` (Boolean): Automatically open Bluetooth
  - `enableForegroundService` (Boolean): Enable foreground service
  - `serviceNotificationTitle` (String): Title for foreground service notification
  - `notificationChannelName` (String): Name for notification channel
  - `notificationChannelDescription` (String): Description for notification channel
  - `notificationIconResourceId` (Number): Resource ID for notification icon

#### Returns

- `Promise<boolean>`: Resolves to `true` if configuration was successful

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
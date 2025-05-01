const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");
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

// AndroidManifest.xml'e izinlerin eklenmesi
function withPoilabsManifest(config) {
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
}

// build.gradle dosyalarının düzenlenmesi
function withPoilabsGradle(config, { jitpackToken }) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const root = modConfig.modRequest.projectRoot;

      // Proje seviyesi build.gradle
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

      // Uygulama seviyesi build.gradle
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

// Native modüllerin oluşturulması
function withPoilabsNativeModules(config) {
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

      // Kaynak dosya yolları (bu dosyaları src/android/ altında tutarsanız)
      const sourceDir = path.join(
        root,
        "node_modules/@poilabs-dev/analysis-sdk-plugin/src/android"
      );

      // Dosyaları kopyala
      const moduleFiles = ["PoilabsAnalysisModule.kt", "PoilabsPackage.kt"];

      moduleFiles.forEach((file) => {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(dest, file);

        if (fs.existsSync(sourcePath)) {
          // Dosya içeriğini oku, package adını değiştir ve kaydet
          let content = fs.readFileSync(sourcePath, "utf8");
          content = content.replace(/__PACKAGE_NAME__/g, pkgName);
          fs.writeFileSync(destPath, content, "utf8");
        } else {
          console.warn(`Source file not found: ${sourcePath}`);
        }
      });

      return modConfig;
    },
  ]);
}

// Tüm Android işlemlerini birleştir
function withPoilabsAndroid(config, props) {
  config = withPoilabsManifest(config);
  config = withPoilabsGradle(config, props);
  config = withPoilabsNativeModules(config);
  return config;
}

module.exports = withPoilabsAndroid;

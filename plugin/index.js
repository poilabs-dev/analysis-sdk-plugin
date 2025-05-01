const withPoilabsAndroid = require("./withPoilabsAndroid");
const withPoilabsIOS = require("./withPoilabsIOS");

// Tüm platformlar için plugin işlemlerini birleştir
function withPoilabsSDK(config, props) {
  // Android işlemleri
  config = withPoilabsAndroid(config, props);

  // iOS işlemleri
  config = withPoilabsIOS(config);

  return config;
}

module.exports = withPoilabsSDK;

const withPoilabsAndroid = require("./withPoilabsAndroid");
const withPoilabsIOS = require("./withPoilabsIOS");

function withPoilabsSDK(config, props) {
  config = withPoilabsAndroid(config, props);

  config = withPoilabsIOS(config);

  return config;
}

module.exports = withPoilabsSDK;

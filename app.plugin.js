const { createRunOncePlugin } = require("@expo/config-plugins");
const withPoilabsSDK = require("./plugin");

const pkg = {
  name: "@poilabs-dev/analysis-sdk-plugin",
  version: "1.0.45",
};

module.exports = createRunOncePlugin(
  withPoilabsSDK,
  pkg.name,
  pkg.version
);
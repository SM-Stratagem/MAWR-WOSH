const fs = require("fs");
const path = require("path");

const baseConfig = require("./app.json");

function readEnvValue(filePath, key) {
  try {
    const contents = fs.readFileSync(filePath, "utf8");
    const line = contents
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${key}=`));
    if (!line) return undefined;
    return line.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

function resolveGoogleMapsApiKey() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    readEnvValue(path.join(__dirname, ".env.local"), "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY") ||
    readEnvValue(path.join(__dirname, ".env"), "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY") ||
    readEnvValue(path.join(__dirname, "..", "..", ".env.local"), "GOOGLE_MAPS_API_KEY")
  );
}

module.exports = ({ config }) => {
  const googleMapsApiKey = resolveGoogleMapsApiKey();
  const expo = {
    ...baseConfig.expo,
    ...config,
    ios: {
      ...baseConfig.expo.ios,
      ...config.ios,
    },
    android: {
      ...baseConfig.expo.android,
      ...config.android,
    },
    extra: {
      ...(baseConfig.expo.extra || {}),
      ...(config.extra || {}),
      googleMapsApiKey,
    },
  };

  const plugins = [...(baseConfig.expo.plugins || [])];
  if (googleMapsApiKey) {
    plugins.push([
      "react-native-maps",
      {
        iosGoogleMapsApiKey: googleMapsApiKey,
        androidGoogleMapsApiKey: googleMapsApiKey,
      },
    ]);
  }

  return {
    ...expo,
    plugins,
  };
};

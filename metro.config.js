const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Repo docs (demo MP4s, e2e screenshots) must never enter the JS bundle.
    blockList: [/docs\/demo\/videos\/.*/, /docs\/e2e\/.*/],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

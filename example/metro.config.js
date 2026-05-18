// example/metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname; // example/
const workspaceRoot = path.resolve(projectRoot, '..'); // repo root (your lib)
const nitroModuleRoot = path.resolve(
  workspaceRoot,
  'react-native-vision-camera-ocr-plus'
);

// Small helper to escape paths for a RegExp
const esc = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Block node_modules from both the workspace root AND the nitro sub-module
// to prevent duplicate React/RN instances being bundled
const blockListRE = new RegExp(
  `(${esc(workspaceRoot)}[\\\\/]node_modules[\\\\/]` +
  `|${esc(nitroModuleRoot)}[\\\\/]node_modules[\\\\/]).*`
);

const config = getDefaultConfig(projectRoot);

// Watch the library folders so edits in ../src/** refresh
config.watchFolders = [workspaceRoot, nitroModuleRoot];

config.resolver = {
  ...config.resolver,
  // IMPORTANT: allow resolving through symlinks (Yarn "link:..")
  unstable_enableSymlinks: true,
  // Ensure React/RN come from the example app only
  nodeModulesPaths: [path.join(projectRoot, 'node_modules')],
  blockList: blockListRE,
  extraNodeModules: {
    'react': path.join(projectRoot, 'node_modules/react'),
    'react-native': path.join(projectRoot, 'node_modules/react-native'),
    // 'react-native-worklets': path.join(
    //   projectRoot,
    //   'node_modules/react-native-worklets'
    // ),
    // 'react-native-vision-camera-worklets': path.join(
    //   projectRoot,
    //   'node_modules/react-native-vision-camera-worklets'
    // ),
    // 'react-native-nitro-modules': path.join(
    //   projectRoot,
    //   'node_modules/react-native-nitro-modules'
    // ),
    // 'react-native-vision-camera': path.join(
    //   projectRoot,
    //   'node_modules/react-native-vision-camera'
    // ),
  },
  // (keep expo defaults but ensure TS extensions present)
  sourceExts: Array.from(
    new Set([...(config.resolver.sourceExts || []), 'cjs', 'ts', 'tsx', 'jsx'])
  ),
};

module.exports = config;

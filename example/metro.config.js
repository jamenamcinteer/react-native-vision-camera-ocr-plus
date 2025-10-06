// example/metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;                 // example/
const workspaceRoot = path.resolve(projectRoot, '..'); // repo root (your lib)

// Small helper to escape paths for a RegExp
const esc = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Block the library's own node_modules to avoid duplicate React/RN
const blockListRE = new RegExp(`${esc(workspaceRoot)}[\\\\/]node_modules[\\\\/].*`);

const config = getDefaultConfig(projectRoot);

// Watch the library folder so edits in ../src/** refresh
config.watchFolders = [workspaceRoot];

config.resolver = {
  ...config.resolver,
  // IMPORTANT: allow resolving through symlinks (Yarn "link:..")
  unstable_enableSymlinks: true,
  // Ensure React/RN come from the example app only
  nodeModulesPaths: [path.join(projectRoot, 'node_modules')],
  blockList: blockListRE,
  extraNodeModules: {
    react: path.join(projectRoot, 'node_modules/react'),
    'react-native': path.join(projectRoot, 'node_modules/react-native'),
  },
  // (keep expo defaults but ensure TS extensions present)
  sourceExts: Array.from(new Set([...(config.resolver.sourceExts || []), 'cjs', 'ts', 'tsx', 'jsx'])),
};

module.exports = config;

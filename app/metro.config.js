// Metro configuration for Expo.
// Force `javascript-lp-solver` to its browser build: the default (ESM) build
// imports Node's `fs` for a CLI file-reading feature we never use, which Metro
// can't resolve for React Native. The browser build is fs-free and exports the
// same `Solve` API.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const lpSolverBrowser = path.resolve(
  __dirname,
  'node_modules/javascript-lp-solver/dist/index.browser.mjs',
);

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'javascript-lp-solver') {
    return { type: 'sourceFile', filePath: lpSolverBrowser };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;

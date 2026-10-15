// Expo's default Metro config, with one change: zustand resolves to its CommonJS build.
//
// zustand 5 resolves to its ESM build (esm/*.mjs) on web. That build reads
// `import.meta.env`, and a classic browser script rejects it with
// "Cannot use 'import.meta' outside a module", so the exported page stays blank.
// Babel's import.meta transform skips node_modules, so the fix is at resolution.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return { type: 'sourceFile', filePath: require.resolve(moduleName) };
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

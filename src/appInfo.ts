// src/appInfo.ts
// Build-time identity for the renderer.
//
// The version is injected by webpack from package.json (see webpack.config.js)
// so the UI, the installer, and the package manifest can never disagree. Three
// different versions were displayed across the app before this existed.

declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__
    ? __APP_VERSION__
    : '0.0.0';

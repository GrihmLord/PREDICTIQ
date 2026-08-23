module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // The Electron main process and preload are Node, not React Native.
      // Without this the shared preset flags Buffer, Response, URL, and the
      // rest of the Node/web platform surface as undefined globals.
      files: ['electron/**/*.js'],
      env: {
        node: true,
        es2022: true,
      },
      globals: {
        // Provided by Electron's Node runtime via undici.
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
      },
    },
    {
      files: ['**/__tests__/**/*.{js,ts,tsx}', '**/__mocks__/**/*.js'],
      env: {
        node: true,
        jest: true,
        es2022: true,
      },
    },
    {
      files: ['*.config.js', '.eslintrc.js', '.prettierrc.js', 'index.js', 'index.web.js'],
      env: {
        node: true,
      },
    },
  ],
};

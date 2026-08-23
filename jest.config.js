module.exports = {
  // Deliberately not the react-native preset. Everything under test is plain
  // TypeScript — the analysis engine, the validators, and the main-process
  // security helpers — so pulling in the RN environment and its haste crawl
  // over android/, ios/ and release/ only cost minutes per run.
  testEnvironment: 'node',

  transform: {
    '^.+.(js|jsx|ts|tsx)$': ['babel-jest', {configFile: './babel.config.js'}],
  },

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // electron only exists inside a running Electron app; the mock provides the
  // narrow surface the main-process helpers touch.
  moduleNameMapper: {
    '^electron$': '<rootDir>/electron/__mocks__/electron.js',
  },

  roots: ['<rootDir>/src', '<rootDir>/electron'],

  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.(ts|tsx|js)',
    '<rootDir>/electron/__tests__/**/*.test.js',
  ],

  modulePathIgnorePatterns: [
    '<rootDir>/release/',
    '<rootDir>/dist/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
    '<rootDir>/logs/',
  ],

  collectCoverageFrom: [
    'src/lib/**/*.ts',
    'src/services/**/*.ts',
    'electron/lib/**/*.js',
    '!**/__mocks__/**',
  ],
};

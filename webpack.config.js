const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const WebpackObfuscator = require('webpack-obfuscator');

const appDirectory = path.resolve(__dirname);
const isDev = process.env.NODE_ENV !== 'production';
const {version} = require('./package.json');

const compileNodeModules = ['react-native-gesture-handler'].map(moduleName =>
  path.resolve(appDirectory, `node_modules/${moduleName}`),
);

const babelLoaderConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/,
  include: [
    path.resolve(appDirectory, 'index.web.js'),
    path.resolve(appDirectory, 'src'),
    ...compileNodeModules,
  ],
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      presets: [
        'module:metro-react-native-babel-preset',
        ['@babel/preset-env', {targets: {browsers: ['last 2 versions']}}],
      ],
      plugins: ['react-native-web'],
    },
  },
};

const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg)$/,
  use: {
    loader: 'url-loader',
    options: {
      name: '[name].[ext]',
      esModule: false,
    },
  },
};

/**
 * Content Security Policy for the renderer.
 *
 * Development needs eval (webpack's eval-source-map) and a websocket for hot
 * reload; production needs neither, so the two are kept apart rather than
 * shipping the permissive policy to users. The Electron main process sets the
 * same policy as a response header — this meta tag is the second layer, and it
 * is what protects the plain-browser build, which has no main process.
 */
const PROD_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.gdeltproject.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

const DEV_CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.gdeltproject.org ws://127.0.0.1:8080 http://127.0.0.1:8080",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: path.resolve(appDirectory, 'index.web.js'),
  output: {
    path: path.resolve(appDirectory, 'dist'),
    filename: 'bundle.web.js',
    publicPath: isDev ? '/' : './',
    clean: true,
  },
  devServer: {
    static: {
      directory: path.resolve(appDirectory, 'public'),
    },
    // Bound to loopback and restricted to localhost hosts. The previous
    // config sent Access-Control-Allow-Origin: * with no allowedHosts,
    // which let any page in the browser read the dev bundle and left the
    // server open to DNS rebinding.
    host: '127.0.0.1',
    port: 8080,
    allowedHosts: ['localhost', '127.0.0.1'],
    hot: true,
    historyApiFallback: true,
    client: {
      overlay: {errors: true, warnings: false},
    },
  },
  resolve: {
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.tsx',
      '.ts',
      '.web.js',
      '.js',
      '.jsx',
    ],
    alias: {
      'react-native$': 'react-native-web',
      'react-native-reanimated': path.resolve(
        appDirectory,
        'src/__mocks__/reanimated-mock.js',
      ),
    },
    fallback: {
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      buffer: false,
      http: false,
      https: false,
      zlib: false,
      net: false,
      tls: false,
      child_process: false,
    },
  },
  module: {
    rules: [
      babelLoaderConfiguration,
      imageLoaderConfiguration,
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(appDirectory, 'public/index.html'),
      inject: true,
      templateParameters: {
        csp: isDev ? DEV_CSP : PROD_CSP,
      },
    }),
    // Static assets (the globe texture) are copied rather than inlined so
    // the bundle does not carry a megabyte of base64.
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(appDirectory, 'public/assets'),
          to: path.resolve(appDirectory, 'dist/assets'),
          noErrorOnMissing: true,
        },
      ],
    }),
    new webpack.DefinePlugin({
      __DEV__: isDev,
      // Single source of truth for the version shown in the UI.
      __APP_VERSION__: JSON.stringify(version),
      'process.env.NODE_ENV': JSON.stringify(
        isDev ? 'development' : 'production',
      ),
    }),
    new webpack.NormalModuleReplacementPlugin(/^node:/, resource => {
      resource.request = resource.request.replace(/^node:/, '');
    }),
    ...(!isDev
      ? [
          new WebpackObfuscator(
            {
              rotateStringArray: true,
              stringArray: true,
              stringArrayThreshold: 0.75,
            },
            [],
          ),
        ]
      : []),
  ],
  devtool: isDev ? 'eval-source-map' : false,
};

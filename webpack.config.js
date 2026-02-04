const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const WebpackObfuscator = require('webpack-obfuscator');

const appDirectory = path.resolve(__dirname);
const isDev = process.env.NODE_ENV !== 'production';

const compileNodeModules = [
    'react-native-gesture-handler',
].map((moduleName) => path.resolve(appDirectory, `node_modules/${moduleName}`));

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
                ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
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

module.exports = {
    mode: isDev ? 'development' : 'production',
    entry: path.resolve(appDirectory, 'index.web.js'),
    output: {
        path: path.resolve(appDirectory, 'dist'),
        filename: 'bundle.web.js',
        publicPath: isDev ? '/' : './',
    },
    devServer: {
        static: {
            directory: path.resolve(appDirectory, 'public'),
        },
        port: 8080,
        hot: true,
        historyApiFallback: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    },
    resolve: {
        extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.jsx'],
        alias: {
            'react-native$': 'react-native-web',
            'react-native-reanimated': path.resolve(appDirectory, 'src/__mocks__/reanimated-mock.js'),
        },
        fallback: {
            "fs": false,
            "path": false,
            "os": false,
            "crypto": false,
            "stream": false,
            "buffer": false,
            "http": false,
            "https": false,
            "zlib": false,
            "net": false,
            "tls": false,
            "child_process": false
        }
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
        }),
        new webpack.DefinePlugin({
            __DEV__: isDev,
            'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
        }),
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
            resource.request = resource.request.replace(/^node:/, '');
        }),
        ...(!isDev ? [
            new WebpackObfuscator({
                rotateStringArray: true,
                stringArray: true,
                stringArrayThreshold: 0.75,
            }, []),
        ] : []),
    ],
    devtool: isDev ? 'eval-source-map' : false,
};

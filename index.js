// index.js
// React Native entry point

// IMPORTANT: Must be at the very top for React Navigation
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

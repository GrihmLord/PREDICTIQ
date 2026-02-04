/**
 * PREDICTIQ Web Entry Point
 * Copyright (c) 2026 GrihmLord / PREDICTIQ. All rights reserved.
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

// Register and run
AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, {
    initialProps: {},
    rootTag: document.getElementById('root'),
});

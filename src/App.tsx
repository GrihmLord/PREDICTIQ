// src/App.tsx
// Main application entry point

import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import store from './redux/store';
import AppNavigator from './navigation/AppNavigator';
import { colors } from './styles';

const App: React.FC = () => {
    return (
        <Provider store={store}>
            <SafeAreaProvider>
                <StatusBar
                    barStyle="dark-content"
                    backgroundColor={colors.light.background}
                />
                <AppNavigator />
            </SafeAreaProvider>
        </Provider>
    );
};

export default App;

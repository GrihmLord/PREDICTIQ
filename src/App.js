// Path: src/App.js
import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import SampleComponent from './components/SampleComponent';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

const App = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <SampleComponent text="Hello from SampleComponent!" />
    </SafeAreaView>
  );
};

export default App;

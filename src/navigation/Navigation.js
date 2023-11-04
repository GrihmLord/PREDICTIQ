import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types'; // Only one import for PropTypes
import { NavigationContainer } from '@react-navigation/native';
// Removed unused imports

// ... rest of your code

const SettingsButton = ({ navigation }) => (
  <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
    <Text style={styles.headerButton}>Settings</Text>
  </TouchableOpacity>
);


SettingsButton.propTypes = {
  // ... propTypes definition
};

// ... rest of your code

function HomeScreen({ navigation }) {
  // ... rest of your component
}

HomeScreen.propTypes = {
  // ... propTypes definition
};

// ... rest of your code

export default AppNavigation;

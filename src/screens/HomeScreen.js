// Step 1: Group all imports together
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Button, Image, ScrollView } from 'react-native';
import PropTypes from 'prop-types'; // Import PropTypes

// Step 2: Define your component
function HomeScreen({ navigation }) {
  const handlePress = () => {
    // Placeholder for any action like navigation or opening a modal
    console.log('Button pressed');
    // Example: navigation.navigate('Details');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Image
          source={{ uri: 'https://placeimg.com/640/480/any' }}
          style={styles.image}
          accessibilityLabel="Random placeholder image"
        />
        <View style={styles.content}>
          <Text style={styles.text} accessibilityLabel="Welcome message">
            Welcome to the Home Screen!
          </Text>
          <Button
            title="Click Me"
            onPress={handlePress}
            color="#1E90FF"
            accessibilityLabel="Tap me to perform an action"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Step 3: Define PropTypes after the component
HomeScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

// Step 4: Export your component
export default HomeScreen;

// Styles are typically defined after the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    marginTop: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  image: {
    width: 300,
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
});

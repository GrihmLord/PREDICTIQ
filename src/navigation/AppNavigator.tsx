// src/navigation/AppNavigator.tsx
// Main navigation configuration with tabs and stacks

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text, StyleSheet} from 'react-native';

import {
  DashboardScreen,
  NewScenarioScreen,
  ResultsScreen,
  HistoryScreen,
  SettingsScreen,
} from '../screens';
import {colors, typography, spacing} from '../styles';

// Define the param lists for type safety
export type RootStackParamList = {
  MainTabs: undefined;
  NewScenario: undefined;
  Results: {scenarioId: string; isNew?: boolean};
};

export type MainTabParamList = {
  Dashboard: undefined;
  History: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Simple icon component (replace with proper icon library in production)
const TabIcon: React.FC<{name: string; focused: boolean}> = ({
  name,
  focused,
}) => {
  const icons: Record<string, string> = {
    Dashboard: '📊',
    History: '📋',
    Settings: '⚙️',
  };

  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {icons[name] || '📱'}
    </Text>
  );
};

// Bottom Tab Navigator
const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused}) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.light.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
      })}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerTitle: 'PREDICTIQ',
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'History',
          headerTitle: 'Prediction History',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};

// Main Stack Navigator
const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerBackTitleVisible: false,
          headerTintColor: colors.primary.main,
          headerShadowVisible: false,
        }}>
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="NewScenario"
          component={NewScenarioScreen}
          options={{
            title: 'New Scenario',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={{
            title: 'Prediction Results',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.light.surface,
    borderTopColor: colors.light.border,
    borderTopWidth: 1,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    height: 65,
  },
  tabBarLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  tabIcon: {
    fontSize: 22,
    marginTop: spacing.xs,
  },
  tabIconFocused: {
    transform: [{scale: 1.1}],
  },
  header: {
    backgroundColor: colors.light.background,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.light.textPrimary,
  },
});

export default AppNavigator;

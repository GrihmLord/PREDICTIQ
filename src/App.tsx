// src/App.tsx
// Main application entry point - Modular Architecture

import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {Provider} from 'react-redux';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import store from './redux/store';
import {DashboardScreen} from './screens_web/DashboardScreen';
import {HistoryScreen} from './screens_web/HistoryScreen';
import {SettingsScreen} from './screens_web/SettingsScreen';

import {ThemeProvider} from './context/ThemeContext';
import {colors} from './styles/colors';

type TabName = 'Dashboard' | 'History' | 'Settings';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard');
  const insets = useSafeAreaInsets();

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardScreen onNavigate={t => setActiveTab(t as TabName)} />;
      case 'History':
        return <HistoryScreen />;
      case 'Settings':
        return <SettingsScreen />;
    }
  };

  const tabs: {name: TabName; icon: string}[] = [
    {name: 'Dashboard', icon: '📊'},
    {name: 'History', icon: '📋'},
    {name: 'Settings', icon: '⚙️'},
  ];

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>PREDICTIQ</Text>
          <Text style={styles.headerSubtitle}>{activeTab}</Text>
        </View>
        <View style={styles.userAvatar}>
          <Text style={styles.userInitials}>DQ</Text>
        </View>
      </View>

      {/* Content */}
      <View style={{flex: 1}}>{renderContent()}</View>

      {/* Bottom Navigation */}
      <View
        style={[
          styles.bottomNav,
          {paddingBottom: Math.max(insets.bottom, 10)},
        ]}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.name}
            style={styles.navItem}
            onPress={() => setActiveTab(tab.name)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.navIcon,
                activeTab === tab.name && styles.navIconActive,
              ]}>
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.navLabel,
                activeTab === tab.name && styles.navLabelActive,
              ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <MainApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.dark.background},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: colors.dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.dark.textPrimary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.dark.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userInitials: {color: '#FFF', fontWeight: 'bold', fontSize: 15},
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  navItem: {flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8},
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5,
    color: colors.dark.textMuted,
  },
  navIconActive: {opacity: 1, color: colors.primary.main},
  navLabel: {fontSize: 11, color: colors.dark.textMuted, fontWeight: '500'},
  navLabelActive: {color: colors.primary.main, fontWeight: '700'},
});

export default App;

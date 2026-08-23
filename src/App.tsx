// src/App.tsx
// Application shell: bootstraps persistence, then renders the tab surface.

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
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
import {ErrorBoundary} from './components/ErrorBoundary';
import {storageService} from './services/storageService';
import {authService} from './services/AuthService';
import {colors} from './styles/colors';

type TabName = 'Dashboard' | 'History' | 'Settings';

const TABS: {name: TabName; icon: string}[] = [
  {name: 'Dashboard', icon: '📊'},
  {name: 'History', icon: '📋'},
  {name: 'Settings', icon: '⚙️'},
];

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard');
  const insets = useSafeAreaInsets();

  const renderContent = () => {
    switch (activeTab) {
      case 'History':
        return <HistoryScreen />;
      case 'Settings':
        return <SettingsScreen />;
      default:
        return (
          <DashboardScreen onNavigate={tab => setActiveTab(tab as TabName)} />
        );
    }
  };

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>PREDICTIQ</Text>
          <Text style={styles.headerSubtitle}>{activeTab}</Text>
        </View>
        <OperatorBadge />
      </View>

      {/* Keyed so switching tabs clears a boundary that has tripped, rather
          than leaving the operator stuck on the error state. */}
      <View style={styles.body}>
        <ErrorBoundary key={activeTab} label={activeTab}>
          {renderContent()}
        </ErrorBoundary>
      </View>

      <View
        style={[
          styles.bottomNav,
          {paddingBottom: Math.max(insets.bottom, 10)},
        ]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.name}
            style={styles.navItem}
            onPress={() => setActiveTab(tab.name)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{selected: activeTab === tab.name}}>
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

/** Shows the signed-in operator's initials, or a neutral marker when unauthenticated. */
const OperatorBadge: React.FC = () => {
  const profile = authService.getCurrentUser();
  const initials = profile
    ? profile.name
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('')
    : '—';

  return (
    <View
      style={styles.userAvatar}
      accessibilityLabel={profile ? profile.name : 'Not signed in'}>
      <Text style={styles.userInitials}>{initials}</Text>
    </View>
  );
};

const Splash: React.FC<{message: string; error?: boolean}> = ({
  message,
  error,
}) => (
  <View style={styles.splash}>
    {!error && <ActivityIndicator color={colors.primary.main} size="large" />}
    <Text style={[styles.splashText, error && styles.splashError]}>
      {message}
    </Text>
  </View>
);

const App: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  // Persistence is loaded once, before any screen renders, so no screen
  // observes an empty store that is about to fill in.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await storageService.hydrate();
        await authService.refresh();
      } catch (error) {
        if (!cancelled) {
          setBootError(
            error instanceof Error
              ? error.message
              : 'Stored data could not be loaded.',
          );
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <Splash message="Initializing secure environment…" />;
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary label="PREDICTIQ">
            {bootError && <Splash message={bootError} error />}
            <MainApp />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.dark.background},
  body: {flex: 1},
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.background,
    padding: 24,
  },
  splashText: {
    color: colors.dark.textSecondary,
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  splashError: {color: colors.warning.high},
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

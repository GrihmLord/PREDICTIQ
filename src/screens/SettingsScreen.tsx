// src/screens/SettingsScreen.tsx
// App settings screen

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import {colors, spacing, typography, borderRadius, shadows} from '../styles';
import {useAppSelector, useAppDispatch} from '../redux/hooks';
import {
  setThemeMode,
  setNotificationsEnabled,
  setAutoSave,
  resetSettings,
  ThemeMode,
} from '../redux/slices/settingsSlice';
import {storageService} from '../services/storageService';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector(state => state.settings);
  const scenariosCount = useAppSelector(
    state => state.scenarios.scenarios.length,
  );

  const handleThemeChange = (mode: ThemeMode) => {
    dispatch(setThemeMode(mode));
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all scenarios and reset settings. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await storageService.clearAll();
            dispatch(resetSettings());
            Alert.alert('Success', 'All data has been cleared.');
          },
        },
      ],
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'PREDICTIQ',
      'Version 1.0.0\n\nA predictive analytics platform that harnesses the power of AI and data science to quantify the likelihood of success.\n\n© 2024 PREDICTIQ',
      [{text: 'OK'}],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>

          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>Theme</Text>
            <View style={styles.themeOptions}>
              {(['light', 'dark', 'system'] as ThemeMode[]).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.themeOption,
                    settings.themeMode === mode && styles.themeOptionActive,
                  ]}
                  onPress={() => handleThemeChange(mode)}>
                  <Text
                    style={[
                      styles.themeOptionText,
                      settings.themeMode === mode &&
                        styles.themeOptionTextActive,
                    ]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive alerts about predictions
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={value => {
                dispatch(setNotificationsEnabled(value));
              }}
              trackColor={{
                false: colors.light.border,
                true: colors.primary.main,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Save</Text>
              <Text style={styles.settingDescription}>
                Automatically save scenarios locally
              </Text>
            </View>
            <Switch
              value={settings.autoSave}
              onValueChange={value => {
                dispatch(setAutoSave(value));
              }}
              trackColor={{
                false: colors.light.border,
                true: colors.primary.main,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>

          <View style={styles.infoRow}>
            <Text style={styles.settingLabel}>Saved Scenarios</Text>
            <Text style={styles.infoValue}>{scenariosCount}</Text>
          </View>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearData}>
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity style={styles.linkRow} onPress={handleAbout}>
            <Text style={styles.settingLabel}>About PREDICTIQ</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() =>
              Linking.openURL('https://github.com/GrihmLord/PREDICTIQ')
            }>
            <Text style={styles.settingLabel}>View on GitHub</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Version Footer */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.copyrightText}>© 2024 PREDICTIQ</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  settingGroup: {
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.light.textPrimary,
  },
  settingDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.light.textSecondary,
    marginTop: spacing.xs,
  },
  themeOptions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  themeOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.light.surfaceAlt,
    alignItems: 'center',
  },
  themeOptionActive: {
    backgroundColor: colors.primary.main,
  },
  themeOptionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.light.textSecondary,
  },
  themeOptionTextActive: {
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  infoValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.main,
  },
  dangerButton: {
    backgroundColor: colors.danger.high + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.danger.high,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  chevron: {
    fontSize: typography.fontSize.xl,
    color: colors.light.textMuted,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  versionText: {
    fontSize: typography.fontSize.sm,
    color: colors.light.textMuted,
  },
  copyrightText: {
    fontSize: typography.fontSize.xs,
    color: colors.light.textMuted,
    marginTop: spacing.xs,
  },
});

export default SettingsScreen;

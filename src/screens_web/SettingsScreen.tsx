// src/screens_web/SettingsScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import {storageService} from '../services/storageService';
import {authService, UserProfile} from '../services/AuthService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../styles/colors';
import {useTheme} from '../context/ThemeContext';

// Safely import electron utils if available
let fs: any;
let path: any;
let os: any;
let electron: any;
if (typeof window !== 'undefined' && window.require) {
  try {
    fs = window.require('fs');
    path = window.require('path');
    os = window.require('os');
    electron = window.require('electron');
  } catch (e) {
    console.warn('Electron modules not available');
  }
}

// Web-specific style helper
const getWebStyle = (style: any) => (Platform.OS === 'web' ? style : {});

// --- Reusable UI Components ---

const SectionHeader = ({title, icon}: {title: string; icon: string}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionIcon}>{icon}</Text>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const SegmentedControl = ({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: any;
  onChange: (val: any) => void;
}) => (
  <View style={styles.segmentedContainer}>
    {options.map(opt => (
      <TouchableOpacity
        key={opt}
        style={[styles.segmentBtn, value === opt && styles.segmentBtnActive]}
        onPress={() => onChange(opt)}>
        <Text
          style={[
            styles.segmentText,
            value === opt && styles.segmentTextActive,
          ]}>
          {opt}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// --- Settings Screen ---

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {brandColors, updateBrandColor, resetbranding} = useTheme();
  const [settings, setSettings] = useState<any>({});
  const [apiKeyHidden, setApiKeyHidden] = useState(true);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importContent, setImportContent] = useState('');

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    loadSettings();
    checkLoginStatus();
  }, []);

  const checkLoginStatus = () => {
    const user = authService.getCurrentUser();
    setUserProfile(user);
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const user = await authService.loginWithSSO();
      setUserProfile(user);
      Alert.alert('Authenticated', `Welcome back, ${user.name}.`);
    } catch (error) {
      Alert.alert('Login Failed', 'Could not connect to Identity Provider.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUserProfile(null);
  };

  const loadSettings = async () => {
    const saved = storageService.getSettings();
    setSettings(saved);
  };

  const updateSetting = (key: string, value: any) => {
    const newSettings = {...settings, [key]: value};
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  // Actions
  const handleExport = () => {
    if (!fs || !os || !path) {
      return alert('Export available on Desktop only.');
    }
    try {
      const history = storageService.getHistory();
      const exportData = JSON.stringify(history, null, 2);
      const desktopPath = path.join(
        os.homedir(),
        'Desktop',
        `PREDICTIQ_Export_${Date.now()}.json`,
      );
      fs.writeFileSync(desktopPath, exportData);
      alert(`Saved to Desktop:\n${desktopPath}`);
    } catch (e: any) {
      alert('Export failed: ' + e.message);
    }
  };

  const handleExportCSV = () => {
    if (!fs || !os || !path) {
      return alert('Export available on Desktop only.');
    }
    try {
      const history = storageService.getHistory();
      const headers = [
        'ID',
        'Timestamp',
        'Scenario',
        'Risk Score',
        'DEFCON',
        'Experts',
      ];
      const rows = history.map((h: any) => [
        h.id,
        h.timestamp,
        `"${h.scenario.substring(0, 50)}..."`,
        h.riskScore,
        h.defconLevel,
        `"${h.experts.map((e: any) => e.name).join(', ')}"`,
      ]);
      const csvContent = [
        headers.join(','),
        ...rows.map((r: any[]) => r.join(',')),
      ].join('\n');
      const desktopPath = path.join(
        os.homedir(),
        'Desktop',
        `PREDICTIQ_Export_${Date.now()}.csv`,
      );
      fs.writeFileSync(desktopPath, csvContent);
      alert(`Saved CSV to Desktop:\n${desktopPath}`);
    } catch (e: any) {
      alert('Export failed: ' + e.message);
    }
  };

  const handleImport = () => {
    try {
      const success = storageService.importHistory(importContent);
      if (success) {
        alert('History restored successfully!');
        setImportModalVisible(false);
        setImportContent('');
      } else {
        alert('Import failed. Invalid JSON format.');
      }
    } catch (e) {
      alert('Import error.');
    }
  };

  const handleClearHistory = () => {
    // web-compatible confirm
    if (
      confirm(
        '⚠️ NUCLEAR OPTION ⚠️\n\nAre you sure you want to delete ALL simulation history? This cannot be undone.',
      )
    ) {
      storageService.clearHistory();
      alert('System memory wiped.');
    }
  };

  if (!settings.riskSensitivity) {
    return <View style={styles.container} />;
  } // Loading

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        {paddingBottom: Math.max(insets.bottom, 20) + 20},
      ]}>
      {/* Background Gradient Layer - Matched to DashboardScreen Structural Pattern */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View
          style={[
            styles.gradientBg,
            getWebStyle({
              backgroundImage: `linear-gradient(160deg, ${colors.dark.background} 0%, #1e1b4b 100%)`,
            }),
          ]}
        />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Configuration</Text>
        <Text style={styles.headerSubtitle}>v1.2.0 • Build 240204</Text>
      </View>

      {/* 0. Enterprise Branding (New) */}
      <SectionHeader title="Enterprise Branding" icon="🎨" />
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingTitle}>Brand Identity</Text>
            <Text style={styles.settingDesc}>
              Customize primary interface accent.
            </Text>
          </View>
          <TouchableOpacity onPress={resetbranding}>
            <Text style={{color: colors.primary.main, fontSize: 12}}>
              Reset
            </Text>
          </TouchableOpacity>
        </View>

        {/* Color Presets */}
        <View style={styles.brandPresetRow}>
          {[
            {name: 'Indigo', value: '#6366F1'},
            {name: 'Cyber', value: '#06B6D4'},
            {name: 'Crimson', value: '#EF4444'},
            {name: 'Emerald', value: '#10B981'},
            {name: 'Gold', value: '#F59E0B'},
          ].map(color => (
            <TouchableOpacity
              key={color.name}
              style={[
                styles.colorBtn,
                {backgroundColor: color.value},
                brandColors.primary === color.value && styles.colorBtnActive,
              ]}
              onPress={() => updateBrandColor('primary', color.value)}
            />
          ))}
        </View>

        {/* Hex Input */}
        <View style={[styles.inputWrapper, {marginTop: 12}]}>
          <Text style={[styles.label, {marginBottom: 0, marginRight: 12}]}>
            HEX CODE
          </Text>
          <TextInput
            style={[styles.input, {fontFamily: 'monospace'}]}
            value={brandColors.primary}
            onChangeText={text => updateBrandColor('primary', text)}
            placeholder="#000000"
            placeholderTextColor={colors.dark.textMuted}
            maxLength={9}
          />
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: brandColors.primary,
              marginLeft: 12,
              borderWidth: 1,
              borderColor: '#FFF',
            }}
          />
        </View>
      </View>

      {/* 1. Neural Engine */}
      <SectionHeader title="Neural Engine" icon="🧠" />
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingTitle}>Risk Sensitivity</Text>
            <Text style={styles.settingDesc}>
              Adjust threat detection threshold.
            </Text>
          </View>
        </View>
        <SegmentedControl
          options={['Conservative', 'Balanced', 'Aggressive']}
          value={settings.riskSensitivity}
          onChange={val => updateSetting('riskSensitivity', val)}
        />

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingTitle}>
              Creativity (Temperature): {settings.temperature}
            </Text>
            <Text style={styles.settingDesc}>
              Variance in simulation outcomes.
            </Text>
          </View>
        </View>
        <View style={styles.tempControls}>
          {[0.1, 0.5, 0.7, 1.0].map(val => (
            <TouchableOpacity
              key={val}
              style={[
                styles.tempBtn,
                settings.temperature === val && styles.tempBtnActive,
              ]}
              onPress={() => updateSetting('temperature', val)}>
              <Text style={styles.tempBtnText}>{val}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingTitle}>Cinematic Mode</Text>
            <Text style={styles.settingDesc}>
              Simulate "thought process" latency.
            </Text>
          </View>
          <Switch
            value={settings.analysisSpeed === 'Cinematic'}
            onValueChange={val =>
              updateSetting('analysisSpeed', val ? 'Cinematic' : 'Instant')
            }
            trackColor={{false: colors.dark.border, true: colors.primary.main}}
          />
        </View>
      </View>

      {/* 2. Connectivity */}
      <SectionHeader title="Connectivity" icon="🔌" />
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <Text style={styles.settingTitle}>AI Provider</Text>
        </View>
        <SegmentedControl
          options={['Local', 'OpenAI', 'Anthropic']}
          value={settings.aiProvider}
          onChange={val => updateSetting('aiProvider', val)}
        />

        {settings.aiProvider !== 'Local' && (
          <View style={styles.apiKeyContainer}>
            <Text style={styles.label}>API Key</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={settings.apiKey}
                onChangeText={text => updateSetting('apiKey', text)}
                secureTextEntry={apiKeyHidden}
                placeholder="sk-..."
                placeholderTextColor={colors.dark.textMuted}
              />
              <TouchableOpacity onPress={() => setApiKeyHidden(!apiKeyHidden)}>
                <Text style={styles.eyeIcon}>{apiKeyHidden ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 6. Security (SSO) */}
      <SectionHeader title="Authentication" icon="🔐" />
      <View style={styles.card}>
        {userProfile ? (
          <View>
            <View style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {userProfile.name.charAt(0)}
                </Text>
              </View>
              <View>
                <Text style={styles.userName}>{userProfile.name}</Text>
                <Text style={styles.userEmail}>
                  {userProfile.email} • {userProfile.role}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Disconnect ID</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.ssoButton}
            onPress={handleLogin}
            disabled={isLoggingIn}>
            {isLoggingIn ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.ssoIcon}>🏢</Text>
                <Text style={styles.ssoText}>Connect with Enterprise ID</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <SectionHeader title="System Information" icon="ℹ️" />
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingTitle}>Retention Policy</Text>
            <Text style={styles.settingDesc}>Auto-prune old logs.</Text>
          </View>
          <View style={styles.retentionRow}>
            {[7, 30, 90, -1].map(days => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.retentionBtn,
                  settings.retentionDays === days && styles.retentionBtnActive,
                ]}
                onPress={() => updateSetting('retentionDays', days)}>
                <Text style={styles.retentionText}>
                  {days === -1 ? 'Forever' : `${days}d`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionLabel}>Export JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleExportCSV}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setImportModalVisible(true)}>
            <Text style={styles.actionIcon}>📥</Text>
            <Text style={styles.actionLabel}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.dangerBtn]}
            onPress={handleClearHistory}>
            <Text style={styles.actionIcon}>☢️</Text>
            <Text style={[styles.actionLabel, styles.dangerText]}>
              Wipe Data
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Accessibility */}
      <SectionHeader title="Accessibility & UX" icon="👓" />
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingTitle}>Compact Mode</Text>
            <Text style={styles.settingDesc}>
              Increase information density.
            </Text>
          </View>
          <Switch
            value={settings.compactMode}
            onValueChange={val => updateSetting('compactMode', val)}
            trackColor={{false: colors.dark.border, true: colors.primary.main}}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingTitle}>Reduced Motion</Text>
            <Text style={styles.settingDesc}>Disable complex animations.</Text>
          </View>
          <Switch
            value={settings.reducedMotion}
            onValueChange={val => updateSetting('reducedMotion', val)}
            trackColor={{false: colors.dark.border, true: colors.primary.main}}
          />
        </View>
      </View>

      <Text style={styles.footerText}>
        PREDICTIQ Secure Environment • All Systems Nominal
      </Text>

      {/* Import Modal */}
      <Modal visible={importModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Import History JSON</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              placeholder="Paste JSON content here..."
              placeholderTextColor={colors.dark.textMuted}
              value={importContent}
              onChangeText={setImportContent}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setImportModalVisible(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleImport}>
                <Text style={styles.btnText}>Import Data</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.dark.background},
  gradientBg: {flex: 1, opacity: 0.8},
  contentContainer: {padding: 20, flexGrow: 1}, // Added flexGrow: 1 for safety
  header: {marginBottom: 24},
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.dark.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.dark.textSecondary,
    marginTop: 4,
    letterSpacing: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionIcon: {fontSize: 18, marginRight: 8},
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  card: {
    backgroundColor: colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.dark.textPrimary,
  },
  settingDesc: {fontSize: 13, color: colors.dark.textSecondary, marginTop: 2},
  divider: {height: 1, backgroundColor: colors.dark.border, marginVertical: 12},

  // Segmented Control
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.dark.background,
    borderRadius: 8,
    padding: 4,
    marginTop: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActive: {backgroundColor: colors.dark.border},
  segmentText: {
    color: colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  segmentTextActive: {color: colors.dark.textPrimary},

  // Temp Controls
  tempControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  tempBtn: {
    flex: 1,
    backgroundColor: colors.dark.background,
    padding: 8,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tempBtnActive: {
    borderColor: colors.primary.main,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  tempBtnText: {color: colors.dark.textPrimary, fontWeight: 'bold'},

  // Connectivity
  apiKeyContainer: {
    marginTop: 16,
    backgroundColor: colors.dark.background,
    padding: 12,
    borderRadius: 8,
  },
  label: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputWrapper: {flexDirection: 'row', alignItems: 'center'},
  input: {flex: 1, color: colors.dark.textPrimary, fontSize: 14, padding: 0},
  eyeIcon: {padding: 4, fontSize: 18},

  // Retention
  retentionRow: {flexDirection: 'row'},
  retentionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.dark.background,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  retentionBtnActive: {
    borderColor: colors.primary.main,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  retentionText: {color: colors.dark.textPrimary, fontSize: 12},

  // Action Grid
  actionGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8},
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.dark.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dangerBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
  },
  actionIcon: {marginRight: 8, fontSize: 16},
  actionLabel: {color: colors.dark.textMuted, fontSize: 13, fontWeight: '500'},
  dangerText: {color: colors.danger.high},

  footerText: {
    textAlign: 'center',
    color: colors.dark.textMuted,
    fontSize: 12,
    paddingBottom: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.dark.surface,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    color: colors.dark.textPrimary,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.dark.background,
    color: colors.dark.textPrimary,
    borderRadius: 8,
    padding: 12,
    height: 200,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelBtn: {padding: 10},
  confirmBtn: {
    backgroundColor: colors.primary.main,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  btnText: {color: '#FFF', fontWeight: 'bold'},

  // Branding
  brandPresetRow: {flexDirection: 'row', gap: 12, marginBottom: 16},
  colorBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorBtnActive: {borderColor: '#FFF'},
});

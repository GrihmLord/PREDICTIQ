// src/screens_web/SettingsScreen.tsx
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Switch,
  TextInput,
  Platform,
  Modal,
} from 'react-native';
import {
  storageService,
  AppSettings,
  isValidHexColor,
} from '../services/storageService';
import {authService} from '../services/AuthService';
import {AuthStatus, AppInfo, getBridge} from '../services/bridge';
import {exportService} from '../services/exportService';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors} from '../styles/colors';
import {useTheme} from '../context/ThemeContext';
import {APP_VERSION} from '../appInfo';

const getWebStyle = (style: any) => (Platform.OS === 'web' ? style : {});

const BRAND_PRESETS = [
  {name: 'Indigo', value: '#6366F1'},
  {name: 'Cyber', value: '#06B6D4'},
  {name: 'Crimson', value: '#EF4444'},
  {name: 'Emerald', value: '#10B981'},
  {name: 'Gold', value: '#F59E0B'},
];

const PROVIDER_MODELS: Record<string, string> = {
  Anthropic: 'claude-opus-5',
  OpenAI: 'gpt-4o',
};

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
  value: string;
  onChange: (val: string) => void;
}) => (
  <View style={styles.segmentedContainer}>
    {options.map(opt => (
      <TouchableOpacity
        key={opt}
        accessibilityRole="button"
        accessibilityState={{selected: value === opt}}
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

/** Inline status line; replaces the browser alert() calls this screen used. */
const Notice = ({
  tone,
  message,
}: {
  tone: 'info' | 'error' | 'success';
  message: string;
}) => (
  <View
    style={[
      styles.notice,
      tone === 'error' && styles.noticeError,
      tone === 'success' && styles.noticeSuccess,
    ]}>
    <Text style={styles.noticeText}>{message}</Text>
  </View>
);

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {brandColors, updateBrandColor, resetBranding} = useTheme();

  const [settings, setSettings] = useState<AppSettings>(() =>
    storageService.getSettings(),
  );
  const [hexDraft, setHexDraft] = useState(brandColors.primary);
  const [notice, setNotice] = useState<{
    tone: 'info' | 'error' | 'success';
    message: string;
  } | null>(null);

  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [apiKeyStored, setApiKeyStored] = useState(false);
  const [apiKeyBusy, setApiKeyBusy] = useState(false);

  const [auth, setAuth] = useState<AuthStatus>(authService.getStatus());
  const [authBusy, setAuthBusy] = useState(false);

  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importContent, setImportContent] = useState('');

  const [confirmWipeVisible, setConfirmWipeVisible] = useState(false);

  const bridge = getBridge();
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback(
    (tone: 'info' | 'error' | 'success', message: string) => {
      setNotice({tone, message});
      if (noticeTimer.current) {
        clearTimeout(noticeTimer.current);
      }
      noticeTimer.current = setTimeout(() => setNotice(null), 6000);
    },
    [],
  );

  useEffect(
    () => () => {
      if (noticeTimer.current) {
        clearTimeout(noticeTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const status = await authService.refresh();
      if (!cancelled) {
        setAuth(status);
      }

      if (bridge) {
        try {
          const [stored, info] = await Promise.all([
            bridge.secrets.has('aiApiKey'),
            bridge.app.info(),
          ]);
          if (!cancelled) {
            setApiKeyStored(stored);
            setAppInfo(info);
          }
        } catch (error) {
          // Diagnostics are best-effort; a failure here must not blank the screen.
          console.warn('[settings] could not read desktop diagnostics', error);
        }
      }
    };

    void load();
    const unsubscribe = storageService.onPersistError(message =>
      announce('error', message),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [bridge, announce]);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      // Optimistic so the control responds immediately; the write is awaited so
      // a persistence failure still surfaces.
      setSettings(current => ({...current, [key]: value}));
      const saved = await storageService.saveSettings({
        [key]: value,
      } as Partial<AppSettings>);
      setSettings(saved);
    },
    [],
  );

  const handleHexChange = (text: string) => {
    setHexDraft(text);
    updateBrandColor('primary', text);
  };

  const handlePreset = (value: string) => {
    setHexDraft(value);
    updateBrandColor('primary', value);
  };

  const handleResetBranding = () => {
    resetBranding();
    setHexDraft('#6366F1');
  };

  // --- Secrets -------------------------------------------------------------

  const handleSaveApiKey = async () => {
    if (!bridge) {
      announce('error', 'API keys can only be stored in the desktop app.');
      return;
    }
    if (apiKeyDraft.trim().length === 0) {
      announce('error', 'Enter a key before saving.');
      return;
    }

    setApiKeyBusy(true);
    try {
      await bridge.secrets.set('aiApiKey', apiKeyDraft.trim());
      setApiKeyStored(true);
      // Held only long enough to store it; the plaintext never lingers in
      // component state or in the persisted settings object.
      setApiKeyDraft('');
      announce('success', 'Key encrypted with the OS keystore.');
    } catch (error) {
      announce(
        'error',
        error instanceof Error ? error.message : 'The key could not be stored.',
      );
    } finally {
      setApiKeyBusy(false);
    }
  };

  const handleClearApiKey = async () => {
    if (!bridge) {
      return;
    }
    setApiKeyBusy(true);
    try {
      await bridge.secrets.clear('aiApiKey');
      setApiKeyStored(false);
      setApiKeyDraft('');
      announce('info', 'Stored key removed.');
    } catch (error) {
      announce('error', 'The key could not be removed.');
    } finally {
      setApiKeyBusy(false);
    }
  };

  // --- Identity ------------------------------------------------------------

  const handleLogin = async () => {
    setAuthBusy(true);
    try {
      const status = await authService.login();
      setAuth(status);
      announce(
        'success',
        'Signed in as ' +
          (status.profile ? status.profile.name : 'operator') +
          '.',
      );
    } catch (error) {
      announce(
        'error',
        error instanceof Error ? error.message : 'Sign-in failed.',
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    try {
      setAuth(await authService.logout());
    } finally {
      setAuthBusy(false);
    }
  };

  // --- Data ----------------------------------------------------------------

  const handleExport = async (format: 'json' | 'csv') => {
    const history = storageService.getHistory();
    if (history.length === 0) {
      announce('error', 'There is nothing to export yet.');
      return;
    }

    const outcome =
      format === 'json'
        ? await exportService.exportHistoryJson(history)
        : await exportService.exportHistoryCsv(history);

    if (outcome.error) {
      announce('error', outcome.error);
    } else if (outcome.saved) {
      announce('success', 'Saved to ' + outcome.path);
    }
  };

  const handleImport = async () => {
    const outcome = await storageService.importHistory(importContent);
    if (!outcome.ok) {
      announce('error', outcome.error || 'The import failed.');
      return;
    }

    setImportModalVisible(false);
    setImportContent('');
    const skippedNote =
      outcome.skipped > 0
        ? ' ' + outcome.skipped + ' unreadable record(s) were skipped.'
        : '';
    announce(
      'success',
      'Restored ' +
        (outcome.value ? outcome.value.length : 0) +
        ' record(s).' +
        skippedNote,
    );
  };

  const handleWipe = async () => {
    setConfirmWipeVisible(false);
    await storageService.clearHistory();
    announce('info', 'All stored assessments were deleted.');
  };

  const providerNeedsKey = settings.aiProvider !== 'Local';
  const modelPlaceholder = PROVIDER_MODELS[settings.aiProvider] || '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        {paddingBottom: Math.max(insets.bottom, 20) + 20},
      ]}>
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
        <Text style={styles.headerSubtitle}>
          v{appInfo ? appInfo.version : APP_VERSION} •{' '}
          {bridge ? 'Desktop' : 'Browser'}
        </Text>
      </View>

      {notice && <Notice tone={notice.tone} message={notice.message} />}

      {/* Enterprise Branding */}
      <SectionHeader title="Enterprise Branding" icon="🎨" />
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingTitle}>Brand Identity</Text>
            <Text style={styles.settingDesc}>
              Customize the primary interface accent.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleResetBranding}
            accessibilityRole="button">
            <Text style={styles.linkText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.brandPresetRow}>
          {BRAND_PRESETS.map(color => (
            <TouchableOpacity
              key={color.name}
              accessibilityRole="button"
              accessibilityLabel={color.name}
              style={[
                styles.colorBtn,
                {backgroundColor: color.value},
                brandColors.primary === color.value && styles.colorBtnActive,
              ]}
              onPress={() => handlePreset(color.value)}
            />
          ))}
        </View>

        <View style={[styles.inputWrapper, {marginTop: 12}]}>
          <Text style={[styles.label, {marginBottom: 0, marginRight: 12}]}>
            HEX CODE
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.monospace,
              !isValidHexColor(hexDraft) && styles.inputInvalid,
            ]}
            value={hexDraft}
            onChangeText={handleHexChange}
            placeholder="#6366F1"
            placeholderTextColor={colors.dark.textMuted}
            autoCapitalize="none"
            maxLength={9}
          />
          <View
            style={[styles.swatch, {backgroundColor: brandColors.primary}]}
          />
        </View>
        {!isValidHexColor(hexDraft) && (
          <Text style={styles.helperTextWarn}>
            Enter a hex colour such as #6366F1 to apply it.
          </Text>
        )}
      </View>

      {/* Neural Engine */}
      <SectionHeader title="Neural Engine" icon="🧠" />
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingTitle}>Risk Sensitivity</Text>
            <Text style={styles.settingDesc}>
              Shifts the escalation curve up or down.
            </Text>
          </View>
        </View>
        <SegmentedControl
          options={['Conservative', 'Balanced', 'Aggressive']}
          value={settings.riskSensitivity}
          onChange={val =>
            updateSetting(
              'riskSensitivity',
              val as AppSettings['riskSensitivity'],
            )
          }
        />

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingTitle}>
              Variance (Temperature): {settings.temperature}
            </Text>
            <Text style={styles.settingDesc}>
              Widens the spread around the deterministic score. The same
              scenario still scores the same way at the same temperature.
            </Text>
          </View>
        </View>
        <View style={styles.tempControls}>
          {[0.1, 0.5, 0.7, 1.0].map(val => (
            <TouchableOpacity
              key={val}
              accessibilityRole="button"
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
          <View style={styles.settingLabel}>
            <Text style={styles.settingTitle}>Cinematic Mode</Text>
            <Text style={styles.settingDesc}>
              Paces the round table so each node reports in turn.
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

      {/* Connectivity */}
      <SectionHeader title="Connectivity" icon="🔌" />
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingTitle}>Analysis Provider</Text>
            <Text style={styles.settingDesc}>
              Local runs entirely offline. A provider adds a written summary on
              top of the council's findings.
            </Text>
          </View>
        </View>
        <SegmentedControl
          options={['Local', 'OpenAI', 'Anthropic']}
          value={settings.aiProvider}
          onChange={val =>
            updateSetting('aiProvider', val as AppSettings['aiProvider'])
          }
        />

        {providerNeedsKey && (
          <View style={styles.apiKeyContainer}>
            {!bridge && (
              <Text style={styles.helperTextWarn}>
                Provider calls need the desktop app: the browser build has no OS
                keystore to hold the key.
              </Text>
            )}

            <Text style={styles.label}>Model</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.monospace]}
                value={settings.model}
                onChangeText={text => updateSetting('model', text)}
                placeholder={modelPlaceholder}
                placeholderTextColor={colors.dark.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <Text style={styles.label}>API Key</Text>
              <View
                style={[
                  styles.pill,
                  apiKeyStored ? styles.pillOk : styles.pillMuted,
                ]}>
                <Text style={styles.pillText}>
                  {apiKeyStored ? 'STORED (ENCRYPTED)' : 'NOT SET'}
                </Text>
              </View>
            </View>

            <Text style={styles.helperText}>
              The key is encrypted by the operating system and used only inside
              the desktop process. It is never read back into the interface, so
              it cannot be displayed again after saving.
            </Text>

            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.monospace]}
                value={apiKeyDraft}
                onChangeText={setApiKeyDraft}
                secureTextEntry
                editable={Boolean(bridge) && !apiKeyBusy}
                placeholder={
                  apiKeyStored
                    ? 'Enter a new key to replace the stored one'
                    : 'sk-...'
                }
                placeholderTextColor={colors.dark.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (!bridge || apiKeyBusy) && styles.btnDisabled,
                ]}
                onPress={handleSaveApiKey}
                disabled={!bridge || apiKeyBusy}>
                {apiKeyBusy ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.btnText}>Save Key</Text>
                )}
              </TouchableOpacity>
              {apiKeyStored && (
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleClearApiKey}
                  disabled={apiKeyBusy}>
                  <Text style={styles.secondaryBtnText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Authentication */}
      <SectionHeader title="Authentication" icon="🔐" />
      <View style={styles.card}>
        {auth.authenticated && auth.profile ? (
          <View>
            <View style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {auth.profile.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.settingLabel}>
                <Text style={styles.userName}>{auth.profile.name}</Text>
                <Text style={styles.userEmail}>
                  {auth.profile.email} • {auth.profile.role}
                </Text>
                {auth.issuer && (
                  <Text style={styles.userIssuer}>{auth.issuer}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              disabled={authBusy}>
              <Text style={styles.logoutText}>
                {authBusy ? 'Signing out…' : 'Disconnect ID'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : auth.configured ? (
          <TouchableOpacity
            style={styles.ssoButton}
            onPress={handleLogin}
            disabled={authBusy}>
            {authBusy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.ssoIcon}>🏢</Text>
                <Text style={styles.ssoText}>Sign in with Enterprise ID</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View>
            <View style={[styles.pill, styles.pillMuted, styles.pillInline]}>
              <Text style={styles.pillText}>NOT CONFIGURED</Text>
            </View>
            <Text style={styles.helperText}>
              {auth.reason || 'No identity provider is configured.'}
            </Text>
            <Text style={styles.helperText}>
              Set PREDICTIQ_OIDC_ISSUER and PREDICTIQ_OIDC_CLIENT_ID before
              launching to enable OAuth 2.0 sign-in with PKCE through your
              browser.
            </Text>
          </View>
        )}
      </View>

      {/* Data */}
      <SectionHeader title="Data & Retention" icon="🗂️" />
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingTitle}>Retention Policy</Text>
            <Text style={styles.settingDesc}>
              Older assessments are pruned on start-up.
            </Text>
          </View>
          <View style={styles.retentionRow}>
            {[7, 30, 90, -1].map(days => (
              <TouchableOpacity
                key={days}
                accessibilityRole="button"
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
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleExport('json')}>
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionLabel}>Export JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleExport('csv')}>
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
            onPress={() => setConfirmWipeVisible(true)}>
            <Text style={styles.actionIcon}>☢️</Text>
            <Text style={[styles.actionLabel, styles.dangerText]}>
              Wipe Data
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Accessibility */}
      <SectionHeader title="Accessibility & UX" icon="👓" />
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
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
          <View style={styles.settingLabel}>
            <Text style={styles.settingTitle}>Reduced Motion</Text>
            <Text style={styles.settingDesc}>
              Disable pulsing alerts and globe rotation.
            </Text>
          </View>
          <Switch
            value={settings.reducedMotion}
            onValueChange={val => updateSetting('reducedMotion', val)}
            trackColor={{false: colors.dark.border, true: colors.primary.main}}
          />
        </View>
      </View>

      {/* Diagnostics */}
      <SectionHeader title="Diagnostics" icon="ℹ️" />
      <View style={styles.card}>
        <DiagnosticRow
          label="Version"
          value={appInfo ? appInfo.version : APP_VERSION}
        />
        <DiagnosticRow
          label="Runtime"
          value={bridge ? 'Electron desktop' : 'Browser'}
        />
        {appInfo && (
          <>
            <DiagnosticRow
              label="Storage backend"
              value={appInfo.storage.backend}
            />
            <DiagnosticRow
              label="Secret encryption"
              value={
                appInfo.storage.encryptedSecrets
                  ? 'OS keystore available'
                  : 'Unavailable on this system'
              }
            />
            <DiagnosticRow label="Electron" value={appInfo.versions.electron} />
            <DiagnosticRow label="Chromium" value={appInfo.versions.chrome} />
          </>
        )}
      </View>

      <Text style={styles.footerText}>PREDICTIQ Secure Environment</Text>

      {/* Import modal */}
      <Modal
        visible={importModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Import History JSON</Text>
            <Text style={styles.helperText}>
              Records are validated before import. Anything that does not match
              the expected shape is skipped and reported rather than stored.
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              placeholder="Paste the contents of an exported JSON file…"
              placeholderTextColor={colors.dark.textMuted}
              value={importContent}
              onChangeText={setImportContent}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setImportModalVisible(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
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

      {/* Wipe confirmation */}
      <Modal
        visible={confirmWipeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmWipeVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete all assessments?</Text>
            <Text style={styles.helperText}>
              This permanently removes every stored assessment from this
              machine. Export first if you need a copy — this cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmWipeVisible(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmDanger]}
                onPress={handleWipe}>
                <Text style={styles.btnText}>Delete Everything</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const DiagnosticRow = ({label, value}: {label: string; value: string}) => (
  <View style={styles.diagnosticRow}>
    <Text style={styles.diagnosticLabel}>{label}</Text>
    <Text style={styles.diagnosticValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.dark.background},
  gradientBg: {flex: 1, opacity: 0.8},
  contentContainer: {padding: 20, flexGrow: 1},
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
  settingLabel: {flex: 1, paddingRight: 12},
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.dark.textPrimary,
  },
  settingDesc: {fontSize: 13, color: colors.dark.textSecondary, marginTop: 2},
  divider: {height: 1, backgroundColor: colors.dark.border, marginVertical: 12},
  linkText: {color: colors.primary.main, fontSize: 12},

  notice: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary.main,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  noticeError: {
    borderColor: colors.danger.high,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  noticeSuccess: {
    borderColor: colors.success.high,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  noticeText: {color: colors.dark.textPrimary, fontSize: 13},

  helperText: {
    color: colors.dark.textSecondary,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },
  helperTextWarn: {
    color: colors.warning.high,
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17,
  },

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
  inputWrapper: {flexDirection: 'row', alignItems: 'center', marginTop: 4},
  input: {
    flex: 1,
    color: colors.dark.textPrimary,
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.surface,
  },
  inputInvalid: {borderColor: colors.warning.high},
  monospace: {fontFamily: 'monospace'},
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#FFF',
  },

  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillInline: {alignSelf: 'flex-start'},
  pillOk: {
    borderColor: colors.success.high,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  pillMuted: {
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.background,
  },
  pillText: {
    color: colors.dark.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  buttonRow: {flexDirection: 'row', gap: 10, marginTop: 12},
  primaryBtn: {
    backgroundColor: colors.primary.main,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 110,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  secondaryBtnText: {color: colors.dark.textSecondary, fontWeight: '600'},
  btnDisabled: {opacity: 0.5},
  btnText: {color: '#FFF', fontWeight: 'bold'},

  userRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {color: '#FFF', fontSize: 18, fontWeight: 'bold'},
  userName: {color: colors.dark.textPrimary, fontSize: 16, fontWeight: '600'},
  userEmail: {color: colors.dark.textSecondary, fontSize: 12, marginTop: 2},
  userIssuer: {color: colors.dark.textMuted, fontSize: 11, marginTop: 2},
  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.danger.high,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  logoutText: {color: colors.danger.high, fontWeight: '600'},
  ssoButton: {
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ssoIcon: {fontSize: 16, marginRight: 8},
  ssoText: {color: '#FFF', fontWeight: '700'},

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

  diagnosticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  diagnosticLabel: {color: colors.dark.textSecondary, fontSize: 13},
  diagnosticValue: {
    color: colors.dark.textPrimary,
    fontSize: 13,
    fontFamily: 'monospace',
  },

  footerText: {
    textAlign: 'center',
    color: colors.dark.textMuted,
    fontSize: 12,
    paddingBottom: 20,
  },

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
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  modalTitle: {
    fontSize: 18,
    color: colors.dark.textPrimary,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: colors.dark.background,
    color: colors.dark.textPrimary,
    borderRadius: 8,
    padding: 12,
    height: 200,
    marginTop: 12,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelBtn: {paddingVertical: 10, paddingHorizontal: 16},
  confirmBtn: {
    backgroundColor: colors.primary.main,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmDanger: {backgroundColor: colors.danger.high},

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

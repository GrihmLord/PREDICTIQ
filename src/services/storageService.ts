// src/services/storageService.ts
// Persistence for the renderer.
//
// Reads are synchronous against an in-memory cache so screens can render
// without awaiting; writes go through the main-process bridge, which owns the
// on-disk store and validates every key. In a plain browser the same cache is
// backed by localStorage instead, which is the honest fallback: there is no OS
// keystore there, so secrets are simply unavailable rather than pretended at.

import {PredictionResult} from './predictionService';
import {getBridge, StoreKey} from './bridge';
import {
  coerceHistory,
  parseHistoryImport,
  ValidationOutcome,
} from '../lib/validation';

export type RiskSensitivity = 'Conservative' | 'Balanced' | 'Aggressive';
export type AnalysisSpeed = 'Cinematic' | 'Instant';
export type AiProvider = 'Local' | 'OpenAI' | 'Anthropic';

export interface AppSettings {
  notifications: boolean;
  riskSensitivity: RiskSensitivity;
  temperature: number;
  analysisSpeed: AnalysisSpeed;
  aiProvider: AiProvider;
  /**
   * Model identifier only. The API key is never held here — it lives in the OS
   * keystore behind the secrets channel and is readable only by the main
   * process.
   */
  model: string;
  retentionDays: number;
  compactMode: boolean;
  reducedMotion: boolean;
  startOnLogin: boolean;
  closeToTray: boolean;
}

export interface BrandTheme {
  primary: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  riskSensitivity: 'Balanced',
  temperature: 0.7,
  analysisSpeed: 'Cinematic',
  aiProvider: 'Local',
  model: '',
  retentionDays: 90,
  compactMode: false,
  reducedMotion: false,
  startOnLogin: false,
  closeToTray: false,
};

const RETENTION_FOREVER = -1;
const ALLOWED_RETENTION = [7, 30, 90, RETENTION_FOREVER];
const ALLOWED_TEMPERATURES = [0.1, 0.5, 0.7, 1.0];
const MAX_HISTORY_RECORDS = 20000;

type PersistListener = (message: string) => void;

function clampSettings(raw: unknown): AppSettings {
  const input =
    raw !== null && typeof raw === 'object'
      ? (raw as Record<string, unknown>)
      : {};
  const pickBool = (key: keyof AppSettings, fallback: boolean) =>
    typeof input[key] === 'boolean' ? (input[key] as boolean) : fallback;

  const sensitivity = input.riskSensitivity;
  const speed = input.analysisSpeed;
  const provider = input.aiProvider;
  const temperature = Number(input.temperature);
  const retention = Number(input.retentionDays);

  return {
    notifications: pickBool('notifications', DEFAULT_SETTINGS.notifications),
    riskSensitivity:
      sensitivity === 'Conservative' ||
      sensitivity === 'Aggressive' ||
      sensitivity === 'Balanced'
        ? sensitivity
        : DEFAULT_SETTINGS.riskSensitivity,
    temperature:
      ALLOWED_TEMPERATURES.indexOf(temperature) !== -1
        ? temperature
        : DEFAULT_SETTINGS.temperature,
    analysisSpeed: speed === 'Instant' ? 'Instant' : 'Cinematic',
    aiProvider:
      provider === 'OpenAI' || provider === 'Anthropic' || provider === 'Local'
        ? provider
        : DEFAULT_SETTINGS.aiProvider,
    model:
      typeof input.model === 'string'
        ? input.model.slice(0, 128)
        : DEFAULT_SETTINGS.model,
    retentionDays:
      ALLOWED_RETENTION.indexOf(retention) !== -1
        ? retention
        : DEFAULT_SETTINGS.retentionDays,
    compactMode: pickBool('compactMode', DEFAULT_SETTINGS.compactMode),
    reducedMotion: pickBool('reducedMotion', DEFAULT_SETTINGS.reducedMotion),
    startOnLogin: pickBool('startOnLogin', DEFAULT_SETTINGS.startOnLogin),
    closeToTray: pickBool('closeToTray', DEFAULT_SETTINGS.closeToTray),
  };
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Brand colours are injected into CSS custom properties, so an unvalidated
 * value would be an injection point into the stylesheet. Only literal hex
 * colours are accepted.
 */
export function coerceBrandTheme(
  raw: unknown,
  defaults: BrandTheme,
): BrandTheme {
  const input =
    raw !== null && typeof raw === 'object'
      ? (raw as Record<string, unknown>)
      : {};
  const pick = (key: keyof BrandTheme) => {
    const value = input[key];
    return typeof value === 'string' && HEX_COLOR.test(value)
      ? value
      : defaults[key];
  };
  return {
    primary: pick('primary'),
    background: pick('background'),
    surface: pick('surface'),
    textPrimary: pick('textPrimary'),
    textSecondary: pick('textSecondary'),
  };
}

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

class StorageService {
  private history: PredictionResult[] = [];
  private settings: AppSettings = {...DEFAULT_SETTINGS};
  private brandTheme: unknown = null;
  private hydrated = false;
  private listeners: PersistListener[] = [];

  private get bridge() {
    return getBridge();
  }

  /** Registers a callback for persistence failures the UI should surface. */
  onPersistError(listener: PersistListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(entry => entry !== listener);
    };
  }

  private reportPersistError(operation: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    const message = 'Could not save ' + operation + ': ' + detail;
    console.error('[storage] ' + message);
    for (const listener of this.listeners) {
      listener(message);
    }
  }

  /**
   * True when neither the desktop bridge nor localStorage is available — which
   * is the case on React Native. Reported once rather than silently discarding
   * every write, because losing data quietly is worse than saying so.
   */
  private warnedNoBackend = false;

  private hasBackend(): boolean {
    if (this.bridge || typeof localStorage !== 'undefined') {
      return true;
    }
    if (!this.warnedNoBackend) {
      this.warnedNoBackend = true;
      const message =
        'No storage backend is available on this platform; assessments will not persist.';
      console.warn('[storage] ' + message);
      for (const listener of this.listeners) {
        listener(message);
      }
    }
    return false;
  }

  private async readKey(key: StoreKey): Promise<unknown> {
    const bridge = this.bridge;
    if (bridge) {
      return bridge.store.get(key);
    }
    if (!this.hasBackend()) {
      return null;
    }
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  private async writeKey(key: StoreKey, value: unknown): Promise<void> {
    const bridge = this.bridge;
    if (bridge) {
      await bridge.store.set(key, value);
      return;
    }
    if (this.hasBackend()) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  private async deleteKey(key: StoreKey): Promise<void> {
    const bridge = this.bridge;
    if (bridge) {
      await bridge.store.delete(key);
      return;
    }
    if (this.hasBackend()) {
      localStorage.removeItem(key);
    }
  }

  /**
   * Loads everything into the cache. Call once during app start-up and await
   * it before rendering, so no screen observes an empty store that is about to
   * fill in.
   */
  async hydrate(): Promise<void> {
    const [history, settings, brandTheme] = await Promise.all([
      this.readKey('predictionHistory').catch(() => null),
      this.readKey('userSettings').catch(() => null),
      this.readKey('brandTheme').catch(() => null),
    ]);

    this.history = coerceHistory(history);
    this.settings = clampSettings(settings);
    this.brandTheme = brandTheme;
    this.hydrated = true;

    // Retention is enforced at start-up rather than on every settings write,
    // which is what an earlier version did — that ran a full prune on every
    // keystroke in the settings screen.
    await this.pruneHistory(this.settings.retentionDays);
  }

  isHydrated(): boolean {
    return this.hydrated;
  }

  // ============= HISTORY =============

  getHistory(): PredictionResult[] {
    return this.history;
  }

  async savePrediction(prediction: PredictionResult): Promise<void> {
    this.history = [prediction, ...this.history].slice(0, MAX_HISTORY_RECORDS);
    try {
      await this.writeKey('predictionHistory', this.history);
    } catch (error) {
      this.reportPersistError('the assessment', error);
    }
  }

  async clearHistory(): Promise<void> {
    this.history = [];
    try {
      await this.deleteKey('predictionHistory');
    } catch (error) {
      this.reportPersistError('the history wipe', error);
    }
  }

  /** Drops records older than the retention window. -1 keeps everything. */
  async pruneHistory(days: number): Promise<number> {
    if (days === RETENTION_FOREVER) {
      return 0;
    }

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const kept = this.history.filter(
      item => new Date(item.timestamp).getTime() >= cutoff,
    );
    const removed = this.history.length - kept.length;

    if (removed > 0) {
      this.history = kept;
      try {
        await this.writeKey('predictionHistory', kept);
      } catch (error) {
        this.reportPersistError('the retention prune', error);
      }
    }
    return removed;
  }

  async importHistory(
    jsonContent: string,
  ): Promise<ValidationOutcome<PredictionResult[]>> {
    const outcome = parseHistoryImport(jsonContent);
    if (!outcome.ok || !outcome.value) {
      return outcome;
    }

    this.history = outcome.value;
    try {
      await this.writeKey('predictionHistory', outcome.value);
    } catch (error) {
      this.reportPersistError('the imported history', error);
      return {
        ok: false,
        value: null,
        error: 'The import could not be saved.',
        skipped: outcome.skipped,
      };
    }
    return outcome;
  }

  // ============= SETTINGS =============

  getSettings(): AppSettings {
    return this.settings;
  }

  async saveSettings(update: Partial<AppSettings>): Promise<AppSettings> {
    const previousRetention = this.settings.retentionDays;
    this.settings = clampSettings({...this.settings, ...update});

    try {
      await this.writeKey('userSettings', this.settings);
    } catch (error) {
      this.reportPersistError('settings', error);
    }

    // Prune only when the policy itself changed; routine setting edits should
    // not walk the whole history.
    if (this.settings.retentionDays !== previousRetention) {
      await this.pruneHistory(this.settings.retentionDays);
    }

    return this.settings;
  }

  /**
   * Removes everything this app has stored: history, settings, branding, and
   * any secret held in the OS keystore. Used by the "wipe" action, which
   * previously called a method that did not exist.
   */
  async clearAll(): Promise<void> {
    this.history = [];
    this.settings = {...DEFAULT_SETTINGS};
    this.brandTheme = null;

    try {
      await Promise.all([
        this.deleteKey('predictionHistory'),
        this.deleteKey('userSettings'),
        this.deleteKey('brandTheme'),
      ]);

      const bridge = this.bridge;
      if (bridge) {
        // Leaving a stored API key behind after a full wipe would be the one
        // piece of user data that survived, which is the opposite of intent.
        await Promise.all([
          bridge.secrets.clear('aiApiKey').catch(() => false),
          bridge.secrets.clear('oidcTokens').catch(() => false),
        ]);
        await bridge.store.delete('authProfile').catch(() => false);
      }
    } catch (error) {
      this.reportPersistError('the data wipe', error);
    }
  }

  // ============= BRANDING =============

  getBrandTheme(defaults: BrandTheme): BrandTheme {
    return coerceBrandTheme(this.brandTheme, defaults);
  }

  async saveBrandTheme(theme: BrandTheme): Promise<void> {
    this.brandTheme = theme;
    try {
      await this.writeKey('brandTheme', theme);
    } catch (error) {
      this.reportPersistError('branding', error);
    }
  }
}

export const storageService = new StorageService();

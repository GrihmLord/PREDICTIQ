// src/services/StorageService.ts
// Handles data persistence using electron-store (Desktop) or localStorage (Web)

import { PredictionResult } from './PredictionService';

class StorageService {
  private store: any;
  private isElectron: boolean;

  constructor() {
    this.isElectron = this.checkIfElectron();
    if (this.isElectron) {
      try {
        const Store = window.require('electron-store');
        // Check if Store is a class/function before instantiating
        if (typeof Store === 'function' || typeof Store === 'object') {
          this.store = new Store();
          console.log('StorageService: Electron Store initialized');
        } else {
          // Fallback for newer ESM versions or mismatches
          console.warn('StorageService: electron-store import is not a constructor', Store);
          this.isElectron = false;
        }
      } catch (error) {
        console.warn('StorageService: Failed to load electron-store', error);
        this.isElectron = false;
      }
    }
  }

  private checkIfElectron(): boolean {
    return typeof window !== 'undefined' && 'require' in window;
  }

  // ============= GENERIC =============

  getItem(key: string, defaultValue: any = null): any {
    if (this.isElectron && this.store) {
      return this.store.get(key, defaultValue);
    } else {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    }
  }

  saveItem(key: string, value: any): void {
    if (this.isElectron && this.store) {
      this.store.set(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  // ============= HISTORY =============

  getHistory(): PredictionResult[] {
    if (this.isElectron && this.store) {
      return this.store.get('predictionHistory', []) as PredictionResult[];
    } else {
      const data = localStorage.getItem('predictionHistory');
      return data ? JSON.parse(data) : [];
    }
  }

  savePrediction(prediction: PredictionResult): void {
    const currentHistory = this.getHistory();
    const newHistory = [prediction, ...currentHistory];

    if (this.isElectron && this.store) {
      this.store.set('predictionHistory', newHistory);
    } else {
      localStorage.setItem('predictionHistory', JSON.stringify(newHistory));
    }
    console.log('StorageService: Prediction saved', prediction.id);
  }

  clearHistory(): void {
    if (this.isElectron && this.store) {
      this.store.delete('predictionHistory');
    } else {
      localStorage.removeItem('predictionHistory');
    }
  }

  // ============= SETTINGS =============

  getSettings(): any {
    const defaults = {
      darkMode: true,
      notifications: true,
      riskSensitivity: 'Balanced',
      temperature: 0.7,
      analysisSpeed: 'Cinematic', // 'Cinematic' | 'Instant'
      aiProvider: 'Local', // 'Local' | 'OpenAI' | 'Anthropic'
      apiKey: '',
      model: 'gpt-4o',
      retentionDays: 90,
      compactMode: false,
      reducedMotion: false,
      theme: 'Dark', // 'System' | 'Light' | 'Dark'
      startOnLogin: false,
      closeToTray: false,
    };

    let saved = {};
    if (this.isElectron && this.store) {
      saved = this.store.get('userSettings', {});
    } else {
      const data = localStorage.getItem('userSettings');
      saved = data ? JSON.parse(data) : {};
    }

    return { ...defaults, ...saved };
  }

  saveSettings(settings: any): void {
    if (this.isElectron && this.store) {
      this.store.set('userSettings', settings);
    } else {
      localStorage.setItem('userSettings', JSON.stringify(settings));
    }

    // Trigger necessary side effects (e.g., pruning)
    if (settings.retentionDays) {
      this.pruneHistory(settings.retentionDays);
    }
  }

  // ============= DATA MANAGEMENT =============

  pruneHistory(days: number): void {
    if (days === -1) {
      return;
    } // 'Forever'

    const history = this.getHistory();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filtered = history.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= cutoff;
    });

    if (filtered.length < history.length) {
      console.log(
        `StorageService: Pruning ${history.length - filtered.length
        } old records.`,
      );
      if (this.isElectron && this.store) {
        this.store.set('predictionHistory', filtered);
      } else {
        localStorage.setItem('predictionHistory', JSON.stringify(filtered));
      }
    }
  }

  importHistory(jsonContent: string): boolean {
    try {
      const parsed = JSON.parse(jsonContent);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid format');
      }

      // Basic validation check for first item
      if (parsed.length > 0 && !parsed[0].id) {
        throw new Error('Invalid prediction record format');
      }

      if (this.isElectron && this.store) {
        this.store.set('predictionHistory', parsed);
      } else {
        localStorage.setItem('predictionHistory', JSON.stringify(parsed));
      }
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

export const storageService = new StorageService();

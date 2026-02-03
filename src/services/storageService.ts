// src/services/storageService.ts
// Local storage service for persisting data

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Scenario } from '../redux/slices/scenarioSlice';

const STORAGE_KEYS = {
    SCENARIOS: '@predictiq/scenarios',
    SETTINGS: '@predictiq/settings',
};

export const storageService = {
    /**
     * Save scenarios to local storage
     */
    async saveScenarios(scenarios: Scenario[]): Promise<void> {
        try {
            const jsonValue = JSON.stringify(scenarios);
            await AsyncStorage.setItem(STORAGE_KEYS.SCENARIOS, jsonValue);
        } catch (error) {
            console.error('Error saving scenarios:', error);
            throw error;
        }
    },

    /**
     * Load scenarios from local storage
     */
    async loadScenarios(): Promise<Scenario[]> {
        try {
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.SCENARIOS);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (error) {
            console.error('Error loading scenarios:', error);
            return [];
        }
    },

    /**
     * Save settings to local storage
     */
    async saveSettings(settings: Record<string, any>): Promise<void> {
        try {
            const jsonValue = JSON.stringify(settings);
            await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, jsonValue);
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    },

    /**
     * Load settings from local storage
     */
    async loadSettings(): Promise<Record<string, any> | null> {
        try {
            const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (error) {
            console.error('Error loading settings:', error);
            return null;
        }
    },

    /**
     * Clear all stored data
     */
    async clearAll(): Promise<void> {
        try {
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.SCENARIOS,
                STORAGE_KEYS.SETTINGS,
            ]);
        } catch (error) {
            console.error('Error clearing storage:', error);
            throw error;
        }
    },
};

export default storageService;

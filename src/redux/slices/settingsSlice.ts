// src/redux/slices/settingsSlice.ts
// Redux Toolkit slice for app settings

import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  autoSave: boolean;
  defaultCategory: string;
}

const initialState: SettingsState = {
  themeMode: 'system',
  notificationsEnabled: true,
  autoSave: true,
  defaultCategory: 'general',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    setNotificationsEnabled(state, action: PayloadAction<boolean>) {
      state.notificationsEnabled = action.payload;
    },
    setAutoSave(state, action: PayloadAction<boolean>) {
      state.autoSave = action.payload;
    },
    setDefaultCategory(state, action: PayloadAction<string>) {
      state.defaultCategory = action.payload;
    },
    resetSettings() {
      return initialState;
    },
  },
});

export const {
  setThemeMode,
  setNotificationsEnabled,
  setAutoSave,
  setDefaultCategory,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;

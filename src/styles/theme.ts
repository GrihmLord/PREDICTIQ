// src/styles/theme.ts
// Theme configuration for PREDICTIQ

import {colors} from './colors';

export type ThemeMode = 'light' | 'dark';

// Typography scale
export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing scale (in pixels)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// Border radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

// Shadow definitions
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
};

// Theme object generator
export const createTheme = (mode: ThemeMode) => {
  const isDark = mode === 'dark';
  const palette = isDark ? colors.dark : colors.light;

  return {
    mode,
    colors: {
      ...colors,
      ...palette,
      primary: colors.primary,
      success: colors.success,
      warning: colors.warning,
      danger: colors.danger,
      chart: colors.chart,
    },
    typography,
    spacing,
    borderRadius,
    shadows,
  };
};

// Default themes
export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

export type Theme = ReturnType<typeof createTheme>;

export default {lightTheme, darkTheme, createTheme};

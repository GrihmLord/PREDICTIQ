import {Platform} from 'react-native';

const isWeb = Platform.OS === 'web';

export const colors = {
  // Primary brand colors
  primary: {
    main: isWeb ? 'var(--brand-primary, #6366F1)' : '#6366F1', // Indigo
    light: '#818CF8',
    dark: '#4F46E5',
  },

  // Success probability gradient
  success: {
    high: '#10B981', // Green - high probability
    medium: '#34D399',
    low: '#6EE7B7',
  },

  // Warning gradient
  warning: {
    high: '#F59E0B', // Amber
    medium: '#FBBF24',
    low: '#FCD34D',
  },

  // Danger/low probability gradient
  danger: {
    high: '#EF4444', // Red
    medium: '#F87171',
    low: '#FCA5A5',
  },

  // Chart colors (distinct and accessible)
  chart: {
    blue: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#EC4899',
    cyan: '#06B6D4',
    orange: '#F97316',
    teal: '#14B8A6',
  },

  // Neutrals - Light mode
  light: {
    background: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceAlt: '#F1F5F9',
    border: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
  },

  // Neutrals - Dark mode
  // Neutrals - Dark mode
  dark: {
    background: isWeb ? 'var(--brand-background, #0F172A)' : '#0F172A',
    surface: isWeb ? 'var(--brand-surface, #1E293B)' : '#1E293B',
    surfaceAlt: '#334155',
    border: '#475569',
    textPrimary: isWeb ? 'var(--brand-text-primary, #F8FAFC)' : '#F8FAFC',
    textSecondary: isWeb ? 'var(--brand-text-secondary, #94A3B8)' : '#94A3B8',
    textMuted: '#64748B',
  },
};

// Helper function to get probability color based on percentage
export const getProbabilityColor = (probability: number): string => {
  if (probability >= 70) {
    return colors.success.high;
  }
  if (probability >= 50) {
    return colors.warning.high;
  }
  if (probability >= 30) {
    return colors.warning.medium;
  }
  return colors.danger.high;
};

// Helper function to get trend color
export const getTrendColor = (trend: 'up' | 'down' | 'flat'): string => {
  switch (trend) {
    case 'up':
      return colors.success.high;
    case 'down':
      return colors.danger.high;
    default:
      return colors.light.textSecondary;
  }
};

export default colors;

import React, {createContext, useState, useEffect, useContext} from 'react';
import {Platform} from 'react-native';
import {storageService} from '../services/storageService';

// Default Brand Colors
const DEFAULT_BRAND = {
  primary: '#6366F1', // Indigo
  background: '#0F172A', // Slate 900
  surface: '#1E293B', // Slate 800
  textPrimary: '#F8FAFC', // Slate 50
  textSecondary: '#94A3B8', // Slate 400
};

type BrandColors = typeof DEFAULT_BRAND;

interface ThemeContextType {
  brandColors: BrandColors;
  updateBrandColor: (key: keyof BrandColors, value: string) => void;
  resetbranding: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [brandColors, setBrandColors] = useState<BrandColors>(DEFAULT_BRAND);

  // Initial Load
  useEffect(() => {
    // Load saved theme from electron-store if available
    try {
      const savedTheme = storageService.getItem('brand_theme'); // Using generic getItem wrapper if available or we might need to extend storageService
      if (savedTheme) {
        setBrandColors({...DEFAULT_BRAND, ...savedTheme});
      }
    } catch (e) {
      console.warn('Failed to load branding', e);
    }
  }, []);

  // Inject CSS Variables on Web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const root = document.documentElement;
      root.style.setProperty('--brand-primary', brandColors.primary);
      root.style.setProperty('--brand-background', brandColors.background);
      root.style.setProperty('--brand-surface', brandColors.surface);
      root.style.setProperty('--brand-text-primary', brandColors.textPrimary);
      root.style.setProperty(
        '--brand-text-secondary',
        brandColors.textSecondary,
      );
    }
  }, [brandColors]);

  const updateBrandColor = (key: keyof BrandColors, value: string) => {
    const newColors = {...brandColors, [key]: value};
    setBrandColors(newColors);
    storageService.saveItem('brand_theme', newColors);
  };

  const resetbranding = () => {
    setBrandColors(DEFAULT_BRAND);
    storageService.saveItem('brand_theme', DEFAULT_BRAND);
  };

  return (
    <ThemeContext.Provider
      value={{brandColors, updateBrandColor, resetbranding}}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

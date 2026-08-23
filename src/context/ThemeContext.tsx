import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import {Platform} from 'react-native';
import {
  storageService,
  BrandTheme,
  isValidHexColor,
} from '../services/storageService';

// Default Brand Colors
const DEFAULT_BRAND: BrandTheme = {
  primary: '#6366F1', // Indigo
  background: '#0F172A', // Slate 900
  surface: '#1E293B', // Slate 800
  textPrimary: '#F8FAFC', // Slate 50
  textSecondary: '#94A3B8', // Slate 400
};

type BrandColors = BrandTheme;

interface ThemeContextType {
  brandColors: BrandColors;
  /**
   * Updates a colour. Returns false when the value is not a hex colour, so the
   * caller can show the input as invalid while the user is mid-type.
   */
  updateBrandColor: (key: keyof BrandColors, value: string) => boolean;
  resetBranding: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const CSS_VARIABLES: Record<keyof BrandColors, string> = {
  primary: '--brand-primary',
  background: '--brand-background',
  surface: '--brand-surface',
  textPrimary: '--brand-text-primary',
  textSecondary: '--brand-text-secondary',
};

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [brandColors, setBrandColors] = useState<BrandColors>(() =>
    storageService.isHydrated()
      ? storageService.getBrandTheme(DEFAULT_BRAND)
      : DEFAULT_BRAND,
  );

  useEffect(() => {
    setBrandColors(storageService.getBrandTheme(DEFAULT_BRAND));
  }, []);

  // Inject CSS custom properties on web. Values are validated before they are
  // stored, so nothing unchecked reaches the stylesheet.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    (Object.keys(CSS_VARIABLES) as (keyof BrandColors)[]).forEach(key => {
      root.style.setProperty(CSS_VARIABLES[key], brandColors[key]);
    });
  }, [brandColors]);

  const updateBrandColor = useCallback(
    (key: keyof BrandColors, value: string): boolean => {
      if (!isValidHexColor(value)) {
        return false;
      }
      setBrandColors(current => {
        const next = {...current, [key]: value};
        void storageService.saveBrandTheme(next);
        return next;
      });
      return true;
    },
    [],
  );

  const resetBranding = useCallback(() => {
    setBrandColors(DEFAULT_BRAND);
    void storageService.saveBrandTheme(DEFAULT_BRAND);
  }, []);

  return (
    <ThemeContext.Provider
      value={{brandColors, updateBrandColor, resetBranding}}>
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

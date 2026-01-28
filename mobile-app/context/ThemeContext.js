import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'theme_mode';

const lightColors = {
  background: '#f6f7fb',
  surface: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  mutedText: '#6b7280',
  dangerText: '#b91c1c',
  primary: '#2563eb',
  primaryText: '#ffffff',
  overlay: 'rgba(17, 24, 39, 0.45)',
  pillNeutralBg: '#f3f4f6',
  pillNeutralBorder: '#e5e7eb',
  pillSuccessBg: '#ecfdf5',
  pillSuccessBorder: '#a7f3d0',
  pillSuccessText: '#047857',
  pillWarningBg: '#fffbeb',
  pillWarningBorder: '#fde68a',
  pillWarningText: '#92400e',
  pillDangerBg: '#fef2f2',
  pillDangerBorder: '#fecaca',
  pillDangerText: '#b91c1c',
};

const darkColors = {
  background: '#0b1220',
  surface: '#0f172a',
  border: '#1f2937',
  text: '#e5e7eb',
  mutedText: '#9ca3af',
  dangerText: '#fca5a5',
  primary: '#3b82f6',
  primaryText: '#0b1220',
  overlay: 'rgba(0, 0, 0, 0.55)',
  pillNeutralBg: '#111827',
  pillNeutralBorder: '#1f2937',
  pillSuccessBg: '#064e3b',
  pillSuccessBorder: '#065f46',
  pillSuccessText: '#a7f3d0',
  pillWarningBg: '#3f2a00',
  pillWarningBorder: '#92400e',
  pillWarningText: '#fde68a',
  pillDangerBg: '#3f0d0d',
  pillDangerBorder: '#7f1d1d',
  pillDangerText: '#fecaca',
};

const ThemeContext = createContext({
  mode: 'light',
  colors: lightColors,
  setMode: () => {},
  toggleMode: () => {},
  hydrated: false,
});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === 'dark' || saved === 'light') setMode(saved);
      } finally {
        setHydrated(true);
      }
    };
    load();
  }, []);

  const updateMode = async (next) => {
    setMode(next);
    try {
      await AsyncStorage.setItem(THEME_KEY, next);
    } catch {
    }
  };

  const toggleMode = async () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    await updateMode(next);
  };

  const colors = mode === 'dark' ? darkColors : lightColors;

  const value = useMemo(
    () => ({
      mode,
      colors,
      setMode: updateMode,
      toggleMode,
      hydrated,
    }),
    [mode, colors, hydrated]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

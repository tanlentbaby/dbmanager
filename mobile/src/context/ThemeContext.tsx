/**
 * 主题上下文
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const lightColors: ThemeColors = {
  background: '#ffffff',
  foreground: '#f6f8fa',
  primary: '#0969da',
  secondary: '#6e7781',
  success: '#1a7f37',
  error: '#cf222e',
  warning: '#9a6700',
  card: '#ffffff',
  border: '#d0d7de',
  text: '#24292f',
  textMuted: '#6e7781',
};

const darkColors: ThemeColors = {
  background: '#0d1117',
  foreground: '#161b22',
  primary: '#58a6ff',
  secondary: '#8b949e',
  success: '#3fb950',
  error: '#f85149',
  warning: '#d29922',
  card: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  textMuted: '#8b949e',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('auto');

  const isDark = mode === 'dark' || (mode === 'auto' && systemColorScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  const value = {
    mode,
    isDark,
    colors,
    setMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

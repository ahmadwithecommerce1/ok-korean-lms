import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppThemeId = 'light-mode' | 'midnight' | 'emerald-dark' | 'purple-velvet';

export interface AppThemeDefinition {
  id: AppThemeId;
  name: string;
  tagline: string;
  category: 'dark' | 'light';
  bgBase: string;
  cardBg: string;
  cardBgSolid: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  primary: string;
  secondary: string;
  chartColor: string;
  borderGlow1: string;
  borderGlow2: string;
  borderGlow3: string;
  glowShadow: string;
  swatches: [string, string, string];
}

export const APP_THEMES: Record<AppThemeId, AppThemeDefinition> = {
  'light-mode': {
    id: 'light-mode',
    name: 'Light Mode',
    tagline: 'Clean White & Slate with Crisp Dark Text',
    category: 'light',
    bgBase: '#f8fafc',
    cardBg: '#ffffff',
    cardBgSolid: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    borderColor: '#e2e8f0',
    primary: '#2563eb',
    secondary: '#059669',
    chartColor: '#2563eb',
    borderGlow1: '#2563eb',
    borderGlow2: '#3b82f6',
    borderGlow3: '#059669',
    glowShadow: 'rgba(0, 0, 0, 0.08)',
    swatches: ['#ffffff', '#2563eb', '#059669']
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Blue',
    tagline: 'Deep Navy Background with Cyan & Blue Accents',
    category: 'dark',
    bgBase: '#0a0e1a',
    cardBg: 'rgba(15, 23, 42, 0.9)',
    cardBgSolid: '#0f172a',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    borderColor: 'rgba(51, 65, 85, 0.65)',
    primary: '#06b6d4',
    secondary: '#10b981',
    chartColor: '#06b6d4',
    borderGlow1: '#06b6d4',
    borderGlow2: '#38bdf8',
    borderGlow3: '#10b981',
    glowShadow: 'rgba(6, 182, 212, 0.2)',
    swatches: ['#0a0e1a', '#06b6d4', '#10b981']
  },
  'emerald-dark': {
    id: 'emerald-dark',
    name: 'Emerald Dark',
    tagline: 'Dark Charcoal Background with Vibrant Green Accents',
    category: 'dark',
    bgBase: '#09110d',
    cardBg: 'rgba(15, 29, 22, 0.92)',
    cardBgSolid: '#0f1d16',
    textPrimary: '#f0fdf4',
    textSecondary: '#86efac',
    borderColor: 'rgba(34, 197, 94, 0.35)',
    primary: '#10b981',
    secondary: '#34d399',
    chartColor: '#10b981',
    borderGlow1: '#10b981',
    borderGlow2: '#34d399',
    borderGlow3: '#059669',
    glowShadow: 'rgba(16, 185, 129, 0.22)',
    swatches: ['#09110d', '#10b981', '#34d399']
  },
  'purple-velvet': {
    id: 'purple-velvet',
    name: 'Purple Velvet',
    tagline: 'Dark Purple & Black with Neon Purple & Pink Accents',
    category: 'dark',
    bgBase: '#0d0718',
    cardBg: 'rgba(23, 13, 43, 0.92)',
    cardBgSolid: '#170d2b',
    textPrimary: '#faf5ff',
    textSecondary: '#c084fc',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    primary: '#a855f7',
    secondary: '#ec4899',
    chartColor: '#a855f7',
    borderGlow1: '#a855f7',
    borderGlow2: '#ec4899',
    borderGlow3: '#c084fc',
    glowShadow: 'rgba(168, 85, 247, 0.22)',
    swatches: ['#0d0718', '#a855f7', '#ec4899']
  }
};

export const THEME_LIST: AppThemeDefinition[] = [
  APP_THEMES['light-mode'],
  APP_THEMES.midnight,
  APP_THEMES['emerald-dark'],
  APP_THEMES['purple-velvet']
];

interface ThemeContextType {
  activeThemeId: AppThemeId;
  activeTheme: AppThemeDefinition;
  setTheme: (id: AppThemeId) => void;
  themes: AppThemeDefinition[];
  isDark: boolean;
  toggleDarkLight: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'ok_korean_theme_4';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeThemeId, setActiveThemeId] = useState<AppThemeId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as AppThemeId;
      if (saved && APP_THEMES[saved]) {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'midnight';
  });

  const activeTheme = APP_THEMES[activeThemeId] || APP_THEMES.midnight;

  const setTheme = (id: AppThemeId) => {
    if (APP_THEMES[id]) {
      setActiveThemeId(id);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch (err) {
        console.error('Failed to save theme in localStorage', err);
      }
    }
  };

  const toggleDarkLight = () => {
    if (activeTheme.category === 'dark') {
      setTheme('light-mode');
    } else {
      setTheme('midnight');
    }
  };

  // Sync CSS variables and document classes whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', activeTheme.id);

    // Dark vs Light category handling for tailwind classes
    if (activeTheme.category === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // Dynamic CSS Custom Properties
    root.style.setProperty('--theme-bg', activeTheme.bgBase);
    root.style.setProperty('--theme-card-bg', activeTheme.cardBg);
    root.style.setProperty('--theme-card-bg-solid', activeTheme.cardBgSolid);
    root.style.setProperty('--theme-text', activeTheme.textPrimary);
    root.style.setProperty('--theme-text-muted', activeTheme.textSecondary);
    root.style.setProperty('--theme-border', activeTheme.borderColor);
    root.style.setProperty('--theme-primary', activeTheme.primary);
    root.style.setProperty('--theme-secondary', activeTheme.secondary);
    root.style.setProperty('--theme-chart', activeTheme.chartColor);
    root.style.setProperty('--theme-glow-shadow', activeTheme.glowShadow);
    root.style.setProperty('--theme-border-glow-1', activeTheme.borderGlow1);
    root.style.setProperty('--theme-border-glow-2', activeTheme.borderGlow2);
    root.style.setProperty('--theme-border-glow-3', activeTheme.borderGlow3);

    // Apply root body background directly to prevent flash
    document.body.style.backgroundColor = activeTheme.bgBase;
    document.body.style.color = activeTheme.textPrimary;
  }, [activeTheme]);

  return (
    <ThemeContext.Provider
      value={{
        activeThemeId,
        activeTheme,
        setTheme,
        themes: THEME_LIST,
        isDark: activeTheme.category === 'dark',
        toggleDarkLight
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

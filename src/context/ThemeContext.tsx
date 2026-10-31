import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light';
export type AccentColor = 'indigo' | 'emerald' | 'rose' | 'cyan' | 'amber' | 'purple';
export type GlassIntensity = 'none' | 'low' | 'medium' | 'high';
export type FontSize = 'small' | 'medium' | 'large';
export type ChartStyle = 'bar' | 'area';
export type BackgroundPattern = 'grid' | 'dots' | 'none';

// Core 3 custom themes requested + legacy presets
export type AppThemeId = 
  | 'cyberpunk'
  | 'matrix'
  | 'oceanic'
  | 'cyberpunk-neon'
  | 'matrix-green'
  | 'oceanic-teal'
  | 'midnight-blue';

export interface AppThemeConfig {
  id: AppThemeId;
  name: string;
  tagline: string;
  isDark: boolean;
  primary: string;
  secondary: string;
  chartColor: string;
  bgBase: string;
  cardBg: string;
  borderColor: string;
  glowColor: string;
  buttonGradient: string;
  buttonShadow: string;
  textColor: string;
  mutedTextColor: string;
  swatches: [string, string, string];
  emoji: string;
}

export const APP_THEMES: Record<string, AppThemeConfig> = {
  // Theme 1: Cyberpunk (Neon Purple & Pink)
  'cyberpunk': {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    tagline: 'Neon Purple & Pink',
    isDark: true,
    primary: '#c026d3', // Neon Purple / Fuchsia
    secondary: '#ec4899', // Hot Pink
    chartColor: '#06b6d4', // Cyan charts
    bgBase: '#080312', // Deep dark purple background
    cardBg: '#130826', // Dark purple card background
    borderColor: 'rgba(192, 38, 211, 0.45)', // Neon purple border
    glowColor: 'rgba(236, 72, 153, 0.45)', // Pink glow
    buttonGradient: 'from-fuchsia-600 via-pink-500 to-rose-500 hover:from-fuchsia-500 hover:to-rose-400',
    buttonShadow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]',
    textColor: '#fdf4ff',
    mutedTextColor: '#d8b4fe',
    swatches: ['#080312', '#c026d3', '#ec4899'],
    emoji: '🔮'
  },

  // Theme 2: Matrix (Hacker Green)
  'matrix': {
    id: 'matrix',
    name: 'Matrix',
    tagline: 'Hacker Green',
    isDark: true,
    primary: '#22c55e', // Terminal Green
    secondary: '#16a34a', // Darker Green
    chartColor: '#22c55e', // Green chart lines
    bgBase: '#000000', // Pitch black background
    cardBg: '#030c05', // Pitch black with subtle green tint
    borderColor: 'rgba(34, 197, 94, 0.5)', // Green glowing borders
    glowColor: 'rgba(34, 197, 94, 0.5)', // Green glow
    buttonGradient: 'from-emerald-600 via-green-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
    buttonShadow: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
    textColor: '#4ade80', // Terminal green text
    mutedTextColor: '#16a34a',
    swatches: ['#000000', '#22c55e', '#4ade80'],
    emoji: '📟'
  },

  // Theme 3: Oceanic (Deep Blue)
  'oceanic': {
    id: 'oceanic',
    name: 'Oceanic',
    tagline: 'Deep Blue',
    isDark: true,
    primary: '#0284c7', // Bright Blue
    secondary: '#14b8a6', // Teal
    chartColor: '#38bdf8', // Bright blue and teal charts
    bgBase: '#020b18', // Very dark blue background
    cardBg: '#06152e', // Dark blue card background
    borderColor: 'rgba(14, 165, 233, 0.45)', // Blue glowing border
    glowColor: 'rgba(14, 165, 233, 0.45)', // Blue glow
    buttonGradient: 'from-sky-500 via-cyan-500 to-teal-500 hover:from-sky-400 hover:to-teal-400',
    buttonShadow: 'shadow-[0_0_20px_rgba(14,165,233,0.5)]',
    textColor: '#f0f9ff',
    mutedTextColor: '#7dd3fc',
    swatches: ['#020b18', '#0284c7', '#14b8a6'],
    emoji: '🌊'
  },

  // Aliases for backwards compatibility with earlier presets
  'cyberpunk-neon': {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    tagline: 'Neon Purple & Pink',
    isDark: true,
    primary: '#c026d3',
    secondary: '#ec4899',
    chartColor: '#06b6d4',
    bgBase: '#080312',
    cardBg: '#130826',
    borderColor: 'rgba(192, 38, 211, 0.45)',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    buttonGradient: 'from-fuchsia-600 via-pink-500 to-rose-500 hover:from-fuchsia-500 hover:to-rose-400',
    buttonShadow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]',
    textColor: '#fdf4ff',
    mutedTextColor: '#d8b4fe',
    swatches: ['#080312', '#c026d3', '#ec4899'],
    emoji: '🔮'
  },
  'matrix-green': {
    id: 'matrix',
    name: 'Matrix',
    tagline: 'Hacker Green',
    isDark: true,
    primary: '#22c55e',
    secondary: '#16a34a',
    chartColor: '#22c55e',
    bgBase: '#000000',
    cardBg: '#030c05',
    borderColor: 'rgba(34, 197, 94, 0.5)',
    glowColor: 'rgba(34, 197, 94, 0.5)',
    buttonGradient: 'from-emerald-600 via-green-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
    buttonShadow: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
    textColor: '#4ade80',
    mutedTextColor: '#16a34a',
    swatches: ['#000000', '#22c55e', '#4ade80'],
    emoji: '📟'
  },
  'oceanic-teal': {
    id: 'oceanic',
    name: 'Oceanic',
    tagline: 'Deep Blue',
    isDark: true,
    primary: '#0284c7',
    secondary: '#14b8a6',
    chartColor: '#38bdf8',
    bgBase: '#020b18',
    cardBg: '#06152e',
    borderColor: 'rgba(14, 165, 233, 0.45)',
    glowColor: 'rgba(14, 165, 233, 0.45)',
    buttonGradient: 'from-sky-500 via-cyan-500 to-teal-500 hover:from-sky-400 hover:to-teal-400',
    buttonShadow: 'shadow-[0_0_20px_rgba(14,165,233,0.5)]',
    textColor: '#f0f9ff',
    mutedTextColor: '#7dd3fc',
    swatches: ['#020b18', '#0284c7', '#14b8a6'],
    emoji: '🌊'
  },
  'midnight-blue': {
    id: 'oceanic',
    name: 'Oceanic',
    tagline: 'Deep Blue',
    isDark: true,
    primary: '#0284c7',
    secondary: '#14b8a6',
    chartColor: '#38bdf8',
    bgBase: '#020b18',
    cardBg: '#06152e',
    borderColor: 'rgba(14, 165, 233, 0.45)',
    glowColor: 'rgba(14, 165, 233, 0.45)',
    buttonGradient: 'from-sky-500 via-cyan-500 to-teal-500 hover:from-sky-400 hover:to-teal-400',
    buttonShadow: 'shadow-[0_0_20px_rgba(14,165,233,0.5)]',
    textColor: '#f0f9ff',
    mutedTextColor: '#7dd3fc',
    swatches: ['#020b18', '#0284c7', '#14b8a6'],
    emoji: '🌊'
  }
};

// The 3 primary themes
export const PRIMARY_3_THEMES: AppThemeConfig[] = [
  APP_THEMES['cyberpunk'],
  APP_THEMES['matrix'],
  APP_THEMES['oceanic'],
];

export interface ThemeSettings {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  glassIntensity: GlassIntensity;
  cardBorderGlow: boolean;
  sidebarCollapsed: boolean;
  fontSize: FontSize;
  animationsEnabled: boolean;
  chartStyle: ChartStyle;
  backgroundPattern: BackgroundPattern;
  highContrast: boolean;
  appThemeId: AppThemeId;
}

export interface AccentColorMeta {
  name: string;
  primary: string;
  gradient: string;
  glow: string;
  border: string;
  bgSubtle: string;
  text: string;
}

export const ACCENT_PALETTES: Record<AccentColor, AccentColorMeta> = {
  indigo: {
    name: 'Neon Indigo',
    primary: '#6366f1',
    gradient: 'from-indigo-600 via-blue-500 to-purple-600',
    glow: 'rgba(99, 102, 241, 0.35)',
    border: 'border-indigo-500/40 hover:border-indigo-400',
    bgSubtle: 'bg-indigo-500/15 text-indigo-300',
    text: 'text-indigo-400'
  },
  emerald: {
    name: 'Emerald Mint',
    primary: '#10b981',
    gradient: 'from-emerald-600 via-teal-500 to-cyan-600',
    glow: 'rgba(16, 185, 129, 0.35)',
    border: 'border-emerald-500/40 hover:border-emerald-400',
    bgSubtle: 'bg-emerald-500/15 text-emerald-300',
    text: 'text-emerald-400'
  },
  rose: {
    name: 'Cyber Rose',
    primary: '#f43f5e',
    gradient: 'from-rose-600 via-pink-500 to-purple-600',
    glow: 'rgba(244, 63, 94, 0.35)',
    border: 'border-rose-500/40 hover:border-rose-400',
    bgSubtle: 'bg-rose-500/15 text-rose-300',
    text: 'text-rose-400'
  },
  cyan: {
    name: 'Electric Cyan',
    primary: '#06b6d4',
    gradient: 'from-cyan-600 via-blue-500 to-indigo-600',
    glow: 'rgba(6, 182, 212, 0.35)',
    border: 'border-cyan-500/40 hover:border-cyan-400',
    bgSubtle: 'bg-cyan-500/15 text-cyan-300',
    text: 'text-cyan-400'
  },
  amber: {
    name: 'Solar Amber',
    primary: '#f59e0b',
    gradient: 'from-amber-600 via-orange-500 to-yellow-500',
    glow: 'rgba(245, 158, 11, 0.35)',
    border: 'border-amber-500/40 hover:border-amber-400',
    bgSubtle: 'bg-amber-500/15 text-amber-300',
    text: 'text-amber-400'
  },
  purple: {
    name: 'Ultra Violet',
    primary: '#a855f7',
    gradient: 'from-purple-600 via-fuchsia-500 to-pink-600',
    glow: 'rgba(168, 85, 247, 0.35)',
    border: 'border-purple-500/40 hover:border-purple-400',
    bgSubtle: 'bg-purple-500/15 text-purple-300',
    text: 'text-purple-400'
  }
};

const DEFAULT_SETTINGS: ThemeSettings = {
  themeMode: 'dark',
  accentColor: 'purple',
  glassIntensity: 'medium',
  cardBorderGlow: true,
  sidebarCollapsed: false,
  fontSize: 'medium',
  animationsEnabled: true,
  chartStyle: 'area',
  backgroundPattern: 'grid',
  highContrast: false,
  appThemeId: 'cyberpunk',
};

const STORAGE_KEY = 'ok_korean_theme_settings_v5';

interface ThemeContextType {
  // Legacy compatibility
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;

  // Modern Theme Engine
  settings: ThemeSettings;
  updateSetting: <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => void;
  resetSettings: () => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  accent: AccentColorMeta;

  // 3 Custom Themes Engine
  activeTheme: AppThemeConfig;
  setAppTheme: (id: AppThemeId) => void;
  cycleNextTheme: () => void;
  themesList: AppThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Normalize theme id to one of the 3 custom themes
        const normalizedId: AppThemeId = 
          parsed.appThemeId === 'matrix' || parsed.appThemeId === 'matrix-green' ? 'matrix' :
          parsed.appThemeId === 'oceanic' || parsed.appThemeId === 'oceanic-teal' || parsed.appThemeId === 'midnight-blue' ? 'oceanic' :
          'cyberpunk';
        return { ...DEFAULT_SETTINGS, ...parsed, appThemeId: normalizedId };
      }
    } catch (e) {
      console.error('Failed to load theme settings from storage', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeTheme = APP_THEMES[settings.appThemeId] || APP_THEMES['cyberpunk'];

  // Sync to DOM root & localStorage
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Dark/Light classes
    root.classList.add('dark');
    body.classList.add('dark');
    root.style.colorScheme = 'dark';

    // Set custom CSS variables for smooth theme transitions
    root.setAttribute('data-theme', activeTheme.id);
    root.style.setProperty('--theme-primary', activeTheme.primary);
    root.style.setProperty('--theme-secondary', activeTheme.secondary);
    root.style.setProperty('--theme-chart', activeTheme.chartColor);
    root.style.setProperty('--theme-bg-base', activeTheme.bgBase);
    root.style.setProperty('--theme-card-bg', activeTheme.cardBg);
    root.style.setProperty('--theme-border', activeTheme.borderColor);
    root.style.setProperty('--theme-glow', activeTheme.glowColor);
    root.style.setProperty('--theme-text', activeTheme.textColor);

    // High contrast class
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font size scaling
    root.setAttribute('data-font-size', settings.fontSize);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save theme settings to storage', e);
    }
  }, [settings, activeTheme]);

  const updateSetting = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const setAppTheme = (themeId: AppThemeId) => {
    const targetTheme = APP_THEMES[themeId] || APP_THEMES['cyberpunk'];
    setSettings(prev => ({
      ...prev,
      appThemeId: targetTheme.id,
      themeMode: 'dark',
    }));
  };

  const cycleNextTheme = () => {
    const currentId = activeTheme.id;
    let nextId: AppThemeId = 'cyberpunk';
    if (currentId === 'cyberpunk') nextId = 'matrix';
    else if (currentId === 'matrix') nextId = 'oceanic';
    else nextId = 'cyberpunk';
    setAppTheme(nextId);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const toggleTheme = () => {
    cycleNextTheme();
  };

  const setTheme = (mode: ThemeMode) => {
    // Mode toggling cycles through the 3 themes in dark mode
    cycleNextTheme();
  };

  const accent: AccentColorMeta = {
    name: activeTheme.name,
    primary: activeTheme.primary,
    gradient: activeTheme.buttonGradient,
    glow: activeTheme.glowColor,
    border: `border-[${activeTheme.primary}]/45`,
    bgSubtle: `bg-[${activeTheme.primary}]/15`,
    text: `text-[${activeTheme.primary}]`
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: 'dark',
        isDark: true,
        toggleTheme,
        setTheme,
        settings,
        updateSetting,
        resetSettings,
        isDrawerOpen,
        setIsDrawerOpen,
        accent,
        activeTheme,
        setAppTheme,
        cycleNextTheme,
        themesList: PRIMARY_3_THEMES,
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

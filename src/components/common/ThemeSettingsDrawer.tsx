import React from 'react';
import { 
  X, 
  RotateCcw, 
  Sun, 
  Moon, 
  Sparkles, 
  Palette, 
  Sliders, 
  Eye, 
  Layout, 
  Type, 
  Activity, 
  BarChart3, 
  Grid, 
  Contrast,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useTheme, 
  ACCENT_PALETTES, 
  AccentColor, 
  GlassIntensity, 
  FontSize, 
  ChartStyle, 
  BackgroundPattern 
} from '../../context/ThemeContext';

export const ThemeSettingsDrawer: React.FC = () => {
  const { 
    settings, 
    updateSetting, 
    resetSettings, 
    isDrawerOpen, 
    setIsDrawerOpen,
    accent 
  } = useTheme();

  const accentKeys: AccentColor[] = ['indigo', 'emerald', 'rose', 'cyan', 'amber', 'purple'];
  const glassLevels: { value: GlassIntensity; label: string }[] = [
    { value: 'none', label: 'Off' },
    { value: 'low', label: 'Subtle' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'Deep' },
  ];
  const fontSizes: { value: FontSize; label: string; desc: string }[] = [
    { value: 'small', label: 'Compact', desc: 'Dense tables & lists' },
    { value: 'medium', label: 'Standard', desc: 'Balanced default' },
    { value: 'large', label: 'Enlarged', desc: 'High legibility' },
  ];
  const patterns: { value: BackgroundPattern; label: string }[] = [
    { value: 'grid', label: 'Cyber Grid' },
    { value: 'dots', label: 'Matrix Dots' },
    { value: 'none', label: 'Clean Solid' },
  ];

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-out Drawer Container */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative w-full max-w-md h-full bg-slate-900/95 dark:bg-slate-900/95 text-slate-100 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/30">
              <div className="flex items-center gap-2.5">
                <div 
                  className="p-2 rounded-xl text-white shadow-md"
                  style={{ backgroundColor: accent.primary }}
                >
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                    <span>Appearance & Theme</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-bold uppercase">
                      10 Controls
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">Personalize your executive dashboard</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetSettings}
                  title="Reset to default theme"
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Settings Controls List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 divide-y divide-white/5">
              
              {/* 1. THEME MODE: DAY / NIGHT TOGGLE */}
              <div className="pt-2 first:pt-0 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    {settings.themeMode === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                    <span>1. Theme Mode (Day / Night)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 capitalize">
                    {settings.themeMode === 'dark' ? 'Night (Dark)' : 'Day (Light)'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => updateSetting('themeMode', 'light')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settings.themeMode === 'light'
                        ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Day Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting('themeMode', 'dark')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settings.themeMode === 'dark'
                        ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Night Mode</span>
                  </button>
                </div>
              </div>

              {/* 2. ACCENT COLOR PICKER */}
              <div className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    <span>2. Brand Accent Color</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {accent.name}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {accentKeys.map((key) => {
                    const pal = ACCENT_PALETTES[key];
                    const isSelected = settings.accentColor === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateSetting('accentColor', key)}
                        className={`p-2 rounded-xl flex items-center gap-2 border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white/15 border-white text-white shadow-md ring-2 ring-white/30'
                            : 'bg-black/30 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span 
                          className="w-4 h-4 rounded-full shrink-0 shadow-xs flex items-center justify-center"
                          style={{ backgroundColor: pal.primary }}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                        </span>
                        <span className="truncate">{pal.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. GLASSMORPHISM EFFECT */}
              <div className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>3. Glassmorphism Intensity</span>
                  </div>
                  <span className="text-xs font-mono text-purple-300 capitalize">
                    {settings.glassIntensity}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
                  {glassLevels.map((lvl) => (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => updateSetting('glassIntensity', lvl.value)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        settings.glassIntensity === lvl.value
                          ? 'bg-white/20 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. CARD BORDER GLOW */}
              <div className="pt-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    <span>4. Card Border Glow</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Neon hover aura on interactive stat cards</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('cardBorderGlow', !settings.cardBorderGlow)}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                    settings.cardBorderGlow ? 'bg-pink-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.cardBorderGlow ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 5. SIDEBAR LAYOUT (EXPANDED VS COLLAPSED) */}
              <div className="pt-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Layout className="w-4 h-4 text-cyan-400" />
                    <span>5. Sidebar Layout</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Toggle between Expanded and Collapsed (icons only)</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('sidebarCollapsed', !settings.sidebarCollapsed)}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                    settings.sidebarCollapsed ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.sidebarCollapsed ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 6. BASE FONT SIZE */}
              <div className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Type className="w-4 h-4 text-emerald-400" />
                    <span>6. Base Typography Scale</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-300 capitalize">
                    {settings.fontSize}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {fontSizes.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => updateSetting('fontSize', f.value)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        settings.fontSize === f.value
                          ? 'bg-emerald-500/20 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">{f.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 7. ANIMATIONS & MICRO-INTERACTIONS */}
              <div className="pt-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <span>7. Motion & Micro-Animations</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Card entrance transitions and responsive lifts</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('animationsEnabled', !settings.animationsEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                    settings.animationsEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.animationsEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 8. CHART STYLE: AREA VS BAR */}
              <div className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <span>8. Analytics Chart Presentation</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-300 uppercase">
                    {settings.chartStyle} Chart
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => updateSetting('chartStyle', 'bar')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settings.chartStyle === 'bar'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Bar Columns
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSetting('chartStyle', 'area')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settings.chartStyle === 'area'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Smooth Area Curve
                  </button>
                </div>
              </div>

              {/* 9. BACKGROUND PATTERN */}
              <div className="pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Grid className="w-4 h-4 text-cyan-400" />
                    <span>9. Background Pattern Texture</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 capitalize">
                    {settings.backgroundPattern}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
                  {patterns.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => updateSetting('backgroundPattern', p.value)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        settings.backgroundPattern === p.value
                          ? 'bg-white/20 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 10. HIGH CONTRAST MODE */}
              <div className="pt-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Contrast className="w-4 h-4 text-amber-400" />
                    <span>10. High Contrast Accessibility</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Amplifies border clarity and white text brightness</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSetting('highContrast', !settings.highContrast)}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                    settings.highContrast ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.highContrast ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Footer with Close */}
            <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Saved to Local Browser Cache
              </span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                Close Settings
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

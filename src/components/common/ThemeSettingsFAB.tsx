import React from 'react';
import { Palette, Sparkles, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export const ThemeSettingsFAB: React.FC = () => {
  const { setIsDrawerOpen, accent, settings, toggleTheme } = useTheme();

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      {/* Quick Day / Night Toggle Pill */}
      <button
        type="button"
        onClick={toggleTheme}
        title={`Switch to ${settings.themeMode === 'dark' ? 'Day (Light)' : 'Night (Dark)'} Mode`}
        className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/20 shadow-xl backdrop-blur-xl hover:scale-105 active:scale-95 transition-all cursor-pointer text-xs font-bold"
      >
        {settings.themeMode === 'dark' ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Day</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Night</span>
          </>
        )}
      </button>

      {/* Primary Floating Action Button (FAB) */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsDrawerOpen(true)}
        title="Open Theme & Appearance Settings"
        className="relative group p-3.5 sm:p-4 rounded-full text-white shadow-2xl backdrop-blur-xl border border-white/25 cursor-pointer flex items-center justify-center transition-all"
        style={{
          background: `linear-gradient(135deg, ${accent.primary}, #1e1b4b)`,
          boxShadow: `0 0 25px ${accent.glow}`
        }}
        aria-label="Open Appearance & Theme Settings"
      >
        <Palette className="w-5 h-5 text-white animate-spin-slow group-hover:rotate-45 transition-transform duration-300" />
        
        {/* Pulsing Accent Glow Ping */}
        <span 
          className="absolute inset-0 rounded-full animate-ping opacity-25 pointer-events-none"
          style={{ backgroundColor: accent.primary }}
        />

        {/* Floating Tooltip */}
        <div className="absolute right-full mr-3 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[11px] font-bold whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md border border-white/10 shadow-lg">
          Appearance & 10 Theme Controls
        </div>
      </motion.button>
    </div>
  );
};

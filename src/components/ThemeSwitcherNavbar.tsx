import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { useTheme, AppThemeId } from '../context/ThemeContext';

export const ThemeSwitcherNavbar: React.FC = () => {
  const { activeTheme, setAppTheme, cycleNextTheme, themesList } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Small Theme Switcher Icon Button in Navbar */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          title={`Theme: ${activeTheme.name} (${activeTheme.tagline}) - Click to change`}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 bg-slate-900/80 backdrop-blur-md"
          style={{
            borderColor: activeTheme.borderColor,
            boxShadow: `0 0 12px ${activeTheme.glowColor}`
          }}
          aria-label="Theme selector"
        >
          <div className="relative flex items-center justify-center">
            <Palette 
              className="w-4 h-4 transition-transform duration-300" 
              style={{ color: activeTheme.primary }} 
            />
            <span 
              className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-ping"
              style={{ backgroundColor: activeTheme.secondary }}
            />
          </div>

          <span className="text-xs font-black tracking-wide font-mono hidden sm:inline" style={{ color: activeTheme.primary }}>
            {activeTheme.emoji} {activeTheme.name}
          </span>
        </button>

        {/* Quick Cycle Button (One click to switch to next theme) */}
        <button
          type="button"
          onClick={cycleNextTheme}
          title="Quick switch to next theme"
          className="p-1.5 rounded-xl border border-white/10 hover:border-white/25 bg-slate-900/60 text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 hidden md:flex items-center justify-center"
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: activeTheme.secondary }} />
        </button>
      </div>

      {/* 3 Custom Themes Popover Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-72 bg-[#0d0718]/95 backdrop-blur-2xl rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn border"
          style={{
            borderColor: activeTheme.borderColor,
            boxShadow: `0 10px 30px rgba(0,0,0,0.8), 0 0 25px ${activeTheme.glowColor}`
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 px-1">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: activeTheme.primary }} />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Select Theme
              </span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              3 Custom Themes
            </span>
          </div>

          {/* 3 Themes List */}
          <div className="space-y-1.5">
            {themesList.map((theme) => {
              const isSelected = activeTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setAppTheme(theme.id as AppThemeId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-white/15 shadow-md ring-1'
                      : 'hover:bg-white/5'
                  }`}
                  style={{
                    borderLeft: isSelected ? `3px solid ${theme.primary}` : '3px solid transparent',
                    boxShadow: isSelected ? `0 0 15px ${theme.glowColor}` : undefined
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Theme Swatches Preview */}
                    <div className="flex items-center -space-x-1 p-1 rounded-lg bg-black/60 border border-white/10 shrink-0">
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs" 
                        style={{ backgroundColor: theme.swatches[0] }} 
                      />
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs" 
                        style={{ backgroundColor: theme.swatches[1] }} 
                      />
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs" 
                        style={{ backgroundColor: theme.swatches[2] }} 
                      />
                    </div>

                    {/* Name & Tagline */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{theme.emoji}</span>
                        <span className={`text-xs font-bold truncate ${
                          isSelected ? 'text-white' : 'text-slate-200'
                        }`}>
                          {theme.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {theme.tagline}
                      </span>
                    </div>
                  </div>

                  {/* Active Checkmark */}
                  {isSelected && (
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick instructions */}
          <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-center text-slate-400 font-mono">
            Auto-syncs cards, text & charts
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme, AppThemeId } from '../context/ThemeContext';

export const ThemeSelectorDropdown: React.FC = () => {
  const { activeTheme, setAppTheme, themesList } = useTheme();
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
      {/* Palette Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Select Theme (12 Presets)"
        className="flex items-center gap-1.5 p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
        style={{
          borderColor: isOpen ? activeTheme.primary : undefined,
        }}
        aria-label="Open theme presets selector"
      >
        <Palette 
          className="w-4 h-4 transition-transform duration-300" 
          style={{ color: activeTheme.primary }} 
        />
        <span className="hidden md:inline font-bold text-[11px] font-mono text-slate-700 dark:text-slate-200">
          Theme
        </span>
      </button>

      {/* 12-Theme Glassmorphism Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white/95 dark:bg-[#0c101d]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn">
          {/* Dropdown Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200/80 dark:border-white/10 px-1">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-500" style={{ color: activeTheme.primary }} />
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Interface Themes
              </span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
              12 Presets
            </span>
          </div>

          {/* Themes Grid */}
          <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
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
                      ? 'bg-slate-100 dark:bg-white/10 shadow-sm ring-1 ring-white/20'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                  style={{
                    borderLeft: isSelected ? `3px solid ${theme.primary}` : '3px solid transparent'
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 3-Dot Swatches Preview */}
                    <div className="flex items-center -space-x-1 p-1 rounded-lg bg-black/40 border border-white/10 shrink-0">
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

                    {/* Theme Name & Tagline */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold truncate ${
                          isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {theme.name}
                        </span>
                        {theme.isDark ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-slate-400 font-mono">
                            Dark
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 font-mono">
                            Light
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {theme.tagline}
                      </span>
                    </div>
                  </div>

                  {/* Active Selection Checkmark */}
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
        </div>
      )}
    </div>
  );
};

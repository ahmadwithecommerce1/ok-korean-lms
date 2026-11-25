import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Sparkles, Check, Palette, ChevronDown } from 'lucide-react';
import { useTheme, AppThemeId } from '../context/ThemeContext';

export const ThemeSwitcher: React.FC = () => {
  const { activeThemeId, activeTheme, setTheme, themes, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  const getThemeIcon = (id: AppThemeId) => {
    switch (id) {
      case 'light-mode':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'midnight':
        return <Moon className="w-4 h-4 text-cyan-400" />;
      case 'emerald-dark':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'purple-velvet':
        return <Palette className="w-4 h-4 text-purple-400" />;
      default:
        return <Moon className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs"
        style={{
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: activeTheme.borderColor,
          color: activeTheme.textPrimary
        }}
        aria-label="Select theme"
        title={`Current theme: ${activeTheme.name}`}
      >
        <span className="flex items-center justify-center">
          {getThemeIcon(activeThemeId)}
        </span>
        <span className="hidden sm:inline font-bold">{activeTheme.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-slate-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-2xl border p-2 shadow-2xl z-50 backdrop-blur-xl animate-fadeIn"
          style={{
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: activeTheme.borderColor,
            boxShadow: `0 16px 36px -8px ${activeTheme.glowShadow || 'rgba(0,0,0,0.3)'}`
          }}
        >
          <div className="px-2.5 py-1.5 border-b mb-1 flex items-center justify-between" style={{ borderColor: activeTheme.borderColor }}>
            <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: activeTheme.textSecondary }}>
              Select Theme (4 Modes)
            </span>
            <span className="text-[10px] font-mono font-bold" style={{ color: activeTheme.primary }}>
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>

          <div className="space-y-1">
            {themes.map((theme) => {
              const isSelected = theme.id === activeThemeId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                    isSelected
                      ? 'border-indigo-500/50 shadow-xs ring-1 ring-indigo-500/30'
                      : 'border-transparent hover:border-slate-200 dark:hover:border-slate-850'
                  }`}
                  style={{
                    backgroundColor: isSelected
                      ? (isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.95)')
                      : 'transparent'
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg shrink-0" style={{ backgroundColor: `${theme.primary}20` }}>
                      {getThemeIcon(theme.id)}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold block truncate" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                        {theme.name}
                      </span>
                      <span className="text-[10px] block truncate" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                        {theme.tagline}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Color Swatch Dot */}
                    <div className="flex -space-x-1">
                      {theme.swatches.map((color, idx) => (
                        <span
                          key={idx}
                          className="w-2.5 h-2.5 rounded-full ring-1 ring-black/20"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-500 shrink-0 font-bold" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { 
  Menu, 
  Sparkles 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { TabId } from '../../types';
import { ThemeSwitcherNavbar } from '../ThemeSwitcherNavbar';

interface HeaderProps {
  currentTab: TabId;
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onOpenSidebar }) => {
  const { language, t } = useLanguage();
  const { activeTheme, cycleNextTheme, accent } = useTheme();

  const today = new Date();
  const dateFormatted = today.toLocaleDateString(language === 'kr' ? 'ko-KR' : language === 'ur' ? 'ur-PK' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header 
      className="sticky top-0 z-30 backdrop-blur-2xl border-b px-4 sm:px-6 lg:px-8 py-3.5 transition-colors duration-300"
      style={{
        backgroundColor: `${activeTheme.bgBase}e6`,
        borderColor: activeTheme.borderColor
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger + OK KOREAN Logo & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-black/40 border transition-colors cursor-pointer"
            style={{ borderColor: activeTheme.borderColor }}
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" style={{ color: activeTheme.primary }} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span 
                className="font-extrabold uppercase tracking-widest text-[11px]"
                style={{ color: activeTheme.primary }}
              >
                OK KOREAN
              </span>
              <span className="text-slate-600">/</span>
              <span className="truncate text-slate-300 font-medium">
                {t(`nav.${currentTab}`)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate drop-shadow-xs">
                {t(`header.title.${currentTab}`)}
              </h1>
              <span className="hidden md:inline-block text-xs font-normal text-slate-400 truncate">
                {t(`header.sub.${currentTab}`)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Live Date Indicator + Theme Switcher Icon */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Live Date Indicator */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border text-xs text-slate-300 font-mono shadow-xs"
            style={{ borderColor: activeTheme.borderColor }}
          >
            <span 
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: activeTheme.primary }}
            />
            <span className="hidden sm:inline">{dateFormatted}</span>
            <span className="sm:hidden">{today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>

          {/* Small 3-Theme Switcher Icon in the navbar */}
          <ThemeSwitcherNavbar />

          {/* Quick theme cycle icon button */}
          <button
            type="button"
            onClick={cycleNextTheme}
            title={`Switch Theme: Next preset after ${activeTheme.name}`}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-black/40 border transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
            style={{ 
              borderColor: activeTheme.borderColor,
              boxShadow: `0 0 10px ${activeTheme.glowColor}`
            }}
            aria-label="Cycle theme"
          >
            <Sparkles className="w-4 h-4" style={{ color: activeTheme.secondary }} />
          </button>
        </div>
      </div>
    </header>
  );
};

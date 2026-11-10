import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Award, 
  CreditCard, 
  FileText, 
  MessageCircle, 
  Settings, 
  LogOut, 
  X,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  Palette
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useColorAnimation } from '../context/ColorAnimationContext';
import { AnimatedColorText } from './common/AnimatedColorText';
import { TabId } from '../types';

export interface SidebarProps {
  currentTab: TabId;
  setCurrentTab: (tab: TabId) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen,
  onClose
}) => {
  const { user, logout, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { isColorAnimEnabled, toggleColorAnim } = useColorAnimation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isAdmin = user?.role === 'admin';

  const allMenuItems: { 
    id: TabId; 
    labelKey: string; 
    defaultLabel: string; 
    koreanLabel: string; 
    icon: React.FC<{ className?: string }>; 
    adminOnly?: boolean;
  }[] = [
    { id: 'dashboard', labelKey: 'nav.dashboard', defaultLabel: 'Dashboard', koreanLabel: '대시보드', icon: LayoutDashboard },
    { id: 'students', labelKey: 'nav.students', defaultLabel: 'Student Directory', koreanLabel: '원생 명부', icon: Users },
    { id: 'attendance', labelKey: 'nav.attendance', defaultLabel: 'Daily Attendance', koreanLabel: '출석 관리', icon: CalendarCheck },
    { id: 'tests', labelKey: 'nav.tests', defaultLabel: 'Weekly Tests', koreanLabel: '주간 시험', icon: Award },
    { id: 'fees', labelKey: 'nav.fees', defaultLabel: 'Fees Management', koreanLabel: '수강료 관리', icon: CreditCard },
    { id: 'reports', labelKey: 'nav.reports', defaultLabel: 'PDF Reports', koreanLabel: '성적표 발급', icon: FileText },
    { id: 'whatsapp', labelKey: 'nav.whatsapp', defaultLabel: 'WhatsApp Hub', koreanLabel: '학부모 소통', icon: MessageCircle },
    { id: 'settings', labelKey: 'nav.settings', defaultLabel: 'Settings', koreanLabel: '학원 설정', icon: Settings, adminOnly: true },
  ];

  const visibleItems = allMenuItems.filter(item => {
    if (isAdmin) return true;
    if (item.adminOnly) return false;
    return hasPermission(item.id);
  });

  const handleSelect = (tab: TabId) => {
    setCurrentTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out border-r lg:translate-x-0 ${
          isCollapsed ? 'lg:w-20 w-72' : 'w-72'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'} bg-[#060813]/95 backdrop-blur-2xl text-white border-slate-800/80 shadow-2xl`}
      >
        {/* Brand Header */}
        <div className={`h-20 flex items-center border-b border-slate-800/80 bg-black/30 ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow-lg shrink-0 bg-white ring-2 ring-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center p-0.5">
              <img 
                src="/logo.png" 
                alt="OK Korean Language Center Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-black text-sm tracking-tight flex items-center gap-1.5 truncate">
                  <span className="text-white">OK Korean</span>
                  <span className="text-[10px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-md shrink-0 text-white bg-emerald-600">
                    {isAdmin ? 'Admin' : 'Teacher'}
                  </span>
                </span>
                <span className="text-[11px] font-medium truncate font-korean text-emerald-400">
                  오케이 한국어 학원
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Capsule */}
        {!isCollapsed ? (
          <div className="px-5 py-3 border-b border-slate-800/80 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md bg-emerald-600">
                {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-slate-100">
                  {user?.name || (isAdmin ? 'Principal Admin' : 'Teacher')}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate font-mono">
                    {isAdmin ? 'Full System Control' : `${visibleItems.length} Authorized Modules`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 flex justify-center border-b border-white/5">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs bg-emerald-600"
              title={user?.name || (isAdmin ? 'Admin' : 'Teacher')}
            >
              {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto" aria-label="Main Navigation">
          {!isCollapsed ? (
            <div className="px-3 pb-2 text-[10px] font-black tracking-widest uppercase text-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Academy Terminal</span>
              </div>
              <button
                type="button"
                onClick={toggleColorAnim}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                  isColorAnimEnabled
                    ? 'bg-gradient-to-r from-purple-500/25 via-pink-500/25 to-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse'
                    : 'bg-white/5 text-slate-500 hover:text-slate-300 border-white/10'
                }`}
                title={isColorAnimEnabled ? "Color Wave Animation: ON (Click to toggle OFF)" : "Color Wave Animation: OFF (Click to toggle ON)"}
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span className="font-mono text-[9px]">{isColorAnimEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center pb-2">
              <button
                type="button"
                onClick={toggleColorAnim}
                className={`p-1.5 rounded-lg transition-all cursor-pointer border ${
                  isColorAnimEnabled
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'bg-white/5 text-slate-500 hover:text-slate-300 border-white/10'
                }`}
                title={isColorAnimEnabled ? "Color Wave: ON" : "Color Wave: OFF"}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          )}

          {visibleItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                title={isCollapsed ? t(item.labelKey) || item.defaultLabel : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                } rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? 'text-white shadow-md bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'min-w-0'}`}>
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform ${
                      isActive ? 'scale-110 text-white' : 'group-hover:scale-105'
                    }`}
                  />
                  {!isCollapsed && (
                    <AnimatedColorText 
                      text={t(item.labelKey) || item.defaultLabel}
                      className="truncate font-medium"
                      delayStep={0.1}
                    />
                  )}
                </div>
                {!isCollapsed && (
                  <span
                    className={`text-[11px] font-normal font-korean shrink-0 ml-1 ${
                      isActive ? 'text-white/80' : 'text-slate-500'
                    }`}
                  >
                    {item.koreanLabel}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Collapse/Expand Toggle on Desktop */}
        <div className="hidden lg:flex px-3 py-2 border-t border-slate-800/80 justify-center">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full py-2 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-slate-400 hover:text-white hover:bg-white/5"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Quick Info & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-black/30 space-y-2">
          {!isCollapsed && (
            <div className="p-2.5 rounded-xl border bg-white/5 border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>{t('nav.topikPrep')}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                {t('nav.activeTerm')}
              </p>
            </div>
          )}

          <button
            onClick={logout}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isCollapsed ? 'p-2' : ''
            } text-rose-400 hover:text-white bg-rose-950/20 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-600 shadow-xs`}
            title={isCollapsed ? t('nav.signOut') : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>{t('nav.signOut')}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;


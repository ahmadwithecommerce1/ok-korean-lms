import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Volume2, 
  CalendarCheck, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  Clock, 
  Award,
  ExternalLink,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { TabId, AppPushNotification } from '../../types';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { StorageService } from '../../services/storageService';
import { NotificationService } from '../../services/notificationService';

interface HeaderProps {
  currentTab: TabId;
  onOpenSidebar: () => void;
  onNavigate?: (tab: TabId) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onOpenSidebar, onNavigate }) => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { activeTheme, isDark } = useTheme();

  const [notifications, setNotifications] = useState<AppPushNotification[]>(() => 
    StorageService.getAppNotifications()
  );
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => 
    NotificationService.getPermissionStatus()
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  // Subscribe to live notifications
  useEffect(() => {
    const unsub = StorageService.subscribeAppNotifications((live) => {
      setNotifications(live);
    });
    return () => unsub();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  // Filter notifications relevant to current user role
  const userNotifications = notifications.filter(n => {
    if (n.targetRole === 'all') return true;
    if (n.targetRole === user?.role) {
      if (user?.role === 'teacher' && n.targetTeacherId) {
        return n.targetTeacherId === (user as any).id || n.targetTeacherId === user?.username;
      }
      return true;
    }
    return false;
  });

  const unreadCount = userNotifications.filter(n => !n.read).length;

  const handleRequestPush = async () => {
    const perm = await NotificationService.requestPermission();
    setPermissionStatus(perm);
    if (perm === 'granted') {
      NotificationService.sendNotification({
        title: 'Push Notifications Enabled',
        body: 'You will receive real-time alerts for attendance, fees, and schedule requests.',
        type: 'attendance_marked',
        targetRole: 'all'
      });
    }
  };

  const handleNotificationClick = (notif: AppPushNotification) => {
    StorageService.markNotificationRead(notif.id);
    if (notif.linkTab && onNavigate) {
      onNavigate(notif.linkTab);
      setIsNotifOpen(false);
    }
  };

  const today = new Date();
  const dateFormatted = today.toLocaleDateString(language === 'kr' ? 'ko-KR' : language === 'ur' ? 'ur-PK' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const getNotifIcon = (type: AppPushNotification['type']) => {
    switch (type) {
      case 'attendance_marked':
        return <CalendarCheck className="w-4 h-4 text-emerald-400" />;
      case 'teacher_reminder':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'fee_due':
        return <DollarSign className="w-4 h-4 text-rose-400" />;
      case 'sunday_request':
      case 'sunday_approved':
        return <Calendar className="w-4 h-4 text-purple-400" />;
      case 'leave_request':
        return <AlertCircle className="w-4 h-4 text-blue-400" />;
      case 'test_alert':
        return <Award className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <header 
      className="sticky top-0 z-30 backdrop-blur-2xl border-b px-4 sm:px-6 lg:px-8 py-3 transition-colors duration-300"
      style={{
        backgroundColor: isDark ? 'rgba(10, 14, 26, 0.85)' : 'rgba(255, 255, 255, 0.88)',
        borderColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(226, 232, 240, 0.9)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger + OK KOREAN Logo & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-xl transition-colors cursor-pointer border"
            style={{
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)',
              borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(203, 213, 225, 0.8)',
              color: activeTheme.primary
            }}
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <span 
                className="font-extrabold uppercase tracking-widest text-[11px]"
                style={{ color: activeTheme.primary }}
              >
                OK KOREAN
              </span>
              <span className="opacity-40">/</span>
              <span 
                className="truncate font-semibold text-[11px]"
                style={{ color: activeTheme.textSecondary }}
              >
                {t(`nav.${currentTab}`)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <h1 
                className="text-base sm:text-lg font-black tracking-tight truncate drop-shadow-xs"
                style={{ color: activeTheme.textPrimary }}
              >
                {t(`header.title.${currentTab}`)}
              </h1>
              <span 
                className="hidden md:inline-block text-xs font-normal truncate"
                style={{ color: activeTheme.textSecondary }}
              >
                {t(`header.sub.${currentTab}`)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Notifications, Theme Switcher & Live Date Indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Notification Bell Dropdown */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl transition-all cursor-pointer border flex items-center justify-center hover:scale-105 active:scale-95"
              style={{
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
                borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(203, 213, 225, 0.8)',
                color: unreadCount > 0 ? activeTheme.primary : activeTheme.textSecondary
              }}
              title="Notifications & Real-Time Alerts"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm shadow-rose-500/50">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-400 animate-ping opacity-60 pointer-events-none" />
                </>
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {isNotifOpen && (
              <div 
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200"
                style={{
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
                  borderColor: isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.9)'
                }}
              >
                {/* Header */}
                <div className="p-3.5 border-b flex items-center justify-between" style={{ borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' }}>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Real-Time Alerts</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => StorageService.markAllNotificationsRead()}
                        className="p-1 rounded text-xs text-cyan-500 hover:text-cyan-400 transition-colors cursor-pointer"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Browser Push Permission Banner */}
                {NotificationService.isSupported() && permissionStatus !== 'granted' && (
                  <div className="p-3 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border-b border-purple-500/20 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-purple-200">
                      <strong>Desktop / Mobile Alerts:</strong> Enable push notifications to receive real-time popups.
                    </div>
                    <button
                      onClick={handleRequestPush}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-600 hover:bg-purple-500 text-white shrink-0 shadow-sm cursor-pointer"
                    >
                      Enable
                    </button>
                  </div>
                )}

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                  {userNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-semibold">No notifications yet</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Alerts for attendance, dues, and requests will appear here.</p>
                    </div>
                  ) : (
                    userNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                          notif.read 
                            ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-75' 
                            : 'bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40'
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700/60 mt-0.5">
                          {getNotifIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {notif.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.body}
                          </p>
                          {notif.linkTab && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                              <span>Go to {notif.linkTab}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-2" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {userNotifications.length > 0 && (
                  <div className="p-2 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs px-3">
                    <span className="text-[11px] text-slate-400">
                      {userNotifications.length} notification{userNotifications.length === 1 ? '' : 's'}
                    </span>
                    <button
                      onClick={() => StorageService.clearAllNotifications()}
                      className="text-[11px] text-rose-500 hover:text-rose-400 font-semibold cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear all</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <ThemeSwitcher />

          {/* Live Date Indicator */}
          <div 
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono shadow-xs"
            style={{
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.8)',
              borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(203, 213, 225, 0.8)',
              color: activeTheme.textSecondary
            }}
          >
            <span 
              className="w-1.5 h-1.5 rounded-full animate-pulse" 
              style={{ backgroundColor: activeTheme.secondary || activeTheme.primary }}
            />
            <span>{dateFormatted}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

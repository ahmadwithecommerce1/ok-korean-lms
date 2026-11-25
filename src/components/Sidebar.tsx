import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
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
  ChevronDown,
  Activity,
  Fingerprint,
  BarChart3,
  Layers,
  CalendarDays,
  UserCog,
  BookOpen,
  FolderOpen,
  ClipboardList,
  GraduationCap,
  Receipt,
  Wallet,
  TrendingUp,
  Bell,
  Megaphone,
  Mail,
  Shield,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useColorAnimation } from '../context/ColorAnimationContext';
import { AnimatedColorText } from './common/AnimatedColorText';
import { AdmissionService } from '../services/admissionService';
import { isSessionOnline, TeacherActivityService } from '../services/teacherActivityService';
import { TabId } from '../types';

export interface SidebarProps {
  currentTab: TabId;
  setCurrentTab: (tab: TabId) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface SidebarMenuItem {
  navId: string;
  targetTab?: TabId;
  permissionTab?: TabId;
  labelKey?: string;
  defaultLabel: string;
  koreanLabel: string;
  icon: React.FC<{ className?: string }>;
  adminOnly?: boolean;
  badgeCount?: number;
}

interface SidebarCategory {
  id: string;
  title: string;
  items: SidebarMenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isOpen,
  onClose,
}) => {
  const { user, logout, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { isColorAnimEnabled, toggleColorAnim } = useColorAnimation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeNavId, setActiveNavId] = useState<string>(currentTab);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'academy-overview': true,
    'student-management': true,
    'staff-management': true,
    'academic-management': true,
    'financial-management': true,
    'communication-centre': true,
    'reports-documents': true,
    'system-administration': true,
  });

  const isAdmin = user?.role === 'admin';
  const [pendingAdmissionsCount, setPendingAdmissionsCount] = useState<number>(() =>
    AdmissionService.getAdmissionRequests().filter((r) => r.status === 'Pending').length
  );

  const [onlineTeachersCount, setOnlineTeachersCount] = useState<number>(() => {
    const ids = new Set<string>();
    TeacherActivityService.getActivityRecords().forEach((r) => {
      if (isSessionOnline(r.status)) ids.add(r.teacherId || r.teacherUsername || r.teacherName);
    });
    return ids.size;
  });

  useEffect(() => {
    if (!isAdmin) return;
    const unsubscribeAdmissions = AdmissionService.subscribeAdmissionRequests((requests) => {
      const pending = requests.filter((r) => r.status === 'Pending').length;
      setPendingAdmissionsCount(pending);
    });
    const unsubscribeActivity = TeacherActivityService.subscribeTeacherActivity((records) => {
      const onlineIds = new Set<string>();
      records.forEach((r) => {
        if (isSessionOnline(r.status)) onlineIds.add(r.teacherId || r.teacherUsername || r.teacherName);
      });
      setOnlineTeachersCount(onlineIds.size);
    });
    return () => {
      unsubscribeAdmissions();
      unsubscribeActivity();
    };
  }, [isAdmin]);

  const categories: SidebarCategory[] = [
    {
      id: 'academy-overview',
      title: 'ACADEMY OVERVIEW',
      items: [
        {
          navId: 'dashboard',
          targetTab: 'dashboard',
          permissionTab: 'dashboard',
          labelKey: 'nav.dashboard',
          defaultLabel: 'Dashboard',
          koreanLabel: '대시보드',
          icon: LayoutDashboard,
        },
        {
          navId: 'analytics-insights',
          targetTab: 'analytics-insights',
          permissionTab: 'analytics-insights',
          labelKey: 'nav.analytics-insights',
          defaultLabel: 'Analytics & Insights',
          koreanLabel: '분석 인사이트',
          icon: BarChart3,
        },
      ],
    },
    {
      id: 'student-management',
      title: 'STUDENT MANAGEMENT',
      items: [
        {
          navId: 'students',
          targetTab: 'students',
          permissionTab: 'students',
          labelKey: 'nav.students',
          defaultLabel: 'Student Directory',
          koreanLabel: '원생 명부',
          icon: Users,
        },
        {
          navId: 'admissions',
          targetTab: 'admissions',
          permissionTab: 'admissions',
          labelKey: 'nav.admissions',
          defaultLabel: 'Admission Requests',
          koreanLabel: '입학 신청',
          icon: UserPlus,
          adminOnly: true,
          badgeCount: pendingAdmissionsCount,
        },
        {
          navId: 'batch-classes',
          targetTab: 'batch-classes',
          permissionTab: 'batch-classes',
          labelKey: 'nav.batch-classes',
          defaultLabel: 'Batch & Classes',
          koreanLabel: '반 및 시간표',
          icon: Layers,
        },
        {
          navId: 'academic-calendar',
          targetTab: 'academic-calendar',
          permissionTab: 'academic-calendar',
          labelKey: 'nav.academic-calendar',
          defaultLabel: 'Academic Calendar',
          koreanLabel: '학사 일정',
          icon: CalendarDays,
        },
      ],
    },
    {
      id: 'staff-management',
      title: 'STAFF MANAGEMENT',
      items: [
        {
          navId: 'teacher-monitor',
          targetTab: 'teacher-monitor',
          permissionTab: 'teacher-monitor',
          labelKey: 'nav.teacher-monitor',
          defaultLabel: 'Teacher Monitor',
          koreanLabel: '강사 활동',
          icon: Activity,
          adminOnly: true,
          badgeCount: onlineTeachersCount,
        },
        {
          navId: 'teacher-management',
          targetTab: 'teacher-management',
          permissionTab: 'teacher-management',
          labelKey: 'nav.teacher-management',
          defaultLabel: 'Teacher Management',
          koreanLabel: '강사 관리',
          icon: UserCog,
          adminOnly: true,
        },
      ],
    },
    {
      id: 'academic-management',
      title: 'ACADEMIC MANAGEMENT',
      items: [
        {
          navId: 'attendance',
          targetTab: 'attendance',
          permissionTab: 'attendance',
          labelKey: 'nav.attendance',
          defaultLabel: 'Daily Attendance',
          koreanLabel: '출석 관리',
          icon: CalendarCheck,
        },
        {
          navId: 'biometric',
          targetTab: 'biometric',
          permissionTab: 'biometric',
          labelKey: 'nav.biometric',
          defaultLabel: 'ZKTeco / Biometric',
          koreanLabel: '생체 인식',
          icon: Fingerprint,
          adminOnly: true,
        },
        {
          navId: 'tests',
          targetTab: 'tests',
          permissionTab: 'tests',
          labelKey: 'nav.tests',
          defaultLabel: 'Weekly Tests',
          koreanLabel: '주간 시험',
          icon: Award,
        },
        {
          navId: 'courses-curriculum',
          targetTab: 'courses-curriculum',
          permissionTab: 'courses-curriculum',
          labelKey: 'nav.courses-curriculum',
          defaultLabel: 'Courses & Curriculum',
          koreanLabel: '교육 과정',
          icon: BookOpen,
        },
        {
          navId: 'study-materials',
          targetTab: 'study-materials',
          permissionTab: 'study-materials',
          labelKey: 'nav.study-materials',
          defaultLabel: 'Study Materials',
          koreanLabel: '학습 자료',
          icon: FolderOpen,
        },
        {
          navId: 'assignments-homework',
          targetTab: 'assignments-homework',
          permissionTab: 'assignments-homework',
          labelKey: 'nav.assignments-homework',
          defaultLabel: 'Assignments & Homework',
          koreanLabel: '과제 관리',
          icon: ClipboardList,
        },
        {
          navId: 'topik-preparation',
          targetTab: 'topik-preparation',
          permissionTab: 'topik-preparation',
          labelKey: 'nav.topik-preparation',
          defaultLabel: 'TOPIK Preparation',
          koreanLabel: 'TOPIK 대비',
          icon: GraduationCap,
        },
      ],
    },
    {
      id: 'financial-management',
      title: 'FINANCIAL MANAGEMENT',
      items: [
        {
          navId: 'fees',
          targetTab: 'fees',
          permissionTab: 'fees',
          labelKey: 'nav.fees',
          defaultLabel: 'Fees Management',
          koreanLabel: '수강료 관리',
          icon: CreditCard,
        },
        {
          navId: 'expense-management',
          targetTab: 'expense-management',
          permissionTab: 'expense-management',
          labelKey: 'nav.expense-management',
          defaultLabel: 'Expense Management',
          koreanLabel: '지출 관리',
          icon: Receipt,
          adminOnly: true,
        },
        {
          navId: 'salary-payroll',
          targetTab: 'salary-payroll',
          permissionTab: 'salary-payroll',
          labelKey: 'nav.salary-payroll',
          defaultLabel: 'Salary & Payroll',
          koreanLabel: '급여 관리',
          icon: Wallet,
          adminOnly: true,
        },
        {
          navId: 'financial-reports',
          targetTab: 'financial-reports',
          permissionTab: 'financial-reports',
          labelKey: 'nav.financial-reports',
          defaultLabel: 'Financial Reports',
          koreanLabel: '재무 리포트',
          icon: TrendingUp,
          adminOnly: true,
        },
      ],
    },
    {
      id: 'communication-centre',
      title: 'COMMUNICATION CENTRE',
      items: [
        {
          navId: 'whatsapp',
          targetTab: 'whatsapp',
          permissionTab: 'whatsapp',
          labelKey: 'nav.whatsapp',
          defaultLabel: 'WhatsApp Hub',
          koreanLabel: '학부모 소통',
          icon: MessageCircle,
        },
        {
          navId: 'notifications-centre',
          targetTab: 'notifications-centre',
          permissionTab: 'notifications-centre',
          labelKey: 'nav.notifications-centre',
          defaultLabel: 'Notifications Centre',
          koreanLabel: '알림 센터',
          icon: Bell,
        },
        {
          navId: 'announcements',
          targetTab: 'announcements',
          permissionTab: 'announcements',
          labelKey: 'nav.announcements',
          defaultLabel: 'Announcements',
          koreanLabel: '공지사항',
          icon: Megaphone,
        },
        {
          navId: 'email-communication',
          targetTab: 'email-communication',
          permissionTab: 'email-communication',
          labelKey: 'nav.email-communication',
          defaultLabel: 'Email Communication',
          koreanLabel: '이메일 소통',
          icon: Mail,
        },
      ],
    },
    {
      id: 'reports-documents',
      title: 'REPORTS & DOCUMENTS',
      items: [
        {
          navId: 'reports',
          targetTab: 'reports',
          permissionTab: 'reports',
          labelKey: 'nav.reports',
          defaultLabel: 'PDF Reports',
          koreanLabel: '성적표 발급',
          icon: FileText,
        },
      ],
    },
    {
      id: 'system-administration',
      title: 'SYSTEM ADMINISTRATION',
      items: [
        {
          navId: 'user-roles-permissions',
          targetTab: 'user-roles-permissions',
          permissionTab: 'user-roles-permissions',
          labelKey: 'nav.user-roles-permissions',
          defaultLabel: 'User Roles & Permissions',
          koreanLabel: '권한 관리',
          icon: Shield,
          adminOnly: true,
        },
        {
          navId: 'activity-audit-logs',
          targetTab: 'activity-audit-logs',
          permissionTab: 'activity-audit-logs',
          labelKey: 'nav.activity-audit-logs',
          defaultLabel: 'Activity & Audit Logs',
          koreanLabel: '활동 로그',
          icon: ScrollText,
          adminOnly: true,
        },
        {
          navId: 'settings',
          targetTab: 'settings',
          permissionTab: 'settings',
          labelKey: 'nav.settings',
          defaultLabel: 'Settings',
          koreanLabel: '학원 설정',
          icon: Settings,
          adminOnly: true,
        },
      ],
    },
  ];

  const canViewItem = (item: SidebarMenuItem): boolean => {
    if (isAdmin) return true;
    if (item.permissionTab && hasPermission(item.permissionTab)) return true;
    if (item.adminOnly) return false;
    return false;
  };

  const visibleCategories = categories
    .map((category) => ({
      ...category,
      items: category.items.filter(canViewItem),
    }))
    .filter((category) => category.items.length > 0);

  const visibleItemsCount = visibleCategories.reduce(
    (sum, category) => sum + category.items.length,
    0
  );

  // Sync active highlight when currentTab changes externally (e.g. from Header or Dashboard buttons)
  useEffect(() => {
    const allItems = categories.flatMap((c) => c.items);
    const activeItem = allItems.find((item) => item.navId === activeNavId);
    if (!activeItem || activeItem.targetTab !== currentTab) {
      setActiveNavId(currentTab);
      const owningCat = categories.find((c) =>
        c.items.some((item) => item.navId === currentTab)
      );
      if (owningCat) {
        setExpandedCategories((prev) => ({ ...prev, [owningCat.id]: true }));
      }
    }
  }, [currentTab]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleSelect = (item: SidebarMenuItem) => {
    setActiveNavId(item.navId);
    if (item.targetTab) {
      setCurrentTab(item.targetTab);
    }
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
        <div
          className={`h-20 flex items-center border-b border-slate-800/80 bg-black/30 shrink-0 ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
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
                    {isAdmin ? 'Admin' : user?.role === 'staff' ? 'Staff' : 'Teacher'}
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
          <div className="px-5 py-3 border-b border-slate-800/80 bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md bg-emerald-600">
                {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate text-slate-100">
                  {user?.name || (isAdmin ? 'Principal Admin' : user?.role === 'staff' ? 'Staff Member' : 'Teacher')}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate font-mono">
                    {isAdmin ? 'Full System Control' : `${visibleItemsCount} Authorized Modules`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 flex justify-center border-b border-white/5 shrink-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs bg-emerald-600"
              title={user?.name || (isAdmin ? 'Admin' : user?.role === 'staff' ? 'Staff' : 'Teacher')}
            >
              {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-2.5" aria-label="Main Navigation">
          {!isCollapsed ? (
            <div className="px-2.5 pb-1 text-[10px] font-black tracking-widest uppercase text-slate-500 flex items-center justify-between">
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
                title={
                  isColorAnimEnabled
                    ? 'Color Wave Animation: ON (Click to toggle OFF)'
                    : 'Color Wave Animation: OFF (Click to toggle ON)'
                }
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span className="font-mono text-[9px]">{isColorAnimEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center pb-1">
              <button
                type="button"
                onClick={toggleColorAnim}
                className={`p-1.5 rounded-lg transition-all cursor-pointer border ${
                  isColorAnimEnabled
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'bg-white/5 text-slate-500 hover:text-slate-300 border-white/10'
                }`}
                title={isColorAnimEnabled ? 'Color Wave: ON' : 'Color Wave: OFF'}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          )}

          {visibleCategories.map((category, categoryIdx) => {
            const isCategoryExpanded = expandedCategories[category.id] !== false;
            const showItems = isCollapsed || isCategoryExpanded;

            return (
              <div
                key={category.id}
                className={
                  categoryIdx > 0
                    ? 'pt-2 border-t border-slate-800/70'
                    : undefined
                }
              >
                {!isCollapsed && (
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    aria-expanded={isCategoryExpanded}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 mb-1 rounded-lg text-[10px] font-black tracking-[0.12em] uppercase text-slate-400/90 hover:text-emerald-300 hover:bg-white/[0.03] transition-colors cursor-pointer select-none"
                  >
                    <span className="truncate">{category.title}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${
                        isCategoryExpanded ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>
                )}

                {showItems && (
                  <div className="space-y-1">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const labelText = item.labelKey
                        ? t(item.labelKey) || item.defaultLabel
                        : item.defaultLabel;
                      const isActive = activeNavId === item.navId;

                      return (
                        <button
                          key={item.navId}
                          type="button"
                          onClick={() => handleSelect(item)}
                          title={isCollapsed ? `${category.title} — ${labelText}` : undefined}
                          className={`w-full flex items-center ${
                            isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
                          } rounded-xl text-xs font-semibold transition-all duration-200 group cursor-pointer ${
                            isActive
                              ? 'text-white shadow-md bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-500/20'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div
                            className={`flex items-center gap-3 ${
                              isCollapsed ? 'justify-center relative' : 'min-w-0'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <Icon
                                className={`w-4 h-4 transition-transform ${
                                  isActive ? 'scale-110 text-white' : 'group-hover:scale-105'
                                }`}
                              />
                              {isCollapsed &&
                                typeof item.badgeCount === 'number' &&
                                item.badgeCount > 0 && (
                                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center shadow-sm">
                                    {item.badgeCount > 99 ? '99+' : item.badgeCount}
                                  </span>
                                )}
                            </div>
                            {!isCollapsed && (
                              <AnimatedColorText
                                text={labelText}
                                className="truncate font-medium text-xs"
                                delayStep={0.1}
                              />
                            )}
                          </div>

                          {!isCollapsed &&
                            (typeof item.badgeCount === 'number' ? (
                              <span
                                className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-black shrink-0 ml-1.5 tabular-nums ${
                                  item.badgeCount > 0
                                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                                    : isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {item.badgeCount}
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-normal font-korean shrink-0 ml-1.5 ${
                                  isActive ? 'text-white/80' : 'text-slate-500'
                                }`}
                              >
                                {item.koreanLabel}
                              </span>
                            ))}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Collapse/Expand Toggle on Desktop */}
        <div className="hidden lg:flex px-3 py-2 border-t border-slate-800/80 justify-center shrink-0">
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
        <div className="p-3 border-t border-slate-800/80 bg-black/30 space-y-2 shrink-0">
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

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CalendarCheck, 
  DollarSign, 
  AlertCircle, 
  Award, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  Sparkles,
  ChevronRight,
  BookOpen,
  Zap,
  Activity,
  BarChart3,
  Sliders,
  Layers,
  UserPlus,
  Receipt
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { StorageService } from '../services/storageService';
import { TabId, Student, AttendanceRecord, WeeklyTest, FeeRecord, ActivityLog } from '../types';
import { SmartInsightsCard } from '../components/SmartInsightsCard';

export interface DashboardProps {
  onNavigate: (tab: TabId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { settings, accent, updateSetting, setIsDrawerOpen, activeTheme } = useTheme();

  const isAdmin = user?.role === 'admin';
  const isDark = true;
  const hasMotion = settings.animationsEnabled;

  // Live state from Firestore subscriptions
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [tests, setTests] = useState<WeeklyTest[]>(() => StorageService.getTests());
  const [fees, setFees] = useState<FeeRecord[]>(() => StorageService.getFees());
  const [logs, setLogs] = useState<ActivityLog[]>(() => StorageService.getActivityLogs());

  // 2-Second Skeleton Loader as requested while data fetches
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(true);

  useEffect(() => {
    const skeletonTimer = setTimeout(() => {
      setIsLoadingSkeleton(false);
    }, 2000);
    return () => clearTimeout(skeletonTimer);
  }, []);

  useEffect(() => {
    const unsubStudents = StorageService.subscribeStudents(setStudents);
    const unsubAttendance = StorageService.subscribeAttendance(setAttendance);
    const unsubTests = StorageService.subscribeTests(setTests);
    const unsubFees = StorageService.subscribeFees(setFees);
    const unsubLogs = StorageService.subscribeLogs(setLogs);
    return () => {
      unsubStudents();
      unsubAttendance();
      unsubTests();
      unsubFees();
      unsubLogs();
    };
  }, []);

  // Metrics calculation
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'Active').length;

  const todayActual = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter(a => a.date === todayActual);
  const recordsToUse = todayRecords.length > 0 
    ? todayRecords 
    : attendance.filter(a => a.date === '2026-10-24');
  const todayPresent = recordsToUse.filter(a => a.status === 'Present').length;
  const attendanceRate = recordsToUse.length > 0 
    ? Math.round((todayPresent / recordsToUse.length) * 100) 
    : (activeStudents > 0 ? 100 : 0);

  // Financials in Pakistani Rupees (PKR)
  const totalFeesExpected = fees.reduce((sum, f) => sum + f.totalAmount, 0);
  const totalFeesCollected = fees.reduce((sum, f) => sum + f.paidAmount, 0);
  const totalPendingDues = fees.reduce((sum, f) => sum + f.pendingAmount, 0);

  // Test statistics
  const allScores = tests.flatMap(t => t.scores);
  const avgTestScore = allScores.length > 0 
    ? Math.round(allScores.reduce((acc, s) => acc + s.percentage, 0) / allScores.length)
    : 86;

  // Chart Mode: 'attendance' | 'tests'
  const [chartMode, setChartMode] = useState<'attendance' | 'tests'>('attendance');

  const attendanceChartData = [
    { label: 'Mon', value: 94, count: '32/34' },
    { label: 'Tue', value: 88, count: '30/34' },
    { label: 'Wed', value: 96, count: '33/34' },
    { label: 'Thu', value: 91, count: '31/34' },
    { label: 'Fri', value: 97, count: '33/34' },
    { label: 'Sat', value: 89, count: '24/27' },
  ];

  const testChartData = [
    { label: 'Wk 1', value: 82, count: 'Hangul Intro' },
    { label: 'Wk 2', value: 85, count: 'Particles' },
    { label: 'Wk 3', value: 79, count: 'Conjugations' },
    { label: 'Wk 4', value: 89, count: 'Honorifics' },
    { label: 'Wk 5', value: 91, count: 'Connectors' },
    { label: 'Wk 6', value: 88, count: 'Comprehension' },
  ];

  const activeChart = chartMode === 'attendance' ? attendanceChartData : testChartData;

  const batches = [
    { name: 'Batch A', time: '09:00 - 11:00 AM', level: 'Beginner (TOPIK I)', students: students.filter(s => s.batch.includes('Batch A')).length, room: 'Room 201' },
    { name: 'Batch B', time: '02:00 - 04:00 PM', level: 'Elementary & EPS', students: students.filter(s => s.batch.includes('Batch B')).length, room: 'Room 202' },
    { name: 'Batch C', time: '06:00 - 08:00 PM', level: 'Intermediate (TOPIK II)', students: students.filter(s => s.batch.includes('Batch C')).length, room: 'Room 204' },
    { name: 'Batch D', time: 'Weekend Intensive', level: 'All Levels Speed Track', students: students.filter(s => s.batch.includes('Weekend')).length, room: 'Main Lecture Hall' },
  ];

  // Card glassmorphic styling helper responsive to the 3 custom themes
  const cardBaseStyle = `rounded-2xl transition-all duration-300 border backdrop-blur-md shadow-lg text-white hover:border-cyan-400/40`;
  const cardCustomStyle = {
    backgroundColor: activeTheme.cardBg,
    borderColor: activeTheme.borderColor,
    boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 16px ${activeTheme.glowColor}`
  };

  // Recent System Activity items (connecting live logs or realistic system events)
  const recentTimelineEvents = React.useMemo(() => {
    if (logs && logs.length > 0) {
      return logs.slice(0, 4).map((log, index) => {
        let icon = <Activity className="w-3.5 h-3.5" />;
        let colorClasses = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
        let categoryLabel = 'System';

        if (log.category === 'fee') {
          icon = <Receipt className="w-3.5 h-3.5" />;
          colorClasses = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
          categoryLabel = 'Fee';
        } else if (log.category === 'attendance') {
          icon = <CheckCircle2 className="w-3.5 h-3.5" />;
          colorClasses = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
          categoryLabel = 'Attendance';
        } else if (log.category === 'test') {
          icon = <Award className="w-3.5 h-3.5" />;
          colorClasses = 'text-purple-400 bg-purple-500/10 border-purple-500/30';
          categoryLabel = 'Test';
        } else if (log.category === 'student') {
          icon = <UserPlus className="w-3.5 h-3.5" />;
          colorClasses = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
          categoryLabel = 'Student';
        }

        const timeDisplay = index === 0 ? '2 min ago' : index === 1 ? '15 min ago' : index === 2 ? '1 hour ago' : '3 hours ago';

        return {
          id: log.id,
          title: log.action || 'System Event',
          detail: log.detail,
          time: timeDisplay,
          icon,
          colorClasses,
          categoryLabel,
        };
      });
    }

    return [
      {
        id: 't1',
        title: 'Batch A attendance synced successfully',
        detail: 'ZKTeco K40 biometric scan logs synchronized with Firestore',
        time: '2 min ago',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        colorClasses: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        categoryLabel: 'Attendance',
      },
      {
        id: 't2',
        title: "New student 'Ali Hassan' enrolled",
        detail: 'Assigned Roll #OK-2025-001 in Morning Class 1 (Beginner Level)',
        time: '15 min ago',
        icon: <UserPlus className="w-3.5 h-3.5" />,
        colorClasses: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        categoryLabel: 'Student',
      },
      {
        id: 't3',
        title: 'Fee payment received from Zainab Q.',
        detail: 'Tuition installment of Rs. 25,000 PKR verified and receipt generated',
        time: '1 hour ago',
        icon: <Receipt className="w-3.5 h-3.5" />,
        colorClasses: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        categoryLabel: 'Fee',
      },
      {
        id: 't4',
        title: 'Weekly Test 6 results compiled',
        detail: 'Batch aggregate reached 89.2% proficiency in TOPIK I Vocabulary',
        time: '3 hours ago',
        icon: <Award className="w-3.5 h-3.5" />,
        colorClasses: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        categoryLabel: 'Test',
      },
    ];
  }, [logs]);

  // Helper for rendering premium Recharts Area Chart with glowing gradient & interactive tooltip
  const renderAreaChart = () => {
    const chartColor = activeTheme.chartColor;

    return (
      <div className="w-full h-60 pt-3 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={activeChart}
            margin={{ top: 16, right: 14, left: -20, bottom: 4 }}
          >
            <defs>
              {/* Smooth Glowing Gradient matching active theme */}
              <linearGradient id="themeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.45} />
                <stop offset="50%" stopColor={chartColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0.0} />
              </linearGradient>

              {/* Glowing Drop Shadow Filter for Line */}
              <filter id="themeAreaLineDropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor={chartColor} floodOpacity={0.7} />
              </filter>
            </defs>

            {/* Faint Dashed Horizontal Grid Lines */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800/60"
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
              dy={6}
            />

            <YAxis
              domain={[60, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
              tickFormatter={(v) => `${v}%`}
              dx={-4}
            />

            {/* Interactive Dark Glassmorphism Tooltip */}
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div 
                      className="backdrop-blur-xl border rounded-2xl p-3.5 shadow-2xl min-w-[170px] text-xs font-sans ring-1 ring-white/10"
                      style={{
                        backgroundColor: `${activeTheme.cardBg}f0`,
                        borderColor: activeTheme.borderColor,
                        boxShadow: `0 10px 25px rgba(0,0,0,0.8), 0 0 15px ${activeTheme.glowColor}`
                      }}
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10">
                        <span className="font-extrabold text-white text-sm">{data.label}</span>
                        <span 
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                          style={{
                            color: chartColor,
                            backgroundColor: `${chartColor}20`,
                            borderColor: `${chartColor}40`
                          }}
                        >
                          {chartMode === 'attendance' ? 'Attendance' : 'Assessment'}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shadow-sm"
                              style={{ backgroundColor: chartColor, boxShadow: `0 0 8px ${chartColor}` }} 
                            />
                            Performance:
                          </span>
                          <span className="font-black text-white text-base tabular-nums">
                            {data.value}%
                          </span>
                        </div>
                        {data.count && (
                          <div className="flex items-center justify-between gap-3 text-slate-400 text-[11px] pt-1 border-t border-white/5">
                            <span>Details:</span>
                            <span className="font-mono font-semibold" style={{ color: chartColor }}>{data.count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Glowing Smooth Area Line with Solid White-Bordered Dots */}
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={3}
              fill="url(#themeAreaGradient)"
              filter="url(#themeAreaLineDropShadow)"
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
              dot={{
                r: 4.5,
                fill: chartColor,
                stroke: '#ffffff',
                strokeWidth: 2,
              }}
              activeDot={{
                r: 7,
                fill: '#ffffff',
                stroke: chartColor,
                strokeWidth: 3,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // =========================================================================
  // 2-Second Skeleton Loader UI (Grey animated pulse boxes)
  // =========================================================================
  if (isLoadingSkeleton) {
    return (
      <div className="space-y-6 animate-pulse font-sans">
        {/* Welcome Banner Skeleton */}
        <div className="rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-36 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="h-9 sm:h-11 w-3/4 sm:w-1/2 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-5/6 sm:w-2/3 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="pt-2 flex flex-wrap gap-2.5">
            <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        {/* 4 Key Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4].map((idx) => (
            <div 
              key={idx} 
              className="rounded-2xl p-5 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="h-3.5 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-3 w-4/5 rounded-md bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>

        {/* Attendance Chart & Schedule Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-48 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-60 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md space-y-3">
            <div className="h-6 w-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2.5 pt-2">
              <div className="h-16 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-16 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-16 rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative z-10 font-sans transition-colors duration-300">
      {/* ========================================================= */}
      {/* 1. SOPHISTICATED INTEGRATED WELCOME BANNER                */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: hasMotion ? 14 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: hasMotion ? 0.45 : 0 }}
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-9 shadow-lg border transition-all duration-300 ${
          isDark
            ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-white/10 text-white'
            : 'bg-gradient-to-r from-slate-50 via-indigo-50/50 to-slate-50 border-slate-200 text-slate-900'
        }`}
      >
        {/* Subtle glowing accent line across top border */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
          style={{ backgroundImage: `linear-gradient(to right, ${accent.primary}, #38bdf8, #ec4899)` }}
        />

        <div className="relative z-10 max-w-3xl">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-3 ${
            isDark 
              ? 'bg-slate-800/80 border-white/10 text-slate-200' 
              : 'bg-white border-slate-200 text-slate-700 shadow-xs'
          }`}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: accent.primary }} />
            <span className="tracking-wide">오케이 한국어 학원 종합 관제 터미널</span>
          </div>

          <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {t('dash.welcome')},{' '}
            <span 
              className="bg-clip-text text-transparent bg-gradient-to-r"
              style={{ backgroundImage: `linear-gradient(to right, ${accent.primary}, #38bdf8, #ec4899)` }}
            >
              {user?.name || (isAdmin ? 'Principal Administrator' : 'Faculty')}
            </span>
          </h2>

          <p className={`mt-2.5 text-xs sm:text-sm leading-relaxed font-normal max-w-2xl ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            {isAdmin 
              ? 'Institutional executive overview. Real-time synchronizations across student admissions, daily batch attendance, PKR tuition collections, and certified examination report cards.'
              : 'Instructor command portal. Record daily batch attendance, evaluate weekly test marks, and dispatch automated bilingual performance notices directly to parents.'
            }
          </p>

          {/* Quick Action Navigation Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${accent.primary}, #312e81)`,
                boxShadow: `0 0 16px ${accent.glow}`
              }}
            >
              <CalendarCheck className="w-4 h-4" />
              <span>{t('dash.markAttendance')}</span>
            </button>

            <button
              onClick={() => onNavigate('tests')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-xs ${
                isDark 
                  ? 'bg-slate-800/80 text-slate-100 border-white/10 hover:bg-slate-800' 
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Award className="w-4 h-4 text-purple-500" />
              <span>{t('dash.recordTest')}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => onNavigate('students')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-xs ${
                  isDark 
                    ? 'bg-slate-800/80 text-slate-100 border-white/10 hover:bg-slate-800' 
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4 text-cyan-500" />
                <span>{t('nav.students')}</span>
              </button>
            )}

            <button
              onClick={() => setIsDrawerOpen(true)}
              className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" style={{ color: accent.primary }} />
              <span className="hidden sm:inline">Theme Presets</span>
            </button>
          </div>
        </div>

        {/* Subtle abstract mesh gradient glow effect on the right side */}
        <div className="absolute -right-16 -top-16 bottom-0 w-96 pointer-events-none select-none overflow-hidden hidden md:block">
          <div 
            className="absolute top-8 right-8 w-64 h-64 rounded-full blur-3xl opacity-30 dark:opacity-25"
            style={{ backgroundColor: accent.primary }}
          />
          <div 
            className="absolute bottom-2 right-20 w-48 h-48 rounded-full blur-3xl opacity-20 dark:opacity-20"
            style={{ backgroundColor: '#38bdf8' }}
          />
          <div 
            className="absolute top-1/2 right-2 -translate-y-1/2 w-36 h-36 rounded-full blur-2xl opacity-15 dark:opacity-15"
            style={{ backgroundColor: '#ec4899' }}
          />
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* 2. STATS CARDS: HIGH CONTRAST & ACCENT GLOWS              */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Enrolled Students */}
        <motion.div 
          initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.05 }}
          onClick={() => isAdmin && onNavigate('students')}
          style={cardCustomStyle}
          className={`p-5 ${cardBaseStyle} ${isAdmin ? 'cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {t('dash.totalStudents')}
            </span>
            <div 
              className="p-2.5 rounded-xl shadow-xs ring-1 ring-cyan-500/30"
              style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}
            >
              <Users className="w-5 h-5 text-cyan-500" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight tabular-nums ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {totalStudents}
            </span>
            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('dash.studentsUnit')}
            </span>
          </div>
          <div className={`mt-3 flex items-center justify-between text-xs pt-2.5 border-t ${
            isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-600'
          }`}>
            <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {activeStudents} Active Now
            </span>
            <span className="font-mono text-[11px]">4 Batches</span>
          </div>
        </motion.div>

        {/* Card 2: Today's Attendance Rate */}
        <motion.div 
          initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.1 }}
          onClick={() => onNavigate('attendance')}
          style={cardCustomStyle}
          className={`p-5 ${cardBaseStyle} cursor-pointer`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {t('dash.todayAttendance')}
            </span>
            <div 
              className="p-2.5 rounded-xl shadow-xs ring-1 ring-emerald-500/30"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
            >
              <CalendarCheck className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {attendanceRate}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-500 font-extrabold uppercase tracking-wide">
              Present
            </span>
          </div>
          <div className={`mt-3 flex items-center justify-between text-xs pt-2.5 border-t ${
            isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-600'
          }`}>
            <span>{todayPresent} present on roll</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-0.5 hover:underline">
              Check Log <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </motion.div>

        {/* Card 3: Total Fees in PKR (Or Class Average for Teachers) */}
        {isAdmin ? (
          <motion.div 
            initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.15 }}
            onClick={() => onNavigate('fees')}
            style={cardCustomStyle}
            className={`p-5 ${cardBaseStyle} cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {t('dash.feesCollected')}
              </span>
              <div 
                className="px-2.5 py-1 rounded-xl shadow-xs ring-1 ring-purple-500/30 font-black text-xs"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}
              >
                PKR
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">Rs.</span>
              <span className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight tabular-nums ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {totalFeesCollected.toLocaleString()}
              </span>
            </div>
            <div className={`mt-3 flex items-center justify-between text-xs pt-2.5 border-t ${
              isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-600'
            }`}>
              <span className="text-purple-600 dark:text-purple-300 font-bold">
                {Math.round((totalFeesCollected / (totalFeesExpected || 1)) * 100)}% Cleared
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-0.5 hover:underline">
                Ledger <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.15 }}
            style={cardCustomStyle}
            className={`p-5 ${cardBaseStyle}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {t('dash.avgScore')}
              </span>
              <div 
                className="p-2.5 rounded-xl shadow-xs ring-1 ring-purple-500/30"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}
              >
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-purple-600 dark:text-purple-300 tabular-nums">
                {avgTestScore}%
              </span>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">Class Avg</span>
            </div>
            <div className={`mt-3 flex items-center justify-between text-xs pt-2.5 border-t ${
              isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-600'
            }`}>
              <span>{tests.length} weekly tests</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Grade A Target</span>
            </div>
          </motion.div>
        )}

        {/* Card 4: Pending Dues (Or Top Performer for Teachers) */}
        {isAdmin ? (
          <motion.div 
            initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.2 }}
            onClick={() => onNavigate('fees')}
            style={cardCustomStyle}
            className={`p-5 ${cardBaseStyle} cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {t('dash.pendingDues')}
              </span>
              <div 
                className="p-2.5 rounded-xl shadow-xs ring-1 ring-rose-500/30"
                style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}
              >
                <AlertCircle className="w-5 h-5 text-rose-500" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-xs text-rose-500 font-bold">Rs.</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
                {totalPendingDues.toLocaleString()}
              </span>
            </div>
            <div className={`mt-3 flex items-center justify-between text-xs pt-2.5 border-t ${
              isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-600'
            }`}>
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                {fees.filter(f => f.status === 'Pending' || f.status === 'Partial').length} Students Pending
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-0.5 hover:underline">
                Collect <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.2 }}
            onClick={() => onNavigate('tests')}
            style={cardCustomStyle}
            className={`p-5 ${cardBaseStyle} cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {t('dash.topPerformer')}
              </span>
              <div 
                className="p-2.5 rounded-xl shadow-xs ring-1 ring-pink-500/30"
                style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}
              >
                <Award className="w-5 h-5 text-pink-500" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl sm:text-3xl font-black truncate block ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Sara Fatima
              </span>
            </div>
            <div className={`mt-3 flex items-center justify-between text-xs pt-2.5 border-t ${
              isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-600'
            }`}>
              <span className="text-pink-600 dark:text-pink-400 font-bold">95% (A+ Grade)</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">View Rankings</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. CHARTS & ACTIVITY FEED (CRISP CONTRAST IN BOTH MODES)  */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Academic & Attendance Analytics */}
        <motion.div 
          initial={{ opacity: 0, y: hasMotion ? 14 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: hasMotion ? 0.4 : 0, delay: 0.25 }}
          style={cardCustomStyle}
          className={`lg:col-span-2 p-6 sm:p-7 ${cardBaseStyle} flex flex-col justify-between`}
        >
          <div>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`text-base font-black tracking-tight flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  <TrendingUp className="w-4 h-4" style={{ color: accent.primary }} />
                  <span>{t('dash.analytics')}</span>
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Consistent weekly progress across enrolled Korean language batches
                </p>
              </div>

              {/* Segmented controls: Attendance vs Tests & Chart Style */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 p-1 rounded-xl border ${
                  isDark ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => setChartMode('attendance')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      chartMode === 'attendance'
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-xs'
                        : isDark 
                          ? 'text-slate-400 hover:text-white' 
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('dash.weeklyAttendance')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('tests')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      chartMode === 'tests'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-xs'
                        : isDark 
                          ? 'text-slate-400 hover:text-white' 
                          : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('dash.testScores')}
                  </button>
                </div>

                {/* Quick Toggle for Area vs Bar Chart */}
                <button
                  type="button"
                  onClick={() => updateSetting('chartStyle', settings.chartStyle === 'bar' ? 'area' : 'bar')}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isDark 
                      ? 'bg-black/40 border-white/10 text-slate-400 hover:text-white' 
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Switch to ${settings.chartStyle === 'bar' ? 'Area Chart' : 'Bar Chart'}`}
                >
                  <BarChart3 className="w-4 h-4" style={{ color: accent.primary }} />
                </button>
              </div>
            </div>

            {/* Dynamic Chart Display */}
            {settings.chartStyle === 'area' ? (
              renderAreaChart()
            ) : (
              <div className="pt-6 pb-2">
                <div className="h-56 w-full flex items-end justify-between gap-2 sm:gap-6 px-2 sm:px-6">
                  {activeChart.map((item, index) => {
                    const heightPercent = Math.max(15, item.value);
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                        {/* Hover Tooltip */}
                        <div className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 border text-[11px] font-bold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-lg pointer-events-none z-20 ${
                          isDark 
                            ? 'bg-slate-950 border-cyan-400 text-cyan-200' 
                            : 'bg-slate-900 border-slate-700 text-white'
                        }`}>
                          {item.value}% ({item.count})
                        </div>

                        {/* Bar Container */}
                        <div className={`w-full max-w-[42px] rounded-xl h-40 flex items-end p-1 relative overflow-hidden border ${
                          isDark 
                            ? 'bg-slate-800 border-white/5' 
                            : 'bg-slate-100 border-slate-200'
                        }`}>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-lg transition-all duration-500 ${
                              chartMode === 'attendance'
                                ? 'bg-gradient-to-t from-indigo-600 via-blue-500 to-cyan-400 shadow-sm'
                                : 'bg-gradient-to-t from-purple-600 via-pink-500 to-rose-400 shadow-sm'
                            }`}
                          />
                        </div>

                        <span className={`text-[11px] font-extrabold tabular-nums ${
                          isDark ? 'text-white' : 'text-slate-800'
                        }`}>
                          {item.value}%
                        </span>
                        <span className={`text-xs font-semibold ${
                          isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subtle Divider Line */}
            <div className={`mt-5 pt-4 border-t ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`} />

            {/* Recent System Activity Timeline Widget */}
            <div className="space-y-3 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-md ${
                    isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-200'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Recent System Activity
                  </h4>
                </div>
                <span className={`text-[11px] font-medium flex items-center gap-1.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real-Time Logs</span>
                </span>
              </div>

              {/* Vertical Timeline List */}
              <div className="relative pl-6 space-y-3 pt-1">
                {/* Connecting Vertical Timeline Line */}
                <div className={`absolute left-[11px] top-2 bottom-2 w-[2px] rounded-full ${
                  isDark 
                    ? 'bg-gradient-to-b from-cyan-500/40 via-purple-500/30 to-emerald-500/20' 
                    : 'bg-gradient-to-b from-cyan-400/40 via-indigo-300 to-emerald-300'
                }`} />

                {recentTimelineEvents.map((item, idx) => (
                  <div key={item.id || idx} className="relative flex items-start gap-3 group">
                    {/* Node Dot / Icon */}
                    <div className={`-ml-6 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border shadow-xs z-10 transition-transform group-hover:scale-110 ${item.colorClasses} ${
                      isDark ? 'bg-slate-900 ring-2 ring-slate-900' : 'bg-white ring-2 ring-white'
                    }`}>
                      {item.icon}
                    </div>

                    {/* Timeline Event Details */}
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate transition-colors ${
                          isDark ? 'text-slate-200 group-hover:text-cyan-300' : 'text-slate-800 group-hover:text-cyan-700'
                        }`}>
                          {item.title}
                        </p>
                        {item.detail && (
                          <p className={`text-xs line-clamp-1 mt-0.5 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {item.detail}
                          </p>
                        )}
                      </div>
                      <span className={`text-[11px] font-mono shrink-0 whitespace-nowrap self-start sm:self-auto ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`mt-4 pt-4 border-t flex items-center justify-between text-xs ${
            isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'
          }`}>
            <span className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full inline-block animate-pulse"
                style={{ backgroundColor: accent.primary }}
              />
              <span>Target Standard: 85%+ Proficiency across TOPIK I & II</span>
            </span>
            <span className="font-bold" style={{ color: accent.primary }}>TOPIK Ready</span>
          </div>
        </motion.div>

        {/* Right 1 Col: Ok-Korean AI Assistant Card */}
        <motion.div 
          initial={{ opacity: 0, y: hasMotion ? 14 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: hasMotion ? 0.4 : 0, delay: 0.3 }}
          className="flex flex-col"
        >
          <SmartInsightsCard 
            students={students}
            attendance={attendance}
            fees={fees}
            tests={tests}
            onNavigate={onNavigate}
          />
        </motion.div>
      </div>

      {/* ========================================================= */}
      {/* 4. TEACHER ASSIGNED CLASSES / BATCH TIMETABLE OVERVIEW   */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: hasMotion ? 14 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: hasMotion ? 0.4 : 0, delay: 0.35 }}
        className={`p-6 sm:p-7 ${cardBaseStyle} shadow-lg`}
      >
        {!isAdmin ? (
          /* Dedicated Teacher Dashboard View */
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                  </span>
                  <h3 className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Your Assigned Classes & Daily Attendance Rosters
                  </h3>
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Direct access to mark attendance and monitor student counts for your assigned Korean language sections.
                </p>
              </div>
              <button
                onClick={() => onNavigate('attendance')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <span>Mark Attendance Now</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Assigned Classes Grid */}
            {(() => {
              const teacherAccount = StorageService.getTeacherAccounts().find(
                t => t.username.toLowerCase() === user?.username.toLowerCase()
              );
              const teacherClasses = teacherAccount?.assignedClasses && teacherAccount.assignedClasses.length > 0
                ? teacherAccount.assignedClasses
                : (user?.assignedClasses && user.assignedClasses.length > 0 ? user.assignedClasses : ['Morning Class 1', 'Morning Class 2', 'Morning Class 3']);

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teacherClasses.map((clsName) => {
                    const isMorning = clsName.startsWith('Morning');
                    const classNameOnly = clsName.replace('Morning ', '').replace('Evening ', '').trim();
                    const timing = isMorning ? 'Morning' : 'Evening';

                    const classStudents = students.filter(s => {
                      if (s.status === 'Inactive') return false;
                      const sTiming = s.timing || (s.batch.includes('Morning') ? 'Morning' : 'Evening');
                      return (sTiming === timing || sTiming === 'Morning + Evening (Both)') && (s.studentClass || 'Class 1') === classNameOnly;
                    });

                    const todayRecords = attendance.filter(
                      a => a.date === todayActual && a.studentClass === classNameOnly && a.timing === timing
                    );

                    const isMarkedToday = todayRecords.length > 0;
                    const presentCount = todayRecords.filter(r => r.status === 'Present').length;

                    return (
                      <div 
                        key={clsName}
                        className={`p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
                          isDark 
                            ? 'bg-slate-800/60 border-white/10 hover:border-indigo-500/40 shadow-xs' 
                            : 'bg-slate-50 border-slate-200 hover:border-indigo-500/40 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`font-black text-sm flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            {clsName}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isMarkedToday
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {isMarkedToday ? `Marked (${presentCount}/${classStudents.length})` : 'Awaiting Attendance'}
                          </span>
                        </div>

                        <div className="space-y-1 mb-4">
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {timing} Shift · {classNameOnly}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            Candidate Biometrics & TOPIK Curriculum
                          </p>
                        </div>

                        <div className={`flex items-center justify-between text-xs pt-3 border-t ${
                          isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
                        }`}>
                          <div>
                            <span className="text-[11px] block">Roster Size</span>
                            <span className={`font-black text-sm tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {classStudents.length} Students
                            </span>
                          </div>

                          <button
                            onClick={() => onNavigate('attendance')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 transition-colors cursor-pointer"
                          >
                            Open Class
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : (
          /* Institutional Batches for Admin */
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-base font-black tracking-tight flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  <BookOpen className="w-4 h-4 text-cyan-500" />
                  <span>{t('dash.timetable')}</span>
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Korean Language curriculum schedule with EPS & TOPIK preparation tracks
                </p>
              </div>
              <button
                onClick={() => onNavigate('attendance')}
                className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View Attendance</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {batches.map((b, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 ${
                    isDark 
                      ? 'bg-slate-800/60 border-white/10 hover:border-cyan-500/40 shadow-xs' 
                      : 'bg-slate-50 border-slate-200 hover:border-cyan-500/40 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{b.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      isDark ? 'bg-white/10 text-cyan-300 border-white/10' : 'bg-white text-cyan-700 border-slate-200'
                    }`}>
                      {b.room}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 mb-1">{b.time}</p>
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{b.level}</p>
                  <div className={`flex items-center justify-between text-xs pt-2.5 border-t ${
                    isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
                  }`}>
                    <span>Enrolled</span>
                    <span className={`font-black tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {b.students} Students
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export const DashboardPage = Dashboard;
export default Dashboard;

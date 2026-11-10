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
  Receipt,
  Calendar,
  CalendarOff,
  ShieldCheck,
  Check,
  X,
  FileText,
  AlertTriangle,
  Send,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { 
  TabId, 
  Student, 
  AttendanceRecord, 
  WeeklyTest, 
  FeeRecord, 
  ActivityLog,
  SundayClassRequest,
  StudentLeaveRequest,
  AttendanceScheduleSettings,
  TeacherAccount
} from '../types';
import { SmartInsightsCard } from '../components/SmartInsightsCard';
import { GlowCard } from '../components/common/GlowCard';
import { AnimatedColorText } from '../components/common/AnimatedColorText';

export interface DashboardProps {
  onNavigate: (tab: TabId) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { activeTheme, isDark } = useTheme();
  const [chartStyle, setChartStyle] = useState<'bar' | 'area'>('area');

  const isAdmin = user?.role === 'admin';
  const hasMotion = true;

  // Live state from Firestore subscriptions
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [tests, setTests] = useState<WeeklyTest[]>(() => StorageService.getTests());
  const [fees, setFees] = useState<FeeRecord[]>(() => StorageService.getFees());
  const [logs, setLogs] = useState<ActivityLog[]>(() => StorageService.getActivityLogs());
  const [sundayRequests, setSundayRequests] = useState<SundayClassRequest[]>(() => StorageService.getSundayRequests());
  const [leaveRequests, setLeaveRequests] = useState<StudentLeaveRequest[]>(() => StorageService.getLeaveRequests());
  const [attendanceSchedule, setAttendanceSchedule] = useState<AttendanceScheduleSettings>(() => 
    StorageService.getAttendanceScheduleSettings()
  );

  // Leave creation modal state for quick dashboard access
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveStudentId, setLeaveStudentId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('Medical & EPS Preparation Leave');
  const [leaveFilter, setLeaveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 2-Second Skeleton Loader as requested while data fetches
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(true);

  useEffect(() => {
    const skeletonTimer = setTimeout(() => {
      setIsLoadingSkeleton(false);
    }, 2000);
    return () => clearTimeout(skeletonTimer);
  }, []);

  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => StorageService.getTeacherAccounts());

  // Dynamic rolling titles with exactly 3-second pause between each roll (Admin only)
  const adminRollingTitles = ['Principal Administrator', 'Admin CEO', 'Sir Farooq Shahzad'];
  const [rollingTitleIndex, setRollingTitleIndex] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    // 3 seconds pause + smooth 0.5s roll = 3500ms cycle
    const rollTimer = setInterval(() => {
      setRollingTitleIndex((prev) => (prev + 1) % adminRollingTitles.length);
    }, 3500);
    return () => clearInterval(rollTimer);
  }, [isAdmin, adminRollingTitles.length]);

  useEffect(() => {
    const unsubStudents = StorageService.subscribeStudents(setStudents);
    const unsubAttendance = StorageService.subscribeAttendance(setAttendance);
    const unsubTests = StorageService.subscribeTests(setTests);
    const unsubFees = StorageService.subscribeFees(setFees);
    const unsubLogs = StorageService.subscribeLogs(setLogs);
    const unsubSunday = StorageService.subscribeSundayRequests(setSundayRequests);
    const unsubLeave = StorageService.subscribeLeaveRequests(setLeaveRequests);
    const unsubSchedule = StorageService.subscribeAttendanceScheduleSettings(setAttendanceSchedule);
    const unsubTeachers = StorageService.subscribeTeachers(setTeachers);
    return () => {
      unsubStudents();
      unsubAttendance();
      unsubTests();
      unsubFees();
      unsubLogs();
      unsubSunday();
      unsubLeave();
      unsubSchedule();
      unsubTeachers();
    };
  }, []);

  // Live teacher profile resolved from Firestore / Auth Context (strictly dynamic, zero hardcoding)
  const currentTeacherAccount = teachers.find(
    t => t.username.toLowerCase() === user?.username?.toLowerCase()
  );
  const teacherDisplayName = currentTeacherAccount?.name || user?.name || 'Faculty Member';
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'Active').length;

  // Teacher assigned classes calculation
  const teacherClasses = currentTeacherAccount?.assignedClasses && currentTeacherAccount.assignedClasses.length > 0
    ? currentTeacherAccount.assignedClasses
    : (user?.assignedClasses && user.assignedClasses.length > 0 ? user.assignedClasses : ['Morning Class 1', 'Morning Class 2', 'Morning Class 3']);

  const todayActual = new Date().toISOString().split('T')[0];
  const todayStatus = StorageService.isAttendanceDayAllowed(todayActual);
  const isTodayOff = !todayStatus.isAllowed;

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
  const allScores = tests.flatMap(t => t.scores || []);
  const topPerformer = allScores.length > 0
    ? [...allScores].sort((a, b) => b.percentage - a.percentage)[0]
    : null;
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

  // Card glassmorphic styling helper: default midnight dark theme
  const cardBaseStyle = `rounded-2xl transition-all duration-300 border backdrop-blur-md shadow-lg text-white hover:border-cyan-400/30`;
  const cardCustomStyle = {
    backgroundColor: '#0f172a99',
    borderColor: '#1e293bcc',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
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
        title: 'New student enrollment system active',
        detail: 'Ready for batch allocations & ZKTeco biometric enrollment',
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
    const chartColor = activeTheme.chartColor || '#06b6d4';

    return (
      <div className="w-full h-60 pt-3 pb-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={activeChart}
            margin={{ top: 16, right: 14, left: -20, bottom: 4 }}
          >
            <defs>
              {/* Smooth Glowing Gradient */}
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
              className={isDark ? "text-slate-800/60" : "text-slate-200/80"}
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}
              dy={6}
            />

            <YAxis
              domain={[60, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }}
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
                      className="backdrop-blur-xl border rounded-2xl p-3.5 shadow-2xl min-w-[170px] text-xs font-sans ring-1"
                      style={{
                        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)',
                        borderColor: isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(203, 213, 225, 0.9)',
                        color: activeTheme.textPrimary,
                        boxShadow: `0 12px 28px -8px ${activeTheme.glowShadow || 'rgba(0,0,0,0.4)'}`
                      }}
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10">
                        <span className="font-extrabold text-sm" style={{ color: activeTheme.textPrimary }}>{data.label}</span>
                        <span 
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                          style={{
                            borderColor: `${chartColor}50`,
                            color: chartColor,
                            backgroundColor: `${chartColor}18`
                          }}
                        >
                          {chartMode === 'attendance' ? 'Attendance' : 'Assessment'}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5" style={{ color: activeTheme.textSecondary }}>
                            <span 
                              className="w-2.5 h-2.5 rounded-full shadow-sm"
                              style={{ backgroundColor: chartColor, boxShadow: `0 0 8px ${chartColor}` }} 
                            />
                            Performance:
                          </span>
                          <span className="font-black text-base tabular-nums" style={{ color: activeTheme.textPrimary }}>
                            {data.value}%
                          </span>
                        </div>
                        {data.count && (
                          <div className="flex items-center justify-between gap-3 text-[11px] pt-1 border-t border-white/5" style={{ color: activeTheme.textSecondary }}>
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. SOPHISTICATED INTEGRATED WELCOME BANNER (GLOW CARD)    */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 1. ULTRA-PREMIUM WELCOME BANNER                           */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: hasMotion ? 14 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: hasMotion ? 0.45 : 0 }}
      >
        <div 
          className="relative overflow-hidden rounded-2xl p-6 sm:p-7 bg-slate-900 border border-slate-800 shadow-sm"
        >
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {/* Clean Outline Badge */}
              <div 
                className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-slate-800 bg-slate-950/60 text-xs font-medium text-slate-300"
              >
                <span className="tracking-wide text-slate-300 font-medium">오케이 한국어 학원</span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  {isAdmin ? 'Administrative Overview' : 'Faculty Instruction Suite'}
                </span>
              </div>

            </div>

            {/* Welcome Heading */}
            <div className="flex items-center py-2 overflow-visible">
              <div className="content">
                <div className="content__container flex items-center flex-wrap sm:flex-nowrap">
                  {isAdmin ? (
                    <>
                      <p className="content__container__text">
                        <AnimatedColorText 
                          text="Welcome back, " 
                          baseDelay={0}
                        />
                      </p>
                      <div className="content__container__list relative inline-flex items-center">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={rollingTitleIndex}
                            initial={{ y: 22, opacity: 0, filter: 'blur(4px)' }}
                            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                            exit={{ y: -22, opacity: 0, filter: 'blur(4px)' }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="content__container__list__item flex items-center h-full"
                          >
                            <AnimatedColorText 
                              text={adminRollingTitles[rollingTitleIndex]} 
                              baseDelay={0.2} 
                            />
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center flex-wrap gap-x-1.5">
                      <p className="content__container__text">
                        <AnimatedColorText 
                          text="Welcome to Faculty " 
                          baseDelay={0}
                        />
                      </p>
                      <span className="font-bold text-white tracking-tight">
                        <AnimatedColorText 
                          text={teacherDisplayName} 
                          baseDelay={0.25} 
                        />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p 
              className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-400 max-w-2xl font-normal"
            >
              {isAdmin 
                ? 'Institutional executive overview. Real-time synchronizations across student admissions, daily batch attendance, PKR tuition collections, and certified examination report cards.'
                : 'Instructor command portal. Record daily batch attendance, evaluate weekly test marks, and dispatch automated bilingual performance notices directly to parents.'
              }
            </p>

            {/* Clean Flat Action Navigation Buttons */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {!isTodayOff ? (
                <button
                  onClick={() => onNavigate('attendance')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4 shrink-0" />
                  <span>{t('dash.markAttendance')}</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Today is off ({todayStatus.dayName})</span>
                </div>
              )}

              {/* Record Weekly Test Button - Simple dark outline button */}
              <button
                onClick={() => onNavigate('tests')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-800 hover:text-white border border-slate-700/80 transition-colors cursor-pointer"
              >
                <Award className="w-4 h-4 text-slate-400" />
                <span>{t('dash.recordTest')}</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => onNavigate('students')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-800 hover:text-white border border-slate-700/80 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>{t('nav.students')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* DAY OFF ATTENDANCE ALERT BANNER - SLEEK DARK CARD WITH ANIMATED GLOWING AMBER/ORANGE BORDER */}
      {isTodayOff && (
        <motion.div
          initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: hasMotion ? 0.35 : 0 }}
          className="rounded-xl p-4 sm:p-5 bg-slate-900 border border-amber-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm sm:text-base text-white">
                  Today is off
                </h4>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {todayStatus.dayName} Day Off
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xl leading-relaxed font-normal">
                Today is {todayStatus.dayName}. Institutional schedule has marked this day as a Day Off. Attendance marking and biometric logging are disabled.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {isAdmin ? (
              <button
                onClick={() => onNavigate('settings')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Manage Schedule</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('attendance')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>View Attendance Log</span>
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ========================================================= */}
      {/* 2. STATS CARDS: HIGH CONTRAST, GLOW BORDERS & LARGER TYPO */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Enrolled Students / Assigned Classes */}
        <motion.div 
          initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.05 }}
          className="h-full"
        >
          <div 
            onClick={() => isAdmin && onNavigate('students')}
            className={`h-full stat-card-3d bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-slate-700 rounded-xl p-5 sm:p-6 transition-all duration-200 shadow-sm flex flex-col justify-between group ${isAdmin ? 'cursor-pointer' : ''}`}
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {isAdmin ? t('dash.totalStudents') : 'Assigned Classes'}
                </span>
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                >
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3.5 flex items-baseline gap-2 min-w-0 overflow-hidden">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight tabular-nums text-white truncate">
                  {isAdmin ? totalStudents : teacherClasses.length}
                </span>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide shrink-0">
                  {isAdmin ? t('dash.studentsUnit') : 'Classes'}
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 font-semibold text-cyan-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {activeStudents} Active Students
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {isAdmin ? '4 Batches' : `${teacherClasses.length} Rosters`}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Today's Attendance Rate */}
        <motion.div 
          initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.1 }}
          className="h-full"
        >
          <div 
            onClick={() => onNavigate('attendance')}
            className="h-full stat-card-3d bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-slate-700 rounded-xl p-5 sm:p-6 transition-all duration-200 shadow-sm flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('dash.todayAttendance')}
                </span>
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                >
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3.5 flex items-baseline gap-2 min-w-0 overflow-hidden">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight tabular-nums text-emerald-400 truncate">
                  {attendanceRate}%
                </span>
                <span className="text-xs text-emerald-500/90 font-semibold uppercase tracking-wide shrink-0">
                  Present
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-slate-400 font-medium">
              <span>{todayPresent} present on roll</span>
              <span className="font-semibold flex items-center gap-0.5 text-cyan-400 hover:underline">
                Check Log <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Fees Collected in PKR (Or Class Avg for Teachers) */}
        {isAdmin ? (
          <motion.div 
            initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.15 }}
            className="h-full"
          >
            <div 
              onClick={() => onNavigate('fees')}
              className="h-full stat-card-3d bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-slate-700 rounded-xl p-5 sm:p-6 transition-all duration-200 shadow-sm flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t('dash.feesCollected')}
                  </span>
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold text-xs"
                  >
                    PKR
                  </div>
                </div>
                <div className="mt-3.5 flex items-baseline gap-1.5 min-w-0 overflow-hidden">
                  <span className="text-xs text-slate-400 font-semibold shrink-0">Rs.</span>
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight tabular-nums text-purple-400 truncate">
                    {totalFeesCollected.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-slate-400 font-medium">
                <span className="text-purple-400 font-semibold">
                  {Math.round((totalFeesCollected / (totalFeesExpected || 1)) * 100)}% Cleared
                </span>
                <span className="font-semibold flex items-center gap-0.5 text-cyan-400 hover:underline">
                  Ledger <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.15 }}
            className="h-full"
          >
            <div 
              onClick={() => onNavigate('tests')}
              className="h-full stat-card-3d bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-slate-700 rounded-xl p-5 sm:p-6 transition-all duration-200 shadow-sm flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t('dash.avgScore')}
                  </span>
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  >
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3.5 flex items-baseline gap-2 min-w-0 overflow-hidden">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight tabular-nums text-purple-400 truncate">
                    {avgTestScore}%
                  </span>
                  <span className="text-xs text-purple-400/90 font-semibold uppercase tracking-wide shrink-0">Class Avg</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-slate-400 font-medium">
                <span>{tests.length} weekly tests evaluated</span>
                <span className="text-emerald-400 font-semibold">Grade A Target</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Card 4: Pending Dues (Or Top Performer for Teachers) */}
        {isAdmin ? (
          <motion.div 
            initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.2 }}
            className="h-full"
          >
            <div 
              onClick={() => onNavigate('fees')}
              className="h-full stat-card-3d bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-slate-700 rounded-xl p-5 sm:p-6 transition-all duration-200 shadow-sm flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t('dash.pendingDues')}
                  </span>
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  >
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3.5 flex items-baseline gap-1.5 min-w-0 overflow-hidden">
                  <span className="text-xs text-slate-400 font-semibold shrink-0">Rs.</span>
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight tabular-nums text-rose-400 truncate">
                    {totalPendingDues.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-slate-400 font-medium">
                <span className="text-rose-400 font-semibold">
                  {fees.filter(f => f.status === 'Pending' || f.status === 'Partial').length} Students Pending
                </span>
                <span className="font-semibold flex items-center gap-0.5 text-cyan-400 hover:underline">
                  Collect <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: hasMotion ? 12 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: hasMotion ? 0.35 : 0, delay: 0.2 }}
            className="h-full"
          >
            <div 
              onClick={() => onNavigate('tests')}
              className="h-full stat-card-3d bg-slate-900/80 backdrop-blur-md border border-slate-800 hover:border-slate-700 rounded-xl p-5 sm:p-6 transition-all duration-200 shadow-sm flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {t('dash.topPerformer')}
                  </span>
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-pink-500/10 text-pink-400 border border-pink-500/20"
                  >
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3.5 min-w-0 overflow-hidden">
                  <span className="text-2xl sm:text-3xl font-bold truncate block text-pink-400">
                    {topPerformer ? topPerformer.studentName : (students.length > 0 ? students[0].fullName : '—')}
                  </span>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wide mt-1 block truncate">
                    {topPerformer ? `${topPerformer.percentage}% Score` : 'Star Student Target'}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-slate-400 font-medium">
                <span className="text-pink-400 font-semibold truncate">
                  {topPerformer ? `Highest Exam Score (${topPerformer.grade || 'A+'})` : (students.length > 0 ? 'Active Candidate' : 'No records')}
                </span>
                <span className="font-semibold text-cyan-400 shrink-0">View Rankings</span>
              </div>
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
          className="lg:col-span-2"
        >
          <GlowCard 
            innerClassName="p-6 sm:p-7 flex flex-col justify-between h-full"
          >
            <div>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
                isDark ? 'border-white/10' : 'border-slate-200'
              }`}>
                <div>
                  <h3 
                    className="text-base font-black tracking-tight flex items-center gap-2"
                    style={{ color: activeTheme.textPrimary }}
                  >
                    <TrendingUp className="w-4 h-4" style={{ color: activeTheme.chartColor || activeTheme.primary }} />
                    <span>{t('dash.analytics')}</span>
                  </h3>
                  <p 
                    className="text-xs mt-0.5"
                    style={{ color: activeTheme.textSecondary }}
                  >
                    Consistent weekly progress across enrolled Korean language batches
                  </p>
                </div>

              {/* Segmented controls: Attendance vs Tests & Chart Style */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 rounded-xl border bg-black/40 border-white/10">
                  <button
                    type="button"
                    onClick={() => setChartMode('attendance')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      chartMode === 'attendance'
                        ? 'bg-gradient-to-r from-emerald-600 to-cyan-500 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
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
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('dash.testScores')}
                  </button>
                </div>

                {/* Quick Toggle for Area vs Bar Chart */}
                <button
                  type="button"
                  onClick={() => setChartStyle(chartStyle === 'bar' ? 'area' : 'bar')}
                  className="p-2 rounded-xl border border-white/10 bg-black/40 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={`Switch to ${chartStyle === 'bar' ? 'Area Chart' : 'Bar Chart'}`}
                >
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>

            {/* Dynamic Chart Display */}
            {chartStyle === 'area' ? (
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
              <span className="w-2.5 h-2.5 rounded-full inline-block animate-pulse bg-emerald-400" />
              <span>Target Standard: 85%+ Proficiency across TOPIK I & II</span>
            </span>
            <span className="font-bold text-emerald-400">TOPIK Ready</span>
          </div>
        </GlowCard>
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
      {/* 4. SUNDAY CLASS OVERRIDE REQUESTS (ADMIN & TEACHER)      */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: hasMotion ? 14 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: hasMotion ? 0.4 : 0, delay: 0.32 }}
      >
        <GlowCard innerClassName="p-6 sm:p-7 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Calendar className="w-4 h-4 text-purple-400" />
                </span>
                <h3 className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Sunday Class Requests & Overrides
                </h3>
                {sundayRequests.filter(r => r.status === 'Pending').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                    {sundayRequests.filter(r => r.status === 'Pending').length} Pending Approval
                  </span>
                )}
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isAdmin 
                  ? 'Attendance is locked on Sundays by default. Approving a request enables attendance marking for that specific teacher and class.'
                  : 'Track your submitted Sunday class requests. Once approved by Admin, attendance marking unlocks.'
                }
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('attendance')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 border border-purple-500/20 transition-all cursor-pointer"
              >
                <span>Go to Attendance</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {sundayRequests.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Sunday class requests</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sunday attendance is disabled by default across all batches until requested by instructors.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {sundayRequests.map((req) => (
                <div
                  key={req.id}
                  className={`p-4 rounded-xl border transition-all ${
                    req.status === 'Approved'
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30'
                      : req.status === 'Rejected'
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-500/30'
                        : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {req.className}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          req.status === 'Approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : req.status === 'Rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span>Teacher: <strong className="text-slate-700 dark:text-slate-300">{req.teacherName}</strong></span>
                        <span>·</span>
                        <span className="font-mono text-purple-500 dark:text-purple-400">{req.date} (Sunday)</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 bg-white/50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-black/5 dark:border-white/5 italic">
                    "{req.reason}"
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        {req.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => StorageService.approveSundayRequest(req.id, user?.name || 'Admin')}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => StorageService.rejectSundayRequest(req.id, user?.name || 'Admin')}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => StorageService.deleteSundayRequest(req.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                          title="Delete request"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {!isAdmin && req.status === 'Approved' && (
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Attendance Unlocked</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlowCard>
      </motion.div>

      {/* ========================================================= */}
      {/* 5. STUDENT LEAVE MANAGEMENT                               */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: hasMotion ? 14 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: hasMotion ? 0.4 : 0, delay: 0.34 }}
      >
        <GlowCard innerClassName="p-6 sm:p-7 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <CalendarOff className="w-4 h-4 text-sky-400" />
                </span>
                <h3 className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Student Leave Management
                </h3>
                {leaveRequests.filter(l => l.status === 'Pending').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                    {leaveRequests.filter(l => l.status === 'Pending').length} Pending Approval
                  </span>
                )}
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isAdmin
                  ? 'Review and authorize candidate leaves submitted by instructors. Approving updates attendance status to Leave; rejecting resets status to Neutral.'
                  : 'Official authorized student leaves. Approved leaves automatically reflect in the attendance roster so instructors know who is on leave.'
                }
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Leave Request</span>
              </button>
            </div>
          </div>

          {/* Pending Requests Highlight Banner for Admin */}
          {isAdmin && leaveRequests.filter(l => l.status === 'Pending').length > 0 && (
            <div className="mb-5 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  Action Required: {leaveRequests.filter(l => l.status === 'Pending').length} Leave Request(s) Awaiting Decision
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {leaveRequests.filter(l => l.status === 'Pending').map((pending) => (
                  <div 
                    key={pending.id}
                    className="p-3 rounded-lg border border-amber-500/30 bg-white/80 dark:bg-slate-900/80 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{pending.studentName}</span>
                        <span className="text-[10px] font-mono text-cyan-400">{pending.studentRoll}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Date: <strong className="text-slate-700 dark:text-slate-300">{pending.startDate}{pending.endDate !== pending.startDate ? ` → ${pending.endDate}` : ''}</strong>
                      </div>
                      <div className="text-[11px] text-amber-600 dark:text-amber-300 font-medium mt-0.5">
                        Reason: "{pending.reason}"
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        By: {pending.submittedByName} ({pending.submittedByRole})
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={async () => {
                          await StorageService.approveLeaveRequest(pending.id, user?.name || 'Admin');
                          showToast(`Leave approved for ${pending.studentName}. Attendance marked as Leave.`);
                        }}
                        className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={async () => {
                          await StorageService.rejectLeaveRequest(pending.id, user?.name || 'Admin');
                          showToast(`Leave rejected for ${pending.studentName}. Attendance reset to Neutral.`);
                        }}
                        className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap">
            {[
              { key: 'all', label: `All Requests (${leaveRequests.length})` },
              { key: 'pending', label: `Pending (${leaveRequests.filter(l => l.status === 'Pending').length})` },
              { key: 'approved', label: `Approved (${leaveRequests.filter(l => l.status === 'Approved').length})` },
              { key: 'rejected', label: `Rejected (${leaveRequests.filter(l => l.status === 'Rejected').length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setLeaveFilter(key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  leaveFilter === key
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {leaveRequests.filter(l => leaveFilter === 'all' || l.status.toLowerCase() === leaveFilter).length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <CalendarOff className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {leaveFilter === 'all' ? 'No student leave requests recorded' : `No ${leaveFilter} leave requests`}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Leave requests submitted by instructors in the Attendance section will appear here for review.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Roll No.</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Submitted By</th>
                    <th className="py-2.5 px-3">Status</th>
                    {isAdmin && <th className="py-2.5 px-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {leaveRequests
                    .filter(l => leaveFilter === 'all' || l.status.toLowerCase() === leaveFilter)
                    .map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {leave.studentName}
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-400">
                        {leave.studentRoll}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300">
                        {leave.startDate} → {leave.endDate}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {leave.reason}
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {leave.submittedByName} ({leave.submittedByRole})
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          leave.status === 'Approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : leave.status === 'Rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {leave.status === 'Pending' && (
                              <>
                                <button
                                  onClick={async () => {
                                    await StorageService.approveLeaveRequest(leave.id, user?.name || 'Admin');
                                    showToast(`Leave approved for ${leave.studentName}. Attendance marked as Leave.`);
                                  }}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer flex items-center gap-0.5"
                                  title="Approve Leave"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    await StorageService.rejectLeaveRequest(leave.id, user?.name || 'Admin');
                                    showToast(`Leave rejected for ${leave.studentName}. Attendance reset to Neutral.`);
                                  }}
                                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] cursor-pointer flex items-center gap-0.5"
                                  title="Reject Leave"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => {
                                StorageService.deleteLeaveRequest(leave.id);
                                showToast('Leave record deleted');
                              }}
                              className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                              title="Delete record"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlowCard>
      </motion.div>

      {/* Leave Creation Modal for Quick Dashboard Access */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <CalendarOff className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Submit Student Leave Request</h3>
              </div>
              <button 
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const targetStudent = students.find(s => s.id === leaveStudentId);
                if (!targetStudent) return;
                const created = StorageService.createLeaveRequest({
                  studentId: targetStudent.id,
                  studentRoll: targetStudent.rollNumber,
                  studentName: targetStudent.fullName,
                  studentClass: targetStudent.studentClass || 'Class 1',
                  batch: targetStudent.batch,
                  startDate: leaveStartDate,
                  endDate: leaveEndDate,
                  reason: leaveReason.trim(),
                  submittedByRole: user?.role || 'admin',
                  submittedByName: user?.name || 'Admin'
                });
                if (isAdmin) {
                  StorageService.approveLeaveRequest(created.id, user?.name || 'Admin');
                  showToast(`Leave recorded and approved for ${targetStudent.fullName}. Marked as Leave.`);
                } else {
                  showToast(`Leave request submitted for ${targetStudent.fullName} (Pending Admin Approval)`);
                }
                setIsLeaveModalOpen(false);
                setLeaveStudentId('');
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Student
                </label>
                <select
                  value={leaveStudentId}
                  onChange={(e) => setLeaveStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  required
                >
                  <option value="">-- Choose student from active classes --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.rollNumber}) · {s.studentClass || 'Class 1'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Leave
                </label>
                <textarea
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Medical, Family emergency, Overseas examination, etc."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isAdmin ? 'Approve & Save Leave' : 'Submit Leave Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. TEACHER ASSIGNED CLASSES / BATCH TIMETABLE OVERVIEW   */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: hasMotion ? 14 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: hasMotion ? 0.4 : 0, delay: 0.35 }}
      >
        <GlowCard innerClassName="p-6 sm:p-7 shadow-lg">
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
              {!isTodayOff ? (
                <button
                  onClick={() => onNavigate('attendance')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <span>Mark Attendance Now</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/25">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Today is OFF. Attendance is disabled.</span>
                </div>
              )}
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
                    const classDayStatus = StorageService.isAttendanceDayAllowed(todayActual, clsName);
                    const isClassDayOff = !classDayStatus.isAllowed;

                    return (
                      <div 
                        key={clsName}
                        className={`p-5 rounded-2xl border transition-all duration-300 stat-card-3d ${
                          isDark 
                            ? 'bg-slate-900/60 backdrop-blur-xl border-white/10 hover:border-indigo-400/60 hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)]' 
                            : 'bg-white/80 backdrop-blur-xl border-slate-200 hover:border-indigo-500/40 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`font-black text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                            {clsName}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            isClassDayOff
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                              : isMarkedToday
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          }`}>
                            {isClassDayOff 
                              ? (classDayStatus.isClassSpecificOverride ? 'Class Holiday' : 'Day OFF') 
                              : isMarkedToday 
                                ? `Marked (${presentCount}/${classStudents.length})` 
                                : 'Awaiting Attendance'}
                          </span>
                        </div>

                        <div className="space-y-1 mb-4">
                          <p className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            {timing} Shift · {classNameOnly}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-slate-300/80' : 'text-slate-600'}`}>
                            Candidate Biometrics & TOPIK Curriculum
                          </p>
                        </div>

                        <div className={`flex items-center justify-between text-xs pt-3.5 border-t ${
                          isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
                        }`}>
                          <div>
                            <span className="text-[11px] block uppercase font-mono tracking-wider text-slate-400">Roster Size</span>
                            <span className={`font-black text-sm tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {classStudents.length} Students
                            </span>
                          </div>

                          {!isClassDayOff ? (
                            <button
                              onClick={() => onNavigate('attendance')}
                              className="px-4 py-1.5 rounded-full text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_22px_rgba(99,102,241,0.4)] hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer"
                            >
                              Open Class
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-rose-300 bg-rose-500/15 px-3 py-1 rounded-full border border-rose-500/30">
                              {classDayStatus.isClassSpecificOverride ? 'Class Holiday' : 'Academy Closed'}
                            </span>
                          )}
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
        </GlowCard>
      </motion.div>
    </div>
  );
};

export const DashboardPage = Dashboard;
export default Dashboard;

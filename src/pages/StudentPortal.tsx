import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Award,
  Calendar,
  List,
  LogOut,
  Fingerprint,
  UserCheck,
  Receipt,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { StorageService } from '../services/storageService';
import {
  Student,
  AttendanceRecord,
  WeeklyTest,
  TestScore,
  FeeRecord,
  AcademySettings,
} from '../types';

type PortalSection = 'all' | 'attendance' | 'tests' | 'fees';
type AttendanceViewMode = 'list' | 'calendar';

function formatCurrency(amount: number, symbol: string): string {
  return `${symbol} ${Number(amount || 0).toLocaleString()}`;
}

export const StudentPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const { activeTheme, isDark } = useTheme();

  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    StorageService.getAttendance()
  );
  const [tests, setTests] = useState<WeeklyTest[]>(() => StorageService.getTests());
  const [fees, setFees] = useState<FeeRecord[]>(() => StorageService.getFees());
  const [academySettings, setAcademySettings] = useState<AcademySettings>(() =>
    StorageService.getSettings()
  );

  const [activeSection, setActiveSection] = useState<PortalSection>('all');
  const [attendanceView, setAttendanceView] = useState<AttendanceViewMode>('list');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('All');
  const [calendarMonth, setCalendarMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedReceiptFee, setSelectedReceiptFee] = useState<FeeRecord | null>(null);

  useEffect(() => {
    const unsubStudents = StorageService.subscribeStudents(setStudents);
    const unsubAttendance = StorageService.subscribeAttendance(setAttendanceRecords);
    const unsubTests = StorageService.subscribeTests(setTests);
    const unsubFees = StorageService.subscribeFees(setFees);
    const unsubSettings = StorageService.subscribeSettings(setAcademySettings);

    return () => {
      unsubStudents();
      unsubAttendance();
      unsubTests();
      unsubFees();
      unsubSettings();
    };
  }, []);

  const currencySymbol = academySettings.currencySymbol || 'Rs.';

  // Match logged-in student record
  const studentProfile = useMemo(() => {
    return students.find(
      (s) =>
        (user?.studentId && s.id === user.studentId) ||
        (user?.studentRoll && s.rollNumber?.toLowerCase() === user.studentRoll.toLowerCase())
    );
  }, [students, user?.studentId, user?.studentRoll]);

  const studentId = studentProfile?.id || user?.studentId || '';
  const studentRoll = studentProfile?.rollNumber || user?.studentRoll || '';
  const studentName = studentProfile?.fullName || user?.name || 'Student';
  const studentBatch = studentProfile?.batch || user?.assignedBatch || 'Enrolled Cohort';
  const studentClass = studentProfile?.studentClass || user?.studentClass || 'Class 1';
  const studentTiming = studentProfile?.timing || user?.timing || 'Morning';

  // Filter student-specific attendance
  const myAttendance = useMemo(() => {
    return attendanceRecords
      .filter(
        (r) =>
          (studentId && r.studentId === studentId) ||
          (studentRoll && r.studentRoll?.toLowerCase() === studentRoll.toLowerCase())
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [attendanceRecords, studentId, studentRoll]);

  // Filter student-specific weekly test scores
  const myTests = useMemo(() => {
    const entries: { test: WeeklyTest; score: TestScore }[] = [];
    tests.forEach((test) => {
      const match = (test.scores || []).find(
        (sc) =>
          (studentId && sc.studentId === studentId) ||
          (studentRoll && sc.studentRoll?.toLowerCase() === studentRoll.toLowerCase())
      );
      if (match) {
        entries.push({ test, score: match });
      }
    });
    return entries.sort((a, b) => (b.test.date || '').localeCompare(a.test.date || ''));
  }, [tests, studentId, studentRoll]);

  // Filter student-specific fee records
  const myFees = useMemo(() => {
    return fees
      .filter(
        (f) =>
          (studentId && f.studentId === studentId) ||
          (studentRoll && f.studentRoll?.toLowerCase() === studentRoll.toLowerCase())
      )
      .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));
  }, [fees, studentId, studentRoll]);

  // Overview KPI calculations
  const totalPresentDays = myAttendance.filter((a) => a.status === 'Present').length;
  const totalAbsentDays = myAttendance.filter((a) => a.status === 'Absent').length;
  const totalLateDays = myAttendance.filter((a) => a.status === 'Late').length;
  const totalLeaveDays = myAttendance.filter((a) => a.status === 'Leave').length;
  const totalMarkedDays = myAttendance.length;
  const attendanceRate =
    totalMarkedDays > 0
      ? Math.round(((totalPresentDays + totalLateDays) / totalMarkedDays) * 100)
      : 0;

  const totalPendingFees = myFees.reduce((sum, f) => sum + Number(f.pendingAmount || 0), 0);
  const totalPaidFees = myFees.reduce((sum, f) => sum + Number(f.paidAmount || 0), 0);
  const latestTestEntry = myTests[0] || null;

  const filteredAttendance = useMemo(() => {
    if (attendanceStatusFilter === 'All') return myAttendance;
    return myAttendance.filter((r) => r.status === attendanceStatusFilter);
  }, [myAttendance, attendanceStatusFilter]);

  // Calendar grid helper
  const calendarDays = useMemo(() => {
    const [yearStr, monthStr] = calendarMonth.split('-');
    const year = Number(yearStr) || new Date().getFullYear();
    const monthIdx = (Number(monthStr) || 1) - 1;
    const firstDay = new Date(year, monthIdx, 1);
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const startWeekday = firstDay.getDay(); // 0 = Sun

    const recordMap = new Map<string, AttendanceRecord>();
    myAttendance.forEach((rec) => {
      if (rec.date) recordMap.set(rec.date, rec);
    });

    const cells: { dateStr: string | null; dayNum: number | null; record?: AttendanceRecord }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNum: d,
        record: recordMap.get(dateStr),
      });
    }
    return cells;
  }, [calendarMonth, myAttendance]);

  const shiftCalendarMonth = (delta: number) => {
    const [yearStr, monthStr] = calendarMonth.split('-');
    const d = new Date(Number(yearStr), Number(monthStr) - 1 + delta, 1);
    setCalendarMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedCalendarDate(null);
  };

  const selectedCalendarRecord = useMemo(() => {
    if (!selectedCalendarDate) return null;
    return myAttendance.find((r) => r.date === selectedCalendarDate) || null;
  }, [selectedCalendarDate, myAttendance]);

  const getBiometricInOut = (record: AttendanceRecord) => {
    const isBiometric =
      record.source === 'Device' ||
      Boolean(record.checkInTime) ||
      Boolean(record.checkOutTime) ||
      Boolean(record.punchState);

    const checkIn =
      record.checkInTime ||
      (isBiometric && (record.punchState === 'in' || record.punchState === 'single')
        ? record.time
        : undefined);
    const checkOut = record.checkOutTime || undefined;
    return { isBiometric, checkIn, checkOut };
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'Present':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30';
      case 'Late':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30';
      case 'Absent':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30';
      case 'Leave':
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30';
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30';
    }
  };

  const getFeeStatusClasses = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30';
      case 'Partial':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30';
      default:
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30';
    }
  };

  const getGradeClasses = (grade: string) => {
    if (grade === 'A+' || grade === 'A') {
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30';
    }
    if (grade === 'B' || grade === 'C') {
      return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30';
    }
    return 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30';
  };

  const cardSurface = isDark
    ? 'bg-slate-900/75 border-slate-800/90 backdrop-blur-xl'
    : 'bg-white/90 border-slate-200/90 backdrop-blur-xl shadow-xs';

  return (
    <div
      className="min-h-screen relative overflow-x-hidden transition-colors duration-300"
      style={{
        backgroundColor: activeTheme.bgBase,
        color: activeTheme.textPrimary,
      }}
    >
      {/* Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[130px] opacity-25"
          style={{ backgroundColor: activeTheme.primary }}
        />
        <div
          className="absolute top-1/2 -right-28 w-[420px] h-[420px] rounded-full blur-[140px] opacity-20"
          style={{ backgroundColor: activeTheme.secondary || activeTheme.primary }}
        />
      </div>

      {/* Top Student Portal Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-2xl border-b px-4 sm:px-6 lg:px-8 py-3.5"
        style={{
          backgroundColor: isDark ? 'rgba(10, 14, 26, 0.88)' : 'rgba(255, 255, 255, 0.92)',
          borderColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(226, 232, 240, 0.9)',
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand + Student Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-white p-0.5 ring-2 ring-cyan-500/40 shadow-md shrink-0">
              <img
                src="/logo.png"
                alt="OK Korean Language Center"
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 dark:text-white truncate">
                  {academySettings.academyName || 'OK Korean Language Centre'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                  Student Portal · 학생 포털
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Welcome, <strong className="text-slate-800 dark:text-slate-200">{studentName}</strong>
                {studentProfile?.koreanName ? ` (${studentProfile.koreanName})` : ''} · Roll:{' '}
                <span className="font-mono font-bold text-indigo-600 dark:text-cyan-400">{studentRoll}</span>
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            <ThemeSwitcher />
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 relative z-10">
        {/* Student Profile Banner + Section Switcher */}
        <div className={`rounded-2xl p-5 border ${cardSurface} flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-lg shrink-0">
              {studentName
                .split(' ')
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                  {studentName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                  {studentRoll}
                </span>
                {studentProfile?.biometricEnrolled && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                    <Fingerprint className="w-3 h-3" />
                    Biometric Registered
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>
                  Cohort: <strong className="text-slate-700 dark:text-slate-200">{studentBatch}</strong>
                </span>
                <span>
                  Class: <strong className="text-slate-700 dark:text-slate-200">{studentClass} ({studentTiming})</strong>
                </span>
                {studentProfile?.level && (
                  <span>
                    Level: <strong className="text-slate-700 dark:text-slate-200">{studentProfile.level}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', label: 'All Overview', icon: Sparkles },
                { id: 'attendance', label: 'Attendance', icon: Calendar },
                { id: 'tests', label: 'Weekly Tests', icon: Award },
                { id: 'fees', label: 'Monthly Fees', icon: CreditCard },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Dashboard Overview: 5 Summary Cards */}
        <section aria-label="Dashboard Overview">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Present Days */}
            <div className={`rounded-2xl p-5 border ${cardSurface}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Total Present Days
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {totalPresentDays}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                {attendanceRate}% Attendance Rate ({totalMarkedDays} logs)
              </p>
            </div>

            {/* Total Absent */}
            <div className={`rounded-2xl p-5 border ${cardSurface}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Total Absent
                </span>
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-500">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {totalAbsentDays}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                Approved Leave: {totalLeaveDays} day{totalLeaveDays === 1 ? '' : 's'}
              </p>
            </div>

            {/* Total Late */}
            <div className={`rounded-2xl p-5 border ${cardSurface}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Total Late
                </span>
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                {totalLateDays}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                Late biometric / manual entries
              </p>
            </div>

            {/* Pending Fees */}
            <div className={`rounded-2xl p-5 border ${cardSurface}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Pending Fees
                </span>
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-500">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-2xl font-black tabular-nums ${
                  totalPendingFees > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatCurrency(totalPendingFees, currencySymbol)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                Paid Total: {formatCurrency(totalPaidFees, currencySymbol)}
              </p>
            </div>

            {/* Latest Test Score */}
            <div className={`rounded-2xl p-5 border ${cardSurface}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Latest Test Score
                </span>
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-500">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              {latestTestEntry ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                      {latestTestEntry.score.percentage}%
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getGradeClasses(
                        latestTestEntry.score.grade
                      )}`}
                    >
                      Grade {latestTestEntry.score.grade}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-1">
                    {latestTestEntry.score.totalScore} /{' '}
                    {latestTestEntry.score.maxPossibleScore || latestTestEntry.test.totalMaxMarks || 120} ·{' '}
                    {latestTestEntry.test.testTitle}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-xl font-black text-slate-400">—</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    No test results recorded yet
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 2. Attendance Section (Biometric IN/OUT & Manual Status + List/Calendar Toggle) */}
        {(activeSection === 'all' || activeSection === 'attendance') && (
          <section className={`rounded-2xl p-6 border ${cardSurface} space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900 dark:text-white">
                    Attendance & Biometric Punch History
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real-time ZKTeco IN/OUT timestamps and daily attendance statuses
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter (for List mode) */}
                {attendanceView === 'list' && (
                  <select
                    value={attendanceStatusFilter}
                    onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="All">All Statuses ({myAttendance.length})</option>
                    <option value="Present">Present ({totalPresentDays})</option>
                    <option value="Late">Late ({totalLateDays})</option>
                    <option value="Absent">Absent ({totalAbsentDays})</option>
                    <option value="Leave">Leave ({totalLeaveDays})</option>
                  </select>
                )}

                {/* List / Calendar Toggle */}
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setAttendanceView('list')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      attendanceView === 'list'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceView('calendar')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      attendanceView === 'calendar'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Calendar</span>
                  </button>
                </div>
              </div>
            </div>

            {attendanceView === 'list' ? (
              filteredAttendance.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    No attendance records found
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your daily biometric punches and teacher attendance markings will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Source</th>
                        <th className="py-3 px-4">Biometric IN</th>
                        <th className="py-3 px-4">Biometric OUT</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredAttendance.map((rec) => {
                        const { isBiometric, checkIn, checkOut } = getBiometricInOut(rec);
                        return (
                          <tr
                            key={rec.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                              {rec.date}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isBiometric
                                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border-cyan-500/30'
                                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30'
                                }`}
                              >
                                {isBiometric && <Fingerprint className="w-3 h-3" />}
                                <span>{isBiometric ? 'Biometric' : 'Manual'}</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {checkIn || '—'}
                            </td>
                            <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                              {checkOut || '—'}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeClasses(
                                  rec.status
                                )}`}
                              >
                                {rec.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                              {rec.remarks || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* Calendar View */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => shiftCalendarMonth(-1)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {calendarMonth}
                  </span>
                  <button
                    type="button"
                    onClick={() => shiftCalendarMonth(1)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((cell, idx) => {
                    if (!cell.dateStr || !cell.dayNum) {
                      return <div key={`empty_${idx}`} className="h-20 rounded-xl opacity-0" />;
                    }
                    const rec = cell.record;
                    const bio = rec ? getBiometricInOut(rec) : null;
                    const isSelected = selectedCalendarDate === cell.dateStr;

                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        onClick={() => setSelectedCalendarDate(cell.dateStr)}
                        className={`h-20 p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-indigo-500 border-indigo-500'
                            : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/60'
                        } ${
                          rec
                            ? rec.status === 'Present'
                              ? 'bg-emerald-500/10'
                              : rec.status === 'Late'
                                ? 'bg-amber-500/10'
                                : rec.status === 'Absent'
                                  ? 'bg-rose-500/10'
                                  : 'bg-sky-500/10'
                            : 'bg-slate-50/60 dark:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {cell.dayNum}
                          </span>
                          {rec && (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                rec.status === 'Present'
                                  ? 'bg-emerald-500'
                                  : rec.status === 'Late'
                                    ? 'bg-amber-500'
                                    : rec.status === 'Absent'
                                      ? 'bg-rose-500'
                                      : 'bg-sky-500'
                              }`}
                            />
                          )}
                        </div>
                        {rec ? (
                          <div className="text-[10px] leading-tight truncate">
                            <span className="font-bold block text-slate-800 dark:text-slate-200">
                              {rec.status}
                            </span>
                            {bio?.checkIn && (
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 block truncate">
                                IN {bio.checkIn.slice(0, 5)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedCalendarDate && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {selectedCalendarDate}
                      </span>
                      {selectedCalendarRecord ? (
                        <span className="ml-2 text-slate-500 dark:text-slate-400">
                          Status: <strong>{selectedCalendarRecord.status}</strong> · IN:{' '}
                          <strong className="font-mono">
                            {getBiometricInOut(selectedCalendarRecord).checkIn || '—'}
                          </strong>{' '}
                          · OUT:{' '}
                          <strong className="font-mono">
                            {getBiometricInOut(selectedCalendarRecord).checkOut || '—'}
                          </strong>
                        </span>
                      ) : (
                        <span className="ml-2 text-slate-500">No attendance entry on this date.</span>
                      )}
                    </div>
                    {selectedCalendarRecord?.remarks && (
                      <span className="text-slate-500 dark:text-slate-400 italic">
                        "{selectedCalendarRecord.remarks}"
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* 3. Weekly Tests Section */}
        {(activeSection === 'all' || activeSection === 'tests') && (
          <section className={`rounded-2xl p-6 border ${cardSurface} space-y-4`}>
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900 dark:text-white">
                    Weekly Tests & Assessment Scores
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Past exam results, marks obtained across modules, grades, and teacher remarks
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 text-xs font-bold">
                {myTests.length} Test{myTests.length === 1 ? '' : 's'}
              </span>
            </div>

            {myTests.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No weekly test scores recorded yet
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Once your instructor grades weekly TOPIK assessments, results will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Test Title & Topic</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Marks Obtained</th>
                      <th className="py-3 px-4">Percentage & Grade</th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {myTests.map(({ test, score }) => {
                      const maxMarks = score.maxPossibleScore || test.totalMaxMarks || 120;
                      return (
                        <tr
                          key={test.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {test.testTitle}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {test.topicCovered || test.month}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {score.vocabulary !== undefined && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                                  Vocab: {score.vocabulary}
                                </span>
                              )}
                              {score.grammar !== undefined && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                                  Grammar: {score.grammar}
                                </span>
                              )}
                              {score.reading !== undefined && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                                  Reading: {score.reading}
                                </span>
                              )}
                              {score.sentences !== undefined && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                                  Sent: {score.sentences}
                                </span>
                              )}
                              {score.listeningSpeaking !== undefined && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                                  Spk/List: {score.listeningSpeaking}
                                </span>
                              )}
                              {score.mcqs !== undefined && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
                                  MCQs: {score.mcqs}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                            {test.date}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {score.totalScore} / {maxMarks}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-600 dark:text-cyan-400">
                                {score.percentage}%
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getGradeClasses(
                                  score.grade
                                )}`}
                              >
                                {score.grade}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            {score.remarks || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* 4. Fees Section */}
        {(activeSection === 'all' || activeSection === 'fees') && (
          <section className={`rounded-2xl p-6 border ${cardSurface} space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-500 border border-purple-500/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-slate-900 dark:text-white">
                    Monthly Tuition Fees & Receipt Ledger
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Monthly fee invoices, paid/pending balances, and payment receipt numbers
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                  Paid: {formatCurrency(totalPaidFees, currencySymbol)}
                </span>
                <span
                  className={`px-3 py-1 rounded-full border font-bold ${
                    totalPendingFees > 0
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20'
                  }`}
                >
                  Pending: {formatCurrency(totalPendingFees, currencySymbol)}
                </span>
              </div>
            </div>

            {myFees.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No fee invoices generated yet
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monthly tuition fee vouchers and payment receipts will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4">Total Fee</th>
                      <th className="py-3 px-4">Paid</th>
                      <th className="py-3 px-4">Pending</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Receipt Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {myFees.map((fee) => (
                      <tr
                        key={fee.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {fee.month}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {formatCurrency(fee.totalAmount, currencySymbol)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(fee.paidAmount, currencySymbol)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(fee.pendingAmount, currencySymbol)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {fee.dueDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getFeeStatusClasses(
                              fee.status
                            )}`}
                          >
                            {fee.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {fee.receiptNumber || fee.lastPaymentDate ? (
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptFee(fee)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-cyan-300 border border-indigo-500/20 font-mono text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>{fee.receiptNumber || 'View Receipt'}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                              <AlertCircle className="w-3 h-3" />
                              <span>Unpaid</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Receipt Detail Modal */}
      {selectedReceiptFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-bold text-sm">Fee Payment Receipt</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {selectedReceiptFee.receiptNumber || selectedReceiptFee.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceiptFee(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Student</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {studentName} ({studentRoll})
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Billing Month</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedReceiptFee.month}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Total Amount</span>
                <span className="font-mono font-bold">
                  {formatCurrency(selectedReceiptFee.totalAmount, currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-mono font-bold text-emerald-500">
                  {formatCurrency(selectedReceiptFee.paidAmount, currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Pending Balance</span>
                <span className="font-mono font-bold text-rose-500">
                  {formatCurrency(selectedReceiptFee.pendingAmount, currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-semibold">
                  {selectedReceiptFee.paymentMethod || 'Cash / Counter'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Payment Date</span>
                <span className="font-mono">
                  {selectedReceiptFee.lastPaymentDate || '—'}
                </span>
              </div>
              {selectedReceiptFee.notes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300">
                  <span className="font-bold block mb-0.5">Notes:</span>
                  {selectedReceiptFee.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPortal;

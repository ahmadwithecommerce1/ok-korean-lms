import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Users,
  CheckCircle2,
  Award,
  TrendingUp,
  CreditCard,
  Filter,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { StorageService } from '../services/storageService';
import { AcademyDataService } from '../services/academyDataService';
import { AttendanceRecord, ExpenseRecord, FeeRecord, Student, WeeklyTest } from '../types';

export const AnalyticsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [tests, setTests] = useState<WeeklyTest[]>(() => StorageService.getTests());
  const [fees, setFees] = useState<FeeRecord[]>(() => StorageService.getFees());
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => AcademyDataService.getExpenses());

  const [batchFilter, setBatchFilter] = useState<string>('All');
  const [dateRangeDays, setDateRangeDays] = useState<number>(30);

  useEffect(() => {
    const u1 = StorageService.subscribeStudents(setStudents);
    const u2 = StorageService.subscribeAttendance(setAttendance);
    const u3 = StorageService.subscribeTests(setTests);
    const u4 = StorageService.subscribeFees(setFees);
    const u5 = AcademyDataService.subscribeExpenses(setExpenses);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, []);

  const batchOptions = useMemo(() => {
    const s = new Set<string>();
    students.forEach((st) => st.batch && s.add(st.batch));
    return Array.from(s);
  }, [students]);

  const cutoffIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dateRangeDays);
    return d.toISOString().split('T')[0];
  }, [dateRangeDays]);

  const filteredStudents = useMemo(
    () => (batchFilter === 'All' ? students : students.filter((s) => s.batch === batchFilter)),
    [students, batchFilter]
  );

  const filteredAttendance = useMemo(
    () =>
      attendance.filter((a) => {
        if (a.status === 'Neutral') return false;
        if (batchFilter !== 'All' && a.batch !== batchFilter) return false;
        if (a.date && a.date < cutoffIso) return false;
        return true;
      }),
    [attendance, batchFilter, cutoffIso]
  );

  const filteredTests = useMemo(
    () =>
      tests.filter((t) => {
        if (batchFilter !== 'All' && t.batch !== batchFilter) return false;
        if (t.date && t.date < cutoffIso) return false;
        return true;
      }),
    [tests, batchFilter, cutoffIso]
  );

  const filteredFees = useMemo(
    () => (batchFilter === 'All' ? fees : fees.filter((f) => f.batch === batchFilter)),
    [fees, batchFilter]
  );

  const kpis = useMemo(() => {
    const activeCount = filteredStudents.filter((s) => s.status === 'Active').length;
    const attTotal = filteredAttendance.length;
    const attPresentOrLate = filteredAttendance.filter(
      (a) => a.status === 'Present' || a.status === 'Late'
    ).length;
    const attendanceRate = attTotal > 0 ? Math.round((attPresentOrLate / attTotal) * 100) : 0;

    const allScores = filteredTests.flatMap((t) => t.scores || []);
    const avgTestScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((sum, sc) => sum + (sc.percentage || 0), 0) / allScores.length)
        : 0;

    const totalFeeCollected = filteredFees.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
    const totalFeeExpected = filteredFees.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
    const totalExpenses = expenses
      .filter((e) => !e.date || e.date >= cutoffIso)
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      totalStudents: filteredStudents.length,
      activeCount,
      attendanceRate,
      avgTestScore,
      testsConducted: filteredTests.length,
      totalFeeCollected,
      collectionRate: totalFeeExpected > 0 ? Math.round((totalFeeCollected / totalFeeExpected) * 100) : 0,
      totalExpenses,
    };
  }, [filteredStudents, filteredAttendance, filteredTests, filteredFees, expenses, cutoffIso]);

  // Daily Attendance Trend Chart
  const attendanceTrendData = useMemo(() => {
    const map = new Map<string, { date: string; present: number; late: number; absent: number }>();
    filteredAttendance.forEach((a) => {
      if (!a.date) return;
      const cur = map.get(a.date) || { date: a.date, present: 0, late: 0, absent: 0 };
      if (a.status === 'Present') cur.present += 1;
      else if (a.status === 'Late') cur.late += 1;
      else if (a.status === 'Absent') cur.absent += 1;
      map.set(a.date, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map((item) => ({
        ...item,
        label: item.date.slice(5),
      }));
  }, [filteredAttendance]);

  // Batch Performance Comparison
  const batchComparisonData = useMemo(() => {
    const batches = Array.from(new Set(students.map((s) => s.batch).filter(Boolean)));
    return batches.map((b) => {
      const bStudents = students.filter((s) => s.batch === b).length;
      const bAtt = attendance.filter((a) => a.batch === b && a.status !== 'Neutral');
      const bPresent = bAtt.filter((a) => a.status === 'Present' || a.status === 'Late').length;
      const bTests = tests.filter((t) => t.batch === b).flatMap((t) => t.scores || []);
      const avgScore =
        bTests.length > 0
          ? Math.round(bTests.reduce((sum, sc) => sum + (sc.percentage || 0), 0) / bTests.length)
          : 0;
      return {
        batch: b.split(' (')[0],
        students: bStudents,
        attendanceRate: bAtt.length > 0 ? Math.round((bPresent / bAtt.length) * 100) : 0,
        avgScore,
      };
    });
  }, [students, attendance, tests]);

  // Student Level Distribution
  const levelDistribution = useMemo(() => {
    const map = new Map<string, number>();
    filteredStudents.forEach((s) => {
      const short = (s.level || 'Unassigned').split(' - ')[0];
      map.set(short, (map.get(short) || 0) + 1);
    });
    const colors = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899'];
    return Array.from(map.entries()).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
  }, [filteredStudents]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-500" />
            <span>Academy Analytics & Performance Insights</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time attendance trends, weekly test performance, batch comparisons, and financial efficiency metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Filter className="w-3.5 h-3.5 text-emerald-500" />
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-transparent text-slate-800 dark:text-white font-semibold focus:outline-hidden"
            >
              <option value="All" className="bg-white dark:bg-slate-900">All Batches</option>
              {batchOptions.map((b) => (
                <option key={b} value={b} className="bg-white dark:bg-slate-900">
                  {b.split(' (')[0]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Calendar className="w-3.5 h-3.5 text-cyan-500" />
            <select
              value={dateRangeDays}
              onChange={(e) => setDateRangeDays(Number(e.target.value))}
              className="bg-transparent text-slate-800 dark:text-white font-semibold focus:outline-hidden"
            >
              <option value={7} className="bg-white dark:bg-slate-900">Last 7 Days</option>
              <option value={30} className="bg-white dark:bg-slate-900">Last 30 Days</option>
              <option value={90} className="bg-white dark:bg-slate-900">Last 90 Days</option>
              <option value={365} className="bg-white dark:bg-slate-900">Last 12 Months</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Enrolled Students
            </span>
            <Users className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">
            {kpis.totalStudents}
          </p>
          <span className="text-xs text-emerald-500 font-semibold mt-1 block">
            {kpis.activeCount} Active Candidates
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attendance Rate
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">
            {kpis.attendanceRate}%
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Based on {filteredAttendance.length} logs in window
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Avg Weekly Test Score
            </span>
            <Award className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2 tabular-nums">
            {kpis.avgTestScore}%
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Across {kpis.testsConducted} assessments
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fee Collection & Expenses
            </span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2 tabular-nums">
            Rs. {kpis.totalFeeCollected.toLocaleString()}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            {kpis.collectionRate}% settled · Expenses Rs. {kpis.totalExpenses.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Attendance Daily Trend */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>Attendance Trajectory (Last 14 Active Days)</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Present vs Late vs Absent counts</p>
            </div>
          </div>

          {attendanceTrendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No attendance records in the selected window yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="present" name="Present" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="absent" name="Absent" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Level Distribution Pie */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
            Korean Proficiency Level Breakdown
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            Distribution of enrolled candidates across TOPIK tracks
          </p>

          {levelDistribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              Enroll students to view level analytics.
            </div>
          ) : (
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={levelDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={82}
                    paddingAngle={4}
                  >
                    {levelDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {levelDistribution.map((lvl) => (
              <span
                key={lvl.name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lvl.color }} />
                {lvl.name}: {lvl.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Batch Comparison Bar Chart & Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Batch-Wise Attendance Rate vs Average Assessment Score
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Side-by-side comparison across all active batches
          </p>
        </div>

        {batchComparisonData.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No batch analytics data available yet.</p>
        ) : (
          <>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="batch" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="attendanceRate" name="Attendance %" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgScore" name="Avg Test %" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Batch</th>
                    <th className="py-2.5 px-4">Students</th>
                    <th className="py-2.5 px-4">Attendance Rate</th>
                    <th className="py-2.5 px-4">Avg Test Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {batchComparisonData.map((row) => (
                    <tr key={row.batch}>
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{row.batch}</td>
                      <td className="py-2.5 px-4 font-mono">{row.students}</td>
                      <td className="py-2.5 px-4 font-mono text-emerald-500 font-bold">{row.attendanceRate}%</td>
                      <td className="py-2.5 px-4 font-mono text-indigo-400 font-bold">{row.avgScore}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  SortingState,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  History,
  Moon,
  Radio,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StorageService } from '../services/storageService';
import {
  exportTeacherActivityToCsv,
  formatActivityDate,
  formatActivityTime,
  formatRelativeLastActive,
  formatSessionDuration,
  getLocalDateKey,
  getRecordLastActiveMs,
  resolveTeacherSessionPresence,
  TeacherActivityService,
  toDateObj,
} from '../services/teacherActivityService';
import { TeacherAccount, TeacherActivityRecord } from '../types';

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
  },
});

const columnHelper = createColumnHelper<typeof features, TeacherActivityRecord>();

type StatusFilterOption = 'All' | 'Online' | 'Offline' | 'Away/Inactive';

export const TeacherActivityMonitor: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [records, setRecords] = useState<TeacherActivityRecord[]>(() =>
    TeacherActivityService.getActivityRecords()
  );
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() =>
    StorageService.getTeacherAccounts()
  );

  // Filters: empty string shows full historical log across dates; selecting a date filters to that day
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isClearingHistory, setIsClearingHistory] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real-time Firestore onSnapshot listeners
  useEffect(() => {
    const unsubActivity = TeacherActivityService.subscribeTeacherActivity((liveRecords) => {
      setRecords(liveRecords);
    });
    const unsubTeachers = StorageService.subscribeTeachers((liveTeachers) => {
      setTeachers(liveTeachers);
    });

    return () => {
      unsubActivity();
      unsubTeachers();
    };
  }, []);

  // Live ticker every 5s so stale sessions (>60s) flip to "Offline (Timeout)" automatically
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  // Compute current real-time presence per registered teacher (with >60s heartbeat timeout check)
  const facultyPresence = useMemo(() => {
    const latestByTeacherId = new Map<string, TeacherActivityRecord>();
    for (const rec of records) {
      const key = rec.teacherId || rec.teacherUsername || rec.teacherName;
      if (!latestByTeacherId.has(key)) {
        latestByTeacherId.set(key, rec);
      }
    }

    return teachers.map((teacher) => {
      const latest =
        latestByTeacherId.get(teacher.id) ||
        latestByTeacherId.get(teacher.username) ||
        records.find(
          (r) =>
            r.teacherUsername?.toLowerCase() === teacher.username.toLowerCase() ||
            r.teacherName?.toLowerCase() === teacher.name.toLowerCase()
        );
      const resolved = resolveTeacherSessionPresence(latest, nowTick);
      return {
        teacher,
        latestRecord: latest,
        status: resolved.effectiveStatus,
        resolved,
      };
    });
  }, [teachers, records, nowTick]);

  // Filter historical activity records by Date Picker, Status Dropdown, and Teacher Name Search
  const filteredRecords = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();

    return records.filter((rec) => {
      if (selectedDate) {
        const loginDateObj = toDateObj(rec.loginTime);
        const recDateKey = rec.date || (loginDateObj ? getLocalDateKey(loginDateObj) : '');
        if (recDateKey !== selectedDate) {
          return false;
        }
      }

      const resolved = resolveTeacherSessionPresence(rec, nowTick);
      if (statusFilter === 'Online' && resolved.effectiveStatus !== 'Online') {
        return false;
      }
      if (statusFilter === 'Offline' && resolved.effectiveStatus !== 'Offline') {
        return false;
      }
      if (statusFilter === 'Away/Inactive' && resolved.effectiveStatus !== 'Away') {
        return false;
      }

      if (term) {
        const haystack = [
          rec.teacherName,
          rec.teacherUsername,
          rec.teacherId,
          rec.assignedBatch,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [records, selectedDate, statusFilter, searchQuery, nowTick]);

  // Summary KPIs
  const { onlineNowCount, awayNowCount } = useMemo(() => {
    const onlineIds = new Set<string>();
    const awayIds = new Set<string>();
    records.forEach((r) => {
      const key = r.teacherId || r.teacherUsername || r.teacherName;
      const resolved = resolveTeacherSessionPresence(r, nowTick);
      if (resolved.effectiveStatus === 'Online') {
        onlineIds.add(key);
      } else if (resolved.effectiveStatus === 'Away') {
        awayIds.add(key);
      }
    });
    return { onlineNowCount: onlineIds.size, awayNowCount: awayIds.size };
  }, [records, nowTick]);

  const offlineFacultyCount = Math.max(0, teachers.length - onlineNowCount - awayNowCount);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor('teacherName', {
          header: 'Teacher Name',
          cell: (info) => {
            const row = info.row.original;
            const resolved = resolveTeacherSessionPresence(row, nowTick);
            const online = resolved.effectiveStatus === 'Online';
            const away = resolved.effectiveStatus === 'Away';
            const initials = (row.teacherName || 'T')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() || '')
              .join('');

            return (
              <div className="flex items-center gap-3 min-w-[190px]">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm ${
                    online
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-500/30'
                      : away
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 ring-2 ring-amber-500/30'
                      : 'bg-slate-600 dark:bg-slate-700'
                  }`}
                >
                  {initials || 'TR'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {row.teacherName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    @{row.teacherUsername || row.teacherId}
                    {row.assignedBatch ? ` · ${row.assignedBatch.split(' (')[0]}` : ''}
                  </p>
                </div>
              </div>
            );
          },
        }),
        columnHelper.accessor((row) => toDateObj(row.loginTime)?.getTime() || 0, {
          id: 'date',
          header: 'Date',
          cell: (info) => {
            const row = info.row.original;
            return (
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {formatActivityDate(row.loginTime)}
              </div>
            );
          },
        }),
        columnHelper.accessor((row) => toDateObj(row.loginTime)?.getTime() || 0, {
          id: 'loginTime',
          header: 'Login Time',
          cell: (info) => {
            const row = info.row.original;
            return (
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap font-mono">
                {formatActivityTime(row.loginTime)}
              </div>
            );
          },
        }),
        columnHelper.accessor((row) => toDateObj(row.logoutTime)?.getTime() || Number.MAX_SAFE_INTEGER, {
          id: 'logoutTime',
          header: 'Logout Time',
          cell: (info) => {
            const row = info.row.original;
            const resolved = resolveTeacherSessionPresence(row, nowTick);
            if (resolved.isTimedOut) {
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">
                  Timed Out (&gt;60s)
                </span>
              );
            }
            if (row.status !== 'Offline' || !row.logoutTime) {
              return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Currently Active
                </span>
              );
            }
            return (
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap font-mono">
                {formatActivityTime(row.logoutTime)}
              </div>
            );
          },
        }),
        columnHelper.accessor((row) => row.sessionDuration || row.totalSessionTime || '', {
          id: 'sessionDuration',
          header: 'Active Duration',
          cell: (info) => {
            const row = info.row.original;
            const resolved = resolveTeacherSessionPresence(row, nowTick);
            if (resolved.effectiveStatus !== 'Offline') {
              const loginMs = toDateObj(row.loginTime)?.getTime();
              const liveElapsed = loginMs ? formatSessionDuration(loginMs, nowTick) : 'Active';
              return (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{liveElapsed} (Live)</span>
                </div>
              );
            }
            return (
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>{row.sessionDuration || row.totalSessionTime || '< 1 min'}</span>
              </div>
            );
          },
        }),
        columnHelper.accessor((row) => getRecordLastActiveMs(row), {
          id: 'lastActive',
          header: 'Last Active',
          cell: (info) => {
            const row = info.row.original;
            const lastMs = getRecordLastActiveMs(row);
            if (!lastMs) {
              return <span className="text-xs text-slate-400 font-mono">—</span>;
            }
            return (
              <div className="whitespace-nowrap">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {formatRelativeLastActive(lastMs, nowTick)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {formatActivityTime(lastMs)}
                </div>
              </div>
            );
          },
        }),
        columnHelper.accessor('status', {
          header: 'Current Status',
          cell: (info) => {
            const row = info.row.original;
            const resolved = resolveTeacherSessionPresence(row, nowTick);

            if (resolved.effectiveStatus === 'Online') {
              return (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  Online
                </span>
              );
            }

            if (resolved.effectiveStatus === 'Away') {
              const tabTime = formatActivityTime(row.lastActiveTabTime || row.lastActiveAt);
              return (
                <div className="flex flex-col gap-0.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 w-fit whitespace-nowrap">
                    <span className="inline-flex rounded-full h-2 w-2 bg-amber-400" />
                    <Moon className="w-3 h-3" />
                    Away
                  </span>
                  {tabTime !== '—' && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 pl-1">
                      Tab left at {tabTime}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap">
                <span className="inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                {resolved.label}
              </span>
            );
          },
        }),
      ]),
    [nowTick]
  );

  const table = useTable({
    features,
    data: filteredRecords,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 15,
      },
    },
  });

  const handleExportCsv = () => {
    const dateSlug = selectedDate || 'all-history';
    exportTeacherActivityToCsv(filteredRecords, `teacher-activity-history-${dateSlug}.csv`);
  };

  const handleConfirmClearHistory = async () => {
    if (isClearingHistory) return;
    setIsClearingHistory(true);
    try {
      await TeacherActivityService.clearAllTeacherHistory();
      setIsClearModalOpen(false);
      showToast('All teacher activity history cleared');
    } catch (err) {
      console.error('Failed to clear teacher activity history:', err);
      showToast('Failed to clear teacher activity history');
    } finally {
      setIsClearingHistory(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Principal / Administrator Access Required
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          The Teacher Activity Monitor is strictly restricted to Principal and Administrator accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Clear All History Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-rose-500/40 shadow-2xl p-6 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-rose-500">
                <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Clear All Teacher History
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isClearingHistory && setIsClearModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                Are you sure you want to clear all teacher history? This cannot be undone.
              </p>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                Registered <strong>Teacher accounts</strong> will NOT be deleted. Only activity session logs will be removed.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-5 mt-5 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                disabled={isClearingHistory}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearHistory}
                disabled={isClearingHistory}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white shadow-md shadow-rose-600/25 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingHistory ? 'Clearing...' : 'Yes, Clear History'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-500" />
              <span>Teacher Activity Monitor</span>
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE HISTORY SYNC
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete historical log of faculty logins, logouts, tab inactivity, and session durations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsClearModalOpen(true)}
            disabled={records.length === 0 || isClearingHistory}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/30 disabled:opacity-40 disabled:hover:bg-rose-600/10 disabled:hover:text-rose-500 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All History</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({filteredRecords.length})</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Online
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {onlineNowCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {awayNowCount > 0 ? `+ ${awayNowCount} away/inactive` : 'Active on LMS'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Offline
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-500/15 text-slate-500 dark:text-slate-400 flex items-center justify-center">
              <WifiOff className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
              {offlineFacultyCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Faculty signed out
            </span>
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sessions
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
              {filteredRecords.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {selectedDate ? `Logs on ${selectedDate}` : 'Total history logs'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Registered Teachers
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
              {teachers.length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Faculty accounts
            </span>
          </div>
        </div>
      </div>

      {/* Live Faculty Presence Strip */}
      {facultyPresence.length > 0 && (
        <div className="rounded-2xl p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              Live Faculty Presence
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Shows live status across tabs (Online, Away/Inactive, Offline)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {facultyPresence.map(({ teacher, latestRecord, resolved }) => {
              const online = resolved.effectiveStatus === 'Online';
              const away = resolved.effectiveStatus === 'Away';
              return (
                <div
                  key={teacher.id}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl border transition-colors ${
                    online
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : away
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-rose-500/5 dark:bg-slate-800/50 border-rose-500/20 dark:border-slate-700/60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {teacher.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {latestRecord && resolved.lastActiveMs
                        ? `Last active: ${formatRelativeLastActive(resolved.lastActiveMs, nowTick)}`
                        : 'No session logged yet'}
                    </p>
                  </div>
                  {online ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      Online
                    </span>
                  ) : away ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 shrink-0">
                      <Moon className="w-2.5 h-2.5" />
                      Away
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {resolved.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="rounded-2xl p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Filter history by specific date"
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Clear date filter"
                aria-label="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(getLocalDateKey())}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              selectedDate === getLocalDateKey()
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate('')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              selectedDate === ''
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All History
          </button>

          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterOption)}
              aria-label="Filter by teacher status"
              className="bg-transparent text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-white dark:bg-slate-900">All Statuses</option>
              <option value="Online" className="bg-white dark:bg-slate-900">Online</option>
              <option value="Offline" className="bg-white dark:bg-slate-900">Offline</option>
              <option value="Away/Inactive" className="bg-white dark:bg-slate-900">Away/Inactive</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by teacher name..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      {/* Historical Activity Data Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
              Historical Session Activity Log
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Showing {filteredRecords.length} {filteredRecords.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        className={`px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none ${
                          canSort ? 'cursor-pointer hover:text-slate-900 dark:hover:text-white' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <table.FlexRender header={header} />
                          {canSort && <ArrowUpDown className="w-3 h-3 opacity-50" />}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-14 text-center">
                    <History className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2.5" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      No activity history found
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {selectedDate
                        ? `No teacher sessions logged on ${selectedDate}. Clear the date filter to view all history.`
                        : 'Each teacher login creates a timestamped session entry here in real time.'}
                    </p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const rowResolved = resolveTeacherSessionPresence(row.original, nowTick);
                  return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      rowResolved.effectiveStatus === 'Online'
                        ? 'bg-emerald-500/[0.03] hover:bg-emerald-500/[0.07]'
                        : rowResolved.effectiveStatus === 'Away'
                        ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.07]'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {row.getAllCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5 align-middle">
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {table.getPageCount() > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Page <strong className="text-slate-900 dark:text-white">{table.state.pagination.pageIndex + 1}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white">{table.getPageCount()}</strong> ({filteredRecords.length} total logs)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherActivityMonitor;

import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Calendar as CalendarIcon, 
  Check, 
  Clock, 
  UserX, 
  CheckCircle2, 
  Users, 
  Sparkles,
  Save,
  RotateCcw,
  CheckCheck,
  Fingerprint,
  Cpu,
  Wifi,
  WifiOff,
  Sliders,
  Radio,
  Zap,
  Info
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus, StudentBatch, ZKTecoDeviceConfig } from '../types';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { DeviceSettings } from '../components/DeviceSettings';
import { SimulatePunchModal } from '../components/modals/SimulatePunchModal';

const BATCH_OPTIONS: StudentBatch[] = [
  'Batch A (Morning 09:00 - 11:00)',
  'Batch B (Afternoon 14:00 - 16:00)',
  'Batch C (Evening 18:00 - 20:00)',
  'Batch D (Weekend Intensive)',
];

export const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  
  // Pre-select assigned batch and classes if teacher has one
  const teacherAccount = isTeacher
    ? StorageService.getTeacherAccounts().find(t => t.username.toLowerCase() === user.username.toLowerCase())
    : null;

  const teacherClasses: string[] = isTeacher
    ? (teacherAccount?.assignedClasses && teacherAccount.assignedClasses.length > 0
        ? teacherAccount.assignedClasses
        : (user?.assignedClasses && user.assignedClasses.length > 0 ? user.assignedClasses : ['Morning Class 1', 'Morning Class 2', 'Morning Class 3']))
    : [
        'Morning Class 1',
        'Morning Class 2',
        'Morning Class 3',
        'Morning Class 4',
        'Morning Class 5',
        'Morning Class 6',
        'Morning Class 7',
        'Evening Class 1',
        'Evening Class 2',
        'Evening Class 3',
      ];

  const initialClass = teacherClasses[0] || 'Morning Class 1';
  const [activeClassTab, setActiveClassTab] = useState<string>(initialClass);

  const initialBatch = (teacherAccount?.assignedBatch && BATCH_OPTIONS.includes(teacherAccount.assignedBatch as StudentBatch))
    ? (teacherAccount.assignedBatch as StudentBatch)
    : BATCH_OPTIONS[0];

  const [selectedBatch, setSelectedBatch] = useState<StudentBatch>(initialBatch);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isDeviceSettingsOpen, setIsDeviceSettingsOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);

  // Live state from Firestore subscriptions
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [deviceConfig, setDeviceConfig] = useState<ZKTecoDeviceConfig>(() => StorageService.getDeviceConfig());

  // Real-time Firestore subscriptions (onSnapshot)
  useEffect(() => {
    const unsubStudents = StorageService.subscribeStudents((liveStudents) => {
      setStudents(liveStudents);
    });
    const unsubAttendance = StorageService.subscribeAttendance((liveAttendance) => {
      setAttendanceRecords(liveAttendance);
    });
    const unsubDevice = StorageService.subscribeDeviceConfig((liveConfig) => {
      setDeviceConfig(liveConfig);
    });

    return () => {
      unsubStudents();
      unsubAttendance();
      unsubDevice();
    };
  }, []);

  // Parse active class tab (e.g. "Morning Class 1" -> timing: "Morning", studentClass: "Class 1")
  const parseClassTab = (tabStr: string) => {
    if (tabStr.startsWith('Morning')) {
      return { timing: 'Morning', studentClass: tabStr.replace('Morning ', '').trim() };
    }
    if (tabStr.startsWith('Evening')) {
      return { timing: 'Evening', studentClass: tabStr.replace('Evening ', '').trim() };
    }
    return { timing: 'Morning', studentClass: 'Class 1' };
  };

  const currentClassInfo = parseClassTab(activeClassTab);

  // Filter students based on active class tab and timing (or batch if teacher has no classes)
  const rosterStudents = students.filter(s => {
    if (s.status === 'Inactive') return false;
    
    // Check if matching selected assigned class and timing
    const sTiming = s.timing || (s.batch.includes('Morning') ? 'Morning' : s.batch.includes('Evening') ? 'Evening' : 'Morning');
    const sClass = s.studentClass || 'Class 1';

    const timingMatch = sTiming === currentClassInfo.timing || sTiming === 'Morning + Evening (Both)';
    const classMatch = sClass === currentClassInfo.studentClass;

    return timingMatch && classMatch;
  });

  // Fallback to batch students if roster by class is empty
  const activeStudents = rosterStudents.length > 0 
    ? rosterStudents 
    : students.filter(s => s.status !== 'Inactive' && (s.batch === selectedBatch || isTeacher));

  // Status mapping: studentId -> AttendanceStatus
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceStatus>>({});

  // When live attendanceRecords, date, or activeClassTab changes, synchronize attendanceState live!
  useEffect(() => {
    const existingRecords = attendanceRecords.filter(
      a => a.date === selectedDate && (
        (a.studentClass === currentClassInfo.studentClass && a.timing === currentClassInfo.timing) ||
        a.batch === selectedBatch
      )
    );

    const initialMap: Record<string, AttendanceStatus> = {};
    activeStudents.forEach(s => {
      const found = existingRecords.find(r => r.studentId === s.id);
      initialMap[s.id] = found ? found.status : 'Present';
    });

    setAttendanceState(initialMap);
  }, [attendanceRecords, activeClassTab, selectedBatch, selectedDate, activeStudents.length]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleMarkAllPresent = () => {
    const newMap: Record<string, AttendanceStatus> = {};
    activeStudents.forEach(s => {
      newMap[s.id] = 'Present';
    });
    setAttendanceState(newMap);
    showToast(`All students marked Present for ${activeClassTab}.`);
  };

  const handleSaveAttendance = () => {
    if (activeStudents.length === 0) return;

    const nowTime = new Date().toTimeString().split(' ')[0];
    const recordsToSave: Omit<AttendanceRecord, 'id'>[] = activeStudents.map(student => ({
      studentId: student.id,
      studentRoll: student.rollNumber,
      studentName: student.fullName,
      batch: student.batch || selectedBatch,
      studentClass: currentClassInfo.studentClass,
      timing: currentClassInfo.timing,
      teacherId: teacherAccount?.id || user?.username || 'teacher',
      teacherName: user?.name || 'Faculty',
      date: selectedDate,
      time: nowTime,
      timestamp: `${selectedDate} ${nowTime}`,
      status: attendanceState[student.id] || 'Present',
      source: 'Manual'
    }));

    StorageService.saveBatchAttendance(
      recordsToSave,
      user?.name || 'Faculty',
      user?.role || 'teacher'
    );

    showToast(`Attendance saved successfully for ${activeClassTab} (${selectedDate})!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Stats calculation
  const totalInBatch = activeStudents.length;
  const presentCount = activeStudents.filter(s => attendanceState[s.id] === 'Present').length;
  const absentCount = activeStudents.filter(s => attendanceState[s.id] === 'Absent').length;
  const leaveCount = activeStudents.filter(s => attendanceState[s.id] === 'Leave').length;
  const lateCount = activeStudents.filter(s => attendanceState[s.id] === 'Late').length;
  const attendanceRate = totalInBatch > 0 ? Math.round((presentCount / totalInBatch) * 100) : 0;

  // Past logs for this batch from live attendanceRecords
  const pastAttendance = attendanceRecords
    .filter(a => a.batch === selectedBatch)
    .reduce((acc, curr) => {
      if (!acc[curr.date]) {
        acc[curr.date] = { date: curr.date, total: 0, present: 0, absent: 0, leave: 0, late: 0 };
      }
      acc[curr.date].total += 1;
      if (curr.status === 'Present') acc[curr.date].present += 1;
      if (curr.status === 'Absent') acc[curr.date].absent += 1;
      if (curr.status === 'Leave') acc[curr.date].leave += 1;
      if (curr.status === 'Late') acc[curr.date].late += 1;
      return acc;
    }, {} as Record<string, { date: string; total: number; present: number; absent: number; leave: number; late: number }>);

  const pastDatesList = Object.values(pastAttendance).sort((a, b) => b.date.localeCompare(a.date));

  const isDeviceOnline = deviceConfig.status === 'Connected';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Device Settings Modal */}
      <DeviceSettings 
        isOpen={isDeviceSettingsOpen} 
        onClose={() => setIsDeviceSettingsOpen(false)} 
      />

      {/* Simulate Fingerprint Punch Modal */}
      <SimulatePunchModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        students={students}
        currentBatch={selectedBatch}
        currentDate={selectedDate}
        onSuccess={(name, roll) => {
          showToast(`Biometric punch recorded for ${name} (${roll})! Fingerprint turned Green.`);
        }}
      />

      {/* 3. Live Device Status Banner */}
      <div className="p-4 rounded-2xl border transition-all bg-rose-500/10 dark:bg-rose-950/30 border-rose-500/20 text-rose-950 dark:text-rose-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl shrink-0 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400">
              <Cpu className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse inline-block" />
                  ZKTeco Device: Disconnected
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Offline
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  ({deviceConfig.ip || '192.168.1.201'}:{deviceConfig.port || 4370})
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Hardware terminal will automatically sync attendance logs once connected to network. Use 'Simulate Fingerprint Punch' to test real-time biometric logging.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setIsDeviceSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span>Device Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Daily Attendance Marking</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time biometric attendance sync, Red-to-Green fingerprint detection, and role-based class rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Simulate Fingerprint Punch Button */}
          <button
            onClick={() => setIsSimulateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/25 transition-all cursor-pointer"
            title="Test biometric device punch"
          >
            <Fingerprint className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span>Simulate Fingerprint Punch</span>
          </button>

          <button
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Present</span>
          </button>

          <button
            onClick={handleSaveAttendance}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Attendance</span>
          </button>
        </div>
      </div>

      {/* Role-Based Assigned Classes Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
              {isTeacher ? `${user?.name || 'Teacher'} · Assigned Classes` : 'Class & Timing Allocations'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {isTeacher ? 'Switch between your assigned classes to mark attendance' : 'Select a class or filter by batch to manage student attendance'}
            </span>
          </div>
          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Active: <strong className="text-slate-900 dark:text-white">{activeClassTab}</strong> ({activeStudents.length} candidate{activeStudents.length === 1 ? '' : 's'})
          </div>
        </div>

        {/* Horizontal scrollable class tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {teacherClasses.map((cls) => {
            const isActive = activeClassTab === cls;
            const parsed = parseClassTab(cls);
            const count = students.filter(s => {
              if (s.status === 'Inactive') return false;
              const sTiming = s.timing || (s.batch.includes('Morning') ? 'Morning' : s.batch.includes('Evening') ? 'Evening' : 'Morning');
              return (sTiming === parsed.timing || sTiming === 'Morning + Evening (Both)') && (s.studentClass || 'Class 1') === parsed.studentClass;
            }).length;

            return (
              <button
                key={cls}
                onClick={() => setActiveClassTab(cls)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{cls}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Bar: Batch Selector & Date Picker */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Assigned Cohort / Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value as StudentBatch)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-white bg-slate-50/50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {BATCH_OPTIONS.map((b) => (
                <option key={b} value={b} className="bg-slate-900 text-slate-100">{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Attendance Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-white bg-slate-50/50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Live Batch Metric Cards */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Total Students</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{totalInBatch}</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Present</span>
            <span className="text-xl font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">{presentCount}</span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">({attendanceRate}%)</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 shadow-xs">
            <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider block">Absent</span>
            <span className="text-xl font-bold text-rose-900 dark:text-rose-200 tabular-nums">{absentCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-xs">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">Late</span>
            <span className="text-xl font-bold text-amber-900 dark:text-amber-200 tabular-nums">{lateCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 col-span-2 sm:col-span-1 shadow-xs">
            <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider block">On Leave</span>
            <span className="text-xl font-bold text-sky-900 dark:text-sky-200 tabular-nums">{leaveCount}</span>
          </div>
        </div>
      </div>

      {/* Attendance Marking List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-sm text-slate-800 dark:text-white">
              Enrolled Students in {activeClassTab} ({activeStudents.length})
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Quick Legend */}
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Fingerprint Matched (Green)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>No Match (Red)</span>
              </span>
            </div>

            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Date: <strong className="text-slate-800 dark:text-white">{selectedDate}</strong>
            </span>
          </div>
        </div>

        {activeStudents.length === 0 ? (
          <div className="p-12 text-center">
            <UserX className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No active students in {activeClassTab}.</p>
            <p className="text-xs text-slate-400 mt-1">Assign students to {activeClassTab} in the Student Directory.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activeStudents.map((student, idx) => {
              const currentStatus = attendanceState[student.id] || 'Present';
              
              // Check if student has attendance record for this date
              const studentRecord = attendanceRecords.find(
                a => a.studentId === student.id && a.date === selectedDate
              );
              
              // 1. Red to Green Fingerprint Logic:
              // Red by default (no fingerprint match yet).
              // Instantly turns Green when student's attendance is marked (via Simulate punch or device log)!
              const isFingerprintMatched = Boolean(studentRecord && studentRecord.status === 'Present');

              const isFromDevice = studentRecord?.source === 'Device' || studentRecord?.deviceId !== undefined;

              return (
                <div 
                  key={student.id} 
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 w-6 tabular-nums shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>

                    {/* RED TO GREEN FINGERPRINT ICON */}
                    <div 
                      className={`p-2 rounded-xl transition-all duration-300 shrink-0 border ${
                        isFingerprintMatched
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 shadow-sm shadow-emerald-500/20 ring-2 ring-emerald-500/20'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-500 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                      }`}
                      title={isFingerprintMatched 
                        ? `Fingerprint Matched & Present (${isFromDevice ? 'Device Punch' : 'Verified'})` 
                        : 'No fingerprint matched yet for today'
                      }
                    >
                      <Fingerprint className={`w-5 h-5 ${isFingerprintMatched ? 'animate-pulse' : ''}`} />
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm shrink-0">
                      {student.fullName.charAt(0)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{student.fullName}</span>
                        {student.koreanName && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-korean font-semibold">
                            {student.koreanName}
                          </span>
                        )}

                        {/* Device / Real-time Badge */}
                        {isFingerprintMatched && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isFromDevice
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          }`}>
                            <Fingerprint className="w-3 h-3" />
                            {isFromDevice ? 'Device Log' : 'Present'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-mono mt-1 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-950/90 via-slate-900 to-slate-900 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs">
                          {student.rollNumber}
                        </span>
                        <span>·</span>
                        <span className="font-sans text-slate-600 dark:text-slate-400">{student.level.split(' - ')[0]}</span>
                        {studentRecord?.time && (
                          <>
                            <span>·</span>
                            <span className="text-slate-500 font-mono text-[11px]">Time: {studentRecord.time}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick status selector buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto shrink-0 pl-9 sm:pl-0">
                    {/* Present */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'Present')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        currentStatus === 'Present'
                          ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Present
                    </button>

                    {/* Late */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'Late')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        currentStatus === 'Late'
                          ? 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Late
                    </button>

                    {/* Absent */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'Absent')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        currentStatus === 'Absent'
                          ? 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Absent
                    </button>

                    {/* Leave */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'Leave')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        currentStatus === 'Leave'
                          ? 'bg-sky-600 text-white shadow-xs ring-1 ring-sky-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Leave
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Save Footer Strip */}
        {activeStudents.length > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
              Review and click "Save Attendance" to commit changes to Firestore.
            </span>
            <button
              onClick={handleSaveAttendance}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save & Confirm</span>
            </button>
          </div>
        )}
      </div>

      {/* Historical Attendance Log for this Batch */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-slate-500" />
          <span>Past Attendance History ({selectedBatch.split(' (')[0]})</span>
        </h3>

        {pastDatesList.length === 0 ? (
          <p className="text-xs text-slate-400">No historical records logged yet for this batch.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastDatesList.map(item => {
              const rate = Math.round((item.present / item.total) * 100);
              return (
                <div
                  key={item.date}
                  onClick={() => setSelectedDate(item.date)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedDate === item.date
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 ring-1 ring-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white mb-1">
                    <span>{item.date}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{rate}% Present</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400">{item.present} Present</span>
                    <span>·</span>
                    <span className="text-rose-600 dark:text-rose-400">{item.absent} Absent</span>
                    <span>·</span>
                    <span className="text-amber-600 dark:text-amber-400">{item.late} Late</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Fingerprint, 
  CheckCircle2, 
  Check, 
  Clock, 
  Zap, 
  ArrowUpRight, 
  Filter, 
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AttendanceRecord, Student, TabId } from '../types';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export interface LiveActivityFeedProps {
  onNavigate?: (tab: TabId) => void;
  maxItems?: number;
  className?: string;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  onNavigate,
  maxItems = 8,
  className = ''
}) => {
  const { user } = useAuth();
  const { settings, accent } = useTheme();
  const isAdmin = user?.role === 'admin';
  const isDark = settings.themeMode === 'dark';
  const hasMotion = settings.animationsEnabled;

  // Real-time state
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [showSimulateMenu, setShowSimulateMenu] = useState<boolean>(false);
  const [selectedStudentForPunch, setSelectedStudentForPunch] = useState<string>('');

  // Subscribe to real-time changes from Firestore / StorageService
  useEffect(() => {
    const unsubAttendance = StorageService.subscribeAttendance((liveAttendance) => {
      setAttendance([...liveAttendance]);
    });
    const unsubStudents = StorageService.subscribeStudents((liveStudents) => {
      setStudents([...liveStudents]);
    });

    return () => {
      unsubAttendance();
      unsubStudents();
    };
  }, []);

  // Determine teacher's assigned classes
  const teacherAssignedClasses = useMemo<string[]>(() => {
    if (isAdmin) return [];
    const teacherAccount = StorageService.getTeacherAccounts().find(
      t => t.username.toLowerCase() === user?.username.toLowerCase()
    );
    if (teacherAccount?.assignedClasses && teacherAccount.assignedClasses.length > 0) {
      return teacherAccount.assignedClasses;
    }
    if (user?.assignedClasses && user.assignedClasses.length > 0) {
      return user.assignedClasses;
    }
    // Default fallback assigned classes for teacher
    return ['Morning Class 1', 'Morning Class 2', 'Morning Class 3'];
  }, [isAdmin, user]);

  // Helper to resolve student class & timing from record and student roster
  const resolveRecordDetails = (record: AttendanceRecord) => {
    const student = students.find(
      s => s.id === record.studentId || 
           (record.studentRoll && s.rollNumber.toLowerCase() === record.studentRoll.toLowerCase())
    );

    const studentClass = record.studentClass || student?.studentClass || 'Class 1';
    let timing = record.timing || student?.timing;
    if (!timing) {
      if (record.batch?.toLowerCase().includes('morning') || student?.batch?.toLowerCase().includes('morning')) {
        timing = 'Morning';
      } else if (record.batch?.toLowerCase().includes('evening') || student?.batch?.toLowerCase().includes('evening')) {
        timing = 'Evening';
      } else {
        timing = 'Morning';
      }
    }

    const fullClass = `${timing} ${studentClass}`.trim();
    const batchLabel = record.batch || student?.batch || 'Regular Batch';

    return {
      student,
      studentClass,
      timing,
      fullClass,
      batchLabel
    };
  };

  // Filter and sort the attendance feed
  const filteredFeed = useMemo(() => {
    // Sort all attendance records by timestamp / date + time descending
    const sorted = [...attendance].sort((a, b) => {
      const timeA = a.timestamp || `${a.date} ${a.time || '00:00:00'}`;
      const timeB = b.timestamp || `${b.date} ${b.time || '00:00:00'}`;
      return timeB.localeCompare(timeA);
    });

    if (isAdmin) {
      // Admin sees updates for all classes
      return sorted.slice(0, maxItems);
    }

    // Teacher view: filter records to only assigned classes
    const teacherRecords = sorted.filter((rec) => {
      const { fullClass, studentClass, timing } = resolveRecordDetails(rec);
      return teacherAssignedClasses.some(ac => {
        const normAC = ac.trim().toLowerCase();
        const normFull = fullClass.trim().toLowerCase();
        if (normAC === normFull) return true;
        if (timing === 'Morning + Evening (Both)') {
          if (normAC === `morning ${studentClass.toLowerCase()}` || normAC === `evening ${studentClass.toLowerCase()}`) {
            return true;
          }
        }
        if (ac.toLowerCase().includes(studentClass.toLowerCase()) && 
            (ac.toLowerCase().includes(timing.toLowerCase()) || timing === 'Morning + Evening (Both)')) {
          return true;
        }
        return false;
      });
    });

    return teacherRecords.slice(0, maxItems);
  }, [attendance, students, isAdmin, teacherAssignedClasses, maxItems]);

  // Generate deterministic gradient avatar initials
  const getAvatarInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarBg = (name: string) => {
    const charCode = (name.charCodeAt(0) || 0) + (name.charCodeAt(name.length - 1) || 0);
    const gradients = [
      'from-indigo-600 to-blue-500 text-indigo-100',
      'from-cyan-600 to-teal-500 text-cyan-100',
      'from-purple-600 to-pink-500 text-purple-100',
      'from-emerald-600 to-green-500 text-emerald-100',
      'from-rose-600 to-amber-500 text-rose-100'
    ];
    return gradients[charCode % gradients.length];
  };

  // Helper for formatting time (e.g., 09:15:20 AM)
  const formatPunchTime = (record: AttendanceRecord) => {
    if (record.time) {
      const parts = record.time.split(':');
      if (parts.length >= 2) {
        let hour = parseInt(parts[0], 10);
        const minute = parts[1];
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        const second = parts[2] ? `:${parts[2]}` : '';
        return `${hour}:${minute}${second} ${ampm}`;
      }
      return record.time;
    }
    if (record.timestamp) {
      try {
        const d = new Date(record.timestamp);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
      } catch {}
    }
    return 'Just now';
  };

  // Quick test simulation punch handler
  const handleQuickSimulate = async (studentIdToUse?: string) => {
    setIsSimulating(true);
    try {
      let targetStudent: Student | undefined;
      if (studentIdToUse) {
        targetStudent = students.find(s => s.id === studentIdToUse);
      } else {
        // Pick an active student (if teacher, prefer one from their assigned class)
        if (!isAdmin && teacherAssignedClasses.length > 0) {
          targetStudent = students.find(s => {
            const timing = s.timing || (s.batch.includes('Morning') ? 'Morning' : 'Evening');
            const fullClass = `${timing} ${s.studentClass || 'Class 1'}`;
            return teacherAssignedClasses.includes(fullClass);
          });
        }
        if (!targetStudent) {
          targetStudent = students[Math.floor(Math.random() * students.length)];
        }
      }

      if (targetStudent) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];
        await StorageService.simulateFingerprintPunch(targetStudent.rollNumber, dateStr, timeStr);
      }
    } catch (e) {
      console.warn('Simulation error:', e);
    } finally {
      setIsSimulating(false);
      setShowSimulateMenu(false);
    }
  };

  return (
    <div 
      className={`rounded-2xl transition-all duration-300 flex flex-col relative overflow-hidden ${
        isDark
          ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-700/60 shadow-xl text-white'
          : 'bg-white/90 backdrop-blur-md border border-slate-200 shadow-md text-slate-900'
      } ${className}`}
    >
      {/* Top ambient highlight glow line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500 opacity-80"
      />

      {/* Header */}
      <div className={`p-5 sm:p-6 pb-4 border-b flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'border-white/10' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          {/* Live green pulsing indicator */}
          <div className="relative flex h-3 w-3 shrink-0" title="Live Attendance Stream Active">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-black tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Live Attendance Updates
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs">
                Live
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isAdmin 
                ? 'Real-time biometric scans & attendance across all classes' 
                : `Assigned view: ${teacherAssignedClasses.join(', ')}`}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Filter Pill */}
          <div className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
            isDark 
              ? 'bg-slate-800/80 border-white/10 text-slate-300' 
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <Filter className="w-3 h-3 text-cyan-400" />
            <span>{isAdmin ? 'All Classes' : `${teacherAssignedClasses.length} Classes`}</span>
          </div>

          {/* Quick Simulation Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSimulateMenu(!showSimulateMenu)}
              disabled={isSimulating}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                isDark 
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
              }`}
              title="Simulate a real-time fingerprint punch to test live animation"
            >
              <Zap className={`w-3.5 h-3.5 text-emerald-400 ${isSimulating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSimulating ? 'Punching...' : 'Test Punch'}</span>
            </button>

            {/* Simulation Quick Dropdown */}
            {showSimulateMenu && (
              <div 
                className={`absolute right-0 mt-2 w-64 rounded-2xl p-3 shadow-2xl border z-50 animate-fadeIn ${
                  isDark 
                    ? 'bg-slate-950/95 border-slate-700 backdrop-blur-xl text-white' 
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                    Simulate Live Punch
                  </span>
                  <button 
                    onClick={() => setShowSimulateMenu(false)}
                    className="text-slate-400 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                  Trigger an instantaneous biometric punch to verify live feed entrance animation:
                </p>

                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 text-xs">
                  {students.slice(0, 6).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleQuickSimulate(s.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        isDark 
                          ? 'hover:bg-slate-800 text-slate-200' 
                          : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <span className="font-semibold truncate">{s.fullName}</span>
                      <span className="font-mono text-[10px] text-cyan-400">{s.rollNumber}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 mt-2 border-t border-white/10">
                  <button
                    onClick={() => handleQuickSimulate()}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-sm cursor-pointer transition-all"
                  >
                    ⚡ Random Student Punch
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feed Content Area */}
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[380px] space-y-2.5 pr-2">
        {filteredFeed.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3 border ${
              isDark 
                ? 'bg-slate-800/80 border-white/10 text-slate-400' 
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              <Clock className="w-6 h-6 animate-pulse text-emerald-400" />
            </div>
            <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Waiting for Live Attendance Logs
            </h4>
            <p className={`text-xs mt-1 max-w-xs mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isAdmin 
                ? 'Punches scanned on ZKTeco K40 or marked manually will stream in here dynamically.' 
                : `No recent attendance logs for your assigned classes: ${teacherAssignedClasses.join(', ')}.`}
            </p>
            <button
              onClick={() => handleQuickSimulate()}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
            >
              <Zap className="w-3 h-3" />
              <span>Simulate First Punch</span>
            </button>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredFeed.map((record) => {
              const { studentClass, timing, fullClass, batchLabel } = resolveRecordDetails(record);
              const isFingerprint = record.source === 'Device' || record.remarks?.toLowerCase().includes('zkteco');
              const punchTimeDisplay = formatPunchTime(record);

              return (
                <motion.div
                  key={record.id}
                  layout
                  initial={{ opacity: 0, y: -24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: hasMotion ? 0.35 : 0, ease: 'easeOut' }}
                  className={`group relative p-3 sm:p-3.5 rounded-xl border transition-all duration-200 ${
                    isDark
                      ? 'bg-slate-800/60 hover:bg-slate-800/90 border-slate-700/60 hover:border-emerald-500/40 shadow-xs'
                      : 'bg-slate-50/90 hover:bg-white border-slate-200 hover:border-emerald-500/40 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Student Initials Avatar */}
                    <div 
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarBg(record.studentName)} flex items-center justify-center font-black text-xs shrink-0 shadow-sm ring-1 ring-white/10`}
                    >
                      {getAvatarInitials(record.studentName)}
                    </div>

                    {/* Middle Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-bold text-xs sm:text-sm truncate leading-snug ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}>
                            {record.studentName}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800/80 text-cyan-300 border border-cyan-500/30 shrink-0 font-bold">
                            {record.studentRoll}
                          </span>
                        </div>

                        {/* Punch Time */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono shrink-0">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{punchTimeDisplay}</span>
                        </div>
                      </div>

                      {/* Class & Batch Row */}
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {/* Class Pill */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
                            timing === 'Morning'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {fullClass}
                          </span>

                          {/* Batch Mini Badge */}
                          <span className={`hidden sm:inline text-[11px] ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {batchLabel.split('(')[0].trim()}
                          </span>
                        </div>

                        {/* Verification Status Badge */}
                        <div className="shrink-0">
                          {isFingerprint ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Fingerprint Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-xs">
                              <Check className="w-3 h-3 text-indigo-400" />
                              <span>Manually Verified</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Navigation bar */}
      <div className={`p-3.5 px-5 sm:px-6 border-t flex items-center justify-between text-xs ${
        isDark ? 'border-white/10 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px]">
            {isAdmin 
              ? `Synced ${filteredFeed.length} records · ZKTeco ADMS Active` 
              : `Filtered for your ${teacherAssignedClasses.length} assigned classes`}
          </span>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('attendance')}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer transition-colors"
          >
            <span>Attendance Center</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveActivityFeed;

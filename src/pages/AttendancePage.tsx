import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Calendar,
  Calendar as CalendarIcon, 
  Check, 
  Clock, 
  UserX, 
  CheckCircle2, 
  Users, 
  Sparkles, 
  RotateCcw, 
  CheckCheck, 
  Fingerprint, 
  Cpu, 
  Wifi, 
  WifiOff, 
  Sliders, 
  Radio, 
  Zap, 
  Info,
  AlertTriangle,
  CalendarOff,
  Send,
  FileText,
  X,
  ShieldAlert,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { 
  Student, 
  AttendanceRecord, 
  AttendanceStatus, 
  StudentBatch, 
  ZKTecoDeviceConfig,
  SundayClassRequest,
  StudentLeaveRequest,
  AttendanceScheduleSettings,
  SpecificDateOverride
} from '../types';
import { StorageService } from '../services/storageService';
import { NotificationService } from '../services/notificationService';
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
  const isAdmin = user?.role === 'admin';
  
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
  const [isSundayModalOpen, setIsSundayModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Sunday Request Form
  const [sundayReason, setSundayReason] = useState('Extra TOPIK/EPS Grammar Revision Session');
  const [sundayTargetClass, setSundayTargetClass] = useState(initialClass);

  // Student Leave Request Form
  const [leaveStudentId, setLeaveStudentId] = useState('');
  const [leaveTargetStudent, setLeaveTargetStudent] = useState<Student | null>(null);
  const [leaveStartDate, setLeaveStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');

  // Live state from Firestore subscriptions
  const [students, setStudents] = useState<Student[]>(() => {
    const loaded = StorageService.getStudents();
    return loaded.filter(s => !['std_01', 'std_02', 'std_03', 'std_04', 'std_05', 'std_06', 'std_07'].includes(s.id));
  });
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [deviceConfig, setDeviceConfig] = useState<ZKTecoDeviceConfig>(() => StorageService.getDeviceConfig());
  const [sundayRequests, setSundayRequests] = useState<SundayClassRequest[]>(() => StorageService.getSundayRequests());
  const [leaveRequests, setLeaveRequests] = useState<StudentLeaveRequest[]>(() => StorageService.getLeaveRequests());
  const [attendanceSchedule, setAttendanceSchedule] = useState<AttendanceScheduleSettings>(() => 
    StorageService.getAttendanceScheduleSettings()
  );

  // Real-time Firestore subscriptions (onSnapshot)
  useEffect(() => {
    const unsubStudents = StorageService.subscribeStudents((liveStudents) => {
      const filtered = liveStudents.filter(s => !['std_01', 'std_02', 'std_03', 'std_04', 'std_05', 'std_06', 'std_07'].includes(s.id));
      setStudents(filtered);
    });
    const unsubAttendance = StorageService.subscribeAttendance((liveAttendance) => {
      setAttendanceRecords(liveAttendance);
    });
    const unsubDevice = StorageService.subscribeDeviceConfig((liveConfig) => {
      setDeviceConfig(liveConfig);
    });
    const unsubSunday = StorageService.subscribeSundayRequests((liveSunday) => {
      setSundayRequests(liveSunday);
    });
    const unsubLeave = StorageService.subscribeLeaveRequests((liveLeave) => {
      setLeaveRequests(liveLeave);
    });
    const unsubSchedule = StorageService.subscribeAttendanceScheduleSettings((liveSchedule) => {
      setAttendanceSchedule(liveSchedule);
    });

    return () => {
      unsubStudents();
      unsubAttendance();
      unsubDevice();
      unsubSunday();
      unsubLeave();
      unsubSchedule();
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

  // 1. ATTENDANCE DAY CONTROL (SUNDAY OFF & ALL DAYS) & SPECIFIC DATE OVERRIDE LOGIC
  const dayScheduleStatus = StorageService.isAttendanceDayAllowed(selectedDate, activeClassTab);
  const isDayOff = !dayScheduleStatus.isAllowed;
  const isSunday = dayScheduleStatus.isSunday;

  // Check if there is an approved Sunday request for this date and class
  const approvedSundayRequest = sundayRequests.find(
    r => r.date === selectedDate && 
         r.status === 'Approved' && 
         (r.className === activeClassTab || r.className === currentClassInfo.studentClass)
  );

  const pendingSundayRequest = sundayRequests.find(
    r => r.date === selectedDate && 
         r.status === 'Pending' && 
         (r.className === activeClassTab || r.className === currentClassInfo.studentClass)
  );

  // If a day is toggled OFF from Admin settings (Monday to Sunday), attendance is disabled (unless approved Sunday session)
  const isAttendanceDisabled = isDayOff && !approvedSundayRequest;

  // Filter students based on active class tab and timing
  const rosterStudents = students.filter(s => {
    if (s.status === 'Inactive') return false;
    
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

  // When live attendanceRecords, date, or activeClassTab changes, synchronize attendanceState live
  useEffect(() => {
    const existingRecords = attendanceRecords.filter(
      a => a.date === selectedDate && (
        (a.studentClass === currentClassInfo.studentClass && a.timing === currentClassInfo.timing) ||
        a.batch === selectedBatch
      )
    );

    const initialMap: Record<string, AttendanceStatus> = {};
    activeStudents.forEach(s => {
      // Check if student has pending leave request covering selectedDate
      const isPendingLeave = leaveRequests.some(
        l => l.studentId === s.id && 
             l.status === 'Pending' && 
             selectedDate >= l.startDate && 
             selectedDate <= l.endDate
      );

      // If pending approval, keep Neutral (not finalized yet)
      if (isPendingLeave) {
        return;
      }

      const found = existingRecords.find(r => r.studentId === s.id);
      if (found) {
        initialMap[s.id] = found.status;
      } else {
        // Check if student has approved leave covering selectedDate
        const isStudentOnLeave = leaveRequests.some(
          l => l.studentId === s.id && 
               l.status === 'Approved' && 
               selectedDate >= l.startDate && 
               selectedDate <= l.endDate
        );
        if (isStudentOnLeave) {
          initialMap[s.id] = 'Leave';
        }
      }
    });

    setAttendanceState(initialMap);
  }, [attendanceRecords, activeClassTab, selectedBatch, selectedDate, activeStudents.length, leaveRequests]);

  const saveStudentAttendance = (studentId: string, status: AttendanceStatus) => {
    if (isAttendanceDisabled) {
      showToast(`Today is off (${dayScheduleStatus.dayName})`);
      return;
    }

    setAttendanceState(prev => ({
      ...prev,
      [studentId]: status
    }));

    // Auto-Save immediately to storage and database
    const targetStudent = activeStudents.find(s => s.id === studentId) || students.find(s => s.id === studentId);
    if (targetStudent) {
      const nowTime = new Date().toTimeString().split(' ')[0];
      const recordToSave: Omit<AttendanceRecord, 'id'> = {
        studentId: targetStudent.id,
        studentRoll: targetStudent.rollNumber,
        studentName: targetStudent.fullName,
        batch: targetStudent.batch || selectedBatch,
        studentClass: currentClassInfo.studentClass,
        timing: currentClassInfo.timing,
        teacherId: teacherAccount?.id || user?.username || 'teacher',
        teacherName: user?.name || 'Faculty',
        date: selectedDate,
        time: nowTime,
        timestamp: `${selectedDate} ${nowTime}`,
        status: status,
        source: 'Manual'
      };

      StorageService.saveBatchAttendance(
        [recordToSave],
        user?.name || 'Faculty',
        user?.role || 'teacher'
      );

      // Push notification to Admin if marked by teacher
      if (isTeacher) {
        NotificationService.notifyAttendanceMarked(user?.name || 'Teacher', activeClassTab, 1);
      }
    }
  };

  const handleOpenLeaveModal = (student: Student) => {
    if (isAttendanceDisabled) {
      showToast(`Today is off (${dayScheduleStatus.dayName})`);
      return;
    }

    // Check if this student already has a pending leave covering selectedDate
    const pending = leaveRequests.find(
      l => l.studentId === student.id &&
           l.status === 'Pending' &&
           selectedDate >= l.startDate &&
           selectedDate <= l.endDate
    );
    if (pending) {
      showToast(`Leave request for ${student.fullName} is already Pending Admin Approval (${pending.reason})`);
      return;
    }

    // Check if student already has approved leave
    const approved = leaveRequests.find(
      l => l.studentId === student.id &&
           l.status === 'Approved' &&
           selectedDate >= l.startDate &&
           selectedDate <= l.endDate
    );
    if (approved) {
      showToast(`${student.fullName} is already on Approved Leave (${approved.reason})`);
      return;
    }

    setLeaveTargetStudent(student);
    setLeaveStudentId(student.id);
    setLeaveStartDate(selectedDate);
    setLeaveEndDate(selectedDate);
    setLeaveReason('');
    setIsLeaveModalOpen(true);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (isAttendanceDisabled) {
      alert(`Today is off`);
      showToast(`Today is off (${dayScheduleStatus.dayName})`);
      return;
    }

    // When Leave is clicked, open the Leave Reason Modal
    if (status === 'Leave') {
      const targetStudent = activeStudents.find(s => s.id === studentId) || students.find(s => s.id === studentId);
      if (targetStudent) {
        handleOpenLeaveModal(targetStudent);
      }
      return;
    }

    // Neutralize handling (Admin Only - resets to Neutral, excluding from counts)
    if (status === 'Neutral') {
      if (!isAdmin) {
        showToast('Only Administrators can neutralize attendance.');
        return;
      }
      StorageService.neutralizeStudentAttendance(studentId, selectedDate, user?.name || 'Admin', user?.role || 'admin');
      setAttendanceState(prev => ({
        ...prev,
        [studentId]: 'Neutral'
      }));
      showToast('Attendance Neutralized (Excluded from counts)');
      return;
    }

    const studentRecord = attendanceRecords.find(
      a => a.studentId === studentId && a.date === selectedDate
    );
    const currentStatus = attendanceState[studentId] || studentRecord?.status;

    if (currentStatus === status) {
      return;
    }

    // If already marked and user is a Teacher: cannot change directly, submit approval request
    if (currentStatus && isTeacher) {
      const targetStudent = activeStudents.find(s => s.id === studentId) || students.find(s => s.id === studentId);
      if (targetStudent) {
        StorageService.createAttendanceRequest({
          studentId: targetStudent.id,
          studentRoll: targetStudent.rollNumber,
          studentName: targetStudent.fullName,
          studentClass: currentClassInfo.studentClass,
          timing: currentClassInfo.timing,
          batch: targetStudent.batch || selectedBatch,
          date: selectedDate,
          previousStatus: currentStatus,
          requestedStatus: status,
          teacherId: teacherAccount?.id || user?.username || 'teacher',
          teacherName: user?.name || 'Faculty',
          timestamp: new Date().toISOString()
        });
      }

      alert("This action requires Admin approval. A request has been sent.");
      showToast("This action requires Admin approval. A request has been sent.");
      return;
    }

    // Normal marking
    saveStudentAttendance(studentId, status);
    showToast('Attendance Auto-Saved');
  };

  const handleMarkAllPresent = () => {
    if (isAttendanceDisabled) {
      alert("Today is off");
      showToast(`Today is off (${dayScheduleStatus.dayName})`);
      return;
    }

    if (activeStudents.length === 0) return;
    const newMap: Record<string, AttendanceStatus> = {};
    const nowTime = new Date().toTimeString().split(' ')[0];
    const recordsToSave: Omit<AttendanceRecord, 'id'>[] = activeStudents.map(student => {
      newMap[student.id] = 'Present';
      return {
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
        status: 'Present' as AttendanceStatus,
        source: 'Manual'
      };
    });

    setAttendanceState(newMap);
    StorageService.saveBatchAttendance(
      recordsToSave,
      user?.name || 'Faculty',
      user?.role || 'teacher'
    );

    // Push notification to Admin
    if (isTeacher) {
      NotificationService.notifyAttendanceMarked(user?.name || 'Teacher', activeClassTab, activeStudents.length);
    }

    showToast('Attendance Auto-Saved for all candidates');
  };

  const handleSundayRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sundayReason.trim()) {
      showToast('Please provide a reason for the Sunday class');
      return;
    }

    StorageService.createSundayRequest({
      teacherId: teacherAccount?.id || user?.username || 'teacher',
      teacherName: user?.name || 'Faculty',
      className: activeClassTab,
      batch: selectedBatch,
      date: selectedDate,
      reason: sundayReason.trim()
    });

    setIsSundayModalOpen(false);
    showToast('Sunday class request sent to Admin for approval!');
  };

  const handleLeaveRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStudent = leaveTargetStudent || students.find(s => s.id === leaveStudentId);
    if (!targetStudent) {
      showToast('Please select a student');
      return;
    }
    if (!leaveReason.trim()) {
      showToast('Please specify a reason for the leave');
      return;
    }

    const created = StorageService.createLeaveRequest({
      studentId: targetStudent.id,
      studentRoll: targetStudent.rollNumber,
      studentName: targetStudent.fullName,
      studentClass: targetStudent.studentClass || currentClassInfo.studentClass,
      batch: targetStudent.batch || selectedBatch,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      reason: leaveReason.trim(),
      submittedByRole: user?.role || 'teacher',
      submittedByName: user?.name || 'Faculty'
    });

    // Reset local attendanceState for this student so it temporarily shows as Neutral / Pending Approval
    setAttendanceState(prev => {
      const next = { ...prev };
      delete next[targetStudent.id];
      return next;
    });

    setIsLeaveModalOpen(false);
    setLeaveTargetStudent(null);
    setLeaveStudentId('');
    setLeaveReason('');

    // If Admin is submitting, automatically approve it
    if (isAdmin) {
      await StorageService.approveLeaveRequest(created.id, user?.name || 'Admin');
      showToast(`Leave approved for ${targetStudent.fullName}. Attendance marked as Leave.`);
    } else {
      showToast(`Leave request submitted for ${targetStudent.fullName} (Pending Admin Approval)`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to test Sunday behavior quickly
  const setTestSundayDate = () => {
    const d = new Date();
    // Calculate days until next Sunday (or today if Sunday)
    const day = d.getDay();
    const diff = (7 - day) % 7;
    d.setDate(d.getDate() + (diff === 0 ? 0 : diff));
    setSelectedDate(d.toISOString().split('T')[0]);
    showToast(`Date set to Sunday (${d.toISOString().split('T')[0]}) for testing`);
  };

  // Stats calculation
  const totalInBatch = activeStudents.length;
  const presentCount = activeStudents.filter(s => attendanceState[s.id] === 'Present').length;
  const absentCount = activeStudents.filter(s => attendanceState[s.id] === 'Absent').length;
  const leaveCount = activeStudents.filter(s => attendanceState[s.id] === 'Leave').length;
  const lateCount = activeStudents.filter(s => attendanceState[s.id] === 'Late').length;
  const neutralCount = activeStudents.filter(s => attendanceState[s.id] === 'Neutral').length;
  const activeCount = totalInBatch - neutralCount;
  const attendanceRate = activeCount > 0 ? Math.round((presentCount / activeCount) * 100) : 0;

  // Past logs for this batch from live attendanceRecords
  const pastAttendance = attendanceRecords
    .filter(a => a.batch === selectedBatch)
    .reduce((acc, curr) => {
      if (!acc[curr.date]) {
        acc[curr.date] = { date: curr.date, total: 0, present: 0, absent: 0, leave: 0, late: 0, neutral: 0 };
      }
      if (curr.status !== 'Neutral') {
        acc[curr.date].total += 1;
        if (curr.status === 'Present') acc[curr.date].present += 1;
        if (curr.status === 'Absent') acc[curr.date].absent += 1;
        if (curr.status === 'Leave') acc[curr.date].leave += 1;
        if (curr.status === 'Late') acc[curr.date].late += 1;
      } else {
        acc[curr.date].neutral += 1;
      }
      return acc;
    }, {} as Record<string, { date: string; total: number; present: number; absent: number; leave: number; late: number; neutral: number }>);

  const pastDatesList = Object.values(pastAttendance).sort((a, b) => b.date.localeCompare(a.date));

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

      {/* Sunday Class Request Modal */}
      {isSundayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Request Sunday Class</h3>
              </div>
              <button 
                onClick={() => setIsSundayModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSundayRequestSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Class
                </label>
                <input
                  type="text"
                  readOnly
                  value={activeClassTab}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sunday Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Sunday Session
                </label>
                <textarea
                  rows={3}
                  value={sundayReason}
                  onChange={(e) => setSundayReason(e.target.value)}
                  placeholder="e.g. Special EPS-TOPIK Intensive Mock Test & Listening Practice Session"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSundayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Request to Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Leave Request Modal (Reason Input Popup) */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <CalendarOff className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {leaveTargetStudent ? `Leave Request: ${leaveTargetStudent.fullName}` : 'Submit Student Leave Request'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsLeaveModalOpen(false);
                  setLeaveTargetStudent(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLeaveRequestSubmit} className="mt-4 space-y-4">
              {/* Target Student Display or Selector */}
              {leaveTargetStudent ? (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      {leaveTargetStudent.fullName}
                    </div>
                    <div className="text-[11px] font-mono text-cyan-500">
                      Roll: {leaveTargetStudent.rollNumber} · {leaveTargetStudent.studentClass || activeClassTab}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {selectedDate}
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Candidate
                  </label>
                  <select
                    value={leaveStudentId}
                    onChange={(e) => {
                      setLeaveStudentId(e.target.value);
                      const st = students.find(s => s.id === e.target.value);
                      if (st) setLeaveTargetStudent(st);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">-- Choose student from active classes --</option>
                    {activeStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.rollNumber}) · {s.studentClass || 'Class 1'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

              {/* Quick Reason Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Quick Reason Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Sick with fever',
                    'Medical / Doctor Appointment',
                    'Family Emergency',
                    'Overseas Visa / Embassy Verification',
                    'EPS-TOPIK Intensive Prep',
                    'Urgent Personal Matter'
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setLeaveReason(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        leaveReason === preset
                          ? 'bg-sky-600 text-white shadow-xs ring-1 ring-sky-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Leave <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="e.g. Sick with high fever, Family emergency, Overseas examination, etc."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              {/* Status explanation notice */}
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Clock className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <span>
                  {isAdmin
                    ? 'Submitting as Admin will directly approve this leave request and update attendance status to Leave.'
                    : 'Once submitted, this leave request will be sent to the Admin Dashboard for approval. Student attendance will temporarily show as "Pending Approval" (Neutral) until reviewed by Admin.'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLeaveModalOpen(false);
                    setLeaveTargetStudent(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isAdmin ? 'Approve & Save Leave' : 'Send Request to Admin'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Device Status Banner - Only visible to ADMIN role */}
      {isAdmin && (
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
      )}

      {/* DAY OFF ATTENDANCE BANNER: LOCK OR AUTHORIZATION NOTICE */}
      {isDayOff && (
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isAttendanceDisabled 
            ? 'bg-rose-500/10 dark:bg-rose-950/30 border-rose-500/30 text-rose-900 dark:text-rose-200' 
            : 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                isAttendanceDisabled 
                  ? 'bg-rose-500/20 text-rose-500' 
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {isAttendanceDisabled ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
              </div>

              <div>
                <h4 className="font-black text-sm flex items-center gap-2">
                  <span>
                    {isAttendanceDisabled 
                      ? (dayScheduleStatus.isClassSpecificOverride ? `Today is off (${dayScheduleStatus.overrideTargetClass || activeClassTab})` : 'Today is off')
                      : (dayScheduleStatus.isClassSpecificOverride ? `${dayScheduleStatus.overrideTargetClass || activeClassTab} Attendance Authorized` : `${dayScheduleStatus.dayName} Attendance Authorized`)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {dayScheduleStatus.isClassSpecificOverride ? `${dayScheduleStatus.overrideTargetClass || activeClassTab} Holiday` : `${dayScheduleStatus.dayName} Day Off`}
                  </span>
                  {pendingSundayRequest && isAttendanceDisabled && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Approval Pending
                    </span>
                  )}
                  {approvedSundayRequest && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Sunday Approved
                    </span>
                  )}
                </h4>
                <p className="text-xs opacity-85 mt-0.5">
                  {isAttendanceDisabled
                    ? (dayScheduleStatus.isClassSpecificOverride
                        ? `${dayScheduleStatus.overrideTargetClass || activeClassTab} has been declared as Holiday/Off on ${selectedDate} by Admin Override. Attendance marking is disabled.`
                        : `Today is ${dayScheduleStatus.dayName}. Institutional schedule has marked this day as a Day Off. Attendance marking is disabled.`)
                    : (dayScheduleStatus.isClassSpecificOverride
                        ? `Attendance marking is enabled for ${dayScheduleStatus.overrideTargetClass || activeClassTab} on ${selectedDate} via Admin Override.`
                        : `Attendance marking is enabled for ${dayScheduleStatus.dayName} (${selectedDate}) via admin authorization.`)
                  }
                </p>
                {pendingSundayRequest && (
                  <p className="text-[11px] font-mono mt-1 text-amber-300">
                    Reason submitted: "{pendingSundayRequest.reason}" (Awaiting Admin review)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isAttendanceDisabled && isTeacher && isSunday && !pendingSundayRequest && (
                <button
                  onClick={() => setIsSundayModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Request Sunday Class</span>
                </button>
              )}

              {/* Admin Direct Authority: Turn attendance ON/OFF for any specific day and save to Firebase node attendance_settings */}
              {isAdmin && (
                <button
                  onClick={async () => {
                    const newOverride: SpecificDateOverride = {
                      id: `${selectedDate}_${activeClassTab}`,
                      date: selectedDate,
                      targetClass: activeClassTab,
                      action: isAttendanceDisabled ? 'enable' : 'holiday',
                      isAllowed: isAttendanceDisabled,
                      createdAt: new Date().toISOString(),
                      createdBy: user?.name || 'Admin'
                    };
                    await StorageService.addSpecificDateOverride(newOverride, user?.name || 'Admin');
                    showToast(isAttendanceDisabled 
                      ? `Attendance turned ON for ${activeClassTab} on ${selectedDate} in Firebase` 
                      : `Attendance turned OFF for ${activeClassTab} on ${selectedDate} in Firebase`
                    );
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                    isAttendanceDisabled ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isAttendanceDisabled ? `Turn Attendance ON (${activeClassTab})` : `Declare Holiday (${activeClassTab})`}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Daily Attendance Marking</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time biometric attendance sync, weekly schedule governance, and student leave tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sunday Class Request button for Teachers */}
          {isTeacher && isSunday && (
            <button
              onClick={() => setIsSundayModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Request Sunday Class</span>
            </button>
          )}

          {/* Submit Leave Request Button */}
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
          >
            <CalendarOff className="w-4 h-4" />
            <span>Submit Leave Request</span>
          </button>

          {/* Simulate Fingerprint Punch Button */}
          <button
            onClick={() => setIsSimulateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/25 transition-all cursor-pointer"
            title="Test biometric device punch"
          >
            <Fingerprint className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span>Simulate Punch</span>
          </button>

          {/* Mark All Present: Hidden when attendance is disabled */}
          {!isAttendanceDisabled && (
            <button
              onClick={handleMarkAllPresent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border-emerald-200 dark:border-emerald-800"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Present</span>
            </button>
          )}
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

      {/* Control Bar: Batch Selector, Date Picker & Quick Test Sunday Shortcut */}
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Attendance Date
              </label>
              <button
                type="button"
                onClick={setTestSundayDate}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
                title="Select next Sunday to test Sunday Lock & Override"
              >
                <Calendar className="w-3 h-3" />
                <span>Simulate Sunday Date</span>
              </button>
            </div>
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

        {isAttendanceDisabled ? (
          <div className="py-16 px-6 sm:px-12 flex flex-col items-center justify-center text-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md">
            {/* Glowing Icon Container */}
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500/20 via-pink-500/10 to-slate-900 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/20">
                <CalendarOff className="w-10 h-10 text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500" />
              </span>
            </div>

            {/* Large, Centered Alert Badge - Prominent Dark Theme with Glow */}
            <div className="inline-flex items-center justify-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 border border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.25),0_10px_25px_-5px_rgba(0,0,0,0.5)] ring-1 ring-rose-500/30 max-w-lg">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 shrink-0 animate-pulse" />
              <span className="text-base sm:text-xl font-black tracking-tight text-white drop-shadow-sm">
                Today is off
              </span>
            </div>

            <h4 className="mt-4 text-base sm:text-lg font-bold text-white tracking-tight">
              {dayScheduleStatus.isClassSpecificOverride 
                ? `Today is off for ${dayScheduleStatus.overrideTargetClass || activeClassTab}` 
                : isSunday 
                  ? "Today is Sunday. Academy is closed." 
                  : `Today is ${dayScheduleStatus.dayName}. Academy is closed.`}
            </h4>

            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md font-medium leading-relaxed">
              {dayScheduleStatus.isClassSpecificOverride 
                ? `${dayScheduleStatus.overrideTargetClass || activeClassTab} has been declared as Holiday/Off on ${selectedDate} by Admin Override. Attendance marking is disabled.` 
                : `${dayScheduleStatus.dayName} is configured as a Day Off in Admin Schedule Settings. Attendance marking and biometric logging are disabled.`}
            </p>

            {/* Action buttons if teacher wants to request or admin wants to enable */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {isSunday && isTeacher && !pendingSundayRequest && (
                <button
                  type="button"
                  onClick={() => setIsSundayModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Request Sunday Class Authorization</span>
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={async () => {
                    const newOverride: SpecificDateOverride = {
                      id: `${selectedDate}_${activeClassTab}`,
                      date: selectedDate,
                      targetClass: activeClassTab,
                      action: 'enable',
                      isAllowed: true,
                      createdAt: new Date().toISOString(),
                      createdBy: user?.name || 'Admin'
                    };
                    await StorageService.addSpecificDateOverride(newOverride, user?.name || 'Admin');
                    showToast(`Attendance turned ON for ${activeClassTab} on ${selectedDate} in Firebase`);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Turn Attendance ON for {activeClassTab} ({selectedDate})</span>
                </button>
              )}
            </div>
          </div>
        ) : activeStudents.length === 0 ? (
          <div className="p-12 text-center">
            <UserX className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No students found.</p>
            <p className="text-xs text-slate-400 mt-1">Assign students to {activeClassTab} in the Student Directory.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activeStudents.map((student, idx) => {
              // Check if student has attendance record for this date
              const studentRecord = attendanceRecords.find(
                a => a.studentId === student.id && a.date === selectedDate
              );

              // Check if student has pending leave request for selectedDate
              const pendingLeave = leaveRequests.find(
                l => l.studentId === student.id && 
                     l.status === 'Pending' && 
                     selectedDate >= l.startDate && 
                     selectedDate <= l.endDate
              );

              // Check if student is on approved leave for selectedDate
              const approvedLeave = leaveRequests.find(
                l => l.studentId === student.id && 
                     l.status === 'Approved' && 
                     selectedDate >= l.startDate && 
                     selectedDate <= l.endDate
              );

              // If pending leave, attendance status temporarily shows as Neutral / empty (not finalized yet)
              const currentStatus = pendingLeave 
                ? undefined 
                : (attendanceState[student.id] || (approvedLeave ? 'Leave' : studentRecord?.status));
              
              // Red to Green Fingerprint Logic
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

                        {/* Pending Leave Request Badge */}
                        {pendingLeave && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs">
                              <Clock className="w-3 h-3 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                              Pending Approval: {pendingLeave.reason}
                            </span>

                            {/* Direct Admin Action Buttons */}
                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await StorageService.approveLeaveRequest(pendingLeave.id, user?.name || 'Admin');
                                    showToast(`Approved leave for ${student.fullName}. Marked as Leave.`);
                                  }}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer flex items-center gap-0.5"
                                  title="Approve Leave"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await StorageService.rejectLeaveRequest(pendingLeave.id, user?.name || 'Admin');
                                    showToast(`Rejected leave for ${student.fullName}. Status reset to Neutral.`);
                                  }}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer flex items-center gap-0.5"
                                  title="Reject Leave"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Approved Leave Badge */}
                        {approvedLeave && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                            <CalendarOff className="w-3 h-3" />
                            Approved Leave ({approvedLeave.reason})
                          </span>
                        )}

                        {/* Current Status Badge with Admin Click-to-Neutralize */}
                        {currentStatus && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isAdmin && currentStatus !== 'Neutral') {
                                if (window.confirm(`Neutralize attendance for ${student.fullName} on ${selectedDate}? This will set it to Neutral (Not Present, Not Absent, Not Leave).`)) {
                                  handleStatusChange(student.id, 'Neutral');
                                }
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                              isAdmin && currentStatus !== 'Neutral' ? 'cursor-pointer hover:opacity-85' : 'cursor-default'
                            } ${
                              currentStatus === 'Present'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : currentStatus === 'Late'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                : currentStatus === 'Absent'
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                : currentStatus === 'Neutral'
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                            }`}
                            title={isAdmin && currentStatus !== 'Neutral' ? 'Admin: Click to Neutralize status' : `Status: ${currentStatus}`}
                          >
                            <span>{currentStatus}</span>
                            {isAdmin && currentStatus !== 'Neutral' && (
                              <span className="text-[9px] opacity-70 underline ml-0.5">Neutralize</span>
                            )}
                          </button>
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

                  {/* Quick status selector buttons - Completely hidden when attendance is disabled */}
                  {!isAttendanceDisabled && (
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

                      {/* Leave - Opens reason input modal */}
                      <button
                        type="button"
                        onClick={() => {
                          if (pendingLeave) {
                            showToast(`Leave request for ${student.fullName} is already Pending Admin Approval (${pendingLeave.reason})`);
                            return;
                          }
                          handleOpenLeaveModal(student);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          pendingLeave
                            ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/40 ring-1 ring-amber-400/30'
                            : currentStatus === 'Leave'
                              ? 'bg-sky-600 text-white shadow-xs ring-1 ring-sky-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                        }`}
                        title={pendingLeave ? `Pending Approval: ${pendingLeave.reason}` : 'Submit Leave Request with Reason'}
                      >
                        {pendingLeave ? 'Leave (Pending)' : currentStatus === 'Leave' ? 'Leave (Approved)' : 'Leave'}
                      </button>

                      {/* Neutral (Admin Only) */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.id, 'Neutral')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            currentStatus === 'Neutral'
                              ? 'bg-slate-700 text-white shadow-xs ring-1 ring-slate-500 font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                          }`}
                          title="Neutralize: Exclude from Present, Absent, and Leave"
                        >
                          Neutral
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historical Attendance Log for this Batch */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <span>Past Attendance History ({selectedBatch.split(' (')[0]})</span>
          </h3>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to permanently clear and delete the attendance history for ${selectedDate} from Firebase?`)) {
                  StorageService.deleteAttendanceForDate(selectedDate, undefined, user?.name || 'Admin', user?.role || 'admin');
                  showToast(`Cleared attendance history for ${selectedDate}`);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer self-start sm:self-auto"
              title={`Clear attendance log for ${selectedDate}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete History ({selectedDate})</span>
            </button>
          )}
        </div>

        {pastDatesList.length === 0 ? (
          <p className="text-xs text-slate-400">No historical records logged yet for this batch.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastDatesList.map(item => {
              const rate = item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
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
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{rate}% Present</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to permanently delete all attendance records for ${item.date} from Firebase?`)) {
                              StorageService.deleteAttendanceForDate(item.date, undefined, user?.name || 'Admin', user?.role || 'admin');
                              showToast(`Deleted attendance records for ${item.date}`);
                            }
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title={`Delete history for ${item.date}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] flex-wrap">
                    <span className="text-emerald-600 dark:text-emerald-400">{item.present} Present</span>
                    <span>·</span>
                    <span className="text-rose-600 dark:text-rose-400">{item.absent} Absent</span>
                    <span>·</span>
                    <span className="text-amber-600 dark:text-amber-400">{item.late} Late</span>
                    {item.neutral > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono">{item.neutral} Neutral</span>
                      </>
                    )}
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

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  RotateCcw, 
  Download, 
  Database, 
  Building2, 
  CheckCircle2, 
  UserCheck, 
  Globe, 
  Plus, 
  Edit3, 
  Trash2, 
  Key,
  Check,
  ShieldCheck,
  Languages,
  Sparkles,
  Sun,
  Moon,
  ShieldAlert,
  Unlock,
  AlertTriangle,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  XCircle,
  FileCheck2,
  RefreshCw,
  CalendarCheck,
  CalendarOff,
  Calendar,
  Megaphone,
  Sliders,
  Volume2,
  X,
  GraduationCap,
  Copy,
  Search,
  ArrowLeftRight,
  Loader2,
  KeyRound,
  Hash
} from 'lucide-react';
import {
  StorageService,
  formatRollNumberFromSettings,
  formatSerialNumberFromSettings,
  DEFAULT_ROLL_NUMBER_SETTINGS,
  DEFAULT_SERIAL_NUMBER_SETTINGS,
  normalizeTimestampToIso,
} from '../services/storageService';
import { AcademyDataService } from '../services/academyDataService';
import { 
  AcademySettings, 
  TeacherAccount, 
  LanguageCode, 
  TabId, 
  AttendanceRequest,
  AttendanceScheduleSettings,
  SpecificDateOverride,
  AttendanceDayKey,
  WelcomeMessageSettings,
  Student,
  StudentPortalAccount,
  ZKTecoDeviceConfig,
  BatchRecord,
  RollNumberSettings,
  SerialNumberSettings
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { TeacherModal } from '../components/modals/TeacherModal';
import { StudentPortalAccessModal } from '../components/modals/StudentPortalAccessModal';
import { ClearAllStudentsButton } from '../components/ClearAllStudentsButton';
import { TeacherWelcomeMarquee } from '../components/common/TeacherWelcomeMarquee';

export const SettingsPage: React.FC = () => {
  const { user, triggerSystemLoading } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { language, setLanguage, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'teachers' | 'students' | 'schedule' | 'rollnumbers' | 'approvals' | 'recovery' | 'profile' | 'language' | 'backup'>('teachers');

  const [settings, setSettings] = useState<AcademySettings>(() => StorageService.getSettings());
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => StorageService.getTeacherAccounts());
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [batches, setBatches] = useState<BatchRecord[]>(() => AcademyDataService.getBatches());
  const [rollConfig, setRollConfig] = useState<RollNumberSettings>(() => StorageService.getRollNumberSettings());
  const [isSavingRollConfig, setIsSavingRollConfig] = useState(false);
  const [serialConfig, setSerialConfig] = useState<SerialNumberSettings>(() => StorageService.getSerialNumberSettings());
  const [isSavingSerialConfig, setIsSavingSerialConfig] = useState(false);
  const [isRunningMigration, setIsRunningMigration] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [resetAcademicYear, setResetAcademicYear] = useState<string>(() => String(new Date().getFullYear()));
  const [resetStartingSerial, setResetStartingSerial] = useState<number>(1);
  const [studentPortalAccounts, setStudentPortalAccounts] = useState<StudentPortalAccount[]>(() =>
    StorageService.getStudentPortalAccounts()
  );
  const [studentPortalSearch, setStudentPortalSearch] = useState('');
  const [isStudentPortalModalOpen, setIsStudentPortalModalOpen] = useState(false);
  const [editingStudentPortal, setEditingStudentPortal] = useState<StudentPortalAccount | null>(null);
  const [preselectedPortalStudent, setPreselectedPortalStudent] = useState<Student | null>(null);
  const [grantingStudentId, setGrantingStudentId] = useState<string | null>(null);
  const [deviceConfig, setDeviceConfig] = useState<ZKTecoDeviceConfig>(() => StorageService.getDeviceConfig());
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceRequest[]>(() => StorageService.getAttendanceRequests());
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Attendance Schedule & Welcome Message State
  const [attendanceSchedule, setAttendanceSchedule] = useState<AttendanceScheduleSettings>(() => 
    StorageService.getAttendanceScheduleSettings()
  );
  const [welcomeMessage, setWelcomeMessage] = useState<WelcomeMessageSettings>(() => 
    StorageService.getWelcomeMessageSettings()
  );
  const [selectedDateOverride, setSelectedDateOverride] = useState<string>(() => 
    new Date().toISOString().split('T')[0]
  );
  const [selectedOverrideTargetClass, setSelectedOverrideTargetClass] = useState<string>('ALL');
  const [selectedOverrideAction, setSelectedOverrideAction] = useState<'holiday' | 'enable'>('holiday');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isSavingMessage, setIsSavingMessage] = useState(false);

  const toggleSelectAllRequests = () => {
    if (selectedRequestIds.length === attendanceRequests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(attendanceRequests.map(r => r.id));
    }
  };

  const toggleSelectRequest = (id: string) => {
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedRequests = () => {
    if (selectedRequestIds.length === 0) return;
    if (window.confirm(`Are you sure you want to remove the ${selectedRequestIds.length} selected attendance approval requests?`)) {
      const count = selectedRequestIds.length;
      StorageService.deleteAttendanceRequestsBatch(selectedRequestIds, user?.name || 'Admin', user?.role || 'admin');
      setSelectedRequestIds([]);
      showToast(`Removed ${count} attendance change approval requests.`);
    }
  };

  // Live Firestore subscriptions
  useEffect(() => {
    const unsubTeachers = StorageService.subscribeTeachers((liveTeachers) => {
      setTeachers(liveTeachers);
    });
    const unsubStudents = StorageService.subscribeStudents((liveStudents) => {
      setStudents(liveStudents);
    });
    const unsubStudentPortals = StorageService.subscribeStudentPortalAccounts((livePortals) => {
      setStudentPortalAccounts(livePortals);
    });
    const unsubSettings = StorageService.subscribeSettings((liveSettings) => {
      setSettings(liveSettings);
    });
    const unsubRequests = StorageService.subscribeAttendanceRequests((liveRequests) => {
      setAttendanceRequests(liveRequests);
    });
    const unsubSchedule = StorageService.subscribeAttendanceScheduleSettings((liveSchedule) => {
      setAttendanceSchedule(liveSchedule);
    });
    const unsubWelcome = StorageService.subscribeWelcomeMessageSettings((liveWelcome) => {
      setWelcomeMessage(liveWelcome);
    });
    const unsubDevice = StorageService.subscribeDeviceConfig((liveDevice) => {
      setDeviceConfig(liveDevice);
    });
    const unsubBatches = AcademyDataService.subscribeBatches((liveBatches) => {
      setBatches(liveBatches);
    });
    const unsubRoll = StorageService.subscribeRollNumberSettings((liveRollCfg) => {
      setRollConfig(liveRollCfg);
    });
    const unsubSerial = StorageService.subscribeSerialNumberSettings((liveSerialCfg) => {
      setSerialConfig(liveSerialCfg);
    });

    return () => {
      unsubTeachers();
      unsubStudents();
      unsubStudentPortals();
      unsubSettings();
      unsubRequests();
      unsubSchedule();
      unsubWelcome();
      unsubDevice();
      unsubBatches();
      unsubRoll();
      unsubSerial();
    };
  }, []);

  // Preset welcome message templates as requested
  const WELCOME_TEMPLATES = [
    "Welcome back! Don't forget to mark attendance.",
    "Good morning! Have a great class today.",
    "Reminder: Please submit weekly test results.",
    "Notice: Today is EPS-TOPIK Intensive Mock Examination Day.",
    "Reminder: Please review pending student attendance approval requests.",
    "Faculty Notice: Monthly academic review meeting will be held this Friday."
  ];

  const formatBadgeDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  };

  const handleToggleDay = async (day: AttendanceDayKey) => {
    const updated = {
      ...attendanceSchedule,
      [day]: !attendanceSchedule[day]
    };
    setAttendanceSchedule(updated);
    await StorageService.saveAttendanceScheduleSettings(updated, user?.name || 'Admin');
    showToast(`${day.charAt(0).toUpperCase() + day.slice(1)} attendance set to ${updated[day] ? 'ON' : 'OFF (Day Off)'}`);
  };

  const handleApplyPreset = async (preset: 'standard' | 'fiveDay' | 'allOn' | 'allOff') => {
    let updated: AttendanceScheduleSettings = { ...attendanceSchedule };
    if (preset === 'standard') {
      updated = { ...updated, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false };
      showToast('Applied Standard Preset: Mon-Sat ON, Sunday OFF');
    } else if (preset === 'fiveDay') {
      updated = { ...updated, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false };
      showToast('Applied 5-Day Workweek Preset: Mon-Fri ON, Sat-Sun OFF');
    } else if (preset === 'allOn') {
      updated = { ...updated, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true };
      showToast('All 7 days set to Attendance ON');
    } else if (preset === 'allOff') {
      updated = { ...updated, monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false };
      showToast('All days set to OFF (Attendance disabled system-wide)');
    }
    setAttendanceSchedule(updated);
    await StorageService.saveAttendanceScheduleSettings(updated, user?.name || 'Admin');
  };

  const handleAddDateOverride = async () => {
    if (!selectedDateOverride) return;
    const isHoliday = selectedOverrideAction === 'holiday';
    const override: SpecificDateOverride = {
      id: `${selectedDateOverride}_${selectedOverrideTargetClass}`,
      date: selectedDateOverride,
      targetClass: selectedOverrideTargetClass,
      action: selectedOverrideAction,
      isAllowed: !isHoliday,
      createdAt: new Date().toISOString(),
      createdBy: user?.name || 'Admin'
    };

    try {
      await StorageService.addSpecificDateOverride(override, user?.name || 'Admin');
      const classLabel = selectedOverrideTargetClass === 'ALL' ? 'ALL Classes' : selectedOverrideTargetClass;
      showToast(`Specific date override saved: ${formatBadgeDate(selectedDateOverride)} - ${classLabel} - ${isHoliday ? 'OFF (Holiday)' : 'ON (Attendance Enabled)'}`);
    } catch (err) {
      showToast('Failed to save date override');
    }
  };

  const handleRemoveDateOverride = async (overrideIdOrDate: string, label?: string) => {
    try {
      await StorageService.removeSpecificDateOverride(overrideIdOrDate, user?.name || 'Admin');
      showToast(`Removed override: ${label || overrideIdOrDate}`);
    } catch (err) {
      showToast('Failed to remove date override');
    }
  };

  const handleSaveAttendanceSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      await StorageService.saveAttendanceScheduleSettings(attendanceSchedule, user?.name || 'Admin');
      showToast('Attendance Schedule saved to Firebase! Stored in attendance_settings node.');
    } catch (e) {
      showToast('Failed to save attendance schedule');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleSaveWelcomeMessage = async () => {
    setIsSavingMessage(true);
    try {
      await StorageService.saveWelcomeMessageSettings(welcomeMessage, user?.name || 'Admin');
      showToast('Welcome message saved to Firebase! Stored in welcome_message_settings node.');
    } catch (e) {
      showToast('Failed to save welcome message');
    } finally {
      setIsSavingMessage(false);
    }
  };

  // Teacher modal state
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherAccount | null>(null);

  const refreshTeachers = () => {
    setTeachers(StorageService.getTeacherAccounts());
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.updateSettings(settings, user?.name || 'Admin', user?.role || 'admin');
    showToast('Institutional profile updated successfully!');
  };

  const handleSaveTeacher = (teacher: TeacherAccount) => {
    const existing = teachers.find(t => t.id === teacher.id);
    if (existing) {
      StorageService.updateTeacherAccount(teacher, user?.name || 'Admin', user?.role || 'admin');
      showToast(`Updated credentials & permissions for ${teacher.name}`);
    } else {
      StorageService.addTeacherAccount(teacher, user?.name || 'Admin', user?.role || 'admin');
      showToast(`Created new teacher login for ${teacher.name}`);
    }
    refreshTeachers();
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (window.confirm(`Revoke access and delete account for ${name}?`)) {
      StorageService.deleteTeacherAccount(id, user?.name || 'Admin', user?.role || 'admin');
      refreshTeachers();
      showToast(`Access revoked for ${name}`);
    }
  };

  const handleToggleTeacherStatus = (teacher: TeacherAccount) => {
    const updatedStatus = teacher.status === 'Active' ? 'Suspended' : 'Active';
    StorageService.updateTeacherAccount({
      ...teacher,
      status: updatedStatus,
      failedAttempts: updatedStatus === 'Active' ? 0 : teacher.failedAttempts
    }, user?.name || 'Admin', user?.role || 'admin');
    refreshTeachers();
    showToast(`Teacher status set to ${updatedStatus}`);
  };

  const handleUnblockTeacher = (teacher: TeacherAccount) => {
    StorageService.unblockTeacherAccount(teacher.id, user?.name || 'Admin', user?.role || 'admin');
    refreshTeachers();
    showToast(`Restored & unblocked account for ${teacher.name}`);
  };

  const handleTogglePassword = (id: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSaveStudentPortal = async (
    accountData: Omit<StudentPortalAccount, 'id'> | StudentPortalAccount,
    selectedStudent?: Student
  ) => {
    if ('id' in accountData && accountData.id && accountData.uid) {
      StorageService.updateStudentPortalAccount(
        accountData,
        user?.name || 'Admin',
        user?.role || 'admin'
      );
      showToast(`Updated app credentials for ${accountData.studentName}`);
    } else if (selectedStudent) {
      const result = await StorageService.grantStudentAppAccess(
        {
          student: selectedStudent,
          email: accountData.email || accountData.username,
          password: accountData.password,
          enabled: accountData.enabled,
        },
        user?.name || 'Admin',
        user?.role || 'admin'
      );
      showToast(`App Access granted for ${selectedStudent.fullName} (${result.email})`);
    } else {
      StorageService.addStudentPortalAccount(
        accountData,
        user?.name || 'Admin',
        user?.role || 'admin'
      );
      showToast(`Granted student portal access for ${accountData.studentName}`);
    }
    setStudentPortalAccounts(StorageService.getStudentPortalAccounts());
  };

  const handleQuickGrantAppAccess = async (student: Student) => {
    setGrantingStudentId(student.id);
    try {
      const result = await StorageService.grantStudentAppAccess(
        { student },
        user?.name || 'Admin',
        user?.role || 'admin'
      );
      setStudentPortalAccounts(StorageService.getStudentPortalAccounts());
      showToast(`App Access Granted! Login: ${result.email}`);
    } catch (err: any) {
      showToast(err?.message || `Failed to grant app access for ${student.fullName}`);
    } finally {
      setGrantingStudentId(null);
    }
  };

  const handleToggleGlobalInOutMode = async () => {
    const nextVal = !deviceConfig.inOutModeEnabled;
    const updated = await StorageService.updateDeviceConfig({ inOutModeEnabled: nextVal });
    setDeviceConfig(updated);
    showToast(
      `Global IN/OUT Mode ${nextVal ? 'ENABLED' : 'DISABLED'} & synced to Firebase settings.`
    );
  };

  const handleToggleStudentPortalAccess = (account: StudentPortalAccount) => {
    const updated = StorageService.toggleStudentPortalAccess(
      account.id,
      user?.name || 'Admin',
      user?.role || 'admin'
    );
    if (updated) {
      setStudentPortalAccounts(StorageService.getStudentPortalAccounts());
      showToast(
        `${account.studentName} portal access ${updated.enabled ? 'Enabled' : 'Disabled'}`
      );
    }
  };

  const handleDeleteStudentPortal = (account: StudentPortalAccount) => {
    if (
      window.confirm(
        `Revoke student portal login credentials for ${account.studentName} (${account.rollNumber})?`
      )
    ) {
      StorageService.deleteStudentPortalAccount(
        account.id,
        user?.name || 'Admin',
        user?.role || 'admin'
      );
      setStudentPortalAccounts(StorageService.getStudentPortalAccounts());
      showToast(`Portal access revoked for ${account.studentName}`);
    }
  };

  const handleCopyCredentials = (account: StudentPortalAccount) => {
    const loginEmail = account.email || account.username;
    const text = `OK Korean Student Mobile App & Portal\nRoll No: ${account.rollNumber}\nEmail: ${loginEmail}\nPassword: ${account.password}`;
    navigator.clipboard
      ?.writeText(text)
      .then(() => showToast(`Copied login details for ${account.studentName}`))
      .catch(() => {});
  };

  const portalStudentIds = new Set(studentPortalAccounts.map((a) => a.studentId));
  const studentsWithoutAppAccess = students.filter(
    (s) =>
      s.status !== 'Inactive' &&
      s.status !== 'Stuck / Inactive' &&
      !portalStudentIds.has(s.id) &&
      (!studentPortalSearch.trim() ||
        s.fullName.toLowerCase().includes(studentPortalSearch.trim().toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(studentPortalSearch.trim().toLowerCase()))
  );

  const filteredStudentPortalAccounts = studentPortalAccounts.filter((acc) => {
    const q = studentPortalSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      acc.studentName.toLowerCase().includes(q) ||
      acc.rollNumber.toLowerCase().includes(q) ||
      acc.username.toLowerCase().includes(q) ||
      (acc.email || '').toLowerCase().includes(q) ||
      acc.assignedBatch.toLowerCase().includes(q)
    );
  });

  const handleApproveRequest = async (requestId: string) => {
    if (!isAdmin) {
      showToast('Unauthorized: Only Administrators can approve attendance changes.');
      return;
    }
    setProcessingRequestId(requestId);
    try {
      const ok = await StorageService.approveAttendanceRequest(
        requestId,
        user?.name || 'Admin',
        user?.teacherId || user?.username || 'admin',
        user?.role || 'admin'
      );
      if (ok) {
        showToast('Attendance change approved and synced to Firebase!');
      } else {
        showToast('Request was already processed or could not be found.');
      }
    } catch (err: any) {
      console.error('Approval error:', err);
      showToast(`Firebase approval failed: ${err?.message || 'Permission or network error'}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!isAdmin) {
      showToast('Unauthorized: Only Administrators can reject attendance changes.');
      return;
    }
    setProcessingRequestId(requestId);
    try {
      const ok = await StorageService.rejectAttendanceRequest(
        requestId,
        user?.name || 'Admin',
        user?.teacherId || user?.username || 'admin',
        user?.role || 'admin'
      );
      if (ok) {
        showToast('Attendance change request rejected. Original status preserved.');
      } else {
        showToast('Request was already processed or could not be found.');
      }
    } catch (err: any) {
      console.error('Rejection error:', err);
      showToast(`Firebase rejection failed: ${err?.message || 'Permission or network error'}`);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const restrictedTeachers = teachers.filter(
    t => t.status === 'Suspended' || (t.failedAttempts !== undefined && t.failedAttempts > 0)
  );

  const pendingApprovalsCount = attendanceRequests.filter(r => String(r.status || '').toLowerCase() === 'pending').length;

  const handleResetDemo = () => {
    if (window.confirm('Reset all records (students, attendance, tests, PKR fees, teachers) back to sample demo data?')) {
      StorageService.resetToDemoData();
      setSettings(StorageService.getSettings());
      refreshTeachers();
      showToast('Database reset to initial demo data in PKR.');
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '2.0-PKR',
      exportedAt: new Date().toISOString(),
      settings: StorageService.getSettings(),
      teachers: StorageService.getTeacherAccounts(),
      students: StorageService.getStudents(),
      attendance: StorageService.getAttendance(),
      tests: StorageService.getTests(),
      fees: StorageService.getFees(),
      logs: StorageService.getActivityLogs(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OkKorean_PKR_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON Backup downloaded.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const languageOptions: { code: LanguageCode; name: string; native: string; flag: string; desc: string }[] = [
    { code: 'en', name: 'English', native: 'English', flag: '🇬🇧', desc: 'Standard international academic interface' },
    { code: 'kr', name: 'Korean', native: '한국어', flag: '🇰🇷', desc: '대한민국 표준 한국어 지원 인터페이스' },
    { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇵🇰', desc: 'پاکستان میں اساتذہ اور عملے کے لیے مکمل اردو انٹرفیس' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <span>System Settings & Governance</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage teacher accounts and permissions, PKR currency parameters, language localization, and backups.
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('teachers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'teachers'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Faculty & Teacher Access</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{teachers.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'students'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-cyan-400" />
          <span>Student Portal Access</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{studentPortalAccounts.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'schedule'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-400" />
          <span>Attendance Schedule & Teacher Message</span>
          {!attendanceSchedule.sunday && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
              Sun OFF
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('approvals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
            activeSubTab === 'approvals'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <FileCheck2 className="w-4 h-4 text-amber-400" />
          <span>Pending Approvals</span>
          {pendingApprovalsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-pulse">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('recovery')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'recovery'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Teacher Account Recovery</span>
          {restrictedTeachers.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/50 text-[10px]">
              {restrictedTeachers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('language')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'language'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Languages className="w-4 h-4" />
          <span>Language Settings</span>
        </button>

        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Academy Profile & Tuition</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rollnumbers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'rollnumbers'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Hash className="w-4 h-4 text-cyan-400" />
          <span>Student ID &amp; Numbering</span>
        </button>

        <button
          onClick={() => setActiveSubTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'backup'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Data Backup & Reset</span>
        </button>
      </div>

      {/* Tab 1: Teacher Access Management */}
      {activeSubTab === 'teachers' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Teacher Accounts & Granular Permissions</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Generate usernames and passwords for teachers and select exactly which menus they are allowed to access.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingTeacher(null);
                  setIsTeacherModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Teacher Account</span>
              </button>
            </div>

            {/* Restricted / Blocked Accounts Security Panel */}
            {restrictedTeachers.length > 0 && (
              <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.2)] backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5 pb-3 border-b border-rose-500/30">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300">
                      <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white flex items-center gap-2">
                        <span>Restricted Faculty Accounts</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/50 text-[10px] font-bold">
                          {restrictedTeachers.length} Account{restrictedTeachers.length > 1 ? 's' : ''} Locked
                        </span>
                      </h4>
                      <p className="text-xs text-rose-300/80 mt-0.5">
                        These accounts were locked due to 3 consecutive failed password attempts. Click below to restore immediate login access.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {restrictedTeachers.map((rt) => (
                    <div key={rt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-black/60 border border-rose-500/30">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{rt.name}</span>
                          <span className="font-mono text-xs text-rose-300">@{rt.username}</span>
                          <span className="px-2 py-0.5 rounded-md bg-rose-900/60 text-rose-200 text-[10px] border border-rose-700/60 font-mono">
                            {rt.failedAttempts || 3}/3 Failed Attempts
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Assigned: {rt.assignedBatch ? rt.assignedBatch.split(' (')[0] : 'All Batches'} · Status: Restricted by Security Protocol
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUnblockTeacher(rt)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.35)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all cursor-pointer self-start sm:self-auto shrink-0"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unblock / Restore Account</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teachers Table */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Faculty Member</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Password</th>
                    <th className="py-3 px-4">Batch Assigned</th>
                    <th className="py-3 px-4">Permitted Menus</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{teacher.name}</div>
                        {(teacher.email || teacher.phone) ? (
                          <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono">
                            {teacher.email}
                            {teacher.phone && <span className="text-slate-400 ml-1.5 font-sans">({teacher.phone})</span>}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        @{teacher.username}
                      </td>

                      {/* Password column: masked with eye toggle */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80">
                          <span className="font-semibold text-xs tracking-widest text-slate-800 dark:text-slate-200">
                            {showPasswordMap[teacher.id] ? teacher.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleTogglePassword(teacher.id)}
                            className="text-slate-400 hover:text-indigo-400 p-0.5 rounded transition-colors cursor-pointer"
                            title={showPasswordMap[teacher.id] ? "Hide password" : "Show password"}
                          >
                            {showPasswordMap[teacher.id] ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {teacher.assignedBatch ? teacher.assignedBatch.split(' (')[0] : 'All Batches'}
                        </div>
                        {teacher.assignedClasses && teacher.assignedClasses.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 max-w-[220px]">
                            {teacher.assignedClasses.map((cls) => (
                              <span 
                                key={cls} 
                                className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 font-medium whitespace-nowrap"
                              >
                                {cls}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Permitted Menus grouped into neat pill badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {teacher.allowedMenus?.map((menu) => (
                            <span 
                              key={menu} 
                              className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-[10px] font-bold capitalize shadow-xs"
                            >
                              {menu}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleTeacherStatus(teacher)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                            teacher.status === 'Active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200'
                          }`}
                        >
                          {teacher.status}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {teacher.status === 'Suspended' && (
                            <button
                              onClick={() => handleUnblockTeacher(teacher)}
                              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/30 transition-colors cursor-pointer"
                              title="Unblock / Restore Account"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingTeacher(teacher);
                              setIsTeacherModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Permissions"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Revoke Access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1b: Student Portal Access Management */}
      {activeSubTab === 'students' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-cyan-500" />
                  <span>Student Portal & Mobile App Access</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Create Firebase Auth accounts ({'${rollNo}@okkorean.com'}) and store email, password & UID in the students Firestore collection.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingStudentPortal(null);
                  setPreselectedPortalStudent(null);
                  setIsStudentPortalModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Grant App Access</span>
              </button>
            </div>

            {/* Global IN/OUT Mode Sync Strip for Mobile App */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${deviceConfig.inOutModeEnabled ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Global IN/OUT Mode (Mobile App & ZKTeco Sync)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Synced in Firestore <code className="font-mono text-cyan-600 dark:text-cyan-400">settings/zkteco_device</code> & <code className="font-mono text-cyan-600 dark:text-cyan-400">settings/global</code> ({deviceConfig.inOutModeEnabled ? 'ON — Dual IN/OUT Punch Mode' : 'OFF — Standard Single Punch Mode'})
                  </span>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={Boolean(deviceConfig.inOutModeEnabled)}
                onClick={handleToggleGlobalInOutMode}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors self-start sm:self-auto ${
                  deviceConfig.inOutModeEnabled
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/40'
                    : 'bg-slate-200/70 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                }`}
              >
                <span>{deviceConfig.inOutModeEnabled ? 'IN/OUT: ON' : 'IN/OUT: OFF'}</span>
                <span
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    deviceConfig.inOutModeEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-400 dark:bg-slate-600 justify-start'
                  }`}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-xs" />
                </span>
              </button>
            </div>

            {/* Search Filter */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={studentPortalSearch}
                  onChange={(e) => setStudentPortalSearch(e.target.value)}
                  placeholder="Search by student name, roll no, email..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Enabled: <strong className="text-emerald-500">{studentPortalAccounts.filter(a => a.enabled).length}</strong> ·
                Disabled: <strong className="text-rose-500 ml-1">{studentPortalAccounts.filter(a => !a.enabled).length}</strong>
              </div>
            </div>

            {/* Student Portal Table */}
            <div className="mt-4 overflow-x-auto">
              {filteredStudentPortalAccounts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-40 text-cyan-400" />
                  <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                    {studentPortalAccounts.length === 0
                      ? 'No Student App Accounts Granted Yet'
                      : 'No matching student app accounts found'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &ldquo;+ Grant App Access&rdquo; or use the list below to provision Firebase Auth login credentials.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Roll No</th>
                      <th className="py-3 px-4">Username/ID</th>
                      <th className="py-3 px-4">Password</th>
                      <th className="py-3 px-4">Assigned Batch</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudentPortalAccounts.map((acc) => {
                      const displayEmail = acc.email || acc.username;
                      return (
                        <tr key={acc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{acc.studentName}</div>
                            {(acc.koreanName || acc.studentClass) && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {acc.koreanName ? <span className="font-korean text-cyan-500 mr-1.5">{acc.koreanName}</span> : null}
                                {acc.studentClass ? <span>{acc.studentClass} · {acc.timing || 'Morning'}</span> : null}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-cyan-300">
                              {acc.rollNumber}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              {displayEmail}
                            </div>
                            {acc.uid && (
                              <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                                UID: {acc.uid.slice(0, 12)}...
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                            <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80">
                              <span className="font-semibold text-xs tracking-widest text-slate-800 dark:text-slate-200">
                                {showPasswordMap[acc.id] ? acc.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTogglePassword(acc.id)}
                                className="text-slate-400 hover:text-indigo-400 p-0.5 rounded transition-colors cursor-pointer"
                                title={showPasswordMap[acc.id] ? 'Hide password' : 'Show password'}
                              >
                                {showPasswordMap[acc.id] ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {acc.assignedBatch ? acc.assignedBatch.split(' (')[0] : 'Unassigned'}
                            </div>
                            {acc.assignedBatch && acc.assignedBatch.includes('(') && (
                              <div className="text-[10px] text-slate-400">
                                ({acc.assignedBatch.split('(')[1]}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                acc.enabled
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/60'
                                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/60'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${acc.enabled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {acc.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Enable / Disable Toggle Switch */}
                              <button
                                type="button"
                                role="switch"
                                aria-checked={acc.enabled}
                                onClick={() => handleToggleStudentPortalAccess(acc)}
                                title={acc.enabled ? 'Disable Student Portal Access' : 'Enable Student Portal Access'}
                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 cursor-pointer shrink-0 ${
                                  acc.enabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                                }`}
                              >
                                <span className="bg-white w-4 h-4 rounded-full shadow-sm" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyCredentials(acc)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Copy Login Credentials"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStudentPortal(acc);
                                  setPreselectedPortalStudent(null);
                                  setIsStudentPortalModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Edit Credentials"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteStudentPortal(acc)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Revoke Access"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Students Without App Access Quick Provisioning */}
            {studentsWithoutAppAccess.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Students Without Mobile App Access ({studentsWithoutAppAccess.length})
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Click &ldquo;Grant App Access&rdquo; to auto-generate {'${rollNo}@okkorean.com'}, create Firebase Auth user, and store credentials.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {studentsWithoutAppAccess.map((s) => {
                    const isGranting = grantingStudentId === s.id;
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {s.fullName}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 font-mono text-[10px] font-bold text-slate-700 dark:text-cyan-300">
                              {s.rollNumber}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {s.batch?.split(' (')[0]} · {s.studentClass || 'Class 1'}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isGranting}
                          onClick={() => handleQuickGrantAppAccess(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer shrink-0"
                        >
                          {isGranting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Provisioning...</span>
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Grant App Access</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Pending Approvals */}
      {activeSubTab === 'approvals' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Pending Attendance Change Approvals</span>
                    {pendingApprovalsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                        {pendingApprovalsCount} Action{pendingApprovalsCount > 1 ? 's' : ''} Needed
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Teachers cannot alter already-marked student attendance without Admin validation. Review and grant or deny requests here.
                  </p>
                </div>
              </div>

              {/* Action buttons at top */}
              {selectedRequestIds.length > 0 && (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleDeleteSelectedRequests}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer border border-rose-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedRequestIds.length})</span>
                  </button>
                </div>
              )}
            </div>

            {attendanceRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400/60" />
                <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No Attendance Requests Found</p>
                <p className="text-xs text-slate-500 mt-1">All attendance modifications are up to date and verified.</p>
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={attendanceRequests.length > 0 && selectedRequestIds.length === attendanceRequests.length}
                          onChange={toggleSelectAllRequests}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="Select All"
                        />
                      </th>
                      <th className="py-3.5 px-4">Faculty Teacher &amp; Submitted</th>
                      <th className="py-3.5 px-4">Student &amp; Roll No</th>
                      <th className="py-3.5 px-4">Batch / Class</th>
                      <th className="py-3.5 px-4">Attendance Date</th>
                      <th className="py-3.5 px-4">Requested Change &amp; Reason</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {attendanceRequests.map((req) => {
                      const isPending = String(req.status || '').toLowerCase() === 'pending';
                      const isSelected = selectedRequestIds.includes(req.id);
                      const normalizedSubmittedIso = normalizeTimestampToIso(req.createdAt || req.timestamp);
                      const submittedAtStr = normalizedSubmittedIso
                        ? new Date(normalizedSubmittedIso).toLocaleString()
                        : '—';
                      return (
                        <tr key={req.id} className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}>
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRequest(req.id)}
                              className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                            <div>{req.teacherName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {submittedAtStr}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{req.studentName}</div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {req.studentSerial && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold border border-slate-700">
                                  {req.studentSerial}
                                </span>
                              )}
                              <span className="text-[11px] text-indigo-500 font-mono font-semibold">{req.studentRoll}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            <div className="font-bold text-slate-800 dark:text-slate-100">
                              {req.batch || 'Unassigned'}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {req.studentClass || 'Class 1'} · {req.timing || 'Morning'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {req.date}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                req.previousStatus === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                req.previousStatus === 'Absent' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                                'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}>
                                {req.previousStatus}
                              </span>
                              <span className="text-slate-400 font-bold">➔</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                req.requestedStatus === 'Present' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs' :
                                req.requestedStatus === 'Absent' ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-xs' :
                                'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                              }`}>
                                {req.requestedStatus}
                              </span>
                            </div>
                            {req.reason && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                                <span className="font-semibold text-slate-400">Reason:</span> {req.reason}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isPending ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' :
                              req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                              'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}>
                              {isPending ? <Clock className="w-3 h-3" /> : req.status === 'Approved' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {req.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isPending && isAdmin ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={processingRequestId === req.id}
                                  onClick={() => handleApproveRequest(req.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                                >
                                  {processingRequestId === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={processingRequestId === req.id}
                                  onClick={() => handleRejectRequest(req.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono">
                                Reviewed by {req.reviewedBy || 'Admin'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Dedicated Teacher Account Recovery */}
      {activeSubTab === 'recovery' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Teacher Account Recovery & Access Restoration</span>
                    {restrictedTeachers.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[10px]">
                        {restrictedTeachers.length} Locked
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage restricted faculty accounts. Click 'Revoke Restriction' to reset failed password attempts, unblock status to 'Active', and restore portal access immediately.
                  </p>
                </div>
              </div>
            </div>

            {restrictedTeachers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                <p className="font-bold text-sm text-slate-800 dark:text-white">All Faculty Accounts Active & Secure</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  No teacher accounts are currently locked or suspended due to security protocols.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {restrictedTeachers.map((rt) => (
                  <div 
                    key={rt.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 backdrop-blur-md"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{rt.name}</span>
                        <span className="font-mono text-xs text-indigo-400 font-semibold">@{rt.username}</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] border border-rose-500/40 font-mono font-bold">
                          {rt.failedAttempts || 3}/3 Failed Password Attempts
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold">
                          Status: {rt.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Contact: {rt.phone || rt.email || 'N/A'} · Batch: {rt.assignedBatch ? rt.assignedBatch.split(' (')[0] : 'All Batches'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnblockTeacher(rt)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Revoke Restriction & Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Language Selection Settings */}
      {activeSubTab === 'language' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Language & Interface Localization</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose your preferred system language. All menus, navigation labels, and headers will adapt instantly.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {languageOptions.map((opt) => {
              const isSelected = language === opt.code;
              return (
                <div
                  key={opt.code}
                  onClick={() => {
                    setLanguage(opt.code);
                    showToast(`Language switched to ${opt.name}`);
                  }}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{opt.flag}</span>
                    {isSelected && (
                      <span className="p-1 rounded-full bg-indigo-600 text-white">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">{opt.name}</h4>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">{opt.native}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{opt.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Active Language:</strong> {language === 'en' ? 'English' : language === 'kr' ? '한국어 (Korean)' : 'اردو (Urdu)'} · <strong>Theme:</strong> Default Midnight Dark. All preferences are saved in your browser.
          </div>
        </div>
      )}

      {/* Tab 3: Institutional Profile & Currency */}
      {activeSubTab === 'profile' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Academy Information & Pakistani Currency (PKR)</h3>
              <p className="text-xs text-slate-400">Institutional metadata used across PDF transcripts, vouchers, and parent communications</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academy Name (English)
              </label>
              <input
                type="text"
                required
                value={settings.academyName}
                onChange={(e) => setSettings({ ...settings, academyName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academy Name (Korean / 한국어 명칭)
              </label>
              <input
                type="text"
                required
                value={settings.academyKoreanName}
                onChange={(e) => setSettings({ ...settings, academyKoreanName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-korean focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fee Currency Standard
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  currency: e.target.value,
                  currencySymbol: e.target.value === 'PKR' ? 'Rs.' : e.target.value === 'KRW' ? '₩' : '$'
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer shadow-xs"
              >
                <option value="PKR" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">PKR - Pakistani Rupees (Rs.)</option>
                <option value="KRW" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">KRW - South Korean Won (₩)</option>
                <option value="USD" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">USD - US Dollar ($)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registration / Accreditation No.
              </label>
              <input
                type="text"
                value={settings.registrationNumber}
                onChange={(e) => setSettings({ ...settings, registrationNumber: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Principal / Director Name
              </label>
              <input
                type="text"
                value={settings.principalName}
                onChange={(e) => setSettings({ ...settings, principalName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Institutional Contact Numbers
              </label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Campus Location / Address
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Institutional Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab: Student ID & Numbering Configuration (Strictly Independent) */}
      {activeSubTab === 'rollnumbers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Student ID &amp; Numbering Configuration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure independent Roll Number and Serial Number sequences, formatting, annual cycles, and safe student migration.
              </p>
            </div>
          </div>

          {/* A. ROLL NUMBER SETTINGS CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    A. Roll Number Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Academic institutional student ID (e.g. OK-2026-001). Independent from Serial Number counter.
                  </p>
                </div>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 dark:text-slate-400 mr-2">Live Roll Preview:</span>
                <span className="font-mono font-black text-cyan-600 dark:text-cyan-300">
                  {formatRollNumberFromSettings(Math.max(rollConfig.nextSerialNumber || 1, rollConfig.startingSerial || 1), rollConfig)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Roll Prefix
                </label>
                <input
                  type="text"
                  value={rollConfig.prefix}
                  onChange={(e) => setRollConfig({ ...rollConfig, prefix: e.target.value.toUpperCase().trimStart() })}
                  placeholder="OK"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Year (Optional)
                </label>
                <input
                  type="text"
                  value={rollConfig.academicYear}
                  onChange={(e) => setRollConfig({ ...rollConfig, academicYear: e.target.value.trim() })}
                  placeholder={String(new Date().getFullYear())}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Year Format
                </label>
                <select
                  value={rollConfig.yearFormat || 'YYYY'}
                  onChange={(e) => setRollConfig({ ...rollConfig, yearFormat: e.target.value as 'YYYY' | 'YY' })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono cursor-pointer"
                >
                  <option value="YYYY">4-Digit Year (2026)</option>
                  <option value="YY">2-Digit Year (26)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Format Separator
                </label>
                <select
                  value={rollConfig.separator}
                  onChange={(e) => setRollConfig({ ...rollConfig, separator: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono cursor-pointer"
                >
                  <option value="-">Hyphen (-)</option>
                  <option value="/">Slash (/)</option>
                  <option value="_">Underscore (_)</option>
                  <option value="">None (No Separator)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Starting Roll Sequence
                </label>
                <input
                  type="number"
                  min={1}
                  value={rollConfig.startingSerial}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value) || 1);
                    setRollConfig({
                      ...rollConfig,
                      startingSerial: val,
                      nextSerialNumber: Math.max(rollConfig.nextSerialNumber || 1, val),
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Next Roll Counter
                </label>
                <input
                  type="number"
                  min={1}
                  value={rollConfig.nextSerialNumber}
                  onChange={(e) =>
                    setRollConfig({
                      ...rollConfig,
                      nextSerialNumber: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Roll Digits Length
                </label>
                <select
                  value={rollConfig.digits}
                  onChange={(e) => setRollConfig({ ...rollConfig, digits: Number(e.target.value) || 3 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono cursor-pointer"
                >
                  <option value={2}>2 Digits (01, 02...)</option>
                  <option value={3}>3 Digits (001, 002...)</option>
                  <option value={4}>4 Digits (0001, 0002...)</option>
                  <option value={5}>5 Digits (00001, 00002...)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Auto-Generate Roll Numbers
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Automatically generate sequential Roll Numbers during enrollment.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={rollConfig.autoGenerate}
                  onChange={(e) => setRollConfig({ ...rollConfig, autoGenerate: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </label>

              <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Allow Manual Roll Override
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Allows Admins to customize Roll Numbers while preventing duplicates.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={rollConfig.allowManualOverride}
                  onChange={(e) => setRollConfig({ ...rollConfig, allowManualOverride: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </label>

              <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Reset Roll Sequence Annually
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Track annual cycle resets independently of Serial Numbers.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(rollConfig.resetAnnually)}
                  onChange={(e) => setRollConfig({ ...rollConfig, resetAnnually: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </label>
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-800 dark:text-white block mb-1">
                  Upcoming Roll Number Sequence ({students.length} students enrolled)
                </span>
                <div className="flex flex-wrap items-center gap-2 font-mono font-bold text-cyan-600 dark:text-cyan-300">
                  {[0, 1, 2].map((offset) => (
                    <span
                      key={offset}
                      className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900 border border-cyan-500/30"
                    >
                      {formatRollNumberFromSettings(
                        Math.max(rollConfig.nextSerialNumber || 1, rollConfig.startingSerial || 1) + offset,
                        rollConfig
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Reset Roll Number format settings to defaults (OK-YYYY-001)? Existing student Roll Numbers will NOT be modified.')) return;
                    const resetCfg = await StorageService.resetRollNumberSettingsToDefault(user?.name || 'Admin');
                    setRollConfig(resetCfg);
                    showToast('Roll Number Settings reset to default format.');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>
                <button
                  type="button"
                  disabled={isSavingRollConfig}
                  onClick={async () => {
                    setIsSavingRollConfig(true);
                    try {
                      const saved = await StorageService.saveRollNumberSettings(rollConfig, user?.name || 'Admin');
                      setRollConfig(saved);
                      showToast('Roll Number configuration saved to Firebase.');
                    } finally {
                      setIsSavingRollConfig(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingRollConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Roll Settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* B. SERIAL NUMBER SETTINGS CARD (INDEPENDENT) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-emerald-500/25 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    B. Serial Number Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Independent permanent student sequence ID (e.g. SN-0001). Never shares a counter with Roll Numbers and never reuses deleted IDs.
                  </p>
                </div>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 dark:text-slate-400 mr-2">Live Serial Preview:</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-300">
                  {formatSerialNumberFromSettings(Math.max(serialConfig.nextSerialNumber || 1, serialConfig.startingSerial || 1), serialConfig)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Serial Prefix (e.g. SN or REG)
                </label>
                <input
                  type="text"
                  value={serialConfig.prefix}
                  onChange={(e) => setSerialConfig({ ...serialConfig, prefix: e.target.value.toUpperCase().trimStart() })}
                  placeholder="SN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Serial Separator
                </label>
                <select
                  value={serialConfig.separator}
                  onChange={(e) => setSerialConfig({ ...serialConfig, separator: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono cursor-pointer"
                >
                  <option value="-">Hyphen (-)</option>
                  <option value="/">Slash (/)</option>
                  <option value="_">Underscore (_)</option>
                  <option value="">None (SN0001)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Serial Digits Length
                </label>
                <select
                  value={serialConfig.digits}
                  onChange={(e) => setSerialConfig({ ...serialConfig, digits: Number(e.target.value) || 4 })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono cursor-pointer"
                >
                  <option value={3}>3 Digits (001, 002...)</option>
                  <option value={4}>4 Digits (0001, 0002...)</option>
                  <option value={5}>5 Digits (00001, 00002...)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Starting Serial Number
                </label>
                <input
                  type="number"
                  min={1}
                  value={serialConfig.startingSerial}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value) || 1);
                    setSerialConfig({
                      ...serialConfig,
                      startingSerial: val,
                      nextSerialNumber: Math.max(serialConfig.nextSerialNumber || 1, val),
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Next Serial Counter
                </label>
                <input
                  type="number"
                  min={1}
                  value={serialConfig.nextSerialNumber}
                  onChange={(e) =>
                    setSerialConfig({
                      ...serialConfig,
                      nextSerialNumber: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Auto-Generate Serial Numbers
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Automatically assign unique Serial Numbers on student admission.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={serialConfig.autoGenerate}
                  onChange={(e) => setSerialConfig({ ...serialConfig, autoGenerate: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </label>

              <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Allow Manual Serial Entry
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Allow Admin to manually edit Serial Numbers while enforcing uniqueness.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={serialConfig.allowManualOverride}
                  onChange={(e) => setSerialConfig({ ...serialConfig, allowManualOverride: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </label>

              <label className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Reset Serial Annually (Optional)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Disabled by default so Serial Numbers stay globally continuous.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(serialConfig.resetAnnually)}
                  onChange={(e) => setSerialConfig({ ...serialConfig, resetAnnually: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-emerald-600 cursor-pointer"
                />
              </label>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-800 dark:text-white block mb-1">
                  Upcoming Serial Number Sequence
                </span>
                <div className="flex flex-wrap items-center gap-2 font-mono font-bold text-emerald-600 dark:text-emerald-300">
                  {[0, 1, 2].map((offset) => (
                    <span
                      key={offset}
                      className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900 border border-emerald-500/30"
                    >
                      {formatSerialNumberFromSettings(
                        Math.max(serialConfig.nextSerialNumber || 1, serialConfig.startingSerial || 1) + offset,
                        serialConfig
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Reset Serial Number format settings to defaults (SN-0001)? Existing student Serial Numbers will NOT be modified.')) return;
                    const resetCfg = await StorageService.resetSerialNumberSettingsToDefault(user?.name || 'Admin');
                    setSerialConfig(resetCfg);
                    showToast('Serial Number Settings reset to default (SN-0001).');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>
                <button
                  type="button"
                  disabled={isSavingSerialConfig}
                  onClick={async () => {
                    setIsSavingSerialConfig(true);
                    try {
                      const saved = await StorageService.saveSerialNumberSettings(serialConfig, user?.name || 'Admin');
                      setSerialConfig(saved);
                      showToast('Serial Number configuration saved to Firebase.');
                    } finally {
                      setIsSavingSerialConfig(false);
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingSerialConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Serial Settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Safe Academic Year Roll Reset Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-amber-500/30 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Safe Academic Year Roll Number Reset
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Start a fresh Roll Number counter for a new academic year without touching existing student Roll Numbers or affecting the independent Serial Number counter. Previously assigned IDs are preserved in the ID registry and never reused.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Academic Year
                </label>
                <input
                  type="text"
                  value={resetAcademicYear}
                  onChange={(e) => setResetAcademicYear(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Starting Roll Sequence
                </label>
                <input
                  type="number"
                  min={1}
                  value={resetStartingSerial}
                  onChange={(e) => setResetStartingSerial(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const next = await StorageService.resetRollNumberSerialForYear(
                    resetAcademicYear.trim() || String(new Date().getFullYear()),
                    resetStartingSerial,
                    user?.name || 'Admin'
                  );
                  setRollConfig(next);
                  showToast(`Roll Number counter safely reset for ${next.academicYear} starting at #${next.startingSerial}.`);
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Apply Roll Year Reset</span>
              </button>
            </div>
          </div>

          {/* Safe Existing Student ID Migration Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-cyan-500/25 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Safe Existing Student Serial &amp; Roll Migration
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assigns independent <span className="font-mono font-semibold text-emerald-400">{serialConfig.prefix || 'SN'}-0001</span> Serial Numbers to existing students missing a formatted serial while keeping all valid existing Roll Numbers untouched.
              </p>
              <p className="text-[11px] font-semibold text-cyan-500">
                Students missing formatted Serial Number: {students.filter((s) => !s.formattedSerialNumber).length} / {students.length}
                {migrationSummary ? ` · ${migrationSummary}` : ''}
              </p>
            </div>
            <button
              type="button"
              disabled={isRunningMigration}
              onClick={async () => {
                setIsRunningMigration(true);
                try {
                  const res = await StorageService.migrateExistingStudentNumbers(user?.name || 'Admin');
                  const msg = `Migrated ${res.updatedCount} student serial(s) safely (${res.skippedCount} already formatted, ${res.totalCount} total students).`;
                  setMigrationSummary(msg);
                  showToast(msg);
                } catch (err: any) {
                  showToast(`Migration failed: ${err?.message || 'Unknown error'}`);
                } finally {
                  setIsRunningMigration(false);
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs shrink-0 flex items-center gap-2 cursor-pointer"
            >
              {isRunningMigration ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>Run Safe ID Migration</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Data Backup & Reset */}
      {activeSubTab === 'backup' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Local Database Persistence & Backup</h3>
              <p className="text-xs text-slate-400">All data is preserved in browser storage with zero external server dependencies</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Export Complete JSON Backup</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  Download a full offline JSON file containing all students, teacher credentials, attendance logs, weekly tests, and PKR fee receipts.
                </p>
              </div>
              <button
                onClick={handleExportBackup}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON Backup</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-rose-900 dark:text-rose-300 mb-1">Reset to Sample PKR Demo Data</h4>
                <p className="text-xs text-rose-700/80 dark:text-rose-400/80 leading-relaxed mb-4">
                  Reverts all data back to the default 7 students, rich attendance logs, tests, and Pakistani Rupee (PKR) fees.
                </p>
              </div>
              <button
                onClick={handleResetDemo}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Sample Data</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 flex flex-col justify-between sm:col-span-2">
              <div>
                <h4 className="font-bold text-sm text-amber-950 dark:text-amber-200 mb-1 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Clear All Students (Firebase Database Purge)</span>
                </h4>
                <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed mb-4">
                  Permanently deletes all student records from the Firebase Firestore database and local storage. Useful for starting fresh with 0 candidate records.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ClearAllStudentsButton
                  buttonText="Clear All Students"
                  onSuccess={() => {
                    showToast('All student records permanently deleted from Firebase.');
                  }}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Requires confirmation before deleting.
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:col-span-2">
              <div>
                <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-200 mb-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Post-Login System Loading Animation</span>
                </h4>
                <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                  Experience or demonstrate the smooth institutional welcome loading sequence that plays after sign-in.
                </p>
              </div>
              <button
                type="button"
                onClick={triggerSystemLoading}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Preview Animation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Attendance Schedule Control & Teacher Portal Welcome Message */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-6">
          {/* 1. ATTENDANCE SCHEDULE CONTROL CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    <Sliders className="w-5 h-5" />
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Attendance Schedule Control
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Turn attendance ON or OFF for each day of the week. If a day is toggled OFF, the Dashboard and Teacher Portal display <strong>"Today is OFF. Attendance is disabled."</strong> and hide attendance marking buttons. Synchronized instantly in Firebase under <code className="text-indigo-400 font-mono">attendance_settings</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveAttendanceSchedule}
                disabled={isSavingSchedule}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingSchedule ? 'Saving to Firebase...' : 'Save Schedule to Firebase'}</span>
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Quick Schedule Presets:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('standard')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer shadow-2xs"
                >
                  Standard (Mon–Sat ON, Sunday OFF)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('fiveDay')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer shadow-2xs"
                >
                  5-Day Week (Mon–Fri ON)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('allOn')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-2xs"
                >
                  All 7 Days ON
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('allOff')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 cursor-pointer shadow-2xs"
                >
                  All Days OFF
                </button>
              </div>
            </div>

            {/* Weekly Days Grid (Monday to Sunday) */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {[
                { key: 'monday', label: 'Monday', korean: '월요일', sub: 'Weekday' },
                { key: 'tuesday', label: 'Tuesday', korean: '화요일', sub: 'Weekday' },
                { key: 'wednesday', label: 'Wednesday', korean: '수요일', sub: 'Weekday' },
                { key: 'thursday', label: 'Thursday', korean: '목요일', sub: 'Weekday' },
                { key: 'friday', label: 'Friday', korean: '금요일', sub: 'Weekday' },
                { key: 'saturday', label: 'Saturday', korean: '토요일', sub: 'Weekend Class' },
                { key: 'sunday', label: 'Sunday', korean: '일요일', sub: 'Weekend Holiday (Default OFF)' },
              ].map(({ key, label, korean, sub }) => {
                const dayKey = key as AttendanceDayKey;
                const isEnabled = Boolean(attendanceSchedule[dayKey]);

                return (
                  <div
                    key={key}
                    onClick={() => handleToggleDay(dayKey)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                      isEnabled
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/40 shadow-xs'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-500/40 opacity-90 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {label}
                          </span>
                          <span className="text-xs text-slate-400 font-korean">
                            ({korean})
                          </span>
                        </div>

                        {/* Toggle Pill */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {isEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {sub}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
                      <span className={`text-[11px] font-semibold ${
                        isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isEnabled ? 'Attendance Enabled' : 'Attendance Disabled (Day OFF)'}
                      </span>

                      {/* Toggle Switch Graphic */}
                      <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                        isEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}>
                        <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Specific Date Override Control */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-indigo-500" />
                  <span>Admin Specific Date Overrides</span>
                </h4>
                <span className="text-[11px] font-semibold text-slate-400">
                  Target: Class, Batch, or Institution-wide
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5">
                Explicitly override attendance permissions for a specific calendar date and target group. You can declare a class-specific holiday (e.g. Morning Class 2 off) or enable special sessions on weekend dates without affecting other classes.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {/* 1. Date Selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</label>
                  <input
                    type="date"
                    value={selectedDateOverride}
                    onChange={(e) => setSelectedDateOverride(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* 2. Class / Batch Dropdown */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class / Batch</label>
                  <select
                    value={selectedOverrideTargetClass}
                    onChange={(e) => setSelectedOverrideTargetClass(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="ALL">ALL Classes (Entire Academy)</option>
                    <optgroup label="Morning Classes">
                      <option value="Morning Class 1">Morning Class 1</option>
                      <option value="Morning Class 2">Morning Class 2</option>
                      <option value="Morning Class 3">Morning Class 3</option>
                      <option value="Morning Class 4">Morning Class 4</option>
                      <option value="Morning Class 5">Morning Class 5</option>
                      <option value="Morning Class 6">Morning Class 6</option>
                      <option value="Morning Class 7">Morning Class 7</option>
                    </optgroup>
                    <optgroup label="Evening Classes">
                      <option value="Evening Class 1">Evening Class 1</option>
                      <option value="Evening Class 2">Evening Class 2</option>
                      <option value="Evening Class 3">Evening Class 3</option>
                      <option value="Evening Class 4">Evening Class 4</option>
                      <option value="Evening Class 5">Evening Class 5</option>
                      <option value="Evening Class 6">Evening Class 6</option>
                      <option value="Evening Class 7">Evening Class 7</option>
                    </optgroup>
                    <optgroup label="Batches">
                      {batches.length === 0 ? (
                        <option value="" disabled>No batches created yet</option>
                      ) : (
                        batches.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name} ({b.code})
                          </option>
                        ))
                      )}
                    </optgroup>
                  </select>
                </div>

                {/* 3. Action Dropdown */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Action</label>
                  <select
                    value={selectedOverrideAction}
                    onChange={(e) => setSelectedOverrideAction(e.target.value as 'holiday' | 'enable')}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="holiday">Declare Holiday/Off</option>
                    <option value="enable">Enable Attendance</option>
                  </select>
                </div>

                {/* 4. Action Button */}
                <div className="flex flex-col justify-end">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-0 pointer-events-none hidden sm:block">Action</label>
                  <button
                    type="button"
                    onClick={handleAddDateOverride}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    <span>Set Specific Date Override</span>
                  </button>
                </div>
              </div>

              {/* List of active date overrides */}
              {(() => {
                const list = attendanceSchedule.dateOverridesList || [];
                const legacyList = Object.entries(attendanceSchedule.specificDateOverrides || {})
                  .filter(([d]) => !list.some(o => o.date === d));

                const hasAny = list.length > 0 || legacyList.length > 0;
                if (!hasAny) {
                  return (
                    <div className="mt-3.5 text-[11px] text-slate-400 italic">
                      No active date overrides configured. Normal weekly schedule applies.
                    </div>
                  );
                }

                return (
                  <div className="mt-4 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Active Calendar Overrides ({list.length + legacyList.length}):
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {list.map((override) => {
                        const isOff = override.action === 'holiday' || !override.isAllowed;
                        const classLabel = override.targetClass === 'ALL' ? 'ALL Classes' : override.targetClass;
                        const actionLabel = isOff ? 'OFF (Holiday)' : 'ON (Attendance Enabled)';

                        return (
                          <div
                            key={override.id || `${override.date}_${override.targetClass}`}
                            className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold border shadow-2xs transition-all ${
                              isOff 
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isOff ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className="text-slate-200">
                              <span className="text-white font-black">{formatBadgeDate(override.date)}</span>
                              {' - '}
                              <span className="text-indigo-300 font-bold">{classLabel}</span>
                              {' - '}
                              <span className={isOff ? 'text-rose-400 font-black' : 'text-emerald-400 font-black'}>
                                {actionLabel}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDateOverride(override.id || override.date, `${override.date} - ${classLabel}`)}
                              className="p-1 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer text-slate-400"
                              title="Delete override"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}

                      {legacyList.map(([dateStr, state]) => {
                        const isOff = !state;
                        const actionLabel = isOff ? 'OFF (Holiday)' : 'ON (Attendance Enabled)';
                        return (
                          <div
                            key={`legacy_${dateStr}`}
                            className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold border shadow-2xs transition-all ${
                              isOff 
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' 
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isOff ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className="text-slate-200">
                              <span className="text-white font-black">{formatBadgeDate(dateStr)}</span>
                              {' - '}
                              <span className="text-indigo-300 font-bold">ALL Classes</span>
                              {' - '}
                              <span className={isOff ? 'text-rose-400 font-black' : 'text-emerald-400 font-black'}>
                                {actionLabel}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDateOverride(dateStr, `${dateStr} - ALL Classes`)}
                              className="p-1 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer text-slate-400"
                              title="Delete override"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 2. TEACHER PORTAL WELCOME MESSAGE CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Megaphone className="w-5 h-5 text-purple-400" />
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Teacher Portal Welcome Message
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Broadcast an institutional announcement message to teachers upon portal entry. This message scrolls (marquee effect) across the top of the Teacher Portal for <strong>exactly 2 minutes</strong>, then automatically disappears. Stored in Firebase under <code className="text-purple-400 font-mono">welcome_message_settings</code>.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleSaveWelcomeMessage}
                  disabled={isSavingMessage}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingMessage ? 'Saving to Firebase...' : 'Save Welcome Message to Firebase'}</span>
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {/* Enable Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">
                    Enable Faculty Welcome Marquee Broadcast
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    When active, instructors see the scrolling marquee banner for exactly 2 minutes after signing in.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setWelcomeMessage(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 cursor-pointer ${
                    welcomeMessage.enabled ? 'bg-purple-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
                </button>
              </div>

              {/* Message Templates Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Message Templates</span>
                </label>
                <select
                  value={welcomeMessage.template || ''}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    setWelcomeMessage(prev => ({
                      ...prev,
                      template: chosen,
                      message: chosen || prev.message
                    }));
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Choose a Pre-defined Template or write custom text below --</option>
                  {WELCOME_TEMPLATES.map((tpl, i) => (
                    <option key={i} value={tpl}>{tpl}</option>
                  ))}
                </select>
              </div>

              {/* Custom Message Text Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Custom Broadcast Message</span>
                  <span className="text-[10px] text-slate-400 font-mono font-normal">
                    {welcomeMessage.message.length} characters
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={welcomeMessage.message}
                  onChange={(e) => setWelcomeMessage(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter the message you want teachers to see scrolling across their portal header..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 leading-relaxed font-medium"
                  required
                />
              </div>

              {/* Speed & Duration Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Scroll Speed
                  </label>
                  <select
                    value={welcomeMessage.speed === 'normal' ? 'medium' : welcomeMessage.speed === 'ultra_slow' ? 'very_very_slow' : (welcomeMessage.speed || 'medium')}
                    onChange={(e) => setWelcomeMessage(prev => ({ ...prev, speed: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="very_very_slow">Very Very Slow (90s per loop)</option>
                    <option value="very_slow">Very Slow (60s per loop)</option>
                    <option value="slow">Slow & Calm (38s per loop)</option>
                    <option value="medium">Medium (20s per loop)</option>
                    <option value="high">High Speed (10s per loop)</option>
                    <option value="fast">Fast (5s per loop)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Duration
                  </label>
                  <div className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Exactly 2 Minutes (120 Seconds)</span>
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Live Marquee Preview (Simulating 2-Minute Banner)</span>
                  </span>
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                    {welcomeMessage.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="rounded-xl overflow-hidden border border-purple-500/30">
                  <TeacherWelcomeMarquee forceShowForPreview={true} previewSettings={welcomeMessage} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Account Modal */}
      <TeacherModal
        isOpen={isTeacherModalOpen}
        onClose={() => {
          setIsTeacherModalOpen(false);
          setEditingTeacher(null);
        }}
        onSave={handleSaveTeacher}
        teacherToEdit={editingTeacher}
      />

      {/* Student Portal Access Modal */}
      <StudentPortalAccessModal
        isOpen={isStudentPortalModalOpen}
        onClose={() => {
          setIsStudentPortalModalOpen(false);
          setEditingStudentPortal(null);
          setPreselectedPortalStudent(null);
        }}
        onSave={handleSaveStudentPortal}
        students={students}
        existingAccounts={studentPortalAccounts}
        accountToEdit={editingStudentPortal}
        preselectedStudent={preselectedPortalStudent}
      />
    </div>
  );
};

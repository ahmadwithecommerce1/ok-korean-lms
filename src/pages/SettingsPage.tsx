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
  X
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { 
  AcademySettings, 
  TeacherAccount, 
  LanguageCode, 
  TabId, 
  AttendanceRequest,
  AttendanceScheduleSettings,
  WelcomeMessageSettings
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { TeacherModal } from '../components/modals/TeacherModal';
import { ClearAllStudentsButton } from '../components/ClearAllStudentsButton';
import { TeacherWelcomeMarquee } from '../components/common/TeacherWelcomeMarquee';

export const SettingsPage: React.FC = () => {
  const { user, triggerSystemLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'teachers' | 'schedule' | 'approvals' | 'recovery' | 'profile' | 'language' | 'backup'>('teachers');

  const [settings, setSettings] = useState<AcademySettings>(() => StorageService.getSettings());
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => StorageService.getTeacherAccounts());
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
  const [selectedOverrideState, setSelectedOverrideState] = useState<boolean>(true);
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

    return () => {
      unsubTeachers();
      unsubSettings();
      unsubRequests();
      unsubSchedule();
      unsubWelcome();
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

  const handleToggleDay = async (day: keyof Omit<AttendanceScheduleSettings, 'specificDateOverrides' | 'updatedAt' | 'updatedBy'>) => {
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

  const handleAddDateOverride = () => {
    if (!selectedDateOverride) return;
    setAttendanceSchedule(prev => ({
      ...prev,
      specificDateOverrides: {
        ...(prev.specificDateOverrides || {}),
        [selectedDateOverride]: selectedOverrideState
      }
    }));
    showToast(`Specific date override added for ${selectedDateOverride} (${selectedOverrideState ? 'ON' : 'OFF'})`);
  };

  const handleRemoveDateOverride = (dateStr: string) => {
    setAttendanceSchedule(prev => {
      const updated = { ...(prev.specificDateOverrides || {}) };
      delete updated[dateStr];
      return {
        ...prev,
        specificDateOverrides: updated
      };
    });
    showToast(`Removed override for ${dateStr}`);
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

  const handleApproveRequest = async (requestId: string) => {
    await StorageService.approveAttendanceRequest(requestId, user?.name || 'Admin');
    showToast('Attendance change approved and recorded!');
  };

  const handleRejectRequest = async (requestId: string) => {
    await StorageService.rejectAttendanceRequest(requestId, user?.name || 'Admin');
    showToast('Attendance change request rejected.');
  };

  const restrictedTeachers = teachers.filter(
    t => t.status === 'Suspended' || (t.failedAttempts !== undefined && t.failedAttempts > 0)
  );

  const pendingApprovalsCount = attendanceRequests.filter(r => r.status === 'Pending').length;

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
                        <div className="text-[11px] text-slate-400 font-mono">{teacher.phone || teacher.email || 'Faculty'}</div>
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
                      <th className="py-3.5 px-4">Faculty Teacher</th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Class & Timing</th>
                      <th className="py-3.5 px-4">Attendance Date</th>
                      <th className="py-3.5 px-4">Requested Change</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {attendanceRequests.map((req) => {
                      const isPending = req.status === 'Pending';
                      const isSelected = selectedRequestIds.includes(req.id);
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
                              {new Date(req.createdAt || req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{req.studentName}</div>
                            <div className="text-[11px] text-indigo-500 font-mono font-semibold">{req.studentRoll}</div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {req.studentClass || 'Class 1'}
                            </span>
                            <span className="ml-1.5 text-[11px] text-slate-400">({req.timing || 'Morning'})</span>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
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
                            {isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleApproveRequest(req.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectRequest(req.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
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
                const dayKey = key as keyof Omit<AttendanceScheduleSettings, 'specificDateOverrides' | 'updatedAt' | 'updatedBy'>;
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-500" />
                <span>Admin Specific Date Overrides</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Explicitly override attendance for any specific calendar date (e.g., enable a special Sunday EPS session or declare a mid-week public holiday).
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={selectedDateOverride}
                  onChange={(e) => setSelectedDateOverride(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                />

                <select
                  value={selectedOverrideState ? 'on' : 'off'}
                  onChange={(e) => setSelectedOverrideState(e.target.value === 'on')}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="on">Force Attendance ON (Allowed)</option>
                  <option value="off">Force Attendance OFF (Disabled)</option>
                </select>

                <button
                  type="button"
                  onClick={handleAddDateOverride}
                  className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Set Specific Date Override
                </button>
              </div>

              {/* List of active date overrides */}
              {attendanceSchedule.specificDateOverrides && Object.keys(attendanceSchedule.specificDateOverrides).length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {Object.entries(attendanceSchedule.specificDateOverrides).map(([dateStr, state]) => (
                    <div
                      key={dateStr}
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
                        state 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      <span>{dateStr}: {state ? 'FORCE ON' : 'FORCE OFF'}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDateOverride(dateStr)}
                        className="p-0.5 hover:text-white cursor-pointer"
                        title="Remove override"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                    value={welcomeMessage.speed || 'normal'}
                    onChange={(e) => setWelcomeMessage(prev => ({ ...prev, speed: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="normal">Normal Speed (25s per loop)</option>
                    <option value="slow">Slow & Calm (38s per loop)</option>
                    <option value="very_slow">Very Slow (60s per loop)</option>
                    <option value="ultra_slow">Ultra Slow (90s per loop)</option>
                    <option value="glacial">Glacial (120s per loop)</option>
                    <option value="fast">Fast (16s per loop)</option>
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
    </div>
  );
};

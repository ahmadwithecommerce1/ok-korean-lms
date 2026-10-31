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
  AlertTriangle
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { AcademySettings, TeacherAccount, LanguageCode, TabId } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { TeacherModal } from '../components/modals/TeacherModal';

export const SettingsPage: React.FC = () => {
  const { user, triggerSystemLoading } = useAuth();
  const { isDark, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'teachers' | 'profile' | 'language' | 'backup'>('teachers');

  const [settings, setSettings] = useState<AcademySettings>(() => StorageService.getSettings());
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => StorageService.getTeacherAccounts());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Firestore subscriptions
  useEffect(() => {
    const unsubTeachers = StorageService.subscribeTeachers((liveTeachers) => {
      setTeachers(liveTeachers);
    });
    const unsubSettings = StorageService.subscribeSettings((liveSettings) => {
      setSettings(liveSettings);
    });
    return () => {
      unsubTeachers();
      unsubSettings();
    };
  }, []);

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

  const restrictedTeachers = teachers.filter(
    t => t.status === 'Suspended' || (t.failedAttempts !== undefined && t.failedAttempts >= 3)
  );

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
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Faculty & Teacher Access</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{teachers.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('language')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'language'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
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
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
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
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
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

                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {teacher.password}
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

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {teacher.allowedMenus?.map((menu) => (
                            <span 
                              key={menu} 
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold capitalize border border-slate-200 dark:border-slate-700"
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

          {/* Day / Night Theme Selector */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Interface Theme (Day Mode / Night Mode)</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Switch between high-contrast Day Mode (light background) and focused Night Mode (dark background).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTheme('light');
                  showToast('Day Mode (Light) activated');
                }}
                className={`p-4 rounded-xl border-2 flex items-center justify-between text-left transition-all cursor-pointer ${
                  !isDark
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Day Mode (Light)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Clean white and slate daylight interface</span>
                  </div>
                </div>
                {!isDark && (
                  <span className="p-1 rounded-full bg-indigo-600 text-white">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('dark');
                  showToast('Night Mode (Dark) activated');
                }}
                className={`p-4 rounded-xl border-2 flex items-center justify-between text-left transition-all cursor-pointer ${
                  isDark
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900 text-indigo-300 dark:bg-slate-700 dark:text-indigo-200">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">Night Mode (Dark)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Deep obsidian & slate night-shift palette</span>
                  </div>
                </div>
                {isDark && (
                  <span className="p-1 rounded-full bg-indigo-600 text-white">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Active Language:</strong> {language === 'en' ? 'English' : language === 'kr' ? '한국어 (Korean)' : 'اردو (Urdu)'} · <strong>Active Theme:</strong> {isDark ? 'Night Mode (Dark)' : 'Day Mode (Light)'}. All preferences are saved in your browser.
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

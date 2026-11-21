import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Check,
  Lock,
  Users,
  Edit3,
  Plus,
} from 'lucide-react';
import { AcademyDataService, DEFAULT_ROLE_MATRIX } from '../services/academyDataService';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { RolePermissionMatrix, TabId, TeacherAccount } from '../types';
import { TeacherModal } from '../components/modals/TeacherModal';

const MODULE_LABELS: { id: TabId; label: string; group: string }[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Overview' },
  { id: 'analytics-insights', label: 'Analytics & Insights', group: 'Overview' },
  { id: 'students', label: 'Student Directory', group: 'Students' },
  { id: 'admissions', label: 'Admission Requests', group: 'Students' },
  { id: 'batch-classes', label: 'Batch & Classes', group: 'Students' },
  { id: 'academic-calendar', label: 'Academic Calendar', group: 'Students' },
  { id: 'teacher-monitor', label: 'Teacher Monitor', group: 'Staff' },
  { id: 'teacher-management', label: 'Teacher Management', group: 'Staff' },
  { id: 'attendance', label: 'Daily Attendance', group: 'Academic' },
  { id: 'biometric', label: 'ZKTeco / Biometric', group: 'Academic' },
  { id: 'tests', label: 'Weekly Tests', group: 'Academic' },
  { id: 'courses-curriculum', label: 'Courses & Curriculum', group: 'Academic' },
  { id: 'study-materials', label: 'Study Materials', group: 'Academic' },
  { id: 'assignments-homework', label: 'Assignments & Homework', group: 'Academic' },
  { id: 'topik-preparation', label: 'TOPIK Preparation', group: 'Academic' },
  { id: 'fees', label: 'Fees Management', group: 'Finance' },
  { id: 'expense-management', label: 'Expense Management', group: 'Finance' },
  { id: 'salary-payroll', label: 'Salary & Payroll', group: 'Finance' },
  { id: 'financial-reports', label: 'Financial Reports', group: 'Finance' },
  { id: 'whatsapp', label: 'WhatsApp Hub', group: 'Communication' },
  { id: 'notifications-centre', label: 'Notifications Centre', group: 'Communication' },
  { id: 'announcements', label: 'Announcements', group: 'Communication' },
  { id: 'email-communication', label: 'Email Communication', group: 'Communication' },
  { id: 'reports', label: 'PDF Reports', group: 'Reports' },
  { id: 'user-roles-permissions', label: 'User Roles & Permissions', group: 'Administration' },
  { id: 'activity-audit-logs', label: 'Activity & Audit Logs', group: 'Administration' },
  { id: 'settings', label: 'Settings', group: 'Administration' },
];

export const UserRolesPage: React.FC = () => {
  const { user } = useAuth();
  const [matrix, setMatrix] = useState<RolePermissionMatrix>(() =>
    AcademyDataService.getRolePermissionMatrix()
  );
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => StorageService.getTeacherAccounts());
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TeacherAccount | null>(null);

  useEffect(() => {
    const u1 = AcademyDataService.subscribeRolePermissionMatrix(setMatrix);
    const u2 = StorageService.subscribeTeachers(setTeachers);
    return () => {
      u1();
      u2();
    };
  }, []);

  const toggleRoleTab = (roleKey: 'teacher' | 'staff', tabId: TabId) => {
    setMatrix((prev) => {
      const current = prev[roleKey] || [];
      const next = current.includes(tabId)
        ? current.filter((t) => t !== tabId)
        : [...current, tabId];
      return { ...prev, [roleKey]: next };
    });
  };

  const handleSaveMatrix = async () => {
    await AcademyDataService.saveRolePermissionMatrix(matrix, user?.name || 'Admin', 'admin');
    setSavedToast('Role permission templates saved to Firebase.');
    setTimeout(() => setSavedToast(null), 3500);
  };

  const applyPresetToAccount = (account: TeacherAccount) => {
    const roleKey = account.roleType === 'staff' ? 'staff' : 'teacher';
    const presetMenus = matrix[roleKey] || DEFAULT_ROLE_MATRIX[roleKey];
    StorageService.updateTeacherAccount(
      { ...account, allowedMenus: presetMenus },
      user?.name || 'Admin',
      'admin'
    );
    setSavedToast(`Applied ${roleKey.toUpperCase()} preset permissions to ${account.name}.`);
    setTimeout(() => setSavedToast(null), 3500);
  };

  const handleSaveAccount = (payload: TeacherAccount) => {
    const exists = teachers.some((t) => t.id === payload.id);
    if (exists) {
      StorageService.updateTeacherAccount(payload, user?.name || 'Admin', 'admin');
    } else {
      const { id: _id, ...rest } = payload;
      StorageService.addTeacherAccount(rest, user?.name || 'Admin', 'admin');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <span>User Roles & Access Permissions</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure Admin, Teacher, and Staff module access policies and enforce sidebar/route restrictions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingAccount(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Teacher / Staff</span>
          </button>
          <button
            type="button"
            onClick={handleSaveMatrix}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Role Matrix</span>
          </button>
        </div>
      </div>

      {savedToast && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-semibold">
          {savedToast}
        </div>
      )}

      {/* Role Permission Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>Module Access Matrix (Admin · Teacher · Staff)</span>
          </span>
          <span className="text-[11px] text-slate-400">Admin always retains full system access</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Admin</th>
                <th className="py-3 px-4 text-center">Teacher Preset</th>
                <th className="py-3 px-4 text-center">Staff Preset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {MODULE_LABELS.map((mod) => {
                const isAdminOnlyStrict =
                  mod.id === 'settings' || mod.id === 'user-roles-permissions';
                return (
                  <tr key={mod.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{mod.label}</td>
                    <td className="py-2.5 px-4 text-slate-400">{mod.group}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-[10px] font-bold">
                        Full Access
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {isAdminOnlyStrict ? (
                        <span className="text-[10px] text-slate-400">Restricted</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={(matrix.teacher || []).includes(mod.id)}
                          onChange={() => toggleRoleTab('teacher', mod.id)}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {isAdminOnlyStrict ? (
                        <span className="text-[10px] text-slate-400">Restricted</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={(matrix.staff || []).includes(mod.id)}
                          onChange={() => toggleRoleTab('staff', mod.id)}
                          className="w-4 h-4 accent-indigo-600 cursor-pointer"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Accounts & Quick Sync */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>Active Teacher & Staff Accounts ({teachers.length})</span>
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {teachers.map((t) => (
            <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{t.name}</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase">
                    {t.roleType === 'staff' ? 'Staff' : 'Teacher'}
                  </span>
                  <span className={`text-[10px] font-bold ${t.status === 'Active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  @{t.username} · {t.allowedMenus.length} permitted menus
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPresetToAccount(t)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600 text-emerald-500 hover:text-white font-bold text-[11px] cursor-pointer"
                >
                  Apply {t.roleType === 'staff' ? 'Staff' : 'Teacher'} Preset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAccount(t);
                    setModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TeacherModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
        teacherToEdit={editingAccount}
      />
    </div>
  );
};

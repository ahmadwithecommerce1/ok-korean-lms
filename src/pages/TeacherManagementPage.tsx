import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit3,
  Trash2,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Banknote,
  Briefcase,
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { TeacherAccount } from '../types';
import { TeacherModal } from '../components/modals/TeacherModal';

export const TeacherManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => StorageService.getTeacherAccounts());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [roleFilter, setRoleFilter] = useState<'All' | 'teacher' | 'staff'>('All');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherAccount | null>(null);

  useEffect(() => {
    const unsub = StorageService.subscribeTeachers(setTeachers);
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return teachers.filter((t) => {
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      const rType = t.roleType === 'staff' ? 'staff' : 'teacher';
      if (roleFilter !== 'All' && rType !== roleFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.username.toLowerCase().includes(q) ||
        (t.designation || '').toLowerCase().includes(q) ||
        (t.phone || '').toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q)
      );
    });
  }, [teachers, searchQuery, statusFilter, roleFilter]);

  const stats = useMemo(() => {
    const active = teachers.filter((t) => t.status === 'Active').length;
    const faculty = teachers.filter((t) => t.roleType !== 'staff').length;
    const totalMonthlyPayroll = teachers.reduce((sum, t) => sum + (Number(t.baseSalary) || 0), 0);
    return { total: teachers.length, active, faculty, totalMonthlyPayroll };
  }, [teachers]);

  const handleSaveTeacher = (payload: TeacherAccount) => {
    const exists = teachers.some((t) => t.id === payload.id);
    if (exists) {
      StorageService.updateTeacherAccount(payload, user?.name || 'Admin', user?.role || 'admin');
    } else {
      const { id: _id, ...rest } = payload;
      StorageService.addTeacherAccount(rest, user?.name || 'Admin', user?.role || 'admin');
    }
  };

  const handleToggleStatus = (t: TeacherAccount) => {
    const nextStatus = t.status === 'Active' ? 'Suspended' : 'Active';
    StorageService.updateTeacherAccount(
      { ...t, status: nextStatus },
      user?.name || 'Admin',
      user?.role || 'admin'
    );
  };

  const handleDelete = (t: TeacherAccount) => {
    if (window.confirm(`Permanently remove ${t.name} (@${t.username}) from Firebase?`)) {
      StorageService.deleteTeacherAccount(t.id, user?.name || 'Admin', user?.role || 'admin');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-emerald-500" />
            <span>Teacher & Faculty Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Full faculty & staff profiles, batch/class allocations, salary bases, and login access controls.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTeacher(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Teacher / Staff</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-slate-400">Total Staff & Faculty</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-emerald-500">Active Accounts</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-indigo-400">Instructors</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{stats.faculty}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-amber-500">Base Salary Pool</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            Rs. {stats.totalMonthlyPayroll.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, username, designation, email, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
        >
          <option value="All">All Roles</option>
          <option value="teacher">Teachers Only</option>
          <option value="staff">Staff Only</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching faculty or staff profiles</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[780px]">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Instructor / Staff</th>
                  <th className="py-3 px-4">Role & Designation</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Batch & Classes</th>
                  <th className="py-3 px-4">Base Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{t.name}</div>
                      <div className="font-mono text-[11px] text-cyan-500">@{t.username}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {t.designation || (t.roleType === 'staff' ? 'Administrative Staff' : 'Korean Instructor')}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {t.employmentStatus || 'Full-Time'} · {t.roleType === 'staff' ? 'Staff' : 'Teacher'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5 text-[11px]">
                      {t.phone && (
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-mono">
                          <Phone className="w-3 h-3 text-emerald-500" /> {t.phone}
                        </div>
                      )}
                      {t.email && (
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Mail className="w-3 h-3 text-indigo-400" /> {t.email}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 dark:text-slate-200 block">
                        {(t.assignedBatch || 'General').split(' (')[0]}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {(t.assignedClasses || []).slice(0, 2).join(', ')}
                        {(t.assignedClasses?.length || 0) > 2 ? ` +${t.assignedClasses!.length - 2}` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      <span className="inline-flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                        Rs. {(t.baseSalary || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(t)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border cursor-pointer ${
                          t.status === 'Active'
                            ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                        }`}
                      >
                        {t.status === 'Active' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        {t.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTeacher(t);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-500 hover:bg-emerald-500/10 cursor-pointer"
                          title="Edit Profile & Permissions"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete Account"
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
        )}
      </div>

      <TeacherModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTeacher(null);
        }}
        onSave={handleSaveTeacher}
        teacherToEdit={editingTeacher}
      />
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { ActivityLog } from '../types';

export const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>(() => StorageService.getActivityLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');

  useEffect(() => {
    const unsub = StorageService.subscribeLogs(setLogs);
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return logs.filter((log) => {
      if (categoryFilter !== 'All' && log.category !== categoryFilter) return false;
      if (roleFilter !== 'All' && log.role !== roleFilter) return false;
      if (!q) return true;
      return (
        (log.action || '').toLowerCase().includes(q) ||
        (log.detail || '').toLowerCase().includes(q) ||
        (log.user || '').toLowerCase().includes(q)
      );
    });
  }, [logs, searchQuery, categoryFilter, roleFilter]);

  const handleExportCsv = () => {
    const header = ['Timestamp', 'User', 'Role', 'Category', 'Action', 'Detail'];
    const rows = filtered.map((l) => [
      `"${(l.timestamp || '').replace(/"/g, '""')}"`,
      `"${(l.user || '').replace(/"/g, '""')}"`,
      l.role,
      l.category,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.detail || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ok-korean-audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-500" />
            <span>Activity & Security Audit Logs</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Chronological trail of logins, student changes, attendance saves, fee payments, and system updates.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit CSV ({filtered.length})</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, user, or event details..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="All">All Categories</option>
            <option value="system">System</option>
            <option value="student">Student</option>
            <option value="attendance">Attendance</option>
            <option value="test">Test / Academic</option>
            <option value="fee">Fee / Finance</option>
            <option value="teacher">Teacher / Payroll</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="student_portal">Student Portal</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="All">All Roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="staff">Staff</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No audit entries matching filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor & Role</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-900 dark:text-white">{log.user}</span>{' '}
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase text-cyan-500">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 text-[10px] font-bold uppercase">
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{log.action}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

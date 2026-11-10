import React, { useState, useEffect } from 'react';
import { X, UserCheck, Shield, Key, Check, AlertCircle, Eye, EyeOff, Sparkles, Copy } from 'lucide-react';
import { TeacherAccount, TabId, StudentBatch } from '../../types';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: TeacherAccount) => void;
  teacherToEdit?: TeacherAccount | null;
}

const ALL_MENUS: { id: TabId; label: string; desc: string }[] = [
  { id: 'dashboard', label: 'Executive Dashboard', desc: 'Overview, attendance rate, charts and batch timetables' },
  { id: 'attendance', label: 'Daily Attendance', desc: 'Mark batch presence (Present, Late, Absent, Leave)' },
  { id: 'tests', label: 'Weekly Tests', desc: 'Enter student marks for Vocabulary, Grammar, Reading, Speaking' },
  { id: 'reports', label: 'PDF Reports', desc: 'Generate and download weekly & monthly student transcripts' },
  { id: 'whatsapp', label: 'WhatsApp Hub', desc: 'Send direct progress & attendance messages to parents' },
  { id: 'students', label: 'Student Directory', desc: 'View, enroll or update student candidate records' },
  { id: 'fees', label: 'Fees Management', desc: 'Record tuition fee collections and print PKR vouchers' },
];

const BATCHES: StudentBatch[] = [
  'Batch A (Morning 09:00 - 11:00)',
  'Batch B (Afternoon 14:00 - 16:00)',
  'Batch C (Evening 18:00 - 20:00)',
  'Batch D (Weekend Intensive)',
];

export const AVAILABLE_TEACHER_CLASSES = [
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
  'Evening Class 4',
  'Evening Class 5',
  'Evening Class 6',
  'Evening Class 7',
];

export const TeacherModal: React.FC<TeacherModalProps> = ({
  isOpen,
  onClose,
  onSave,
  teacherToEdit,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [assignedBatch, setAssignedBatch] = useState<string>(BATCHES[0]);
  const [assignedClasses, setAssignedClasses] = useState<string[]>(['Morning Class 1', 'Morning Class 2']);
  const [status, setStatus] = useState<'Active' | 'Suspended'>('Active');
  const [allowedMenus, setAllowedMenus] = useState<TabId[]>([
    'dashboard', 'attendance', 'tests', 'reports', 'whatsapp'
  ]);
  const [error, setError] = useState<string | null>(null);

  const handleAutoGenerateUsername = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setUsername(`ok-korean-${randomSuffix}`);
  };

  const handleAutoGeneratePassword = () => {
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const specialSymbols = ['!#', '@$', '#%', '&*', '?!'];
    const sym = specialSymbols[Math.floor(Math.random() * specialSymbols.length)];
    const generatedPwd = `QWer12${sym}${randomDigits}`;
    setPassword(generatedPwd);
    setShowPassword(true);
    setCopiedPassword(false);
  };

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password).then(() => {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }).catch(() => {
      // fallback
    });
  };

  useEffect(() => {
    if (teacherToEdit) {
      setName(teacherToEdit.name);
      setUsername(teacherToEdit.username);
      setPassword(teacherToEdit.password);
      setPhone(teacherToEdit.phone || '');
      setAssignedBatch(teacherToEdit.assignedBatch || BATCHES[0]);
      setAssignedClasses(teacherToEdit.assignedClasses || ['Morning Class 1', 'Morning Class 2']);
      setStatus(teacherToEdit.status);
      setAllowedMenus(teacherToEdit.allowedMenus || ['dashboard', 'attendance', 'tests', 'reports', 'whatsapp']);
    } else {
      setName('');
      setUsername('');
      setPassword('Korean2026!#');
      setPhone('');
      setAssignedBatch(BATCHES[0]);
      setAssignedClasses(['Morning Class 1', 'Morning Class 2', 'Morning Class 3']);
      setStatus('Active');
      setAllowedMenus(['dashboard', 'attendance', 'tests', 'reports', 'whatsapp']);
    }
    setError(null);
  }, [teacherToEdit, isOpen]);

  const toggleAssignedClass = (cls: string) => {
    setAssignedClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  if (!isOpen) return null;

  const toggleMenu = (menuId: TabId) => {
    setAllowedMenus(prev => 
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    );
  };

  const handleSelectAll = () => {
    setAllowedMenus(ALL_MENUS.map(m => m.id));
  };

  const handleSelectDefault = () => {
    setAllowedMenus(['dashboard', 'attendance', 'tests', 'reports', 'whatsapp']);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Teacher Full Name is required.');
      return;
    }
    if (!username.trim()) {
      setError('Username identifier is required.');
      return;
    }
    if (!password.trim()) {
      setError('Password is required.');
      return;
    }
    if (allowedMenus.length === 0) {
      setError('Please select at least one menu permission for this teacher.');
      return;
    }

    const payload: TeacherAccount = {
      id: teacherToEdit ? teacherToEdit.id : `teacher_${Date.now()}`,
      name: name.trim(),
      username: username.trim(),
      password: password.trim(),
      phone: phone.trim() || undefined,
      assignedBatch,
      assignedClasses,
      status,
      allowedMenus,
      createdAt: teacherToEdit ? teacherToEdit.createdAt : new Date().toISOString().split('T')[0],
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-[95%] sm:w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] my-auto animate-fadeIn overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {teacherToEdit ? 'Edit Teacher Credentials & Permissions' : 'Generate New Teacher Account'}
              </h3>
              <p className="text-xs text-slate-400">
                Grant login access and control class allocations & menu permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Teacher Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter teacher name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Active' | 'Suspended')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="Active" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Active (Granted Access)</option>
                <option value="Suspended" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Suspended (Access Revoked)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Login Username <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateUsername}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-md transition-all cursor-pointer border border-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  title="Auto-Generate secure username"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Auto-Generate</span>
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="e.g. ok-korean-4821"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Login Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGeneratePassword}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-500 hover:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-0.5 rounded-md transition-all cursor-pointer border border-purple-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  title="Auto-Generate strong password"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Auto-Generate</span>
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setCopiedPassword(false);
                  }}
                  placeholder="Password"
                  className="w-full px-3.5 py-2 pr-18 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      copiedPassword 
                        ? 'text-emerald-400 bg-emerald-500/20' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                    }`}
                    title={copiedPassword ? "Copied password to clipboard!" : "Copy Password"}
                  >
                    {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>


            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Primary Assigned Batch
              </label>
              <select
                value={assignedBatch}
                onChange={(e) => setAssignedBatch(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {BATCHES.map(b => (
                  <option key={b} value={b} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone / WhatsApp
              </label>
              <input
                type="tel"
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Teacher Class Allocation Section */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                  Assigned Classes & Timings
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select which specific classes this teacher takes attendance for (e.g. Morning Class 1, 2, 3)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignedClasses(['Morning Class 1', 'Morning Class 2', 'Morning Class 3'])}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Morning 1-3
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setAssignedClasses(AVAILABLE_TEACHER_CLASSES.filter(c => c.startsWith('Morning')))}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  All Morning
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setAssignedClasses([])}
                  className="text-[11px] text-rose-500 font-semibold hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {AVAILABLE_TEACHER_CLASSES.map(cls => {
                const isSelected = assignedClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleAssignedClass(cls)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <span className="truncate">{cls}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
            {assignedClasses.length === 0 && (
              <p className="text-[11px] text-amber-500 mt-1.5 font-medium">
                Note: With no classes assigned, teacher can view general batches only.
              </p>
            )}
          </div>

          {/* Granular Menu Permissions Checklist */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                  Menu & Feature Access Permissions
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select which exact tabs and modules this teacher can see and operate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectDefault}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Standard Faculty
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Select All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {ALL_MENUS.map(menu => {
                const isChecked = allowedMenus.includes(menu.id);
                return (
                  <label
                    key={menu.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleMenu(menu.id)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-xs block">{menu.label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                        {menu.desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{teacherToEdit ? 'Save Changes' : 'Create Teacher Access'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

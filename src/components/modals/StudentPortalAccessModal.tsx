import React, { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  User,
  KeyRound,
  ShieldCheck,
  Loader2,
  Mail,
} from 'lucide-react';
import { Student, StudentPortalAccount } from '../../types';
import {
  buildStudentAppEmail,
  generateSecureStudentPassword,
} from '../../services/storageService';

interface StudentPortalAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    account: Omit<StudentPortalAccount, 'id'> | StudentPortalAccount,
    selectedStudent?: Student
  ) => Promise<void> | void;
  students: Student[];
  existingAccounts: StudentPortalAccount[];
  accountToEdit?: StudentPortalAccount | null;
  preselectedStudent?: Student | null;
}

export const StudentPortalAccessModal: React.FC<StudentPortalAccessModalProps> = ({
  isOpen,
  onClose,
  onSave,
  students,
  existingAccounts,
  accountToEdit,
  preselectedStudent,
}) => {
  const eligibleStudents = students.filter(
    (s) => s.status !== 'Inactive' && s.status !== 'Stuck / Inactive'
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setCopiedPassword(false);
    setIsSubmitting(false);

    if (accountToEdit) {
      setSelectedStudentId(accountToEdit.studentId);
      setUsername(accountToEdit.email || accountToEdit.username);
      setPassword(accountToEdit.password);
      setEnabled(accountToEdit.enabled);
      setShowPassword(false);
    } else if (preselectedStudent) {
      setSelectedStudentId(preselectedStudent.id);
      setUsername(buildStudentAppEmail(preselectedStudent.rollNumber));
      setPassword(generateSecureStudentPassword(10));
      setEnabled(true);
      setShowPassword(true);
    } else {
      const existingStudentIds = new Set(existingAccounts.map((a) => a.studentId));
      const firstUnassigned =
        eligibleStudents.find((s) => !existingStudentIds.has(s.id)) || eligibleStudents[0];

      if (firstUnassigned) {
        setSelectedStudentId(firstUnassigned.id);
        setUsername(buildStudentAppEmail(firstUnassigned.rollNumber));
        setPassword(generateSecureStudentPassword(10));
      } else {
        setSelectedStudentId('');
        setUsername('');
        setPassword(generateSecureStudentPassword(10));
      }
      setEnabled(true);
      setShowPassword(true);
    }
  }, [isOpen, accountToEdit, preselectedStudent]);

  if (!isOpen) return null;

  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) ||
    (accountToEdit
      ? ({
          id: accountToEdit.studentId,
          fullName: accountToEdit.studentName,
          koreanName: accountToEdit.koreanName,
          rollNumber: accountToEdit.rollNumber,
          batch: accountToEdit.assignedBatch,
          studentClass: accountToEdit.studentClass,
          timing: accountToEdit.timing,
        } as Student)
      : undefined);

  const handleStudentChange = (newStudentId: string) => {
    setSelectedStudentId(newStudentId);
    setError(null);
    const chosen = students.find((s) => s.id === newStudentId);
    if (chosen && !accountToEdit) {
      const existingForStudent = existingAccounts.find((a) => a.studentId === chosen.id);
      if (existingForStudent) {
        setUsername(existingForStudent.email || existingForStudent.username);
        setPassword(existingForStudent.password);
        setEnabled(existingForStudent.enabled);
      } else {
        setUsername(buildStudentAppEmail(chosen.rollNumber));
        setPassword(generateSecureStudentPassword(10));
        setEnabled(true);
      }
    }
  };

  const handleAutoGenerateEmail = () => {
    if (selectedStudent) {
      setUsername(buildStudentAppEmail(selectedStudent.rollNumber));
    } else {
      setUsername(`student-${Math.floor(1000 + Math.random() * 9000)}@okkorean.com`);
    }
  };

  const handleAutoGeneratePassword = () => {
    setPassword(generateSecureStudentPassword(10));
    setShowPassword(true);
    setCopiedPassword(false);
  };

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard
      .writeText(password)
      .then(() => {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      })
      .catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setError('Please select an enrolled student first.');
      return;
    }
    const cleanEmail = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Valid app login email is required (e.g., ok-2026-001@okkorean.com).');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      setError('Firebase Auth password must be at least 6 characters long.');
      return;
    }

    const duplicateUsername = existingAccounts.find(
      (acc) =>
        (acc.email || acc.username).trim().toLowerCase() === cleanEmail &&
        acc.studentId !== selectedStudent.id &&
        acc.id !== accountToEdit?.id
    );
    if (duplicateUsername) {
      setError(`Email "${cleanEmail}" is already assigned to ${duplicateUsername.studentName}.`);
      return;
    }

    const payload: Omit<StudentPortalAccount, 'id'> | StudentPortalAccount = {
      ...(accountToEdit
        ? {
            id: accountToEdit.id,
            uid: accountToEdit.uid,
            createdAt: accountToEdit.createdAt,
          }
        : {}),
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      koreanName: selectedStudent.koreanName || '',
      rollNumber: selectedStudent.rollNumber,
      username: cleanEmail,
      email: cleanEmail,
      password: cleanPassword,
      assignedBatch: selectedStudent.batch,
      studentClass: selectedStudent.studentClass || 'Class 1',
      timing: selectedStudent.timing || 'Morning',
      enabled,
      status: enabled ? 'Active' : 'Disabled',
      createdAt: accountToEdit?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(payload, selectedStudent);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to provision Firebase Auth account for student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const existingIds = new Set(existingAccounts.map((a) => a.studentId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-[95%] sm:w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] my-auto animate-fadeIn overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-600 text-white shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {accountToEdit ? 'Edit Student App Credentials' : 'Grant App Access (Firebase Auth)'}
              </h3>
              <p className="text-xs text-slate-400">
                Creates Firebase Auth user & saves email, password & UID to student document
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
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

          {/* Student Selector */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-500" />
              <span>Select Enrolled Student <span className="text-rose-500">*</span></span>
            </label>
            <select
              value={selectedStudentId}
              disabled={Boolean(accountToEdit) || isSubmitting}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {eligibleStudents.length === 0 ? (
                <option value="">No active enrolled students found</option>
              ) : (
                eligibleStudents.map((s) => (
                  <option key={s.id} value={s.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {s.rollNumber} — {s.fullName} ({s.batch.split(' (')[0]}){existingIds.has(s.id) && !accountToEdit ? ' [Access Granted]' : ''}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Selected Student Summary Pill */}
          {selectedStudent && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Roll Number</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-cyan-400">{selectedStudent.rollNumber}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Assigned Batch</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedStudent.batch || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Firebase UID</span>
                <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-emerald-300 truncate block">
                  {accountToEdit?.uid || selectedStudent.uid || 'Pending creation'}
                </span>
              </div>
            </div>
          )}

          {/* App Email & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-cyan-500" />
                  <span>App Login Email <span className="text-rose-500">*</span></span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateEmail}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded-md transition-all cursor-pointer border border-indigo-500/20"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Reset</span>
                </button>
              </div>
              <input
                type="email"
                required
                disabled={isSubmitting}
                placeholder="ok-2026-001@okkorean.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Format: {'${rollNo}@okkorean.com'}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Secure Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGeneratePassword}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-500 hover:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-0.5 rounded-md transition-all cursor-pointer border border-purple-500/20"
                >
                  <KeyRound className="w-3 h-3 text-purple-400" />
                  <span>Regenerate</span>
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setCopiedPassword(false);
                  }}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 pr-18 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-cyan-500"
                />
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      copiedPassword
                        ? 'text-emerald-400 bg-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/60'
                    }`}
                    title={copiedPassword ? 'Copied password!' : 'Copy Password'}
                  >
                    {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Saved in Firestore student doc for admin view
              </span>
            </div>
          </div>

          {/* Enable / Disable Access Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className={`w-4 h-4 mt-0.5 ${enabled ? 'text-emerald-500' : 'text-rose-500'}`} />
              <div>
                <span className="font-bold text-xs text-slate-900 dark:text-white block">
                  Mobile & Portal Access: {enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {enabled
                    ? 'Student can sign into the Mobile App & Student Portal with these credentials.'
                    : 'Login is suspended until re-enabled by an administrator.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={isSubmitting}
              onClick={() => setEnabled(!enabled)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 cursor-pointer shrink-0 ${
                enabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <span className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedStudent || isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Firebase Auth...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{accountToEdit ? 'Save Credentials' : 'Grant App Access'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Check, AlertCircle, Lock, Loader2, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import {
  Student,
  StudentLevel,
  StudentBatch,
  StudentStatus,
  StudentClass,
  ClassTiming,
  BatchRecord,
  RollNumberSettings,
  SerialNumberSettings,
} from '../../types';
import {
  StorageService,
  formatRollNumberFromSettings,
  formatSerialNumberFromSettings,
  getStudentSerialDisplay,
  parseTrailingNumber,
} from '../../services/storageService';
import { AcademyDataService } from '../../services/academyDataService';
import { useAuth } from '../../context/AuthContext';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Omit<Student, 'id'> | Student) => void | Promise<void>;
  studentToEdit?: Student | null;
  existingCount: number;
}

const LEVELS: StudentLevel[] = [
  'Level 1 - Beginner (TOPIK I)',
  'Level 2 - Elementary (TOPIK I)',
  'Level 3 - Intermediate (TOPIK II)',
  'Level 4 - Upper-Intermediate (TOPIK II)',
  'Level 5 - Advanced (TOPIK II)',
];

export const CLASSES: StudentClass[] = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
];

export const TIMINGS: ClassTiming[] = [
  'Morning',
  'Evening',
  'Morning + Evening (Both)',
];

const STATUSES: StudentStatus[] = [
  'Pending Verification',
  'Active',
  'On Leave',
  'Graduated',
  'Stuck / Inactive',
];

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  studentToEdit,
  existingCount
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [batches, setBatches] = useState<BatchRecord[]>(() => AcademyDataService.getBatches());
  const [allStudents, setAllStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [rollSettings, setRollSettings] = useState<RollNumberSettings>(() =>
    StorageService.getRollNumberSettings()
  );
  const [serialSettings, setSerialSettings] = useState<SerialNumberSettings>(() =>
    StorageService.getSerialNumberSettings()
  );
  const [isManualRollModified, setIsManualRollModified] = useState(false);
  const [isManualSerialModified, setIsManualSerialModified] = useState(false);

  const [formData, setFormData] = useState<Omit<Student, 'id'>>({
    serialNumber: existingCount + 1,
    formattedSerialNumber: '',
    rollNumber: '',
    fullName: '',
    koreanName: '',
    fatherName: '',
    contactNumber: '',
    parentWhatsApp: '',
    email: '',
    level: 'Level 1 - Beginner (TOPIK I)',
    batch: '',
    batchId: '',
    batchCode: '',
    studentClass: 'Class 1',
    timing: 'Morning',
    status: 'Pending Verification',
    enrollmentDate: new Date().toISOString().split('T')[0],
    notes: '',
    whatsappOptOut: false,
  });

  const [isLoadingNextId, setIsLoadingNextId] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const uBatches = AcademyDataService.subscribeBatches(setBatches);
    const uStudents = StorageService.subscribeStudents(setAllStudents);
    const uRoll = StorageService.subscribeRollNumberSettings(setRollSettings);
    const uSerial = StorageService.subscribeSerialNumberSettings(setSerialSettings);
    return () => {
      uBatches();
      uStudents();
      uRoll();
      uSerial();
    };
  }, [isOpen]);

  const activeBatches = useMemo(
    () => batches.filter((b) => b.status === 'Active' || b.status === 'Upcoming'),
    [batches]
  );

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsManualRollModified(false);
    setIsManualSerialModified(false);
    setIsSaving(false);

    if (studentToEdit) {
      const normalizedStatus: StudentStatus =
        studentToEdit.status === 'Inactive' ? 'Stuck / Inactive' : studentToEdit.status;
      const hasAppEmail = Boolean(
        studentToEdit.portalEmail ||
          (studentToEdit.uid && studentToEdit.email?.toLowerCase().endsWith('@okkorean.com'))
      );
      const matchedBatch = AcademyDataService.getBatches().find(
        (b) =>
          (studentToEdit.batchId && b.id === studentToEdit.batchId) ||
          b.name === studentToEdit.batch
      );
      setFormData({
        serialNumber: studentToEdit.serialNumber,
        formattedSerialNumber: getStudentSerialDisplay(studentToEdit),
        rollNumber: studentToEdit.rollNumber,
        fullName: studentToEdit.fullName,
        koreanName: studentToEdit.koreanName || '',
        fatherName: studentToEdit.fatherName,
        contactNumber: studentToEdit.contactNumber,
        parentWhatsApp: studentToEdit.parentWhatsApp,
        email: hasAppEmail
          ? studentToEdit.personalEmail ||
            (studentToEdit.email?.toLowerCase().endsWith('@okkorean.com')
              ? ''
              : studentToEdit.email || '')
          : studentToEdit.email || '',
        level: studentToEdit.level,
        batch: matchedBatch?.name || studentToEdit.batch || '',
        batchId: matchedBatch?.id || studentToEdit.batchId || '',
        batchCode: matchedBatch?.code || studentToEdit.batchCode || '',
        studentClass: studentToEdit.studentClass || 'Class 1',
        timing: studentToEdit.timing || 'Morning',
        status: normalizedStatus,
        enrollmentDate: studentToEdit.enrollmentDate,
        notes: studentToEdit.notes || '',
        whatsappOptOut: Boolean(studentToEdit.whatsappOptOut),
      });
      setIsLoadingNextId(false);
    } else {
      const currentRollCfg = StorageService.getRollNumberSettings();
      const currentSerialCfg = StorageService.getSerialNumberSettings();
      const initialBatches = AcademyDataService.getBatches().filter(
        (b) => b.status === 'Active' || b.status === 'Upcoming'
      );
      const firstBatch = initialBatches[0];
      const fallbackSerialNum = Math.max(currentSerialCfg.nextSerialNumber || currentSerialCfg.startingSerial || 1, existingCount + 1);
      const fallbackFormattedSerial = formatSerialNumberFromSettings(fallbackSerialNum, currentSerialCfg);
      const fallbackRollSeq = Math.max(currentRollCfg.nextSerialNumber || currentRollCfg.startingSerial || 1, 1);
      const fallbackRoll = formatRollNumberFromSettings(fallbackRollSeq, currentRollCfg);

      setFormData({
        serialNumber: fallbackSerialNum,
        formattedSerialNumber: fallbackFormattedSerial,
        rollNumber: fallbackRoll,
        fullName: '',
        koreanName: '',
        fatherName: '',
        contactNumber: '',
        parentWhatsApp: '',
        email: '',
        level: (firstBatch?.level as StudentLevel) || 'Level 1 - Beginner (TOPIK I)',
        batch: firstBatch?.name || '',
        batchId: firstBatch?.id || '',
        batchCode: firstBatch?.code || '',
        studentClass: 'Class 1',
        timing:
          firstBatch?.timing === 'Evening'
            ? 'Evening'
            : 'Morning',
        status: 'Pending Verification',
        enrollmentDate: new Date().toISOString().split('T')[0],
        notes: '',
        whatsappOptOut: false,
      });

      setIsLoadingNextId(true);
      StorageService.fetchNextStudentSerialAndRoll()
        .then(({ serialNumber, formattedSerialNumber, rollNumber }) => {
          if (cancelled) return;
          setFormData((prev) => ({
            ...prev,
            serialNumber,
            formattedSerialNumber,
            rollNumber,
          }));
        })
        .catch(() => {
          // Fallback already populated
        })
        .finally(() => {
          if (!cancelled) setIsLoadingNextId(false);
        });
    }

    setError(null);
    return () => {
      cancelled = true;
    };
  }, [studentToEdit, isOpen, existingCount]);

  // If batches finish loading after modal opens on create mode, default to the first active batch if none selected yet
  useEffect(() => {
    if (!isOpen || studentToEdit) return;
    if (!formData.batch && activeBatches.length > 0) {
      const first = activeBatches[0];
      setFormData((prev) => ({
        ...prev,
        batch: first.name,
        batchId: first.id,
        batchCode: first.code,
        level: (first.level as StudentLevel) || prev.level,
        timing: first.timing === 'Evening' ? 'Evening' : 'Morning',
      }));
    }
  }, [isOpen, studentToEdit, activeBatches, formData.batch]);

  if (!isOpen) return null;

  const isStuckLocked =
    formData.status === 'Stuck / Inactive' || formData.status === 'Inactive';
  const canManualRollEdit = !studentToEdit && isAdmin && (rollSettings.allowManualOverride || !rollSettings.autoGenerate);
  const canManualSerialEdit = !studentToEdit && isAdmin && (serialSettings.allowManualOverride || !serialSettings.autoGenerate);
  const formatRollSample = formatRollNumberFromSettings(rollSettings.startingSerial || 1, rollSettings);
  const formatSerialSample = formatSerialNumberFromSettings(serialSettings.startingSerial || 1, serialSettings);

  const selectedBatchRecord = batches.find(
    (b) => (formData.batchId && b.id === formData.batchId) || b.name === formData.batch
  );

  const handleBatchSelection = (selectedNameOrId: string) => {
    const matched = batches.find((b) => b.id === selectedNameOrId || b.name === selectedNameOrId);
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        batch: matched.name as StudentBatch,
        batchId: matched.id,
        batchCode: matched.code,
        level: (LEVELS.includes(matched.level as StudentLevel) ? (matched.level as StudentLevel) : prev.level),
        timing:
          matched.timing === 'Evening'
            ? 'Evening'
            : matched.timing === 'Morning'
            ? 'Morning'
            : prev.timing,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        batch: selectedNameOrId as StudentBatch,
        batchId: '',
        batchCode: '',
      }));
    }
  };

  const handleRefreshNextRoll = async () => {
    setIsLoadingNextId(true);
    try {
      const { rollNumber } = await StorageService.fetchNextStudentSerialAndRoll();
      setFormData((prev) => ({ ...prev, rollNumber }));
      setIsManualRollModified(false);
    } finally {
      setIsLoadingNextId(false);
    }
  };

  const handleRefreshNextSerial = async () => {
    setIsLoadingNextId(true);
    try {
      const { serialNumber, formattedSerialNumber } = await StorageService.fetchNextStudentSerialAndRoll();
      setFormData((prev) => ({ ...prev, serialNumber, formattedSerialNumber }));
      setIsManualSerialModified(false);
    } finally {
      setIsLoadingNextId(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.rollNumber.trim()) {
      setError('Roll Number is required.');
      return;
    }
    const cleanSerial = (formData.formattedSerialNumber || '').trim();
    if (!cleanSerial) {
      setError('Serial Number is required.');
      return;
    }
    if (!formData.fullName.trim()) {
      setError('Student Full Name is required.');
      return;
    }
    if (!formData.fatherName.trim()) {
      setError('Father / Guardian Name is required.');
      return;
    }
    if (!formData.contactNumber.trim()) {
      setError('Student Contact Number is required.');
      return;
    }
    if (!formData.parentWhatsApp.trim()) {
      setError('Parent WhatsApp Number is required for automated alerts.');
      return;
    }
    if (!studentToEdit && activeBatches.length > 0 && !formData.batch.trim()) {
      setError('Please select an active Batch for this student.');
      return;
    }

    setIsSaving(true);
    try {
      if (!studentToEdit) {
        const uniqueness = await StorageService.validateUniqueStudentIds({
          rollNumber: formData.rollNumber.trim(),
          formattedSerialNumber: cleanSerial,
        });
        if (!uniqueness.valid) {
          setError(uniqueness.error || 'Duplicate Roll Number or Serial Number.');
          return;
        }
      }

      const parsedSerialNum = parseTrailingNumber(cleanSerial) ?? formData.serialNumber ?? 1;
      if (studentToEdit) {
        const hasAppEmail = Boolean(
          studentToEdit.portalEmail ||
            (studentToEdit.uid && studentToEdit.email?.toLowerCase().endsWith('@okkorean.com'))
        );
        await onSave({
          ...studentToEdit,
          ...formData,
          rollNumber: studentToEdit.rollNumber,
          serialNumber: studentToEdit.serialNumber,
          formattedSerialNumber: studentToEdit.formattedSerialNumber || cleanSerial,
          id: studentToEdit.id,
          ...(hasAppEmail
            ? {
                personalEmail: formData.email || undefined,
                email: studentToEdit.portalEmail || studentToEdit.email,
              }
            : {}),
        });
      } else {
        await onSave({
          ...formData,
          rollNumber: formData.rollNumber.trim(),
          formattedSerialNumber: cleanSerial,
          serialNumber: parsedSerialNum,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unable to save student record. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-[95%] sm:w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] my-auto animate-fadeIn text-slate-800 dark:text-slate-100 overflow-hidden">
        {/* Header - Fixed & Never Clipped */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                {studentToEdit ? 'Edit Student Profile' : 'Enroll New Student'}
              </h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                {studentToEdit ? `Updating ${studentToEdit.rollNumber}` : 'Register a new Korean language candidate'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {isStuckLocked && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div>
                <span className="font-bold block">Profile Locked — Stuck / Inactive</span>
                <span className="opacity-90">
                  Student profile fields are read-only and excluded from active attendance lists. Change Student Status to Active to unlock.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Independent Roll Number Field */}
            <div>
              <div className="flex items-center justify-between mb-1 gap-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Roll Number {canManualRollEdit ? '(Admin Override)' : '(Auto-Generated)'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {canManualRollEdit && isManualRollModified && (
                    <button
                      type="button"
                      onClick={handleRefreshNextRoll}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 cursor-pointer"
                      title="Reset to next sequential Roll Number"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Auto</span>
                    </button>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                    {isLoadingNextId ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      !canManualRollEdit && <Lock className="w-3 h-3" />
                    )}
                  </span>
                </div>
              </div>
              <input
                type="text"
                required
                readOnly={!canManualRollEdit}
                aria-readonly={!canManualRollEdit}
                value={formData.rollNumber}
                onChange={(e) => {
                  if (!canManualRollEdit) return;
                  setIsManualRollModified(true);
                  setFormData({ ...formData, rollNumber: e.target.value });
                }}
                title={
                  studentToEdit
                    ? 'Roll Number is permanently locked on edit'
                    : canManualRollEdit
                    ? 'Admin Override enabled in Roll Settings'
                    : 'Roll Number is auto-generated from Roll Settings'
                }
                className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold focus:outline-hidden ${
                  canManualRollEdit
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-cyan-300 focus:ring-2 focus:ring-indigo-500'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-cyan-300 cursor-not-allowed select-all'
                }`}
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                {studentToEdit
                  ? 'Roll Number preserved on profile update'
                  : `Roll format: ${formatRollSample}`}
              </span>
            </div>

            {/* Independent Serial Number Field */}
            <div>
              <div className="flex items-center justify-between mb-1 gap-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Serial Number {canManualSerialEdit ? '(Manual Entry)' : '(Auto-Generated)'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {canManualSerialEdit && isManualSerialModified && (
                    <button
                      type="button"
                      onClick={handleRefreshNextSerial}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 cursor-pointer"
                      title="Reset to next sequential Serial Number"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Auto</span>
                    </button>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {isLoadingNextId ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      !canManualSerialEdit && <Lock className="w-3 h-3" />
                    )}
                  </span>
                </div>
              </div>
              <input
                type="text"
                required
                readOnly={!canManualSerialEdit}
                aria-readonly={!canManualSerialEdit}
                value={formData.formattedSerialNumber || ''}
                onChange={(e) => {
                  if (!canManualSerialEdit) return;
                  setIsManualSerialModified(true);
                  setFormData({ ...formData, formattedSerialNumber: e.target.value });
                }}
                title={
                  studentToEdit
                    ? 'Serial Number is permanently locked on edit'
                    : canManualSerialEdit
                    ? 'Manual Serial entry enabled in Serial Settings'
                    : 'Serial Number is auto-generated independently from Roll Number'
                }
                className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold focus:outline-hidden ${
                  canManualSerialEdit
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-emerald-300 cursor-not-allowed select-all'
                }`}
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                {studentToEdit
                  ? 'Serial Number preserved on profile update'
                  : `Independent Serial format: ${formatSerialSample}`}
              </span>
            </div>

            {/* Status (Includes Pending Verification & Stuck / Inactive) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Student Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:ring-2 focus:outline-hidden cursor-pointer ${
                  isStuckLocked
                    ? 'border-red-500/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 focus:ring-red-500 font-bold'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500'
                }`}
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {st}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                {formData.status === 'Pending Verification' 
                  ? '⚡ Automatically activates once fingerprint is enrolled on ZKTeco K40'
                  : isStuckLocked
                    ? '🔒 Excluded from active attendance lists & profile locked'
                    : 'Current institutional standing'}
              </span>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Full Name (English) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isStuckLocked}
                placeholder="e.g. Ali Hassan"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Korean Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Korean Name (한국어 이름) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                disabled={isStuckLocked}
                placeholder="e.g. 알리 하산"
                value={formData.koreanName}
                onChange={(e) => setFormData({ ...formData, koreanName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-korean focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Father Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Father / Guardian Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isStuckLocked}
                placeholder="e.g. Hassan Mahmood"
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled={isStuckLocked}
                placeholder="student@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Student Contact */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Student Contact Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                disabled={isStuckLocked}
                placeholder="+92 301 5550192"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Parent WhatsApp */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Parent WhatsApp (with Country Code) <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                disabled={isStuckLocked}
                placeholder="+92 300 1234567"
                value={formData.parentWhatsApp}
                onChange={(e) => setFormData({ ...formData, parentWhatsApp: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Used for automated attendance & test alerts</span>
              <label className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={isStuckLocked}
                  checked={!formData.whatsappOptOut}
                  onChange={(e) => setFormData({ ...formData, whatsappOptOut: !e.target.checked })}
                  className="rounded text-emerald-600 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed"
                />
                <span>Receive automated WhatsApp alerts (Parent Consent)</span>
              </label>
            </div>

            {/* Course Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Course Level <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isStuckLocked}
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as StudentLevel })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Batch (Dynamic from Batch & Classes) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Assigned Batch <span className="text-rose-500">*</span>
              </label>
              {activeBatches.length === 0 && !formData.batch ? (
                <div className="px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No active batches created yet. Add a batch in Batch &amp; Classes first.</span>
                </div>
              ) : (
                <>
                  <select
                    disabled={isStuckLocked}
                    value={selectedBatchRecord?.id || formData.batch}
                    onChange={(e) => handleBatchSelection(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                  >
                    {!formData.batch && (
                      <option value="">Select an active batch...</option>
                    )}
                    {activeBatches.map((b) => {
                      const enrolled = allStudents.filter(
                        (s) =>
                          s.batchId === b.id ||
                          (s.batch || '').trim().toLowerCase() === b.name.trim().toLowerCase()
                      ).length;
                      const seatsLeft = Math.max(0, (b.capacity || 0) - enrolled);
                      return (
                        <option
                          key={b.id}
                          value={b.id}
                          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        >
                          {b.name} ({b.code}) · {b.timing} {b.startTime}-{b.endTime} · {seatsLeft}/{b.capacity} seats
                        </option>
                      );
                    })}
                    {formData.batch && !activeBatches.some((b) => b.id === selectedBatchRecord?.id) && (
                      <option
                        value={selectedBatchRecord?.id || formData.batch}
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      >
                        {formData.batch} {selectedBatchRecord ? `(${selectedBatchRecord.status})` : '(Legacy)'}
                      </option>
                    )}
                  </select>
                  {selectedBatchRecord && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-mono font-bold border border-cyan-500/20">
                        <Layers className="w-2.5 h-2.5" />
                        {selectedBatchRecord.code}
                      </span>
                      <span>
                        {selectedBatchRecord.scheduleDays} · {selectedBatchRecord.startTime}-{selectedBatchRecord.endTime}
                      </span>
                      {selectedBatchRecord.teacherName && (
                        <span>· {selectedBatchRecord.teacherName}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Assigned Class (Class 1 to Class 7) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Class <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isStuckLocked}
                value={formData.studentClass || 'Class 1'}
                onChange={(e) => setFormData({ ...formData, studentClass: e.target.value as StudentClass })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer font-medium"
              >
                {CLASSES.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Timing */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Class Timing <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isStuckLocked}
                value={formData.timing || 'Morning'}
                onChange={(e) => setFormData({ ...formData, timing: e.target.value as ClassTiming })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer font-medium"
              >
                {TIMINGS.map((t) => (
                  <option key={t} value={t} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Enrollment Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Enrollment Date
              </label>
              <input
                type="date"
                disabled={isStuckLocked}
                value={formData.enrollmentDate}
                onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Academic Notes & Objectives
              </label>
              <input
                type="text"
                disabled={isStuckLocked}
                placeholder="e.g. TOPIK Level 2 / EPS candidate"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoadingNextId || isSaving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isSaving ? 'Saving...' : studentToEdit ? 'Save Changes' : 'Confirm Enrollment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

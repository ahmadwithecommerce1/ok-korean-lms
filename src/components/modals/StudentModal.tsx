import React, { useState, useEffect } from 'react';
import { X, User, Phone, BookOpen, Clock, Calendar, Check, AlertCircle } from 'lucide-react';
import { Student, StudentLevel, StudentBatch, StudentStatus, StudentClass, ClassTiming } from '../../types';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Omit<Student, 'id'> | Student) => void;
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

const BATCHES: StudentBatch[] = [
  'Batch A (Morning 09:00 - 11:00)',
  'Batch B (Afternoon 14:00 - 16:00)',
  'Batch C (Evening 18:00 - 20:00)',
  'Batch D (Weekend Intensive)',
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

const STATUSES: StudentStatus[] = ['Pending Verification', 'Active', 'On Leave', 'Graduated', 'Inactive'];

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  studentToEdit,
  existingCount
}) => {
  const [formData, setFormData] = useState<Omit<Student, 'id'>>({
    rollNumber: '',
    fullName: '',
    koreanName: '',
    fatherName: '',
    contactNumber: '',
    parentWhatsApp: '',
    email: '',
    level: 'Level 1 - Beginner (TOPIK I)',
    batch: 'Batch A (Morning 09:00 - 11:00)',
    studentClass: 'Class 1',
    timing: 'Morning',
    status: 'Pending Verification',
    enrollmentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentToEdit) {
      setFormData({
        rollNumber: studentToEdit.rollNumber,
        fullName: studentToEdit.fullName,
        koreanName: studentToEdit.koreanName || '',
        fatherName: studentToEdit.fatherName,
        contactNumber: studentToEdit.contactNumber,
        parentWhatsApp: studentToEdit.parentWhatsApp,
        email: studentToEdit.email || '',
        level: studentToEdit.level,
        batch: studentToEdit.batch,
        studentClass: studentToEdit.studentClass || 'Class 1',
        timing: studentToEdit.timing || 'Morning',
        status: studentToEdit.status,
        enrollmentDate: studentToEdit.enrollmentDate,
        notes: studentToEdit.notes || '',
      });
    } else {
      // Auto generate Roll Number
      const nextNum = (existingCount + 1).toString().padStart(3, '0');
      setFormData({
        rollNumber: `OK-2025-${nextNum}`,
        fullName: '',
        koreanName: '',
        fatherName: '',
        contactNumber: '',
        parentWhatsApp: '',
        email: '',
        level: 'Level 1 - Beginner (TOPIK I)',
        batch: 'Batch A (Morning 09:00 - 11:00)',
        studentClass: 'Class 1',
        timing: 'Morning',
        status: 'Pending Verification',
        enrollmentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
    setError(null);
  }, [studentToEdit, isOpen, existingCount]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    if (studentToEdit) {
      onSave({ ...formData, id: studentToEdit.id });
    } else {
      onSave(formData);
    }
    onClose();
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Roll Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Roll Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Status (Dark/Light Background) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Student Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
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
                placeholder="e.g. Ali Hassan"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Korean Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Korean Name (한국어 이름) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 알리 하산"
                value={formData.koreanName}
                onChange={(e) => setFormData({ ...formData, koreanName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-korean focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
                placeholder="e.g. Hassan Mahmood"
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="student@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
                placeholder="+92 301 5550192"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
                placeholder="+92 300 1234567"
                value={formData.parentWhatsApp}
                onChange={(e) => setFormData({ ...formData, parentWhatsApp: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Used for direct WhatsApp report cards & alerts</span>
            </div>

            {/* Course Level (Dark/Light Background) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Course Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as StudentLevel })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Batch (Dark/Light Background) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Assigned Batch <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value as StudentBatch })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                {BATCHES.map((b) => (
                  <option key={b} value={b} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Class (Class 1 to Class 7) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.studentClass || 'Class 1'}
                onChange={(e) => setFormData({ ...formData, studentClass: e.target.value as StudentClass })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer font-medium"
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
                value={formData.timing || 'Morning'}
                onChange={(e) => setFormData({ ...formData, timing: e.target.value as ClassTiming })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer font-medium"
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
                value={formData.enrollmentDate}
                onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Academic Notes & Objectives
              </label>
              <input
                type="text"
                placeholder="e.g. TOPIK Level 2 / EPS candidate"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{studentToEdit ? 'Save Changes' : 'Confirm Enrollment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

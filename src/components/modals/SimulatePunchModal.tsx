import React, { useState } from 'react';
import { 
  Fingerprint, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  User, 
  RefreshCw, 
  Cpu, 
  Sparkles,
  Zap
} from 'lucide-react';
import { Student, StudentBatch, AttendanceRecord } from '../../types';
import { StorageService } from '../../services/storageService';

interface SimulatePunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  currentBatch: StudentBatch;
  currentDate: string;
  onSuccess: (studentName: string, roll: string) => void;
}

export const SimulatePunchModal: React.FC<SimulatePunchModalProps> = ({
  isOpen,
  onClose,
  students,
  currentBatch,
  currentDate,
  onSuccess
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    const firstInBatch = students.find(s => s.batch === currentBatch);
    return firstInBatch ? firstInBatch.id : (students[0]?.id || '');
  });
  const [manualRoll, setManualRoll] = useState<string>('');
  const [useManualRoll, setUseManualRoll] = useState<boolean>(false);
  const [punchTime, setPunchTime] = useState<string>(() => {
    const d = new Date();
    return d.toTimeString().split(' ')[0]; // HH:mm:ss
  });
  const [isPunching, setIsPunching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleSimulate = async () => {
    setIsPunching(true);
    setError(null);

    const query = useManualRoll ? manualRoll.trim() : (selectedStudent?.rollNumber || selectedStudentId);

    if (!query) {
      setError('Please select a student or enter a roll number.');
      setIsPunching(false);
      return;
    }

    try {
      const res = await StorageService.simulateFingerprintPunch(query, currentDate, punchTime);
      if (res.success && res.student) {
        onSuccess(res.student.fullName, res.student.rollNumber);
        onClose();
      } else {
        setError(res.error || 'Failed to simulate biometric punch.');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing biometric punch.');
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 to-purple-900 text-white flex items-center justify-between border-b border-indigo-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/30 border border-indigo-400/30 text-emerald-400 shadow-md">
              <Fingerprint className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Simulate Fingerprint Punch</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/40 text-indigo-200 border border-indigo-400/30 uppercase">
                  Hardware Test
                </span>
              </h3>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Emulates a ZKTeco K40 biometric scan & writes to Firestore
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Toggle between dropdown and manual roll input */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Select Student Candidate</span>
            <button
              type="button"
              onClick={() => setUseManualRoll(!useManualRoll)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              {useManualRoll ? 'Choose from list' : 'Type Roll No manually'}
            </button>
          </div>

          {!useManualRoll ? (
            <div>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.rollNumber} - {s.fullName} ({s.batch.split(' (')[0]})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={manualRoll}
                onChange={(e) => setManualRoll(e.target.value)}
                placeholder="e.g. OK-2025-001 or 1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Student Preview Card */}
          {selectedStudent && !useManualRoll && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {selectedStudent.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {selectedStudent.fullName}
                    </span>
                    {selectedStudent.koreanName && (
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-korean font-semibold">
                        {selectedStudent.koreanName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {selectedStudent.rollNumber} · {selectedStudent.batch.split(' (')[0]}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedStudent.biometricEnrolled 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                }`}>
                  <Fingerprint className="w-3 h-3" />
                  {selectedStudent.biometricEnrolled ? 'Enrolled' : 'Not Enrolled'}
                </span>
              </div>
            </div>
          )}

          {/* Time & Date Parameters */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Attendance Date
              </label>
              <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentDate}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Punch Time (HH:mm:ss)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={punchTime}
                  onChange={(e) => setPunchTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Writing this simulated punch writes an attendance document with <code className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">source: 'Device'</code> and <code className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">status: 'Present'</code>. The Red fingerprint icon will instantly turn <strong>Green</strong> via real-time <code className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">onSnapshot</code>.
          </div>
        </div>

        {/* Action Button */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSimulate}
            disabled={isPunching}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isPunching ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Fingerprint className="w-4 h-4 text-emerald-200" />
            )}
            <span>Simulate Punch (Turn Green)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

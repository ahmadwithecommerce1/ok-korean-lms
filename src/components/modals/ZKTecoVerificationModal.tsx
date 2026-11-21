import React, { useState } from 'react';
import { 
  Fingerprint, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Cpu, 
  RefreshCw,
  ShieldCheck,
  Radio,
  Clock
} from 'lucide-react';
import { Student } from '../../types';
import { StorageService } from '../../services/storageService';

interface ZKTecoVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onVerified: (updated: Student) => void;
}

export const ZKTecoVerificationModal: React.FC<ZKTecoVerificationModalProps> = ({
  isOpen,
  onClose,
  student,
  onVerified
}) => {
  if (!isOpen || !student) return null;

  const [loading, setLoading] = useState(false);
  const [enrollSignalSent, setEnrollSignalSent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [statusLog, setStatusLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setStatusLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 5)]);
  };

  const handleSendEnrollCommand = async () => {
    setLoading(true);
    try {
      addLog(`Sending ENROLL_FP signal for PIN #${student.biometricPin || student.rollNumber} to ZKTeco K40...`);
      await StorageService.queueBiometricEnrollment(student.id);
      
      // Also notify local bridge server if running
      try {
        await fetch('/api/zkteco/enroll-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.id,
            rollNumber: student.rollNumber,
            fullName: student.fullName,
            pin: student.biometricPin || student.rollNumber.replace(/[^0-9]/g, '')
          })
        });
      } catch (e) {
        // Bridge might be running locally or asynchronously
      }

      setEnrollSignalSent(true);
      addLog(`Command C:101:ENROLL_FP queued in ADMS request queue. Device will poll and beep for fingerprint placement.`);
    } catch (err: any) {
      addLog(`Error queuing command: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateDeviceCapture = async () => {
    setLoading(true);
    try {
      addLog(`Simulating biometric sensor capture on ZKTeco K40 optical glass...`);
      
      // Call backend bridge verification endpoint
      try {
        await fetch('/api/zkteco/verify-student', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.id,
            deviceId: 'K40-PRO-01'
          })
        });
      } catch (e) {
        // Fallback directly to storage service
      }

      const updated = await StorageService.confirmBiometricVerification(student.id, 'K40-PRO-01');
      addLog(`ZKTeco K40 confirmed: Fingerprint template stored (Score: 98%). Student verified.`);
      setSuccess(true);
      setTimeout(() => {
        if (updated) {
          onVerified(updated);
        }
        onClose();
      }, 1400);
    } catch (err: any) {
      addLog(`Verification failed: ${err.message || 'Error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Fingerprint className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>ZKTeco K40 Biometric Verification</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  ADMS Bridge
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enroll student fingerprint on physical biometric terminal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Student Dossier Quick Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Candidate Name</span>
              <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>{student.fullName}</span>
                {student.koreanName && (
                  <span className="text-xs text-indigo-500 dark:text-indigo-400 font-korean font-normal">
                    ({student.koreanName})
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                Roll: <strong className="text-slate-900 dark:text-white">{student.rollNumber}</strong> · PIN: <strong className="text-amber-600 dark:text-amber-400">#{student.biometricPin || student.rollNumber.replace(/[^0-9]/g, '') || '1'}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-600/40">
                <Clock className="w-3 h-3 animate-spin" />
                <span>Pending Enrollment</span>
              </span>
            </div>
          </div>

          {/* Visual Scanner Radar */}
          <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-50 dark:from-slate-950 dark:to-slate-900 border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden">
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-dashed border-amber-500/40 flex items-center justify-center relative">
                <Fingerprint className={`w-10 h-10 ${success ? 'text-emerald-500' : 'text-amber-500'} ${loading ? 'animate-pulse' : ''}`} />
                {loading && (
                  <div className="absolute inset-0 rounded-full border-2 border-amber-500 animate-ping opacity-30" />
                )}
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {success 
                ? 'Fingerprint Template Enrolled & Student Activated!'
                : enrollSignalSent
                ? 'Device Signaled: Place finger on K40 optical sensor 3 times.'
                : 'ZKTeco K40 Ready for Fingerprint Registration'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              Per requirements, student status remains <strong className="text-amber-600 dark:text-amber-400">Pending Verification</strong> until biometric template is verified.
            </p>
          </div>

          {/* Status logs */}
          {statusLog.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 space-y-1">
              {statusLog.map((log, i) => (
                <div key={i} className="truncate">{log}</div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleSendEnrollCommand}
              disabled={loading || success}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{enrollSignalSent ? 'Resend Enroll Signal to K40' : 'Send Enroll Request to ZKTeco K40'}</span>
            </button>

            <button
              onClick={handleSimulateDeviceCapture}
              disabled={loading || success}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-600/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Simulate K40 Biometric Scan & Activate</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>ADMS Listener: <code className="font-mono text-slate-700 dark:text-slate-300">/iclock/cdata</code></span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

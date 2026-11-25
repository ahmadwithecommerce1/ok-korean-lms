import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AttendanceRecord, AttendanceRulesSettings, Student, ZKTecoDeviceConfig, ZKTecoPunchLog } from '../types';

export type FingerprintVisualColor = 'red' | 'yellow' | 'green';

export interface FingerprintVisualState {
  color: FingerprintVisualColor;
  state: 'not_punched' | 'punched_in' | 'punched_out' | 'standard_present';
  badgeText: string;
  tooltip: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function isBiometricRecord(record?: AttendanceRecord): boolean {
  if (!record) return false;
  const sourceStr = String(record.source || '').toLowerCase();
  return (
    sourceStr === 'device' ||
    sourceStr === 'zkteco_k40' ||
    Boolean(record.deviceId) ||
    Boolean(record.punchState) ||
    Boolean(record.checkInTime) ||
    Boolean(record.checkOutTime)
  );
}

function normalizeTimeHHmm(val?: string): string | null {
  if (!val) return null;
  const match = String(val).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = match[1].padStart(2, '0');
  const m = match[2].padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Resolves whether a student belongs to Morning or Evening timing/batch.
 */
export function resolveStudentTimingCategory(params?: {
  timing?: string;
  batch?: string;
  punchTime?: string;
}): 'Morning' | 'Evening' {
  const timingLower = String(params?.timing || '').trim().toLowerCase();
  const batchLower = String(params?.batch || '').trim().toLowerCase();

  if (timingLower.includes('both') || (timingLower.includes('morning') && timingLower.includes('evening'))) {
    const punchHHmm = normalizeTimeHHmm(params?.punchTime);
    if (punchHHmm) {
      return punchHHmm >= '13:00' ? 'Evening' : 'Morning';
    }
    if (batchLower.includes('evening') || batchLower.includes('afternoon')) return 'Evening';
    return 'Morning';
  }

  if (timingLower.includes('evening') || timingLower.includes('afternoon')) {
    return 'Evening';
  }
  if (timingLower.includes('morning')) {
    return 'Morning';
  }

  if (batchLower.includes('evening') || batchLower.includes('afternoon')) {
    return 'Evening';
  }
  return 'Morning';
}

/**
 * Evaluates Morning vs Evening Late Arrival rules with Neutral mode support.
 * If the matching batch's late rule toggle is OFF (false), marks Present (Neutral mode).
 */
export function evaluateBatchLateArrival(params: {
  punchTime?: string;
  timing?: string;
  batch?: string;
  rules?: Partial<AttendanceRulesSettings> | null;
}): {
  status: 'Present' | 'Late';
  batchType: 'Morning' | 'Evening';
  ruleEnabled: boolean;
  cutoffUsed?: string;
} {
  const batchType = resolveStudentTimingCategory({
    timing: params.timing,
    batch: params.batch,
    punchTime: params.punchTime,
  });
  const rules = params.rules || {};

  const ruleEnabled =
    batchType === 'Morning'
      ? Boolean(rules.morningLateEnabled)
      : Boolean(rules.eveningLateEnabled);

  const rawCutoff =
    batchType === 'Morning' ? rules.morningLateTime : rules.eveningLateTime;

  if (!ruleEnabled) {
    return {
      status: 'Present',
      batchType,
      ruleEnabled: false,
    };
  }

  const cutoffHHmm = normalizeTimeHHmm(rawCutoff);
  const punchHHmm = normalizeTimeHHmm(params.punchTime);

  if (!cutoffHHmm || !punchHHmm) {
    return {
      status: 'Present',
      batchType,
      ruleEnabled: true,
      cutoffUsed: cutoffHHmm || undefined,
    };
  }

  return {
    status: punchHHmm > cutoffHHmm ? 'Late' : 'Present',
    batchType,
    ruleEnabled: true,
    cutoffUsed: cutoffHHmm,
  };
}

/**
 * Evaluates whether a biometric punch time is 'Late' or 'Present' against a configured HH:mm lateTime.
 * Returns 'Present' if no lateTime is configured.
 */
export function evaluateBiometricArrivalStatus(
  punchTime?: string,
  lateTime?: string
): 'Present' | 'Late' {
  const normalizedLate = normalizeTimeHHmm(lateTime);
  const normalizedPunch = normalizeTimeHHmm(punchTime);
  if (!normalizedLate || !normalizedPunch) return 'Present';
  return normalizedPunch > normalizedLate ? 'Late' : 'Present';
}

/**
 * Computes the 3-color Fingerprint Icon state for a student based on today's punch status
 * and whether ZKTeco IN/OUT mode is enabled:
 * - Red: Student has NOT punched in today.
 * - Yellow: `inOutModeEnabled` is ON and student has punched IN (1st punch), awaiting OUT.
 * - Green:
 *   - `inOutModeEnabled` is OFF and student has punched IN (Present).
 *   - `inOutModeEnabled` is ON and student has punched OUT (2nd punch).
 */
export function getStudentTodayFingerprintVisual(
  student: Student,
  attendanceRecords: AttendanceRecord[],
  inOutModeEnabled: boolean,
  targetDate: string = getTodayDateStr()
): FingerprintVisualState {
  const todayRecord = attendanceRecords.find(
    (r) => r.studentId === student.id && r.date === targetDate
  );

  const hasRecordPunch =
    Boolean(todayRecord) &&
    (todayRecord?.status === 'Present' || todayRecord?.status === 'Late') &&
    isBiometricRecord(todayRecord);

  const hasStudentPunch =
    student.lastPunchDate === targetDate &&
    (Boolean(student.lastPunchState) ||
      (Boolean(student.punchStatus) && student.punchStatus !== 'Not Punched'));

  if (!hasRecordPunch && !hasStudentPunch) {
    return {
      color: 'red',
      state: 'not_punched',
      badgeText: 'Not Punched Today',
      tooltip: student.biometricEnrolled
        ? 'Not Punched Today (Red)'
        : 'Not Punched Today — Awaiting fingerprint scan (Red)',
    };
  }

  const resolvedState =
    todayRecord?.punchState ||
    (todayRecord?.checkOutTime || (todayRecord?.punchCount && todayRecord.punchCount >= 2)
      ? 'out'
      : undefined) ||
    (student.lastPunchDate === targetDate
      ? student.lastPunchState ||
        (student.punchStatus === 'OUT'
          ? 'out'
          : student.punchStatus === 'IN'
            ? 'in'
            : undefined)
      : undefined) ||
    'single';

  const checkInTime =
    todayRecord?.checkInTime ||
    todayRecord?.time ||
    (student.lastPunchDate === targetDate ? student.lastPunchTime : undefined);
  const checkOutTime = todayRecord?.checkOutTime;

  if (!inOutModeEnabled) {
    return {
      color: 'green',
      state: 'standard_present',
      badgeText: 'Punched',
      tooltip: checkInTime
        ? `Punched at ${checkInTime} (Standard Mode - Solid Green)`
        : 'Punched (Standard Mode - Solid Green)',
      checkInTime,
      checkOutTime,
    };
  }

  // IN/OUT Mode is ON
  if (resolvedState === 'out' || Boolean(checkOutTime) || (todayRecord?.punchCount || 0) >= 2) {
    return {
      color: 'green',
      state: 'punched_out',
      badgeText: 'Punched OUT',
      tooltip: `Punched OUT${checkOutTime ? ` at ${checkOutTime}` : ''}${
        checkInTime ? ` (IN: ${checkInTime})` : ''
      } (Solid Green)`,
      checkInTime,
      checkOutTime,
    };
  }

  // First punch (IN) while IN/OUT mode is ON -> Yellow
  return {
    color: 'yellow',
    state: 'punched_in',
    badgeText: 'Punched IN',
    tooltip: `Punched IN${checkInTime ? ` at ${checkInTime}` : ''} — Awaiting Punch OUT (Yellow)`,
    checkInTime,
  };
}

/**
 * Real-time Firebase listener utility for ZKTeco biometric punches, device config,
 * and attendance synchronization.
 */
export const ZKTecoListenerService = {
  subscribeLivePunches(
    callback: (punches: ZKTecoPunchLog[]) => void,
    maxItems: number = 30
  ): () => void {
    return onSnapshot(
      collection(db, 'zkteco_punches'),
      (snapshot) => {
        const list: ZKTecoPunchLog[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            userId: String(data.userId || ''),
            studentId: data.studentId,
            studentRoll: data.studentRoll,
            studentName: data.studentName,
            timestamp: data.timestamp || `${data.date || ''} ${data.time || ''}`.trim(),
            date: data.date || '',
            time: data.time || '',
            status: data.status === 'Late' ? 'Late' : 'Present',
            punchState: data.punchState,
            punchType: data.punchType,
            rawPayload: data.rawPayload || '',
            deviceId: data.deviceId,
            syncedToFirestore: true,
          };
        });

        list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        callback(list.slice(0, maxItems));
      },
      (err) => {
        console.warn('ZKTeco punches live listener notice:', err.message);
      }
    );
  },

  subscribeDeviceMode(callback: (config: ZKTecoDeviceConfig | null) => void): () => void {
    return onSnapshot(
      doc(db, 'settings', 'zkteco_device'),
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as ZKTecoDeviceConfig);
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn('ZKTeco device config listener notice:', err.message);
      }
    );
  },
};

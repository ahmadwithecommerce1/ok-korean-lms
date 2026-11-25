import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { TeacherActivityRecord, TeacherOnlineStatus } from '../types';

const ACTIVE_SESSION_STORAGE_KEY = 'ok_korean_active_teacher_activity_v1';
const LOCAL_ACTIVITY_CACHE_KEY = 'ok_korean_teacher_activity_cache_v1';

interface ActiveTeacherSessionMeta {
  sessionId: string;
  teacherId: string;
  teacherName: string;
  teacherUsername?: string;
  assignedBatch?: string;
  loginTimeMs: number;
  date: string;
  closedAtMs?: number;
}

let cachedRecords: TeacherActivityRecord[] = (() => {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITY_CACHE_KEY);
    return raw ? (JSON.parse(raw) as TeacherActivityRecord[]) : [];
  } catch {
    return [];
  }
})();

const listeners = new Set<(records: TeacherActivityRecord[]) => void>();
let activityUnsub: Unsubscribe | null = null;
let pendingLoginPromise: Promise<string> | null = null;

function persistCache(records: TeacherActivityRecord[]) {
  try {
    localStorage.setItem(LOCAL_ACTIVITY_CACHE_KEY, JSON.stringify(records.slice(0, 500)));
  } catch {
    // ignore storage quota errors
  }
}

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb(cachedRecords);
    } catch (err) {
      console.error('TeacherActivity listener error:', err);
    }
  });
}

export const HEARTBEAT_INTERVAL_MS = 20000;
export const ONLINE_FRESH_THRESHOLD_MS = 30000;
export const TIMEOUT_THRESHOLD_MS = 60000;

export function isSessionOnline(status?: TeacherOnlineStatus | string): boolean {
  return status === 'Online' || status === 'Active';
}

export function isSessionAway(status?: TeacherOnlineStatus | string): boolean {
  return status === 'Away' || status === 'Inactive';
}

export function getRecordLastActiveMs(rec?: Partial<TeacherActivityRecord> | null): number {
  if (!rec) return 0;
  return (
    toDateObj(rec.lastActiveAt)?.getTime() ||
    toDateObj(rec.lastActiveTabTime)?.getTime() ||
    toDateObj(rec.loginTime)?.getTime() ||
    0
  );
}

export function formatRelativeLastActive(lastActiveMs: number, nowMs: number = Date.now()): string {
  if (!lastActiveMs || Number.isNaN(lastActiveMs)) return 'Never';
  const diffSec = Math.max(0, Math.floor((nowMs - lastActiveMs) / 1000));
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec} ${diffSec === 1 ? 'sec' : 'secs'} ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export interface ResolvedTeacherPresence {
  effectiveStatus: 'Online' | 'Away' | 'Offline';
  label: 'Online' | 'Away' | 'Offline' | 'Offline (Timeout)';
  isTimedOut: boolean;
  lastActiveMs: number;
  diffMs: number;
}

export function resolveTeacherSessionPresence(
  rec?: Partial<TeacherActivityRecord> | null,
  nowMs: number = Date.now()
): ResolvedTeacherPresence {
  const lastActiveMs = getRecordLastActiveMs(rec);
  const diffMs = lastActiveMs ? Math.max(0, nowMs - lastActiveMs) : Infinity;

  if (!rec || rec.status === 'Offline' || Boolean(rec.logoutTime)) {
    return {
      effectiveStatus: 'Offline',
      label: 'Offline',
      isTimedOut: false,
      lastActiveMs,
      diffMs,
    };
  }

  // Timeout rule: > 60 seconds without a heartbeat -> Offline (Timeout)
  if (diffMs > TIMEOUT_THRESHOLD_MS) {
    return {
      effectiveStatus: 'Offline',
      label: 'Offline (Timeout)',
      isTimedOut: true,
      lastActiveMs,
      diffMs,
    };
  }

  if (isSessionAway(rec.status)) {
    return {
      effectiveStatus: 'Away',
      label: 'Away',
      isTimedOut: false,
      lastActiveMs,
      diffMs,
    };
  }

  return {
    effectiveStatus: 'Online',
    label: 'Online',
    isTimedOut: false,
    lastActiveMs,
    diffMs,
  };
}

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDateObj(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6));
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatActivityDate(value: any): string {
  const d = toDateObj(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatActivityTime(value: any): string {
  const d = toDateObj(value);
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatActivityTimestamp(value: any): string {
  const d = toDateObj(value);
  if (!d) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSessionDuration(loginMs: number, logoutMs: number): string {
  const diffMs = Math.max(0, logoutMs - loginMs);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'min' : 'mins'}`;
  }
  if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  if (totalMinutes > 0) {
    return `${totalMinutes} ${totalMinutes === 1 ? 'min' : 'mins'}`;
  }
  return '< 1 min';
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Reusable CSV export utility for Teacher Activity History logs.
 */
export function exportTeacherActivityToCsv(
  records: TeacherActivityRecord[],
  filename: string = `teacher-activity-history-${getLocalDateKey()}.csv`
): void {
  const headers = [
    'Teacher Name',
    'Username',
    'Date',
    'Login Time',
    'Logout Time',
    'Active Duration',
    'Current Status',
    'Last Active Tab Time',
  ];

  const rows = records.map((rec) => {
    const isClosed = rec.status === 'Offline' && Boolean(rec.logoutTime);
    const loginMs = toDateObj(rec.loginTime)?.getTime();
    const duration = isClosed
      ? rec.sessionDuration || rec.totalSessionTime || '< 1 min'
      : loginMs
      ? `${formatSessionDuration(loginMs, Date.now())} (Active)`
      : rec.sessionDuration || 'Currently Active';

    return [
      rec.teacherName || 'Unknown Teacher',
      rec.teacherUsername || rec.teacherId || '',
      formatActivityDate(rec.loginTime),
      formatActivityTime(rec.loginTime),
      isClosed ? formatActivityTime(rec.logoutTime) : 'Currently Active',
      duration,
      rec.status,
      formatActivityTimestamp(rec.lastActiveTabTime || rec.lastActiveAt),
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function getStoredActiveSession(): ActiveTeacherSessionMeta | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveTeacherSessionMeta) : null;
  } catch {
    return null;
  }
}

function setStoredActiveSession(meta: ActiveTeacherSessionMeta | null) {
  try {
    if (!meta) {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(meta));
    }
  } catch {
    // ignore storage errors
  }
}

function sortRecords(list: TeacherActivityRecord[]): TeacherActivityRecord[] {
  return [...list].sort((a, b) => {
    const aMs = toDateObj(a.loginTime)?.getTime() || 0;
    const bMs = toDateObj(b.loginTime)?.getTime() || 0;
    return bMs - aMs;
  });
}

function ensureListener() {
  if (activityUnsub) return;
  try {
    activityUnsub = onSnapshot(
      collection(db, 'teacher_activity'),
      (snapshot) => {
        const list: TeacherActivityRecord[] = snapshot.docs.map((d) => {
          const data = d.data() as TeacherActivityRecord;
          return {
            ...data,
            id: d.id,
            sessionDuration: data.sessionDuration || data.totalSessionTime || '< 1 min',
          };
        });
        cachedRecords = sortRecords(list);
        persistCache(cachedRecords);
        notifyListeners();
      },
      (err) => {
        console.warn('Live sync notice (teacher_activity):', err.message);
      }
    );
  } catch (err) {
    console.warn('Unable to subscribe teacher_activity:', err);
  }
}

async function closePreviousUnclosedSessions(teacherId: string, excludeSessionId?: string) {
  try {
    const q = query(
      collection(db, 'teacher_activity'),
      where('teacherId', '==', teacherId)
    );
    const snap = await getDocs(q);
    const nowTs = Timestamp.now();
    const nowMs = nowTs.toMillis();

    const updates = snap.docs
      .filter((docSnap) => {
        if (docSnap.id === excludeSessionId) return false;
        const st = docSnap.data()?.status;
        return st !== 'Offline';
      })
      .map((docSnap) => {
        const data = docSnap.data();
        const loginMs =
          toDateObj(data.loginTime)?.getTime() ||
          toDateObj(data.lastActiveTabTime)?.getTime() ||
          nowMs;
        const lastActiveMs =
          toDateObj(data.lastActiveTabTime)?.getTime() ||
          toDateObj(data.lastActiveAt)?.getTime();
        const effectiveLogoutMs =
          lastActiveMs && lastActiveMs >= loginMs ? lastActiveMs : nowMs;
        const durationStr = formatSessionDuration(loginMs, effectiveLogoutMs);

        return updateDoc(doc(db, 'teacher_activity', docSnap.id), {
          status: 'Offline',
          logoutTime: Timestamp.fromMillis(effectiveLogoutMs),
          sessionDuration: durationStr,
          totalSessionTime: durationStr,
        });
      });

    if (updates.length > 0) {
      await Promise.allSettled(updates);
    }
  } catch (err) {
    console.warn('Could not close previous unclosed teacher sessions:', err);
  }
}

export const TeacherActivityService = {
  getActivityRecords(): TeacherActivityRecord[] {
    ensureListener();
    return cachedRecords;
  },

  subscribeTeacherActivity(cb: (records: TeacherActivityRecord[]) => void): () => void {
    ensureListener();
    listeners.add(cb);
    cb(cachedRecords);
    return () => {
      listeners.delete(cb);
    };
  },

  /**
   * Creates a new session document in `teacher_activity` every time a teacher logs in,
   * preserving full historical login/logout logs across days and multiple sessions per day.
   */
  async onLogin(params: {
    teacherId: string;
    teacherName: string;
    teacherUsername?: string;
    assignedBatch?: string;
  }): Promise<string> {
    const nowTs = Timestamp.now();
    const nowMs = nowTs.toMillis();
    const dateKey = getLocalDateKey(new Date(nowMs));
    const safeId = (params.teacherId || params.teacherUsername || 'teacher')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const sessionId = `ta_${safeId}_${nowMs}`;

    const sessionMeta: ActiveTeacherSessionMeta = {
      sessionId,
      teacherId: params.teacherId,
      teacherName: params.teacherName,
      teacherUsername: params.teacherUsername,
      assignedBatch: params.assignedBatch,
      loginTimeMs: nowMs,
      date: dateKey,
    };
    setStoredActiveSession(sessionMeta);

    const record: TeacherActivityRecord = {
      id: sessionId,
      teacherId: params.teacherId,
      teacherName: params.teacherName,
      teacherUsername: params.teacherUsername || params.teacherId,
      assignedBatch: params.assignedBatch || '',
      status: 'Online',
      loginTime: nowTs,
      logoutTime: null,
      sessionDuration: 'Currently Active',
      totalSessionTime: 'Currently Active',
      lastActiveTabTime: nowTs,
      date: dateKey,
      lastActiveAt: nowTs,
    };

    cachedRecords = sortRecords([record, ...cachedRecords.filter((r) => r.id !== sessionId)]);
    persistCache(cachedRecords);
    notifyListeners();

    const writePromise = (async () => {
      try {
        await closePreviousUnclosedSessions(params.teacherId, sessionId);
        await setDoc(doc(db, 'teacher_activity', sessionId), record);
      } catch (err) {
        console.warn('TeacherActivity onLogin write warning:', err);
      } finally {
        pendingLoginPromise = null;
      }
      return sessionId;
    })();

    pendingLoginPromise = writePromise;
    return writePromise;
  },

  /**
   * Called on page reload / session restore or tab return:
   * - If the stored session belongs to today and wasn't closed long ago (> 2 mins), resume it cleanly.
   * - Otherwise create a new historical session document.
   */
  async ensureSessionOnline(params: {
    teacherId: string;
    teacherName: string;
    teacherUsername?: string;
    assignedBatch?: string;
  }): Promise<string> {
    if (pendingLoginPromise) {
      return pendingLoginPromise;
    }

    const existing = getStoredActiveSession();
    const todayKey = getLocalDateKey(new Date());
    const closedRecently =
      !existing?.closedAtMs || Date.now() - existing.closedAtMs < 2 * 60 * 1000;

    if (
      existing &&
      existing.teacherId === params.teacherId &&
      existing.date === todayKey &&
      closedRecently
    ) {
      const nowTs = Timestamp.now();
      const updatedMeta: ActiveTeacherSessionMeta = { ...existing, closedAtMs: undefined };
      setStoredActiveSession(updatedMeta);

      cachedRecords = cachedRecords.map((r) =>
        r.id === existing.sessionId
          ? {
              ...r,
              status: 'Online',
              logoutTime: null,
              sessionDuration: 'Currently Active',
              totalSessionTime: 'Currently Active',
              lastActiveTabTime: nowTs,
              lastActiveAt: nowTs,
            }
          : r
      );
      persistCache(cachedRecords);
      notifyListeners();

      try {
        await setDoc(
          doc(db, 'teacher_activity', existing.sessionId),
          {
            teacherId: params.teacherId,
            teacherName: params.teacherName,
            teacherUsername: params.teacherUsername || params.teacherId,
            assignedBatch: params.assignedBatch || '',
            status: 'Online',
            logoutTime: null,
            sessionDuration: 'Currently Active',
            totalSessionTime: 'Currently Active',
            lastActiveTabTime: nowTs,
            date: existing.date,
            lastActiveAt: nowTs,
          },
          { merge: true }
        );
        return existing.sessionId;
      } catch {
        // Fall through to create a fresh session if write failed
      }
    }

    return this.onLogin(params);
  },

  /**
   * visibilitychange (hidden): Teacher switched browser tabs or minimized window.
   * Updates `lastActiveTabTime` and sets status to "Away" without closing the session.
   */
  async onTabHidden(): Promise<void> {
    const active = getStoredActiveSession();
    if (!active) return;

    const nowTs = Timestamp.now();

    cachedRecords = cachedRecords.map((r) =>
      r.id === active.sessionId && r.status !== 'Offline'
        ? {
            ...r,
            status: 'Away',
            lastActiveTabTime: nowTs,
            lastActiveAt: nowTs,
          }
        : r
    );
    persistCache(cachedRecords);
    notifyListeners();

    try {
      await updateDoc(doc(db, 'teacher_activity', active.sessionId), {
        status: 'Away',
        lastActiveTabTime: nowTs,
        lastActiveAt: nowTs,
      });
    } catch (err) {
      console.warn('TeacherActivity onTabHidden warning:', err);
    }
  },

  /**
   * visibilitychange (visible): Teacher returned to the LMS tab.
   * Updates `lastActiveTabTime` and restores status to "Active".
   */
  async onTabVisible(params: {
    teacherId: string;
    teacherName: string;
    teacherUsername?: string;
    assignedBatch?: string;
  }): Promise<void> {
    const active = getStoredActiveSession();
    const todayKey = getLocalDateKey(new Date());

    if (!active || active.teacherId !== params.teacherId || active.date !== todayKey) {
      await this.onLogin(params);
      return;
    }

    const nowTs = Timestamp.now();

    cachedRecords = cachedRecords.map((r) =>
      r.id === active.sessionId
        ? {
            ...r,
            status: 'Active',
            logoutTime: null,
            lastActiveTabTime: nowTs,
            lastActiveAt: nowTs,
          }
        : r
    );
    persistCache(cachedRecords);
    notifyListeners();

    try {
      await updateDoc(doc(db, 'teacher_activity', active.sessionId), {
        status: 'Active',
        logoutTime: null,
        lastActiveTabTime: nowTs,
        lastActiveAt: nowTs,
      });
    } catch {
      await this.ensureSessionOnline(params);
    }
  },

  /**
   * Explicit Sign Out OR tab close:
   * Sets status = "Offline", records logoutTime, and saves calculated sessionDuration.
   */
  async onLogout(reason: 'logout' | 'tab_closed' = 'logout'): Promise<void> {
    const active = getStoredActiveSession();
    if (!active) return;

    const nowTs = Timestamp.now();
    const nowMs = nowTs.toMillis();
    const sessionDuration = formatSessionDuration(active.loginTimeMs, nowMs);

    cachedRecords = cachedRecords.map((r) =>
      r.id === active.sessionId
        ? {
            ...r,
            status: 'Offline',
            logoutTime: nowTs,
            sessionDuration,
            totalSessionTime: sessionDuration,
            lastActiveTabTime: nowTs,
            lastActiveAt: nowTs,
          }
        : r
    );
    persistCache(cachedRecords);
    notifyListeners();

    if (reason === 'logout') {
      setStoredActiveSession(null);
    } else {
      setStoredActiveSession({ ...active, closedAtMs: nowMs });
    }

    try {
      await updateDoc(doc(db, 'teacher_activity', active.sessionId), {
        status: 'Offline',
        logoutTime: nowTs,
        sessionDuration,
        totalSessionTime: sessionDuration,
        lastActiveTabTime: nowTs,
        lastActiveAt: nowTs,
      });
    } catch (err) {
      console.warn('TeacherActivity onLogout Firestore warning:', err);
      this.sendOfflineBeacon(active);
    }
  },

  /**
   * Non-blocking keepalive beacon for beforeunload/pagehide tab close.
   */
  sendOfflineBeacon(explicitMeta?: ActiveTeacherSessionMeta | null): void {
    const active = explicitMeta || getStoredActiveSession();
    if (!active) return;

    setStoredActiveSession({ ...active, closedAtMs: Date.now() });

    const payload = JSON.stringify({
      sessionId: active.sessionId,
      loginTimeMs: active.loginTimeMs,
      teacherId: active.teacherId,
      teacherName: active.teacherName,
    });

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/teacher-activity/offline', blob);
        return;
      }
    } catch {
      // Fallback to fetch keepalive
    }

    try {
      fetch('/api/teacher-activity/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore unload network errors
    }
  },

  async heartbeat(): Promise<void> {
    const active = getStoredActiveSession();
    if (!active) return;

    const isVisible = typeof document === 'undefined' || document.visibilityState === 'visible';
    const nowTs = Timestamp.now();

    cachedRecords = cachedRecords.map((r) =>
      r.id === active.sessionId && r.status !== 'Offline'
        ? {
            ...r,
            lastActiveAt: nowTs,
            ...(isVisible ? { lastActiveTabTime: nowTs } : {}),
          }
        : r
    );
    persistCache(cachedRecords);
    notifyListeners();

    try {
      const patch: Record<string, any> = { lastActiveAt: nowTs };
      if (isVisible) {
        patch.lastActiveTabTime = nowTs;
      }
      await updateDoc(doc(db, 'teacher_activity', active.sessionId), patch);
    } catch {
      // silent heartbeat failure
    }
  },

  /**
   * Deletes all teacher activity history documents from Firebase
   * (`teacher_activity_logs` and `teacher_activity`) without deleting teacher accounts.
   */
  async clearAllTeacherHistory(): Promise<number> {
    cachedRecords = [];
    persistCache([]);
    notifyListeners();

    const collectionsToClear = ['teacher_activity_logs', 'teacher_activity'];
    let deletedCount = 0;

    for (const colName of collectionsToClear) {
      try {
        const snap = await getDocs(collection(db, colName));
        if (!snap.empty) {
          const docs = snap.docs;
          const chunkSize = 400;
          for (let i = 0; i < docs.length; i += chunkSize) {
            const batch = writeBatch(db);
            docs.slice(i, i + chunkSize).forEach((docSnap) => {
              batch.delete(doc(db, colName, docSnap.id));
            });
            await batch.commit();
          }
          deletedCount += docs.length;
        }
      } catch (err) {
        console.warn(`Unable to clear "${colName}" from Firestore:`, err);
      }
    }

    return deletedCount;
  },
};

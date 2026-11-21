import { 
  Student, 
  AttendanceRecord, 
  AttendanceStatus,
  AttendanceSource,
  StudentBatch,
  WeeklyTest, 
  FeeRecord, 
  ActivityLog, 
  AcademySettings,
  TeacherAccount,
  UserRole,
  TabId,
  SubjectConfig,
  ZKTecoPunchLog,
  ZKTecoEnrollRequest,
  ZKTecoDeviceStatus,
  ZKTecoDeviceConfig,
  AttendanceRequest,
  SundayClassRequest,
  StudentLeaveRequest,
  AppPushNotification,
  AttendanceScheduleSettings,
  SpecificDateOverride,
  WelcomeMessageSettings,
  AttendanceRulesSettings,
  StudentPortalAccount,
  RollNumberSettings,
  SerialNumberSettings,
  IdRegistryRecord,
  AttendanceChangeHistoryRecord
} from '../types';
import { db, provisionStudentFirebaseAuth } from '../firebase';
import { WhatsAppService } from './whatsappService';
import { evaluateBatchLateArrival } from './zktecoListenerService';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDoc,
  getDocs,
  runTransaction,
  query,
  where,
  arrayUnion
} from 'firebase/firestore';

const STORAGE_KEYS = {
  STUDENTS: 'ok_korean_students_v2',
  ATTENDANCE: 'ok_korean_attendance_v2',
  TESTS: 'ok_korean_tests_v2',
  FEES: 'ok_korean_fees_v2',
  LOGS: 'ok_korean_logs_v2',
  SETTINGS: 'ok_korean_settings_v2',
  TEACHERS: 'ok_korean_teachers_v2',
  INITIALIZED: 'ok_korean_initialized_v2',
  ZK_PUNCHES: 'ok_korean_zk_punches_v2',
  ZK_ENROLLMENTS: 'ok_korean_zk_enrollments_v2',
  DEVICE_CONFIG: 'ok_korean_device_config_v2',
  ATTENDANCE_REQUESTS: 'ok_korean_attendance_requests_v2',
  SUNDAY_REQUESTS: 'ok_korean_sunday_requests_v2',
  LEAVE_REQUESTS: 'ok_korean_leave_requests_v2',
  NOTIFICATIONS: 'ok_korean_notifications_v2',
  ATTENDANCE_SETTINGS: 'ok_korean_attendance_settings_v2',
  WELCOME_MESSAGE_SETTINGS: 'ok_korean_welcome_message_settings_v2',
  ATTENDANCE_RULES: 'ok_korean_attendance_rules_v2',
  STUDENT_PORTAL_ACCOUNTS: 'ok_korean_student_portal_v2',
  ROLL_NUMBER_SETTINGS: 'ok_korean_roll_number_settings_v2',
  SERIAL_NUMBER_SETTINGS: 'ok_korean_serial_number_settings_v2',
  ID_REGISTRY: 'ok_korean_id_registry_v2',
  ATTENDANCE_CHANGE_HISTORY: 'ok_korean_attendance_change_history_v2',
};

export const DEFAULT_DEVICE_CONFIG: ZKTecoDeviceConfig = {
  ip: '192.168.1.201',
  port: 4370,
  sn: 'K40-ADMS-01',
  backendApiUrl: '',
  status: 'Disconnected',
  lastSeen: '',
  firmware: 'Ver 6.60 (Build 2026)',
  pushVersion: '2.4.1',
  autoSync: true,
  inOutModeEnabled: false
};

export const DEFAULT_SETTINGS: AcademySettings = {
  academyName: 'Ok Korean Language Centre',
  academyKoreanName: '오케이 한국어 학원',
  tagline: 'Leading Centre for Korean Language, TOPIK Mastery & EPS-TOPIK Examination',
  address: 'Commercial Plaza, Main Boulevard, Lahore / Rawalpindi & Seoul Education Hub',
  contactPhone: '+92 300 5551234 / +92 321 8889900',
  email: 'info@okkorean.com',
  principalName: 'Farooq Shahzad',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  registrationNumber: 'PK-KR-EDU-2024-9912',
};

export const DEFAULT_ATTENDANCE_SCHEDULE: AttendanceScheduleSettings = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: false, // Sunday toggled OFF by default as required
  specificDateOverrides: {},
  dateOverridesList: []
};

export const DEFAULT_WELCOME_MESSAGE_SETTINGS: WelcomeMessageSettings = {
  enabled: true,
  message: "Welcome back! Don't forget to mark attendance.",
  template: "Welcome back! Don't forget to mark attendance.",
  speed: 'medium',
  durationMinutes: 2
};

export const DEFAULT_ATTENDANCE_RULES: AttendanceRulesSettings = {
  morningLateTime: '08:00',
  morningLateEnabled: false,
  eveningLateTime: '17:00',
  eveningLateEnabled: false,
};

export const DEFAULT_ROLL_NUMBER_SETTINGS: RollNumberSettings = {
  prefix: 'OK',
  academicYear: String(new Date().getFullYear()),
  yearFormat: 'YYYY',
  startingSerial: 1,
  nextSerialNumber: 1,
  digits: 3,
  separator: '-',
  resetAnnually: false,
  lastResetYear: String(new Date().getFullYear()),
  autoGenerate: true,
  allowManualOverride: false,
};

export const DEFAULT_SERIAL_NUMBER_SETTINGS: SerialNumberSettings = {
  prefix: 'SN',
  startingSerial: 1,
  nextSerialNumber: 1,
  digits: 4,
  separator: '-',
  resetAnnually: false,
  lastResetYear: String(new Date().getFullYear()),
  autoGenerate: true,
  allowManualOverride: false,
};

export const DEFAULT_ID_REGISTRY: IdRegistryRecord = {
  usedRollNumbers: [],
  usedSerialNumbers: [],
  usedSerialSeqs: [],
  highestRollSeqByYear: {},
  highestSerialSeq: 0,
};

export function normalizeTimestampToIso(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      try {
        const d = value.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : '';
      } catch {
        return '';
      }
    }
    if (typeof value.seconds === 'number') {
      const ms = value.seconds * 1000 + Math.floor((Number(value.nanoseconds) || 0) / 1e6);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? '' : d.toISOString();
    }
  }
  return String(value || '');
}

export function normalizeAttendanceStatusValue(rawStatus: any): AttendanceStatus {
  const s = String(rawStatus || '').trim().toLowerCase();
  if (s === 'present') return 'Present';
  if (s === 'absent') return 'Absent';
  if (s === 'late') return 'Late';
  if (s === 'leave') return 'Leave';
  if (s === 'neutral') return 'Neutral';
  return (rawStatus as AttendanceStatus) || 'Present';
}

export function normalizeAttendanceRequest(docId: string, raw: Record<string, any>): AttendanceRequest {
  const rawStatusLower = String(raw?.status || 'Pending').trim().toLowerCase();
  const status: AttendanceRequest['status'] =
    rawStatusLower === 'approved'
      ? 'Approved'
      : rawStatusLower === 'rejected'
      ? 'Rejected'
      : 'Pending';

  const createdIso = normalizeTimestampToIso(raw?.createdAt || raw?.timestamp) || new Date(0).toISOString();
  const tsIso = normalizeTimestampToIso(raw?.timestamp || raw?.createdAt) || createdIso;
  const studentRoll = String(raw?.studentRoll || raw?.rollNumber || '').trim();
  const previousStatus = raw?.previousStatus
    ? normalizeAttendanceStatusValue(raw.previousStatus)
    : 'Absent';
  const requestedStatus = normalizeAttendanceStatusValue(
    raw?.requestedStatus || raw?.requestType || 'Present'
  );

  return {
    ...(raw as AttendanceRequest),
    id: docId,
    attendanceRecordId:
      raw?.attendanceRecordId ||
      (raw?.studentId && raw?.date ? `att_${raw.studentId}_${raw.date}` : undefined),
    studentId: String(raw?.studentId || ''),
    studentRoll,
    studentSerial: raw?.studentSerial ? String(raw.studentSerial) : undefined,
    studentName: String(raw?.studentName || 'Unknown Student'),
    batch: String(raw?.batch || ''),
    date: String(raw?.date || ''),
    previousStatus,
    requestedStatus,
    reason: raw?.reason ? String(raw.reason) : '',
    requestType: raw?.requestType ? String(raw.requestType) : undefined,
    teacherId: String(raw?.teacherId || ''),
    teacherName: String(raw?.teacherName || 'Teacher'),
    timestamp: tsIso,
    createdAt: createdIso,
    reviewedAt: raw?.reviewedAt ? normalizeTimestampToIso(raw.reviewedAt) : undefined,
    status,
  };
}

export function formatRollNumberFromSettings(
  serialNumber: number,
  config: Partial<RollNumberSettings> = DEFAULT_ROLL_NUMBER_SETTINGS
): string {
  const prefix = String(config.prefix ?? DEFAULT_ROLL_NUMBER_SETTINGS.prefix).trim().toUpperCase();
  const rawYear = String(config.academicYear ?? DEFAULT_ROLL_NUMBER_SETTINGS.academicYear).trim();
  const yearFormat = config.yearFormat === 'YY' ? 'YY' : 'YYYY';
  const year =
    rawYear.length === 0
      ? ''
      : yearFormat === 'YY' && rawYear.length >= 2
      ? rawYear.slice(-2)
      : rawYear;
  const sep = config.separator !== undefined ? String(config.separator) : '-';
  const digits = Math.min(8, Math.max(2, Number(config.digits ?? 3) || 3));
  const paddedSeq = String(Math.max(1, Math.floor(serialNumber || 1))).padStart(digits, '0');
  const parts = [prefix, year, paddedSeq].filter((p) => p.length > 0);
  return parts.join(sep);
}

export function formatSerialNumberFromSettings(
  serialNumber: number,
  config: Partial<SerialNumberSettings> = DEFAULT_SERIAL_NUMBER_SETTINGS
): string {
  const prefix = String(config.prefix ?? DEFAULT_SERIAL_NUMBER_SETTINGS.prefix).trim().toUpperCase();
  const sep = config.separator !== undefined ? String(config.separator) : '-';
  const digits = Math.min(8, Math.max(2, Number(config.digits ?? 4) || 4));
  const paddedSeq = String(Math.max(1, Math.floor(serialNumber || 1))).padStart(digits, '0');
  return prefix ? `${prefix}${sep}${paddedSeq}` : paddedSeq;
}

export function parseTrailingNumber(value?: string): number {
  const match = String(value || '').trim().match(/(\d+)\s*$/);
  if (!match) return 0;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function getStudentSerialDisplay(
  student?: Partial<Student> | null,
  fallbackIndex?: number
): string {
  if (student?.formattedSerialNumber && String(student.formattedSerialNumber).trim()) {
    return String(student.formattedSerialNumber).trim();
  }
  const num = Number(student?.serialNumber);
  const cfg = memoryCache?.serialNumberSettings || DEFAULT_SERIAL_NUMBER_SETTINGS;
  if (Number.isFinite(num) && num > 0) {
    return formatSerialNumberFromSettings(num, cfg);
  }
  if (typeof fallbackIndex === 'number' && fallbackIndex >= 0) {
    return formatSerialNumberFromSettings(fallbackIndex + 1, cfg);
  }
  return '—';
}

const INITIAL_TEACHERS: TeacherAccount[] = [
  {
    id: 'teacher_fakhar',
    name: 'Mam (Fakhar -U- Nisa)',
    username: 'fakhar',
    password: 'Teacher@2026',
    email: 'fakhar@okkorean.com',
    phone: '+92 301 7788990',
    assignedBatch: '',
    assignedClasses: ['Morning Class 1', 'Morning Class 2', 'Morning Class 3'],
    status: 'Active',
    allowedMenus: ['dashboard', 'attendance', 'tests', 'reports', 'whatsapp'],
    createdAt: '2026-08-01',
  },
  {
    id: 'teacher_nabila',
    name: 'Nabila Teacher (나빌라 강사)',
    username: 'nabila',
    password: 'Korean2026!#',
    email: 'nabila@okkorean.com',
    phone: '+92 300 4455667',
    assignedBatch: '',
    assignedClasses: ['Morning Class 1', 'Morning Class 2', 'Morning Class 3'],
    status: 'Active',
    allowedMenus: ['dashboard', 'attendance', 'tests', 'reports', 'whatsapp'],
    createdAt: '2026-08-01',
  },
  {
    id: 'teacher_rashid',
    name: 'Rashid Minhas (라시드 강사)',
    username: 'rashid.minhas',
    password: 'Rashid@2026',
    email: 'rashid.minhas@okkorean.com',
    phone: '+92 300 1122334',
    assignedBatch: '',
    assignedClasses: ['Morning Class 1', 'Morning Class 2'],
    status: 'Active',
    allowedMenus: ['dashboard', 'attendance', 'tests', 'reports', 'whatsapp'],
    createdAt: '2026-08-01',
  },
  {
    id: 'teacher_sub_2',
    name: 'Teacher Tariq Min-woo (민우 강사)',
    username: 'teacher.tariq',
    password: 'Password123!',
    email: 'tariq.korean@okkorean.com',
    phone: '+92 302 1122334',
    assignedBatch: '',
    assignedClasses: ['Evening Class 1', 'Evening Class 2'],
    status: 'Active',
    allowedMenus: ['dashboard', 'attendance', 'tests', 'reports'],
    createdAt: '2026-09-10',
  }
];

const INITIAL_STUDENTS: Student[] = [];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export function buildStudentAppEmail(rollNumber: string): string {
  const cleanRoll = String(rollNumber || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-');
  return `${cleanRoll || `student-${Date.now()}`}@okkorean.com`;
}

export function generateSecureStudentPassword(length: number = 10): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#&!$%';
  const all = `${upper}${lower}${digits}${symbols}`;

  const randomIndex = (max: number): number => {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] % max;
    }
    return Math.floor(Math.random() * max);
  };

  const chars = [
    upper[randomIndex(upper.length)],
    lower[randomIndex(lower.length)],
    digits[randomIndex(digits.length)],
    symbols[randomIndex(symbols.length)],
  ];
  while (chars.length < Math.max(8, length)) {
    chars.push(all[randomIndex(all.length)]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }
  return chars.join('');
}

export const DEFAULT_SUBJECTS_CONFIG: SubjectConfig[] = [
  { key: 'vocabulary', label: 'Vocabulary', shortLabel: 'Vocab', enabled: true, maxMarks: 20 },
  { key: 'grammar', label: 'Grammar', shortLabel: 'Grammar', enabled: true, maxMarks: 20 },
  { key: 'reading', label: 'Reading', shortLabel: 'Reading', enabled: true, maxMarks: 20 },
  { key: 'sentences', label: 'Sentence Construction', shortLabel: 'Sentences', enabled: true, maxMarks: 20 },
  { key: 'listeningSpeaking', label: 'Speaking / Listening', shortLabel: 'Spk/List', enabled: true, maxMarks: 20 },
  { key: 'mcqs', label: 'Multiple Choice Questions (MCQs)', shortLabel: 'MCQs', enabled: true, maxMarks: 20 },
];

const INITIAL_TESTS: WeeklyTest[] = [];

const INITIAL_FEES: FeeRecord[] = [];

const INITIAL_LOGS: ActivityLog[] = [];

function safeGet<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err);
  }
}

// Clean objects for Firestore (removes undefined values which cause Firestore errors)
function cleanForFirestore<T extends Record<string, any>>(obj: T): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => (typeof item === 'object' && item !== null ? cleanForFirestore(item) : item));
  }
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (typeof val === 'object' && val !== null) {
        cleaned[key] = cleanForFirestore(val);
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned;
}

// In-memory live cache
interface CacheStore {
  students: Student[];
  attendance: AttendanceRecord[];
  tests: WeeklyTest[];
  fees: FeeRecord[];
  logs: ActivityLog[];
  settings: AcademySettings;
  teachers: TeacherAccount[];
  deviceConfig: ZKTecoDeviceConfig;
  attendanceRequests: AttendanceRequest[];
  sundayRequests: SundayClassRequest[];
  leaveRequests: StudentLeaveRequest[];
  notifications: AppPushNotification[];
  attendanceSchedule: AttendanceScheduleSettings;
  welcomeMessage: WelcomeMessageSettings;
  attendanceRules: AttendanceRulesSettings;
  studentPortalAccounts: StudentPortalAccount[];
  rollNumberSettings: RollNumberSettings;
  serialNumberSettings: SerialNumberSettings;
  idRegistry: IdRegistryRecord;
  attendanceChangeHistory: AttendanceChangeHistoryRecord[];
}

const memoryCache: CacheStore = {
  students: safeGet<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS),
  attendance: safeGet<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE),
  tests: safeGet<WeeklyTest[]>(STORAGE_KEYS.TESTS, INITIAL_TESTS),
  fees: safeGet<FeeRecord[]>(STORAGE_KEYS.FEES, INITIAL_FEES),
  logs: safeGet<ActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS),
  settings: safeGet<AcademySettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
  teachers: safeGet<TeacherAccount[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS),
  deviceConfig: safeGet<ZKTecoDeviceConfig>(STORAGE_KEYS.DEVICE_CONFIG, DEFAULT_DEVICE_CONFIG),
  attendanceRequests: safeGet<AttendanceRequest[]>(STORAGE_KEYS.ATTENDANCE_REQUESTS, []),
  sundayRequests: safeGet<SundayClassRequest[]>(STORAGE_KEYS.SUNDAY_REQUESTS, []),
  leaveRequests: safeGet<StudentLeaveRequest[]>(STORAGE_KEYS.LEAVE_REQUESTS, []),
  notifications: safeGet<AppPushNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []),
  attendanceSchedule: safeGet<AttendanceScheduleSettings>(STORAGE_KEYS.ATTENDANCE_SETTINGS, DEFAULT_ATTENDANCE_SCHEDULE),
  welcomeMessage: safeGet<WelcomeMessageSettings>(STORAGE_KEYS.WELCOME_MESSAGE_SETTINGS, DEFAULT_WELCOME_MESSAGE_SETTINGS),
  attendanceRules: safeGet<AttendanceRulesSettings>(STORAGE_KEYS.ATTENDANCE_RULES, DEFAULT_ATTENDANCE_RULES),
  studentPortalAccounts: safeGet<StudentPortalAccount[]>(STORAGE_KEYS.STUDENT_PORTAL_ACCOUNTS, []),
  rollNumberSettings: safeGet<RollNumberSettings>(STORAGE_KEYS.ROLL_NUMBER_SETTINGS, DEFAULT_ROLL_NUMBER_SETTINGS),
  serialNumberSettings: safeGet<SerialNumberSettings>(STORAGE_KEYS.SERIAL_NUMBER_SETTINGS, DEFAULT_SERIAL_NUMBER_SETTINGS),
  idRegistry: safeGet<IdRegistryRecord>(STORAGE_KEYS.ID_REGISTRY, DEFAULT_ID_REGISTRY),
  attendanceChangeHistory: safeGet<AttendanceChangeHistoryRecord[]>(STORAGE_KEYS.ATTENDANCE_CHANGE_HISTORY, []),
};

// Migrate old principal name if needed
if (!memoryCache.settings.principalName || memoryCache.settings.principalName.includes('Ahmad Malik')) {
  memoryCache.settings.principalName = 'Farooq Shahzad';
  safeSet(STORAGE_KEYS.SETTINGS, memoryCache.settings);
}

// Clear legacy dummy students so default is permanently empty
const dummyIds = new Set(['std_01', 'std_02', 'std_03', 'std_04', 'std_05', 'std_06', 'std_07']);
const dummyNames = new Set(['Ali Hassan', 'Sara Fatima', 'Hamza Bilal', 'Zain Ul Abideen', 'Ayesha Noor', 'Usman Ghani', 'Khadija Rehman']);
memoryCache.students = (memoryCache.students || []).filter(
  s => !dummyIds.has(s.id) && !dummyNames.has(s.fullName)
);
safeSet(STORAGE_KEYS.STUDENTS, memoryCache.students);

// Subscriber management
type SubscriberCallback<T = any> = (data: T) => void;
const subscribers: Record<string, Set<SubscriberCallback>> = {
  students: new Set(),
  attendance: new Set(),
  tests: new Set(),
  fees: new Set(),
  logs: new Set(),
  settings: new Set(),
  teachers: new Set(),
  deviceConfig: new Set(),
  attendanceRequests: new Set(),
  sundayRequests: new Set(),
  leaveRequests: new Set(),
  notifications: new Set(),
  attendanceSchedule: new Set(),
  welcomeMessage: new Set(),
  attendanceRules: new Set(),
  studentPortalAccounts: new Set(),
  rollNumberSettings: new Set(),
  serialNumberSettings: new Set(),
  idRegistry: new Set(),
  attendanceChangeHistory: new Set(),
  all: new Set(),
};

// BroadcastChannel for instant cross-tab sync on same machine
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('ok_lms_realtime');
    broadcastChannel.onmessage = (event) => {
      const { type, data } = event.data || {};
      if (type && type in memoryCache) {
        memoryCache[type as keyof CacheStore] = data;
        const keyMap: Record<string, string> = {
          studentPortalAccounts: STORAGE_KEYS.STUDENT_PORTAL_ACCOUNTS,
          rollNumberSettings: STORAGE_KEYS.ROLL_NUMBER_SETTINGS,
          serialNumberSettings: STORAGE_KEYS.SERIAL_NUMBER_SETTINGS,
          idRegistry: STORAGE_KEYS.ID_REGISTRY,
          attendanceChangeHistory: STORAGE_KEYS.ATTENDANCE_CHANGE_HISTORY,
          attendanceRequests: STORAGE_KEYS.ATTENDANCE_REQUESTS,
          sundayRequests: STORAGE_KEYS.SUNDAY_REQUESTS,
          leaveRequests: STORAGE_KEYS.LEAVE_REQUESTS,
          attendanceSchedule: STORAGE_KEYS.ATTENDANCE_SETTINGS,
          welcomeMessage: STORAGE_KEYS.WELCOME_MESSAGE_SETTINGS,
          attendanceRules: STORAGE_KEYS.ATTENDANCE_RULES,
          deviceConfig: STORAGE_KEYS.DEVICE_CONFIG,
        };
        const storageKey =
          keyMap[type] || STORAGE_KEYS[type.toUpperCase() as keyof typeof STORAGE_KEYS];
        if (storageKey) {
          safeSet(storageKey, data);
        }
        subscribers[type]?.forEach(cb => {
          try { cb(data); } catch (e) { console.error(`Error in ${type} subscriber:`, e); }
        });
        subscribers.all?.forEach(cb => {
          try { cb({ type, data }); } catch (e) { console.error('Error in all subscriber:', e); }
        });
      }
    };
  }
} catch (e) {
  console.warn('BroadcastChannel warning:', e);
}

function notifySubscribers(type: keyof CacheStore, data: any) {
  subscribers[type]?.forEach(cb => {
    try { cb(data); } catch (e) { console.error(`Error in ${type} subscriber:`, e); }
  });
  subscribers.all?.forEach(cb => {
    try { cb({ type, data }); } catch (e) { console.error('Error in all subscriber:', e); }
  });
  try {
    broadcastChannel?.postMessage({ type, data });
  } catch (e) {
    console.warn('Broadcast postMessage warning:', e);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ok_lms_sync', { detail: { type, data } }));
  }
}

// Initial Firestore seed tracker
let isSeeding = false;
async function seedInitialFirestoreData() {
  if (isSeeding) return;
  isSeeding = true;
  try {
    const batch = writeBatch(db);
    // Seed Settings
    batch.set(doc(db, 'settings', 'academy_settings'), cleanForFirestore(memoryCache.settings));
    // Seed Teachers
    INITIAL_TEACHERS.forEach(t => batch.set(doc(db, 'teachers', t.id), cleanForFirestore(t)));
    // Seed Students
    INITIAL_STUDENTS.forEach(s => batch.set(doc(db, 'students', s.id), cleanForFirestore(s)));
    // Seed Attendance with deterministic doc ID
    INITIAL_ATTENDANCE.forEach(a => batch.set(doc(db, 'attendance', `att_${a.studentId}_${a.date}`), cleanForFirestore({
      ...a,
      id: `att_${a.studentId}_${a.date}`
    })));
    // Seed Tests
    INITIAL_TESTS.forEach(test => batch.set(doc(db, 'tests', test.id), cleanForFirestore(test)));
    // Seed Fees
    INITIAL_FEES.forEach(f => batch.set(doc(db, 'fees', f.id), cleanForFirestore(f)));
    // Seed Logs
    INITIAL_LOGS.forEach(l => batch.set(doc(db, 'logs', l.id), cleanForFirestore(l)));

    await batch.commit();
    console.log('Firebase Firestore initialized with OK Korean Centre baseline data.');
  } catch (err) {
    console.warn('Initial Firestore seed check completed/warned:', err);
  } finally {
    isSeeding = false;
  }
}

// Real-Time onSnapshot Listeners Initialization
let isListenersInitialized = false;
let autoStudentMigrationRan = false;

export function initStorage(): void {
  if (isListenersInitialized) return;
  isListenersInitialized = true;

  // 1. Live Sync: Students
  onSnapshot(collection(db, 'students'), (snapshot) => {
    if (snapshot.empty) {
      seedInitialFirestoreData();
      return;
    }
    const dummyIds = new Set(['std_01', 'std_02', 'std_03', 'std_04', 'std_05', 'std_06', 'std_07']);
    const dummyNames = new Set(['Ali Hassan', 'Sara Fatima', 'Hamza Bilal', 'Zain Ul Abideen', 'Ayesha Noor', 'Usman Ghani', 'Khadija Rehman']);

    // Actively delete any dummy documents if found in Firestore
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data() as Student;
      if (dummyIds.has(docSnap.id) || dummyNames.has(data?.fullName)) {
        deleteDoc(doc(db, 'students', docSnap.id)).catch(() => {});
      }
    });

    const list: Student[] = snapshot.docs
      .map(docSnap => ({
        ...docSnap.data() as Student,
        id: docSnap.id
      }))
      .filter(s => !dummyIds.has(s.id) && !dummyNames.has(s.fullName));

    memoryCache.students = list;
    safeSet(STORAGE_KEYS.STUDENTS, list);
    notifySubscribers('students', list);

    // Trigger automatic idempotent migration once if any existing student lacks formattedSerialNumber
    if (!autoStudentMigrationRan && list.some(s => !s.formattedSerialNumber || !s.serialNumber)) {
      autoStudentMigrationRan = true;
      setTimeout(() => {
        StorageService.migrateExistingStudentNumbers('System').catch(err =>
          console.warn('Auto serial migration notice:', err)
        );
      }, 600);
    }
  }, (err) => {
    console.warn('Live sync notice (students):', err.message);
  });

  // 2. Live Sync: Attendance (Deduplicated by studentId + date)
  onSnapshot(collection(db, 'attendance'), (snapshot) => {
    const rawList: AttendanceRecord[] = snapshot.docs.map(docSnap => ({
      ...docSnap.data() as AttendanceRecord,
      id: docSnap.id
    }));

    const map = new Map<string, AttendanceRecord>();
    rawList.forEach(rec => {
      if (rec.studentId && rec.date) {
        const key = `${rec.studentId}_${rec.date}`;
        map.set(key, rec);
      }
    });
    const list = Array.from(map.values());
    memoryCache.attendance = list;
    safeSet(STORAGE_KEYS.ATTENDANCE, list);
    notifySubscribers('attendance', list);
  }, (err) => {
    console.warn('Live sync notice (attendance):', err.message);
  });

  // 3. Live Sync: Weekly Tests
  onSnapshot(collection(db, 'tests'), (snapshot) => {
    const list: WeeklyTest[] = snapshot.docs.map(docSnap => ({
      ...docSnap.data() as WeeklyTest,
      id: docSnap.id
    }));
    memoryCache.tests = list;
    safeSet(STORAGE_KEYS.TESTS, list);
    notifySubscribers('tests', list);
  }, (err) => {
    console.warn('Live sync notice (tests):', err.message);
  });

  // 4. Live Sync: Fees
  onSnapshot(collection(db, 'fees'), (snapshot) => {
    const list: FeeRecord[] = snapshot.docs.map(docSnap => ({
      ...docSnap.data() as FeeRecord,
      id: docSnap.id
    }));
    if (list.length > 0 || !snapshot.empty) {
      memoryCache.fees = list;
      safeSet(STORAGE_KEYS.FEES, list);
      notifySubscribers('fees', list);
    }
  }, (err) => {
    console.warn('Live sync notice (fees):', err.message);
  });

  // 5. Live Sync: Notifications / Activity Logs
  onSnapshot(collection(db, 'logs'), (snapshot) => {
    const list: ActivityLog[] = snapshot.docs.map(docSnap => {
      const raw = docSnap.data() as Record<string, any>;
      return {
        ...(raw as ActivityLog),
        id: docSnap.id,
        timestamp: normalizeTimestampToIso(raw.timestamp) || '',
      };
    });
    list.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    memoryCache.logs = list;
    safeSet(STORAGE_KEYS.LOGS, list);
    notifySubscribers('logs', list);
  }, (err) => {
    console.warn('Live sync notice (logs):', err.message);
  });

  // 6. Live Sync: Teachers
  onSnapshot(collection(db, 'teachers'), (snapshot) => {
    const list: TeacherAccount[] = snapshot.docs.map(docSnap => ({
      ...docSnap.data() as TeacherAccount,
      id: docSnap.id
    }));
    if (list.length > 0 || !snapshot.empty) {
      memoryCache.teachers = list;
      safeSet(STORAGE_KEYS.TEACHERS, list);
      notifySubscribers('teachers', list);
    }
  }, (err) => {
    console.warn('Live sync notice (teachers):', err.message);
  });

  // 6b. Live Sync: Student Portal Accounts
  onSnapshot(collection(db, 'student_portal_accounts'), (snapshot) => {
    const list: StudentPortalAccount[] = snapshot.docs.map(docSnap => {
      const raw = docSnap.data() as StudentPortalAccount;
      const enabled = raw.enabled !== undefined ? Boolean(raw.enabled) : raw.status !== 'Disabled';
      return {
        ...raw,
        id: docSnap.id,
        enabled,
        status: enabled ? 'Active' : 'Disabled',
      };
    });
    list.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
    memoryCache.studentPortalAccounts = list;
    safeSet(STORAGE_KEYS.STUDENT_PORTAL_ACCOUNTS, list);
    notifySubscribers('studentPortalAccounts', list);
  }, (err) => {
    console.warn('Live sync notice (student_portal_accounts):', err.message);
  });

  // 7. Live Sync: Settings
  onSnapshot(collection(db, 'settings'), (snapshot) => {
    const settingsDoc = snapshot.docs.find(d => d.id === 'academy_settings');
    if (settingsDoc && settingsDoc.exists()) {
      const data = settingsDoc.data() as AcademySettings;
      if (!data.principalName || data.principalName.includes('Ahmad Malik')) {
        data.principalName = 'Farooq Shahzad';
      }
      memoryCache.settings = data;
      safeSet(STORAGE_KEYS.SETTINGS, data);
      notifySubscribers('settings', data);
    }
  }, (err) => {
    console.warn('Live sync notice (settings):', err.message);
  });

  // 8. Live Sync: ZKTeco Device Configuration
  onSnapshot(doc(db, 'settings', 'zkteco_device'), (docSnap) => {
    if (docSnap.exists()) {
      const rawData = docSnap.data() as any;
      const resolvedInOut = Boolean(rawData?.inOutModeEnabled ?? rawData?.inOutMode);
      const data: ZKTecoDeviceConfig = {
        ...DEFAULT_DEVICE_CONFIG,
        ...rawData,
        inOutModeEnabled: resolvedInOut
      };
      memoryCache.deviceConfig = data;
      safeSet(STORAGE_KEYS.DEVICE_CONFIG, data);
      notifySubscribers('deviceConfig', data);

      if (rawData?.inOutMode === undefined) {
        setDoc(
          doc(db, 'settings', 'zkteco_device'),
          { inOutModeEnabled: resolvedInOut, inOutMode: resolvedInOut },
          { merge: true }
        ).catch(() => {});
        setDoc(
          doc(db, 'settings', 'global'),
          {
            inOutModeEnabled: resolvedInOut,
            inOutMode: resolvedInOut,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {});
      }
    }
  }, (err) => {
    console.warn('Live sync notice (deviceConfig):', err.message);
  });

  // 9. Live Sync: Attendance Approval Requests (Timestamp-safe & case-normalized)
  onSnapshot(collection(db, 'attendance_requests'), (snapshot) => {
    const list: AttendanceRequest[] = snapshot.docs.map(docSnap =>
      normalizeAttendanceRequest(docSnap.id, docSnap.data() as Record<string, any>)
    );
    // Sort newest first using normalized ISO strings (prevents Firestore Timestamp.localeCompare crash)
    list.sort((a, b) =>
      String(b.createdAt || b.timestamp || '').localeCompare(String(a.createdAt || a.timestamp || ''))
    );
    memoryCache.attendanceRequests = list;
    safeSet(STORAGE_KEYS.ATTENDANCE_REQUESTS, list);
    notifySubscribers('attendanceRequests', list);
  }, (err) => {
    console.warn('Live sync notice (attendance_requests):', err.message);
  });

  // 10. Live Sync: Sunday Class Override Requests
  onSnapshot(collection(db, 'sunday_requests'), (snapshot) => {
    const list: SundayClassRequest[] = snapshot.docs.map(docSnap => {
      const raw = docSnap.data() as Record<string, any>;
      return {
        ...(raw as SundayClassRequest),
        id: docSnap.id,
        createdAt: normalizeTimestampToIso(raw.createdAt),
      };
    });
    list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    memoryCache.sundayRequests = list;
    safeSet(STORAGE_KEYS.SUNDAY_REQUESTS, list);
    notifySubscribers('sundayRequests', list);
  }, (err) => {
    console.warn('Live sync notice (sunday_requests):', err.message);
  });

  // 11. Live Sync: Student Leave Requests
  onSnapshot(collection(db, 'leave_requests'), (snapshot) => {
    const list: StudentLeaveRequest[] = snapshot.docs.map(docSnap => {
      const raw = docSnap.data() as Record<string, any>;
      return {
        ...(raw as StudentLeaveRequest),
        id: docSnap.id,
        createdAt: normalizeTimestampToIso(raw.createdAt),
      };
    });
    list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    memoryCache.leaveRequests = list;
    safeSet(STORAGE_KEYS.LEAVE_REQUESTS, list);
    notifySubscribers('leaveRequests', list);
  }, (err) => {
    console.warn('Live sync notice (leave_requests):', err.message);
  });

  // 12. Live Sync: In-App Push Notifications
  onSnapshot(collection(db, 'app_notifications'), (snapshot) => {
    const list: AppPushNotification[] = snapshot.docs.map(docSnap => {
      const raw = docSnap.data() as Record<string, any>;
      return {
        ...(raw as AppPushNotification),
        id: docSnap.id,
        timestamp: normalizeTimestampToIso(raw.timestamp),
      };
    });
    list.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    memoryCache.notifications = list;
    safeSet(STORAGE_KEYS.NOTIFICATIONS, list);
    notifySubscribers('notifications', list);
  }, (err) => {
    console.warn('Live sync notice (app_notifications):', err.message);
  });

  // 13. Live Sync: Attendance Schedule Settings
  onSnapshot(doc(db, 'attendance_settings', 'global'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as AttendanceScheduleSettings;
      memoryCache.attendanceSchedule = data;
      safeSet(STORAGE_KEYS.ATTENDANCE_SETTINGS, data);
      notifySubscribers('attendanceSchedule', data);
    }
  }, (err) => {
    console.warn('Live sync notice (attendance_settings):', err.message);
  });

  // 14. Live Sync: Teacher Portal Welcome Message Settings
  onSnapshot(doc(db, 'welcome_message_settings', 'global'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as WelcomeMessageSettings;
      memoryCache.welcomeMessage = data;
      safeSet(STORAGE_KEYS.WELCOME_MESSAGE_SETTINGS, data);
      notifySubscribers('welcomeMessage', data);
    }
  }, (err) => {
    console.warn('Live sync notice (welcome_message_settings):', err.message);
  });

  // 15. Live Sync: Attendance Rules (Morning & Evening Late Arrival Rules)
  onSnapshot(doc(db, 'settings', 'attendance_rules'), (docSnap) => {
    if (docSnap.exists()) {
      const rawData = docSnap.data() as any;
      const data: AttendanceRulesSettings = {
        ...DEFAULT_ATTENDANCE_RULES,
        ...rawData,
        morningLateTime: String(rawData?.morningLateTime || rawData?.lateTime || DEFAULT_ATTENDANCE_RULES.morningLateTime).trim(),
        morningLateEnabled: Boolean(rawData?.morningLateEnabled ?? false),
        eveningLateTime: String(rawData?.eveningLateTime || DEFAULT_ATTENDANCE_RULES.eveningLateTime).trim(),
        eveningLateEnabled: Boolean(rawData?.eveningLateEnabled ?? false),
      };
      memoryCache.attendanceRules = data;
      safeSet(STORAGE_KEYS.ATTENDANCE_RULES, data);
      notifySubscribers('attendanceRules', data);
    }
  }, (err) => {
    console.warn('Live sync notice (attendance_rules):', err.message);
  });

  // 16. Live Sync: Roll Number Configuration Settings
  onSnapshot(doc(db, 'settings', 'roll_number_config'), (docSnap) => {
    if (docSnap.exists()) {
      const rawData = docSnap.data() as Partial<RollNumberSettings>;
      const data: RollNumberSettings = {
        ...DEFAULT_ROLL_NUMBER_SETTINGS,
        ...rawData,
        prefix: String(rawData?.prefix ?? DEFAULT_ROLL_NUMBER_SETTINGS.prefix).trim().toUpperCase(),
        academicYear: String(rawData?.academicYear ?? DEFAULT_ROLL_NUMBER_SETTINGS.academicYear).trim(),
        yearFormat: rawData?.yearFormat === 'YY' ? 'YY' : 'YYYY',
        startingSerial: Math.max(1, Number(rawData?.startingSerial ?? 1) || 1),
        nextSerialNumber: Math.max(1, Number(rawData?.nextSerialNumber ?? rawData?.startingSerial ?? 1) || 1),
        digits: Math.min(8, Math.max(2, Number(rawData?.digits ?? 3) || 3)),
        separator: rawData?.separator !== undefined ? String(rawData.separator) : '-',
        resetAnnually: Boolean(rawData?.resetAnnually ?? false),
        lastResetYear: String(rawData?.lastResetYear ?? rawData?.academicYear ?? DEFAULT_ROLL_NUMBER_SETTINGS.academicYear),
        autoGenerate: rawData?.autoGenerate !== undefined ? Boolean(rawData.autoGenerate) : true,
        allowManualOverride: Boolean(rawData?.allowManualOverride ?? false),
      };
      memoryCache.rollNumberSettings = data;
      safeSet(STORAGE_KEYS.ROLL_NUMBER_SETTINGS, data);
      notifySubscribers('rollNumberSettings', data);
    }
  }, (err) => {
    console.warn('Live sync notice (roll_number_config):', err.message);
  });

  // 16b. Live Sync: Independent Serial Number Configuration Settings
  onSnapshot(doc(db, 'settings', 'serial_number_config'), (docSnap) => {
    if (docSnap.exists()) {
      const rawData = docSnap.data() as Partial<SerialNumberSettings>;
      const data: SerialNumberSettings = {
        ...DEFAULT_SERIAL_NUMBER_SETTINGS,
        ...rawData,
        prefix: String(rawData?.prefix ?? DEFAULT_SERIAL_NUMBER_SETTINGS.prefix).trim().toUpperCase(),
        startingSerial: Math.max(1, Number(rawData?.startingSerial ?? 1) || 1),
        nextSerialNumber: Math.max(1, Number(rawData?.nextSerialNumber ?? rawData?.startingSerial ?? 1) || 1),
        digits: Math.min(8, Math.max(2, Number(rawData?.digits ?? 4) || 4)),
        separator: rawData?.separator !== undefined ? String(rawData.separator) : '-',
        resetAnnually: Boolean(rawData?.resetAnnually ?? false),
        lastResetYear: String(rawData?.lastResetYear ?? DEFAULT_SERIAL_NUMBER_SETTINGS.lastResetYear),
        autoGenerate: rawData?.autoGenerate !== undefined ? Boolean(rawData.autoGenerate) : true,
        allowManualOverride: Boolean(rawData?.allowManualOverride ?? false),
      };
      memoryCache.serialNumberSettings = data;
      safeSet(STORAGE_KEYS.SERIAL_NUMBER_SETTINGS, data);
      notifySubscribers('serialNumberSettings', data);
    }
  }, (err) => {
    console.warn('Live sync notice (serial_number_config):', err.message);
  });

  // 16c. Live Sync: Permanent Used ID Registry (prevents reuse of deleted Roll/Serial numbers)
  onSnapshot(doc(db, 'settings', 'id_registry'), (docSnap) => {
    if (docSnap.exists()) {
      const rawData = docSnap.data() as Partial<IdRegistryRecord>;
      const data: IdRegistryRecord = {
        usedRollNumbers: Array.isArray(rawData.usedRollNumbers) ? rawData.usedRollNumbers : [],
        usedSerialNumbers: Array.isArray(rawData.usedSerialNumbers) ? rawData.usedSerialNumbers : [],
        usedSerialSeqs: Array.isArray(rawData.usedSerialSeqs) ? rawData.usedSerialSeqs : [],
        highestRollSeqByYear: rawData.highestRollSeqByYear || {},
        highestSerialSeq: Number(rawData.highestSerialSeq || 0),
        updatedAt: rawData.updatedAt,
      };
      memoryCache.idRegistry = data;
      safeSet(STORAGE_KEYS.ID_REGISTRY, data);
      notifySubscribers('idRegistry', data);
    }
  }, (err) => {
    console.warn('Live sync notice (id_registry):', err.message);
  });

  // 17. Live Sync: Attendance Change Audit History
  onSnapshot(collection(db, 'attendance_change_history'), (snapshot) => {
    const list: AttendanceChangeHistoryRecord[] = snapshot.docs.map(docSnap => {
      const raw = docSnap.data() as Record<string, any>;
      return {
        ...(raw as AttendanceChangeHistoryRecord),
        id: docSnap.id,
        timestamp: normalizeTimestampToIso(raw.timestamp),
      };
    });
    list.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
    memoryCache.attendanceChangeHistory = list;
    safeSet(STORAGE_KEYS.ATTENDANCE_CHANGE_HISTORY, list);
    notifySubscribers('attendanceChangeHistory', list);
  }, (err) => {
    console.warn('Live sync notice (attendance_change_history):', err.message);
  });
}

// Auto-boot live sync immediately upon module evaluation
initStorage();

export const StorageService = {
  // Students
  getStudents(): Student[] {
    initStorage();
    const dummyIds = new Set(['std_01', 'std_02', 'std_03', 'std_04', 'std_05', 'std_06', 'std_07']);
    const dummyNames = new Set(['Ali Hassan', 'Sara Fatima', 'Hamza Bilal', 'Zain Ul Abideen', 'Ayesha Noor', 'Usman Ghani', 'Khadija Rehman']);
    return (memoryCache.students || []).filter(
      s => !dummyIds.has(s.id) && !dummyNames.has(s.fullName)
    );
  },

  getStudentById(id: string): Student | undefined {
    return this.getStudents().find(s => s.id === id);
  },

  saveStudents(students: Student[]): void {
    memoryCache.students = students;
    safeSet(STORAGE_KEYS.STUDENTS, students);
    notifySubscribers('students', students);

    // Sync to Firestore
    try {
      const batch = writeBatch(db);
      students.forEach(s => {
        batch.set(doc(db, 'students', s.id), cleanForFirestore(s), { merge: true });
      });
      batch.commit().catch(e => console.warn('Firestore students batch write warning:', e));
    } catch (e) {
      console.warn('saveStudents warning:', e);
    }
  },

  getRollNumberSettings(): RollNumberSettings {
    initStorage();
    return memoryCache.rollNumberSettings || DEFAULT_ROLL_NUMBER_SETTINGS;
  },

  subscribeRollNumberSettings(callback: (settings: RollNumberSettings) => void): () => void {
    subscribers.rollNumberSettings.add(callback);
    callback(this.getRollNumberSettings());
    return () => subscribers.rollNumberSettings.delete(callback);
  },

  getSerialNumberSettings(): SerialNumberSettings {
    initStorage();
    return memoryCache.serialNumberSettings || DEFAULT_SERIAL_NUMBER_SETTINGS;
  },

  subscribeSerialNumberSettings(callback: (settings: SerialNumberSettings) => void): () => void {
    subscribers.serialNumberSettings.add(callback);
    callback(this.getSerialNumberSettings());
    return () => subscribers.serialNumberSettings.delete(callback);
  },

  getIdRegistry(): IdRegistryRecord {
    initStorage();
    return memoryCache.idRegistry || DEFAULT_ID_REGISTRY;
  },

  async recordUsedStudentIdsInRegistry(
    studentsList: Array<Partial<Student>>,
    options?: { awaitSync?: boolean }
  ): Promise<void> {
    initStorage();
    const rollsToAdd = new Set<string>();
    const serialsToAdd = new Set<string>();
    const seqsToAdd = new Set<number>();

    studentsList.forEach(s => {
      const r = String(s.rollNumber || '').trim().toUpperCase();
      if (r) rollsToAdd.add(r);
      const fs = String(s.formattedSerialNumber || '').trim().toUpperCase();
      if (fs) serialsToAdd.add(fs);
      const n = Number(s.serialNumber);
      if (Number.isFinite(n) && n > 0) {
        seqsToAdd.add(n);
        if (!fs) {
          serialsToAdd.add(
            formatSerialNumberFromSettings(n, this.getSerialNumberSettings()).toUpperCase()
          );
        }
      }
    });

    if (rollsToAdd.size === 0 && serialsToAdd.size === 0 && seqsToAdd.size === 0) return;

    const prev = this.getIdRegistry();
    const nextHighestSerial = Math.max(
      Number(prev.highestSerialSeq || 0),
      ...Array.from(seqsToAdd)
    );
    const updatedRegistry: IdRegistryRecord = {
      usedRollNumbers: Array.from(new Set([...(prev.usedRollNumbers || []), ...rollsToAdd])),
      usedSerialNumbers: Array.from(new Set([...(prev.usedSerialNumbers || []), ...serialsToAdd])),
      usedSerialSeqs: Array.from(new Set([...(prev.usedSerialSeqs || []), ...seqsToAdd])),
      highestRollSeqByYear: prev.highestRollSeqByYear || {},
      highestSerialSeq: nextHighestSerial,
      updatedAt: new Date().toISOString(),
    };
    memoryCache.idRegistry = updatedRegistry;
    safeSet(STORAGE_KEYS.ID_REGISTRY, updatedRegistry);
    notifySubscribers('idRegistry', updatedRegistry);

    const firestorePayload: Record<string, any> = {
      highestSerialSeq: nextHighestSerial,
      updatedAt: updatedRegistry.updatedAt,
    };
    if (rollsToAdd.size > 0) firestorePayload.usedRollNumbers = arrayUnion(...Array.from(rollsToAdd));
    if (serialsToAdd.size > 0) firestorePayload.usedSerialNumbers = arrayUnion(...Array.from(serialsToAdd));
    if (seqsToAdd.size > 0) firestorePayload.usedSerialSeqs = arrayUnion(...Array.from(seqsToAdd));

    const writePromise = setDoc(doc(db, 'settings', 'id_registry'), firestorePayload, { merge: true }).catch(err =>
      console.warn('id_registry sync warning:', err)
    );
    if (options?.awaitSync) {
      await writePromise;
    }
  },

  async saveRollNumberSettings(
    settings: RollNumberSettings,
    user: string = 'Admin'
  ): Promise<RollNumberSettings> {
    initStorage();
    const startingSerial = Math.max(1, Math.floor(Number(settings.startingSerial) || 1));
    const nextSerialNumber = Math.max(
      startingSerial,
      Math.floor(Number(settings.nextSerialNumber) || startingSerial)
    );
    const cleanYear = String(settings.academicYear || new Date().getFullYear()).trim();
    const payload: RollNumberSettings = {
      prefix: String(settings.prefix || '').trim().toUpperCase(),
      academicYear: cleanYear,
      yearFormat: settings.yearFormat === 'YY' ? 'YY' : 'YYYY',
      startingSerial,
      nextSerialNumber,
      digits: Math.min(8, Math.max(2, Math.floor(Number(settings.digits) || 3))),
      separator: settings.separator !== undefined ? String(settings.separator) : '-',
      resetAnnually: Boolean(settings.resetAnnually),
      lastResetYear: String(settings.lastResetYear || cleanYear),
      autoGenerate: Boolean(settings.autoGenerate),
      allowManualOverride: Boolean(settings.allowManualOverride),
      updatedAt: new Date().toISOString(),
      updatedBy: user,
    };

    memoryCache.rollNumberSettings = payload;
    safeSet(STORAGE_KEYS.ROLL_NUMBER_SETTINGS, payload);
    notifySubscribers('rollNumberSettings', payload);

    await setDoc(doc(db, 'settings', 'roll_number_config'), cleanForFirestore(payload), { merge: true });

    this.logActivity(
      'Roll Number Settings Updated',
      `Updated roll format to ${formatRollNumberFromSettings(payload.nextSerialNumber, payload)} (Next Counter #${payload.nextSerialNumber}, Auto: ${payload.autoGenerate ? 'ON' : 'OFF'}, Override: ${payload.allowManualOverride ? 'ON' : 'OFF'})`,
      'system',
      user,
      'admin'
    );

    return payload;
  },

  async resetRollNumberSettingsToDefault(user: string = 'Admin'): Promise<RollNumberSettings> {
    initStorage();
    const current = this.getRollNumberSettings();
    const nextSettings: RollNumberSettings = {
      ...DEFAULT_ROLL_NUMBER_SETTINGS,
      nextSerialNumber: Math.max(1, current.nextSerialNumber || 1),
    };
    return this.saveRollNumberSettings(nextSettings, user);
  },

  async saveSerialNumberSettings(
    settings: SerialNumberSettings,
    user: string = 'Admin'
  ): Promise<SerialNumberSettings> {
    initStorage();
    const startingSerial = Math.max(1, Math.floor(Number(settings.startingSerial) || 1));
    const nextSerialNumber = Math.max(
      startingSerial,
      Math.floor(Number(settings.nextSerialNumber) || startingSerial)
    );
    const payload: SerialNumberSettings = {
      prefix: String(settings.prefix ?? DEFAULT_SERIAL_NUMBER_SETTINGS.prefix).trim().toUpperCase(),
      startingSerial,
      nextSerialNumber,
      digits: Math.min(8, Math.max(2, Math.floor(Number(settings.digits) || 4))),
      separator: settings.separator !== undefined ? String(settings.separator) : '-',
      resetAnnually: Boolean(settings.resetAnnually),
      lastResetYear: String(settings.lastResetYear || new Date().getFullYear()),
      autoGenerate: Boolean(settings.autoGenerate),
      allowManualOverride: Boolean(settings.allowManualOverride),
      updatedAt: new Date().toISOString(),
      updatedBy: user,
    };

    memoryCache.serialNumberSettings = payload;
    safeSet(STORAGE_KEYS.SERIAL_NUMBER_SETTINGS, payload);
    notifySubscribers('serialNumberSettings', payload);

    await setDoc(doc(db, 'settings', 'serial_number_config'), cleanForFirestore(payload), { merge: true });

    this.logActivity(
      'Serial Number Settings Updated',
      `Updated serial format to ${formatSerialNumberFromSettings(payload.nextSerialNumber, payload)} (Next Counter #${payload.nextSerialNumber}, Auto: ${payload.autoGenerate ? 'ON' : 'OFF'}, Manual: ${payload.allowManualOverride ? 'ON' : 'OFF'})`,
      'system',
      user,
      'admin'
    );

    return payload;
  },

  async resetSerialNumberSettingsToDefault(user: string = 'Admin'): Promise<SerialNumberSettings> {
    initStorage();
    const current = this.getSerialNumberSettings();
    const nextSettings: SerialNumberSettings = {
      ...DEFAULT_SERIAL_NUMBER_SETTINGS,
      nextSerialNumber: Math.max(1, current.nextSerialNumber || 1),
    };
    return this.saveSerialNumberSettings(nextSettings, user);
  },

  async resetRollNumberSerialForYear(
    newAcademicYear: string,
    startingSerial: number = 1,
    user: string = 'Admin'
  ): Promise<RollNumberSettings> {
    initStorage();
    const current = this.getRollNumberSettings();
    const cleanYear = String(newAcademicYear || new Date().getFullYear()).trim();
    const safeStart = Math.max(1, Math.floor(Number(startingSerial) || 1));

    let studentsList = this.getStudents();
    let registry = this.getIdRegistry();
    try {
      const [snap, regSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDoc(doc(db, 'settings', 'id_registry')),
      ]);
      studentsList = snap.docs.map(d => ({ ...(d.data() as Student), id: d.id }));
      if (regSnap.exists()) {
        registry = { ...DEFAULT_ID_REGISTRY, ...(regSnap.data() as Partial<IdRegistryRecord>) };
      }
    } catch {
      // fallback to cache
    }

    const usedRolls = new Set<string>([
      ...studentsList.map(s => String(s.rollNumber || '').trim().toUpperCase()).filter(Boolean),
      ...(registry.usedRollNumbers || []).map(r => String(r || '').trim().toUpperCase()).filter(Boolean),
    ]);

    const yearDisplay =
      current.yearFormat === 'YY' && cleanYear.length >= 2 ? cleanYear.slice(-2) : cleanYear;
    const yearPrefix = [current.prefix.trim().toUpperCase(), yearDisplay.toUpperCase()]
      .filter(Boolean)
      .join(current.separator ?? '-');

    let highestUsedInYear = 0;
    usedRolls.forEach(rollUpper => {
      if (!cleanYear || rollUpper.includes(yearPrefix) || rollUpper.includes(cleanYear.toUpperCase())) {
        const trailingMatch = rollUpper.match(/(\d+)\s*$/);
        if (trailingMatch) {
          const seq = parseInt(trailingMatch[1], 10);
          if (Number.isFinite(seq) && seq > highestUsedInYear) {
            highestUsedInYear = seq;
          }
        }
      }
    });

    const nextCandidateSettings: RollNumberSettings = {
      ...current,
      academicYear: cleanYear,
      lastResetYear: cleanYear,
      startingSerial: safeStart,
      nextSerialNumber: Math.max(safeStart, highestUsedInYear + 1),
    };

    while (
      usedRolls.has(
        formatRollNumberFromSettings(nextCandidateSettings.nextSerialNumber, nextCandidateSettings).toUpperCase()
      )
    ) {
      nextCandidateSettings.nextSerialNumber += 1;
    }

    const saved = await this.saveRollNumberSettings(nextCandidateSettings, user);
    this.logActivity(
      'Academic Year Roll Counter Reset',
      `Reset independent Roll Number counter for ${cleanYear} starting at #${saved.nextSerialNumber} (${formatRollNumberFromSettings(saved.nextSerialNumber, saved)}). Existing student Roll & Serial numbers preserved.`,
      'system',
      user,
      'admin'
    );
    return saved;
  },

  async fetchNextStudentSerialAndRoll(): Promise<{
    serialNumber: number;
    formattedSerialNumber: string;
    rollSeq: number;
    rollNumber: string;
    lastSerialNumber: number;
    lastFormattedSerialNumber?: string;
    lastRollNumber?: string;
    settings: RollNumberSettings;
    serialSettings: SerialNumberSettings;
  }> {
    initStorage();
    let rollConfig = this.getRollNumberSettings();
    let serialConfig = this.getSerialNumberSettings();
    let registry = this.getIdRegistry();
    let studentsList: Partial<Student>[] = this.getStudents();

    try {
      const [rollSnap, serialSnap, regSnap, snapshot] = await Promise.all([
        getDoc(doc(db, 'settings', 'roll_number_config')),
        getDoc(doc(db, 'settings', 'serial_number_config')),
        getDoc(doc(db, 'settings', 'id_registry')),
        getDocs(collection(db, 'students')),
      ]);
      if (rollSnap.exists()) {
        rollConfig = { ...DEFAULT_ROLL_NUMBER_SETTINGS, ...(rollSnap.data() as Partial<RollNumberSettings>) };
      }
      if (serialSnap.exists()) {
        serialConfig = { ...DEFAULT_SERIAL_NUMBER_SETTINGS, ...(serialSnap.data() as Partial<SerialNumberSettings>) };
      }
      if (regSnap.exists()) {
        registry = { ...DEFAULT_ID_REGISTRY, ...(regSnap.data() as Partial<IdRegistryRecord>) };
      }
      studentsList = snapshot.docs.map(docSnap => docSnap.data() as Partial<Student>);
    } catch (err) {
      console.warn('fetchNextStudentSerialAndRoll Firestore fallback to cache:', err);
    }

    const currentCalYear = String(new Date().getFullYear());
    // Independent Annual Reset Check for Roll Number
    if (rollConfig.resetAnnually && rollConfig.lastResetYear && rollConfig.lastResetYear !== currentCalYear) {
      rollConfig = {
        ...rollConfig,
        academicYear: currentCalYear,
        lastResetYear: currentCalYear,
        nextSerialNumber: Math.max(1, Number(rollConfig.startingSerial) || 1),
      };
    }
    // Independent Annual Reset Check for Serial Number
    if (serialConfig.resetAnnually && serialConfig.lastResetYear && serialConfig.lastResetYear !== currentCalYear) {
      serialConfig = {
        ...serialConfig,
        lastResetYear: currentCalYear,
        nextSerialNumber: Math.max(1, Number(serialConfig.startingSerial) || 1),
      };
    }

    const usedRolls = new Set<string>(
      (registry.usedRollNumbers || []).map(r => String(r || '').trim().toUpperCase()).filter(Boolean)
    );
    const usedSerialFormatted = new Set<string>(
      (registry.usedSerialNumbers || []).map(s => String(s || '').trim().toUpperCase()).filter(Boolean)
    );
    const usedSerialSeqs = new Set<number>(
      (registry.usedSerialSeqs || []).map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0)
    );

    let maxRollSeqInYear = 0;
    let maxSerialSeq = Number(registry.highestSerialSeq || 0);
    let lastRollNumber: string | undefined;
    let lastFormattedSerialNumber: string | undefined;

    const activeYear = String(rollConfig.academicYear || '').trim();
    const shortYear = activeYear.length >= 2 ? activeYear.slice(-2) : activeYear;
    const prefixUpper = String(rollConfig.prefix || '').trim().toUpperCase();

    studentsList.forEach((data) => {
      const sNum = Number(data?.serialNumber);
      if (Number.isFinite(sNum) && sNum > 0) {
        usedSerialSeqs.add(sNum);
        if (sNum > maxSerialSeq) {
          maxSerialSeq = sNum;
        }
      }
      const fSerial = String(data?.formattedSerialNumber || '').trim();
      if (fSerial) {
        usedSerialFormatted.add(fSerial.toUpperCase());
        const sTrailing = parseTrailingNumber(fSerial);
        if (sTrailing >= maxSerialSeq) {
          maxSerialSeq = Math.max(maxSerialSeq, sTrailing);
          lastFormattedSerialNumber = fSerial;
        }
      }
      const roll = String(data?.rollNumber || '').trim();
      if (roll) {
        const rollUpper = roll.toUpperCase();
        usedRolls.add(rollUpper);
        const matchesYear =
          !activeYear ||
          rollUpper.includes(activeYear.toUpperCase()) ||
          (rollConfig.yearFormat === 'YY' && rollUpper.includes(shortYear.toUpperCase()));
        const matchesPrefix = !prefixUpper || rollUpper.startsWith(prefixUpper);
        const rSeq = parseTrailingNumber(roll);
        if (rSeq > 0 && matchesYear && matchesPrefix && rSeq >= maxRollSeqInYear) {
          maxRollSeqInYear = rSeq;
          lastRollNumber = roll;
        }
      }
    });

    // Also advance maxRollSeqInYear based on registry for this prefix/year so deleted rolls are never reused
    usedRolls.forEach((rollUpper) => {
      const matchesYear =
        !activeYear ||
        rollUpper.includes(activeYear.toUpperCase()) ||
        (rollConfig.yearFormat === 'YY' && rollUpper.includes(shortYear.toUpperCase()));
      const matchesPrefix = !prefixUpper || rollUpper.startsWith(prefixUpper);
      const rSeq = parseTrailingNumber(rollUpper);
      if (rSeq > 0 && matchesYear && matchesPrefix && rSeq > maxRollSeqInYear) {
        maxRollSeqInYear = rSeq;
      }
    });

    // 1. Independent Roll Number calculation
    let rollSeq = Math.max(
      Number(rollConfig.startingSerial) || 1,
      Number(rollConfig.nextSerialNumber) || 1,
      rollConfig.resetAnnually && rollConfig.lastResetYear === currentCalYear ? 1 : maxRollSeqInYear + 1
    );
    if (rollSeq <= maxRollSeqInYear) {
      rollSeq = maxRollSeqInYear + 1;
    }
    let rollNumber = formatRollNumberFromSettings(rollSeq, rollConfig);
    while (usedRolls.has(rollNumber.toUpperCase())) {
      rollSeq += 1;
      rollNumber = formatRollNumberFromSettings(rollSeq, rollConfig);
    }

    // 2. Independent Serial Number calculation (completely decoupled from Roll Number!)
    let serialNumber = Math.max(
      Number(serialConfig.startingSerial) || 1,
      Number(serialConfig.nextSerialNumber) || 1,
      maxSerialSeq + 1
    );
    let formattedSerialNumber = formatSerialNumberFromSettings(serialNumber, serialConfig);
    while (
      usedSerialSeqs.has(serialNumber) ||
      usedSerialFormatted.has(formattedSerialNumber.toUpperCase())
    ) {
      serialNumber += 1;
      formattedSerialNumber = formatSerialNumberFromSettings(serialNumber, serialConfig);
    }

    return {
      serialNumber,
      formattedSerialNumber,
      rollSeq,
      rollNumber,
      lastSerialNumber: maxSerialSeq,
      lastFormattedSerialNumber:
        lastFormattedSerialNumber ||
        (maxSerialSeq > 0 ? formatSerialNumberFromSettings(maxSerialSeq, serialConfig) : undefined),
      lastRollNumber,
      settings: rollConfig,
      serialSettings: serialConfig,
    };
  },

  async allocateNextStudentSerialAndRoll(
    reservedRolls?: Set<string>,
    reservedSerials?: Set<string>
  ): Promise<{
    serialNumber: number;
    formattedSerialNumber: string;
    rollSeq: number;
    rollNumber: string;
    settings: RollNumberSettings;
    serialSettings: SerialNumberSettings;
  }> {
    initStorage();
    let studentsList: Partial<Student>[] = this.getStudents();
    try {
      const snap = await getDocs(collection(db, 'students'));
      studentsList = snap.docs.map(d => d.data() as Partial<Student>);
    } catch {
      // use cached students
    }

    const usedRolls = new Set<string>(
      studentsList.map(s => String(s.rollNumber || '').trim().toUpperCase()).filter(Boolean)
    );
    const usedFormattedSerials = new Set<string>(
      studentsList.map(s => String(s.formattedSerialNumber || '').trim().toUpperCase()).filter(Boolean)
    );
    const usedSerialSeqs = new Set<number>(
      studentsList.map(s => Number(s.serialNumber)).filter(n => Number.isFinite(n) && n > 0)
    );

    if (reservedRolls) {
      reservedRolls.forEach(r => usedRolls.add(r.trim().toUpperCase()));
    }
    if (reservedSerials) {
      reservedSerials.forEach(s => usedFormattedSerials.add(s.trim().toUpperCase()));
    }

    let maxSerialSeq = 0;
    studentsList.forEach(s => {
      const sn = Number(s.serialNumber);
      if (Number.isFinite(sn) && sn > maxSerialSeq) maxSerialSeq = sn;
      const fs = parseTrailingNumber(s.formattedSerialNumber);
      if (fs > maxSerialSeq) maxSerialSeq = fs;
    });

    const currentCalYear = String(new Date().getFullYear());

    try {
      const rollConfigRef = doc(db, 'settings', 'roll_number_config');
      const serialConfigRef = doc(db, 'settings', 'serial_number_config');
      const registryRef = doc(db, 'settings', 'id_registry');

      const result = await runTransaction(db, async (transaction) => {
        const [rollSnap, serialSnap, regSnap] = await Promise.all([
          transaction.get(rollConfigRef),
          transaction.get(serialConfigRef),
          transaction.get(registryRef),
        ]);

        let rollCfg: RollNumberSettings = rollSnap.exists()
          ? { ...DEFAULT_ROLL_NUMBER_SETTINGS, ...(rollSnap.data() as Partial<RollNumberSettings>) }
          : { ...this.getRollNumberSettings() };

        let serialCfg: SerialNumberSettings = serialSnap.exists()
          ? { ...DEFAULT_SERIAL_NUMBER_SETTINGS, ...(serialSnap.data() as Partial<SerialNumberSettings>) }
          : { ...this.getSerialNumberSettings() };

        const reg: IdRegistryRecord = regSnap.exists()
          ? { ...DEFAULT_ID_REGISTRY, ...(regSnap.data() as Partial<IdRegistryRecord>) }
          : { ...this.getIdRegistry() };

        // Add permanently retired/used numbers so deleted IDs are NEVER reused
        (reg.usedRollNumbers || []).forEach(r => {
          const ru = String(r || '').trim().toUpperCase();
          if (ru) usedRolls.add(ru);
        });
        (reg.usedSerialNumbers || []).forEach(s => {
          const su = String(s || '').trim().toUpperCase();
          if (su) usedFormattedSerials.add(su);
        });
        (reg.usedSerialSeqs || []).forEach(n => {
          const num = Number(n);
          if (Number.isFinite(num) && num > 0) usedSerialSeqs.add(num);
        });
        const regHighestSerial = Math.max(maxSerialSeq, Number(reg.highestSerialSeq || 0));

        // Annual Reset if enabled for Roll Number
        if (rollCfg.resetAnnually && rollCfg.lastResetYear && rollCfg.lastResetYear !== currentCalYear) {
          rollCfg = {
            ...rollCfg,
            academicYear: currentCalYear,
            lastResetYear: currentCalYear,
            nextSerialNumber: Math.max(1, Number(rollCfg.startingSerial) || 1),
          };
        }

        // Annual Reset if enabled for Serial Number
        if (serialCfg.resetAnnually && serialCfg.lastResetYear && serialCfg.lastResetYear !== currentCalYear) {
          serialCfg = {
            ...serialCfg,
            lastResetYear: currentCalYear,
            nextSerialNumber: Math.max(1, Number(serialCfg.startingSerial) || 1),
          };
        }

        // Match max roll sequence only within same year/prefix
        const activeYear = String(rollCfg.academicYear || '').trim();
        const shortYear = activeYear.length >= 2 ? activeYear.slice(-2) : activeYear;
        const prefixUpper = String(rollCfg.prefix || '').trim().toUpperCase();
        let maxMatchingRollSeq = 0;
        usedRolls.forEach(rollUpper => {
          const matchesYear =
            !activeYear ||
            rollUpper.includes(activeYear.toUpperCase()) ||
            (rollCfg.yearFormat === 'YY' && rollUpper.includes(shortYear.toUpperCase()));
          const matchesPrefix = !prefixUpper || rollUpper.startsWith(prefixUpper);
          const seq = parseTrailingNumber(rollUpper);
          if (seq > 0 && matchesYear && matchesPrefix && seq > maxMatchingRollSeq) {
            maxMatchingRollSeq = seq;
          }
        });

        // 1. Allocate independent Roll Number
        let candidateRollSeq = Math.max(
          Number(rollCfg.startingSerial) || 1,
          Number(rollCfg.nextSerialNumber) || 1,
          maxMatchingRollSeq + 1
        );
        let candidateRoll = formatRollNumberFromSettings(candidateRollSeq, rollCfg);
        while (usedRolls.has(candidateRoll.toUpperCase())) {
          candidateRollSeq += 1;
          candidateRoll = formatRollNumberFromSettings(candidateRollSeq, rollCfg);
        }

        // 2. Allocate independent Serial Number
        let candidateSerial = Math.max(
          Number(serialCfg.startingSerial) || 1,
          Number(serialCfg.nextSerialNumber) || 1,
          regHighestSerial + 1
        );
        let candidateFormattedSerial = formatSerialNumberFromSettings(candidateSerial, serialCfg);
        while (
          usedSerialSeqs.has(candidateSerial) ||
          usedFormattedSerials.has(candidateFormattedSerial.toUpperCase())
        ) {
          candidateSerial += 1;
          candidateFormattedSerial = formatSerialNumberFromSettings(candidateSerial, serialCfg);
        }

        const nowIso = new Date().toISOString();
        const updatedRollConfig: RollNumberSettings = {
          ...rollCfg,
          lastResetYear: rollCfg.lastResetYear || activeYear || currentCalYear,
          nextSerialNumber: candidateRollSeq + 1,
          updatedAt: nowIso,
        };
        const updatedSerialConfig: SerialNumberSettings = {
          ...serialCfg,
          lastResetYear: serialCfg.lastResetYear || currentCalYear,
          nextSerialNumber: candidateSerial + 1,
          updatedAt: nowIso,
        };

        const nextRegRolls = Array.from(new Set([...(reg.usedRollNumbers || []), candidateRoll.toUpperCase()]));
        const nextRegSerials = Array.from(new Set([...(reg.usedSerialNumbers || []), candidateFormattedSerial.toUpperCase()]));
        const nextRegSeqs = Array.from(new Set([...(reg.usedSerialSeqs || []), candidateSerial]));

        transaction.set(rollConfigRef, cleanForFirestore(updatedRollConfig), { merge: true });
        transaction.set(serialConfigRef, cleanForFirestore(updatedSerialConfig), { merge: true });
        transaction.set(
          registryRef,
          {
            usedRollNumbers: nextRegRolls,
            usedSerialNumbers: nextRegSerials,
            usedSerialSeqs: nextRegSeqs,
            highestSerialSeq: Math.max(regHighestSerial, candidateSerial),
            updatedAt: nowIso,
          },
          { merge: true }
        );

        return {
          serialNumber: candidateSerial,
          formattedSerialNumber: candidateFormattedSerial,
          rollSeq: candidateRollSeq,
          rollNumber: candidateRoll,
          settings: updatedRollConfig,
          serialSettings: updatedSerialConfig,
        };
      });

      memoryCache.rollNumberSettings = result.settings;
      memoryCache.serialNumberSettings = result.serialSettings;
      safeSet(STORAGE_KEYS.ROLL_NUMBER_SETTINGS, result.settings);
      safeSet(STORAGE_KEYS.SERIAL_NUMBER_SETTINGS, result.serialSettings);
      notifySubscribers('rollNumberSettings', result.settings);
      notifySubscribers('serialNumberSettings', result.serialSettings);
      if (reservedRolls) reservedRolls.add(result.rollNumber.toUpperCase());
      if (reservedSerials) reservedSerials.add(result.formattedSerialNumber.toUpperCase());
      return result;
    } catch (err) {
      console.warn('allocateNextStudentSerialAndRoll transaction fallback:', err);
      const preview = await this.fetchNextStudentSerialAndRoll();
      let rollSeq = preview.rollSeq;
      let rollNumber = preview.rollNumber;
      while (usedRolls.has(rollNumber.toUpperCase())) {
        rollSeq += 1;
        rollNumber = formatRollNumberFromSettings(rollSeq, preview.settings);
      }

      let serialNumber = preview.serialNumber;
      let formattedSerialNumber = preview.formattedSerialNumber;
      while (
        usedSerialSeqs.has(serialNumber) ||
        usedFormattedSerials.has(formattedSerialNumber.toUpperCase())
      ) {
        serialNumber += 1;
        formattedSerialNumber = formatSerialNumberFromSettings(serialNumber, preview.serialSettings);
      }

      if (reservedRolls) reservedRolls.add(rollNumber.toUpperCase());
      if (reservedSerials) reservedSerials.add(formattedSerialNumber.toUpperCase());

      const nextRollCfg: RollNumberSettings = {
        ...preview.settings,
        nextSerialNumber: rollSeq + 1,
      };
      const nextSerialCfg: SerialNumberSettings = {
        ...preview.serialSettings,
        nextSerialNumber: serialNumber + 1,
      };
      memoryCache.rollNumberSettings = nextRollCfg;
      memoryCache.serialNumberSettings = nextSerialCfg;
      safeSet(STORAGE_KEYS.ROLL_NUMBER_SETTINGS, nextRollCfg);
      safeSet(STORAGE_KEYS.SERIAL_NUMBER_SETTINGS, nextSerialCfg);
      notifySubscribers('rollNumberSettings', nextRollCfg);
      notifySubscribers('serialNumberSettings', nextSerialCfg);
      return {
        serialNumber,
        formattedSerialNumber,
        rollSeq,
        rollNumber,
        settings: nextRollCfg,
        serialSettings: nextSerialCfg,
      };
    }
  },

  async validateUniqueStudentIds(params: {
    rollNumber?: string;
    formattedSerialNumber?: string;
    excludeStudentId?: string;
  }): Promise<{ valid: boolean; error?: string }> {
    initStorage();
    let allStudents: Partial<Student>[] = this.getStudents();
    let registry = this.getIdRegistry();
    try {
      const [snap, regSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDoc(doc(db, 'settings', 'id_registry')),
      ]);
      allStudents = snap.docs.map(d => ({ ...(d.data() as Student), id: d.id }));
      if (regSnap.exists()) {
        registry = { ...DEFAULT_ID_REGISTRY, ...(regSnap.data() as Partial<IdRegistryRecord>) };
      }
    } catch {
      // use cached state
    }

    const rollCheck = String(params.rollNumber || '').trim().toUpperCase();
    const serialCheck = String(params.formattedSerialNumber || '').trim().toUpperCase();

    if (rollCheck) {
      const dupStudent = allStudents.find(
        s => s.id !== params.excludeStudentId && String(s.rollNumber || '').trim().toUpperCase() === rollCheck
      );
      if (dupStudent) {
        return {
          valid: false,
          error: `Roll Number "${params.rollNumber}" is already assigned to ${dupStudent.fullName}.`,
        };
      }
      if (!params.excludeStudentId && (registry.usedRollNumbers || []).some(r => r.toUpperCase() === rollCheck)) {
        return {
          valid: false,
          error: `Roll Number "${params.rollNumber}" was previously issued to a deleted/archived student and cannot be reused.`,
        };
      }
    }

    if (serialCheck) {
      const dupSerial = allStudents.find(
        s =>
          s.id !== params.excludeStudentId &&
          String(s.formattedSerialNumber || '').trim().toUpperCase() === serialCheck
      );
      if (dupSerial) {
        return {
          valid: false,
          error: `Serial Number "${params.formattedSerialNumber}" is already assigned to ${dupSerial.fullName}.`,
        };
      }
      if (!params.excludeStudentId && (registry.usedSerialNumbers || []).some(s => s.toUpperCase() === serialCheck)) {
        return {
          valid: false,
          error: `Serial Number "${params.formattedSerialNumber}" was previously issued to a deleted/archived student and cannot be reused.`,
        };
      }
    }

    return { valid: true };
  },

  async enrollStudentSafe(
    studentData: Omit<Student, 'id'>,
    user: string = 'Admin',
    role: UserRole = 'admin',
    options?: { allowManualRoll?: boolean; allowManualSerial?: boolean }
  ): Promise<Student> {
    initStorage();
    const rollCfg = this.getRollNumberSettings();
    const serialCfg = this.getSerialNumberSettings();

    const manualRoll = String(studentData.rollNumber || '').trim();
    const manualSerialStr = String(studentData.formattedSerialNumber || '').trim();

    const needsAutoRoll = !(options?.allowManualRoll || rollCfg.allowManualOverride) || !manualRoll;
    const needsAutoSerial = !(options?.allowManualSerial || serialCfg.allowManualOverride) || !manualSerialStr;

    let finalRoll = manualRoll;
    let finalFormattedSerial = manualSerialStr;
    let finalSerialSeq = Number(studentData.serialNumber) || 0;

    // Validate manual entries first if provided
    if (!needsAutoRoll || !needsAutoSerial) {
      const uniqueness = await this.validateUniqueStudentIds({
        rollNumber: !needsAutoRoll ? manualRoll : undefined,
        formattedSerialNumber: !needsAutoSerial ? manualSerialStr : undefined,
      });
      if (!uniqueness.valid) {
        throw new Error(uniqueness.error || 'Duplicate Student Roll or Serial Number.');
      }
    }

    if (needsAutoRoll || needsAutoSerial) {
      const allocated = await this.allocateNextStudentSerialAndRoll(
        !needsAutoRoll && manualRoll ? new Set([manualRoll]) : undefined,
        !needsAutoSerial && manualSerialStr ? new Set([manualSerialStr]) : undefined
      );
      if (needsAutoRoll) {
        finalRoll = allocated.rollNumber;
      }
      if (needsAutoSerial) {
        finalSerialSeq = allocated.serialNumber;
        finalFormattedSerial = allocated.formattedSerialNumber;
      }
    }

    if (!needsAutoSerial && finalFormattedSerial && finalSerialSeq <= 0) {
      finalSerialSeq = parseTrailingNumber(finalFormattedSerial) || 1;
    }

    const created = this.addStudent(
      {
        ...studentData,
        serialNumber: finalSerialSeq > 0 ? finalSerialSeq : undefined,
        formattedSerialNumber: finalFormattedSerial,
        rollNumber: finalRoll,
      },
      user,
      role
    );

    // Ensure manually entered numbers are permanently registered in id_registry too
    await this.recordUsedStudentIdsInRegistry([created]);
    return created;
  },

  addStudent(studentData: Omit<Student, 'id'>, user: string = 'Admin', role: UserRole = 'admin'): Student {
    const existingStudents = this.getStudents();
    const rollCfg = this.getRollNumberSettings();
    const serialCfg = this.getSerialNumberSettings();

    const computedMaxSerial = existingStudents.reduce((max, s) => {
      const seq = Number(s.serialNumber) || parseTrailingNumber(s.formattedSerialNumber) || 0;
      return Math.max(max, seq);
    }, Math.max(0, (Number(serialCfg.nextSerialNumber) || 1) - 1, existingStudents.length));

    const resolvedSerial =
      typeof studentData.serialNumber === 'number' && studentData.serialNumber > 0
        ? studentData.serialNumber
        : parseTrailingNumber(studentData.formattedSerialNumber) || computedMaxSerial + 1;

    const resolvedFormattedSerial =
      String(studentData.formattedSerialNumber || '').trim() ||
      formatSerialNumberFromSettings(resolvedSerial, serialCfg);

    const resolvedRoll =
      String(studentData.rollNumber || '').trim() ||
      formatRollNumberFromSettings(Math.max(1, Number(rollCfg.nextSerialNumber) || resolvedSerial), rollCfg);

    const newStudent: Student = {
      ...studentData,
      rollNumber: resolvedRoll,
      serialNumber: resolvedSerial,
      formattedSerialNumber: resolvedFormattedSerial,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    
    // Immediate optimistic update
    const updated = [newStudent, ...memoryCache.students];
    memoryCache.students = updated;
    safeSet(STORAGE_KEYS.STUDENTS, updated);
    notifySubscribers('students', updated);

    // Keep serial & roll counters advancing independently if needed
    if (resolvedSerial >= (serialCfg.nextSerialNumber || 1)) {
      const nextSerialCfg: SerialNumberSettings = {
        ...serialCfg,
        nextSerialNumber: resolvedSerial + 1,
      };
      memoryCache.serialNumberSettings = nextSerialCfg;
      safeSet(STORAGE_KEYS.SERIAL_NUMBER_SETTINGS, nextSerialCfg);
      notifySubscribers('serialNumberSettings', nextSerialCfg);
    }

    const rollTrailing = parseTrailingNumber(resolvedRoll);
    if (rollTrailing >= (rollCfg.nextSerialNumber || 1)) {
      const nextRollCfg: RollNumberSettings = {
        ...rollCfg,
        nextSerialNumber: rollTrailing + 1,
      };
      memoryCache.rollNumberSettings = nextRollCfg;
      safeSet(STORAGE_KEYS.ROLL_NUMBER_SETTINGS, nextRollCfg);
      notifySubscribers('rollNumberSettings', nextRollCfg);
    }

    // Save to Firestore real-time collection + record used IDs
    setDoc(doc(db, 'students', newStudent.id), cleanForFirestore(newStudent))
      .catch(err => console.warn('Firestore addStudent warning:', err));
    this.recordUsedStudentIdsInRegistry([newStudent]).catch(() => {});

    this.logActivity(
      'Student Added',
      `Registered ${newStudent.fullName} (Roll: ${newStudent.rollNumber}, Serial: ${newStudent.formattedSerialNumber}) in ${newStudent.batch}`,
      'student',
      user,
      role
    );
    return newStudent;
  },

  updateStudent(updatedStudent: Student, user: string = 'Admin', role: UserRole = 'admin'): Student {
    const existing = memoryCache.students.find(s => s.id === updatedStudent.id);
    // Preserve existing Roll Number and Serial Number unless explicitly altered
    const preservedRoll = String(updatedStudent.rollNumber || existing?.rollNumber || '').trim();
    const preservedSerial =
      updatedStudent.serialNumber || existing?.serialNumber || parseTrailingNumber(updatedStudent.formattedSerialNumber || existing?.formattedSerialNumber) || undefined;
    const preservedFormattedSerial =
      String(updatedStudent.formattedSerialNumber || existing?.formattedSerialNumber || '').trim() ||
      (preservedSerial ? formatSerialNumberFromSettings(preservedSerial, this.getSerialNumberSettings()) : undefined);

    const finalizedStudent: Student = {
      ...updatedStudent,
      rollNumber: preservedRoll,
      serialNumber: preservedSerial,
      formattedSerialNumber: preservedFormattedSerial,
    };

    const updatedList = memoryCache.students.map(s => s.id === finalizedStudent.id ? finalizedStudent : s);
    memoryCache.students = updatedList;
    safeSet(STORAGE_KEYS.STUDENTS, updatedList);
    notifySubscribers('students', updatedList);

    // Update in Firestore + registry
    setDoc(doc(db, 'students', finalizedStudent.id), cleanForFirestore(finalizedStudent), { merge: true })
      .catch(err => console.warn('Firestore updateStudent warning:', err));
    this.recordUsedStudentIdsInRegistry([finalizedStudent]).catch(() => {});

    this.logActivity(
      'Student Updated',
      `Updated profile information for ${finalizedStudent.fullName} (${finalizedStudent.rollNumber}${finalizedStudent.formattedSerialNumber ? ` · ${finalizedStudent.formattedSerialNumber}` : ''})`,
      'student',
      user,
      role
    );
    return finalizedStudent;
  },

  async migrateExistingStudentNumbers(
    user: string = 'Admin'
  ): Promise<{ updatedCount: number; skippedCount: number; totalCount: number }> {
    initStorage();
    const [studentsSnap, serialSnap, rollSnap, regSnap] = await Promise.all([
      getDocs(collection(db, 'students')),
      getDoc(doc(db, 'settings', 'serial_number_config')),
      getDoc(doc(db, 'settings', 'roll_number_config')),
      getDoc(doc(db, 'settings', 'id_registry')),
    ]);

    const serialCfg: SerialNumberSettings = serialSnap.exists()
      ? { ...DEFAULT_SERIAL_NUMBER_SETTINGS, ...(serialSnap.data() as Partial<SerialNumberSettings>) }
      : { ...this.getSerialNumberSettings() };
    const rollCfg: RollNumberSettings = rollSnap.exists()
      ? { ...DEFAULT_ROLL_NUMBER_SETTINGS, ...(rollSnap.data() as Partial<RollNumberSettings>) }
      : { ...this.getRollNumberSettings() };
    const reg: IdRegistryRecord = regSnap.exists()
      ? { ...DEFAULT_ID_REGISTRY, ...(regSnap.data() as Partial<IdRegistryRecord>) }
      : { ...this.getIdRegistry() };

    const docsList: Student[] = studentsSnap.docs
      .map(d => ({ ...(d.data() as Student), id: d.id }))
      .sort((a, b) => {
        const dateCmp = String(a.enrollmentDate || '').localeCompare(String(b.enrollmentDate || ''));
        if (dateCmp !== 0) return dateCmp;
        return String(a.rollNumber || '').localeCompare(String(b.rollNumber || ''));
      });

    const usedRolls = new Set<string>(
      (reg.usedRollNumbers || []).map(r => r.toUpperCase()).filter(Boolean)
    );
    const usedFormattedSerials = new Set<string>(
      (reg.usedSerialNumbers || []).map(s => s.toUpperCase()).filter(Boolean)
    );
    const usedSerialSeqs = new Set<number>(
      (reg.usedSerialSeqs || []).map(Number).filter(n => Number.isFinite(n) && n > 0)
    );

    // Seed sets with already-valid existing numbers first
    docsList.forEach(s => {
      if (s.rollNumber) usedRolls.add(String(s.rollNumber).trim().toUpperCase());
      if (s.formattedSerialNumber) {
        usedFormattedSerials.add(String(s.formattedSerialNumber).trim().toUpperCase());
      }
      if (Number(s.serialNumber) > 0 && s.formattedSerialNumber) {
        usedSerialSeqs.add(Number(s.serialNumber));
      }
    });

    let nextSerialCursor = Math.max(
      Number(serialCfg.startingSerial) || 1,
      Number(serialCfg.nextSerialNumber) || 1
    );
    let nextRollCursor = Math.max(
      Number(rollCfg.startingSerial) || 1,
      Number(rollCfg.nextSerialNumber) || 1
    );

    const updates: Student[] = [];
    let skippedCount = 0;

    docsList.forEach(student => {
      const hasValidRoll = Boolean(student.rollNumber && String(student.rollNumber).trim());
      const hasValidFormattedSerial = Boolean(
        student.formattedSerialNumber && String(student.formattedSerialNumber).trim()
      );
      if (hasValidRoll && hasValidFormattedSerial && Number(student.serialNumber) > 0) {
        skippedCount += 1;
        return;
      }

      let resolvedRoll = String(student.rollNumber || '').trim();
      if (!resolvedRoll) {
        while (usedRolls.has(formatRollNumberFromSettings(nextRollCursor, rollCfg).toUpperCase())) {
          nextRollCursor += 1;
        }
        resolvedRoll = formatRollNumberFromSettings(nextRollCursor, rollCfg);
        usedRolls.add(resolvedRoll.toUpperCase());
        nextRollCursor += 1;
      }

      let resolvedSeq = Number(student.serialNumber) || 0;
      let resolvedFormattedSerial = String(student.formattedSerialNumber || '').trim();

      if (!resolvedFormattedSerial) {
        // Prefer student's existing positive serialNumber if unused; otherwise take next sequential counter
        if (
          resolvedSeq > 0 &&
          !usedSerialSeqs.has(resolvedSeq) &&
          !usedFormattedSerials.has(formatSerialNumberFromSettings(resolvedSeq, serialCfg).toUpperCase())
        ) {
          resolvedFormattedSerial = formatSerialNumberFromSettings(resolvedSeq, serialCfg);
        } else {
          while (
            usedSerialSeqs.has(nextSerialCursor) ||
            usedFormattedSerials.has(formatSerialNumberFromSettings(nextSerialCursor, serialCfg).toUpperCase())
          ) {
            nextSerialCursor += 1;
          }
          resolvedSeq = nextSerialCursor;
          resolvedFormattedSerial = formatSerialNumberFromSettings(resolvedSeq, serialCfg);
          nextSerialCursor += 1;
        }
        usedSerialSeqs.add(resolvedSeq);
        usedFormattedSerials.add(resolvedFormattedSerial.toUpperCase());
      } else if (resolvedSeq <= 0) {
        resolvedSeq = parseTrailingNumber(resolvedFormattedSerial) || nextSerialCursor++;
      }

      updates.push({
        ...student,
        rollNumber: resolvedRoll,
        serialNumber: resolvedSeq,
        formattedSerialNumber: resolvedFormattedSerial,
      });
    });

    if (updates.length > 0) {
      const batch = writeBatch(db);
      updates.forEach(u => {
        batch.set(
          doc(db, 'students', u.id),
          cleanForFirestore({
            rollNumber: u.rollNumber,
            serialNumber: u.serialNumber,
            formattedSerialNumber: u.formattedSerialNumber,
          }),
          { merge: true }
        );
      });
      const highestSerialSeq = Math.max(
        Number(reg.highestSerialSeq || 0),
        ...Array.from(usedSerialSeqs)
      );
      batch.set(
        doc(db, 'settings', 'serial_number_config'),
        cleanForFirestore({
          ...serialCfg,
          nextSerialNumber: Math.max(nextSerialCursor, highestSerialSeq + 1),
          updatedAt: new Date().toISOString(),
          updatedBy: user,
        }),
        { merge: true }
      );
      batch.set(
        doc(db, 'settings', 'id_registry'),
        {
          usedRollNumbers: Array.from(usedRolls),
          usedSerialNumbers: Array.from(usedFormattedSerials),
          usedSerialSeqs: Array.from(usedSerialSeqs),
          highestSerialSeq,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await batch.commit();

      const updateMap = new Map(updates.map(u => [u.id, u]));
      const nextCache = (memoryCache.students || []).map(s => updateMap.get(s.id) || s);
      memoryCache.students = nextCache;
      safeSet(STORAGE_KEYS.STUDENTS, nextCache);
      notifySubscribers('students', nextCache);

      this.logActivity(
        'Student Serial Migration Completed',
        `Assigned unique independent Serial Numbers to ${updates.length} existing student(s) (${skippedCount} already configured). All existing Roll Numbers preserved.`,
        'system',
        user,
        'admin'
      );
    } else {
      await this.recordUsedStudentIdsInRegistry(docsList, { awaitSync: true });
    }

    return {
      updatedCount: updates.length,
      skippedCount,
      totalCount: docsList.length,
    };
  },

  updateStudentWhatsAppConsent(
    studentId: string,
    whatsappOptOut: boolean,
    user: string = 'Admin',
    role: UserRole = 'admin'
  ): Student | null {
    const existing = memoryCache.students.find(s => s.id === studentId);
    if (!existing) return null;
    const updated: Student = {
      ...existing,
      whatsappOptOut,
      whatsappConsentUpdatedAt: new Date().toISOString()
    };
    return this.updateStudent(updated, user, role);
  },

  deleteStudent(id: string, user: string = 'Admin', role: UserRole = 'admin'): boolean {
    const target = memoryCache.students.find(s => s.id === id);
    if (!target) return false;

    // Permanently preserve deleted Roll & Serial numbers so they are never reused
    this.recordUsedStudentIdsInRegistry([target]).catch(() => {});

    const filtered = memoryCache.students.filter(s => s.id !== id);
    memoryCache.students = filtered;
    safeSet(STORAGE_KEYS.STUDENTS, filtered);
    notifySubscribers('students', filtered);

    // Delete in Firestore
    deleteDoc(doc(db, 'students', id))
      .catch(err => console.warn('Firestore deleteStudent warning:', err));

    this.logActivity(
      'Student Removed',
      `Removed student record: ${target.fullName} (Roll: ${target.rollNumber}${target.formattedSerialNumber ? `, Serial: ${target.formattedSerialNumber}` : ''})`,
      'student',
      user,
      role
    );
    return true;
  },

  deleteStudentsBatch(ids: string[], user: string = 'Admin', role: UserRole = 'admin'): boolean {
    if (!ids || ids.length === 0) return false;
    const idSet = new Set(ids);
    const targets = memoryCache.students.filter(s => idSet.has(s.id));
    const targetCount = targets.length;

    // Permanently preserve deleted Roll & Serial numbers so they are never reused
    this.recordUsedStudentIdsInRegistry(targets).catch(() => {});
    
    const filtered = memoryCache.students.filter(s => !idSet.has(s.id));
    memoryCache.students = filtered;
    safeSet(STORAGE_KEYS.STUDENTS, filtered);
    notifySubscribers('students', filtered);

    // Delete in Firestore using batch
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.delete(doc(db, 'students', id));
      });
      batch.commit().catch(e => console.warn('Firestore deleteStudentsBatch warning:', e));
    } catch (e) {
      console.warn('deleteStudentsBatch error:', e);
    }

    this.logActivity(
      'Bulk Students Removed',
      `Bulk deleted ${targetCount} student record(s) from directory`,
      'student',
      user,
      role
    );
    return true;
  },

  async clearAllStudents(user: string = 'Admin', role: UserRole = 'admin'): Promise<number> {
    const studentsToDelete = [...memoryCache.students];
    const count = studentsToDelete.length;

    await this.recordUsedStudentIdsInRegistry(studentsToDelete, { awaitSync: true });

    // 1. Immediately reset in-memory cache and localStorage so the UI renders 0 students
    memoryCache.students = [];
    safeSet(STORAGE_KEYS.STUDENTS, []);
    notifySubscribers('students', []);

    // 2. Loop through existing students and delete each from Firebase Firestore
    try {
      for (const student of studentsToDelete) {
        if (student?.id) {
          try {
            await deleteDoc(doc(db, 'students', student.id));
          } catch (e) {
            console.warn(`Firestore deleteDoc warning for student ${student.id}:`, e);
          }
        }
      }

      // 3. Additionally sweep the Firestore 'students' collection in case of any un-cached or orphan documents
      try {
        const snap = await getDocs(collection(db, 'students'));
        if (!snap.empty) {
          const orphanStudents = snap.docs.map(d => d.data() as Partial<Student>);
          await this.recordUsedStudentIdsInRegistry(orphanStudents, { awaitSync: true });
          for (const docSnap of snap.docs) {
            try {
              await deleteDoc(doc(db, 'students', docSnap.id));
            } catch (e) {
              console.warn(`Firestore cleanup warning for doc ${docSnap.id}:`, e);
            }
          }
        }
      } catch (sweepErr) {
        console.warn('Firestore sweep warning:', sweepErr);
      }
    } catch (e) {
      console.warn('Firebase clearAllStudents error:', e);
    }

    this.logActivity(
      'All Students Cleared',
      `Permanently cleared all student records (${count}) from Firebase database for a fresh start.`,
      'student',
      user,
      role
    );

    return count;
  },

  // Teachers Management (Admin controlled)
  getTeacherAccounts(): TeacherAccount[] {
    initStorage();
    return memoryCache.teachers;
  },

  saveTeacherAccounts(teachers: TeacherAccount[]): void {
    memoryCache.teachers = teachers;
    safeSet(STORAGE_KEYS.TEACHERS, teachers);
    notifySubscribers('teachers', teachers);

    try {
      const batch = writeBatch(db);
      teachers.forEach(t => {
        batch.set(doc(db, 'teachers', t.id), cleanForFirestore(t), { merge: true });
      });
      batch.commit().catch(e => console.warn('Firestore teachers batch write warning:', e));
    } catch (e) {
      console.warn('saveTeacherAccounts warning:', e);
    }
  },

  addTeacherAccount(teacherData: Omit<TeacherAccount, 'id'>, user: string = 'Admin', role: UserRole = 'admin'): TeacherAccount {
    const newTeacher: TeacherAccount = {
      ...teacherData,
      id: `teacher_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };

    const updated = [...memoryCache.teachers, newTeacher];
    memoryCache.teachers = updated;
    safeSet(STORAGE_KEYS.TEACHERS, updated);
    notifySubscribers('teachers', updated);

    // Save to Firestore
    setDoc(doc(db, 'teachers', newTeacher.id), cleanForFirestore(newTeacher))
      .catch(err => console.warn('Firestore addTeacherAccount warning:', err));

    this.logActivity(
      'Teacher Account Created',
      `Created teacher account for ${newTeacher.name} (@${newTeacher.username}) with access to: ${newTeacher.allowedMenus.join(', ')}`,
      'teacher',
      user,
      role
    );
    return newTeacher;
  },

  updateTeacherAccount(teacher: TeacherAccount, user: string = 'Admin', role: UserRole = 'admin'): TeacherAccount {
    const updated = memoryCache.teachers.map(t => t.id === teacher.id ? teacher : t);
    memoryCache.teachers = updated;
    safeSet(STORAGE_KEYS.TEACHERS, updated);
    notifySubscribers('teachers', updated);

    // Update in Firestore
    setDoc(doc(db, 'teachers', teacher.id), cleanForFirestore(teacher), { merge: true })
      .catch(err => console.warn('Firestore updateTeacherAccount warning:', err));

    this.logActivity(
      'Teacher Account Updated',
      `Updated credentials or permissions for ${teacher.name} (@${teacher.username})`,
      'teacher',
      user,
      role
    );
    return teacher;
  },

  deleteTeacherAccount(id: string, user: string = 'Admin', role: UserRole = 'admin'): boolean {
    const target = memoryCache.teachers.find(t => t.id === id);
    if (!target) return false;

    const filtered = memoryCache.teachers.filter(t => t.id !== id);
    memoryCache.teachers = filtered;
    safeSet(STORAGE_KEYS.TEACHERS, filtered);
    notifySubscribers('teachers', filtered);

    // Delete in Firestore
    deleteDoc(doc(db, 'teachers', id))
      .catch(err => console.warn('Firestore deleteTeacherAccount warning:', err));

    this.logActivity(
      'Teacher Account Revoked',
      `Revoked access and deleted account for ${target.name} (@${target.username})`,
      'teacher',
      user,
      role
    );
    return true;
  },

  getTeacherByUsername(username: string): TeacherAccount | undefined {
    return this.getTeacherAccounts().find(
      t => t.username.toLowerCase() === username.trim().toLowerCase()
    );
  },

  unblockTeacherAccount(id: string, user: string = 'Admin', role: UserRole = 'admin'): boolean {
    const target = memoryCache.teachers.find(t => t.id === id);
    if (!target) return false;

    const restored: TeacherAccount = {
      ...target,
      status: 'Active',
      failedAttempts: 0,
      blockedAt: undefined
    };

    const updated = memoryCache.teachers.map(t => t.id === id ? restored : t);
    memoryCache.teachers = updated;
    safeSet(STORAGE_KEYS.TEACHERS, updated);
    notifySubscribers('teachers', updated);

    setDoc(doc(db, 'teachers', id), cleanForFirestore(restored), { merge: true })
      .catch(err => console.warn('Firestore unblockTeacherAccount warning:', err));

    this.logActivity(
      'Teacher Account Restored',
      `Restored access and cleared failed attempts for ${target.name} (@${target.username})`,
      'teacher',
      user,
      role
    );
    return true;
  },

  // Student Portal Accounts Management (Admin controlled)
  getStudentPortalAccounts(): StudentPortalAccount[] {
    initStorage();
    return memoryCache.studentPortalAccounts;
  },

  getStudentPortalByUsernameOrRoll(identifier: string): StudentPortalAccount | undefined {
    const q = identifier.trim().toLowerCase();
    if (!q) return undefined;
    return this.getStudentPortalAccounts().find(
      acc =>
        acc.username.trim().toLowerCase() === q ||
        (acc.email && acc.email.trim().toLowerCase() === q) ||
        acc.rollNumber.trim().toLowerCase() === q
    );
  },

  async grantStudentAppAccess(
    params: {
      student: Student;
      email?: string;
      password?: string;
      enabled?: boolean;
    },
    user: string = 'Admin',
    role: UserRole = 'admin'
  ): Promise<{
    account: StudentPortalAccount;
    student: Student;
    uid: string;
    email: string;
    password: string;
  }> {
    initStorage();
    const { student } = params;
    const generatedEmail = (params.email || buildStudentAppEmail(student.rollNumber)).trim().toLowerCase();
    const generatedPassword = (params.password || generateSecureStudentPassword(10)).trim();
    const enabled = params.enabled !== undefined ? Boolean(params.enabled) : true;

    // 1. Create Firebase Auth account using createUserWithEmailAndPassword
    const { uid, email } = await provisionStudentFirebaseAuth(generatedEmail, generatedPassword);
    const grantedAt = new Date().toISOString();

    // 2. Save email, password (for admin view), and uid in the students Firestore document
    const existingPersonalEmail =
      student.personalEmail ||
      (student.email && !student.email.toLowerCase().endsWith('@okkorean.com')
        ? student.email
        : undefined);

    const updatedStudent: Student = {
      ...student,
      uid,
      email,
      password: generatedPassword,
      personalEmail: existingPersonalEmail,
      portalEmail: email,
      portalPassword: generatedPassword,
      portalUid: uid,
      portalEnabled: enabled,
      portalGrantedAt: grantedAt,
    };

    const nextStudents = memoryCache.students.map((s) =>
      s.id === student.id ? updatedStudent : s
    );
    memoryCache.students = nextStudents;
    safeSet(STORAGE_KEYS.STUDENTS, nextStudents);
    notifySubscribers('students', nextStudents);

    await setDoc(
      doc(db, 'students', student.id),
      cleanForFirestore({
        uid,
        email,
        password: generatedPassword,
        personalEmail: existingPersonalEmail,
        portalEmail: email,
        portalPassword: generatedPassword,
        portalUid: uid,
        portalEnabled: enabled,
        portalGrantedAt: grantedAt,
      }),
      { merge: true }
    );

    // 3. Mirror into student_portal_accounts for Admin table & Web Student Portal
    const docId = `portal_${student.id}`;
    const existingAcc = memoryCache.studentPortalAccounts.find(
      (a) => a.id === docId || a.studentId === student.id
    );
    const account: StudentPortalAccount = {
      id: docId,
      studentId: student.id,
      studentName: student.fullName,
      koreanName: student.koreanName || '',
      rollNumber: student.rollNumber,
      username: email,
      email,
      password: generatedPassword,
      uid,
      assignedBatch: student.batch,
      studentClass: student.studentClass || 'Class 1',
      timing: student.timing || 'Morning',
      enabled,
      status: enabled ? 'Active' : 'Disabled',
      createdAt: existingAcc?.createdAt || grantedAt.split('T')[0],
      updatedAt: grantedAt,
    };

    const nextAccounts = existingAcc
      ? memoryCache.studentPortalAccounts.map((a) =>
          a.id === docId || a.studentId === student.id ? account : a
        )
      : [...memoryCache.studentPortalAccounts, account];

    memoryCache.studentPortalAccounts = nextAccounts;
    safeSet(STORAGE_KEYS.STUDENT_PORTAL_ACCOUNTS, nextAccounts);
    notifySubscribers('studentPortalAccounts', nextAccounts);

    await setDoc(doc(db, 'student_portal_accounts', docId), cleanForFirestore(account), {
      merge: true,
    });

    // 4. Ensure global IN/OUT Mode setting exists in Firestore settings collection for Mobile App
    const currentInOut = Boolean(memoryCache.deviceConfig?.inOutModeEnabled);
    await Promise.all([
      setDoc(
        doc(db, 'settings', 'zkteco_device'),
        { inOutModeEnabled: currentInOut, inOutMode: currentInOut },
        { merge: true }
      ),
      setDoc(
        doc(db, 'settings', 'global'),
        { inOutModeEnabled: currentInOut, inOutMode: currentInOut, updatedAt: grantedAt },
        { merge: true }
      ),
    ]).catch((err) => console.warn('IN/OUT Mode sync warning:', err));

    this.logActivity(
      'App Access Granted',
      `Created Firebase Auth account (${email}, UID: ${uid}) for ${student.fullName} (${student.rollNumber})`,
      'student_portal',
      user,
      role
    );

    return { account, student: updatedStudent, uid, email, password: generatedPassword };
  },

  addStudentPortalAccount(
    accountData: Omit<StudentPortalAccount, 'id'>,
    user: string = 'Admin',
    role: UserRole = 'admin'
  ): StudentPortalAccount {
    const docId = accountData.studentId ? `portal_${accountData.studentId}` : `portal_${Date.now()}`;
    const enabled = accountData.enabled !== undefined ? Boolean(accountData.enabled) : accountData.status !== 'Disabled';
    const newAccount: StudentPortalAccount = {
      ...accountData,
      id: docId,
      enabled,
      status: enabled ? 'Active' : 'Disabled',
      createdAt: accountData.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    const existingIdx = memoryCache.studentPortalAccounts.findIndex(
      a => a.id === docId || a.studentId === accountData.studentId
    );
    const updated =
      existingIdx >= 0
        ? memoryCache.studentPortalAccounts.map((a, idx) => (idx === existingIdx ? newAccount : a))
        : [...memoryCache.studentPortalAccounts, newAccount];

    memoryCache.studentPortalAccounts = updated;
    safeSet(STORAGE_KEYS.STUDENT_PORTAL_ACCOUNTS, updated);
    notifySubscribers('studentPortalAccounts', updated);

    setDoc(doc(db, 'student_portal_accounts', newAccount.id), cleanForFirestore(newAccount), { merge: true })
      .catch(err => console.warn('Firestore addStudentPortalAccount warning:', err));

    this.logActivity(
      'Student Portal Access Granted',
      `Granted portal access for ${newAccount.studentName} (${newAccount.rollNumber}) as @${newAccount.username}`,
      'student_portal',
      user,
      role
    );
    return newAccount;
  },

  updateStudentPortalAccount(
    account: StudentPortalAccount,
    user: string = 'Admin',
    role: UserRole = 'admin'
  ): StudentPortalAccount {
    const enabled = account.enabled !== undefined ? Boolean(account.enabled) : account.status !== 'Disabled';
    const normalized: StudentPortalAccount = {
      ...account,
      enabled,
      status: enabled ? 'Active' : 'Disabled',
      updatedAt: new Date().toISOString(),
    };
    const updated = memoryCache.studentPortalAccounts.map(a =>
      a.id === normalized.id ? normalized : a
    );
    memoryCache.studentPortalAccounts = updated;
    safeSet(STORAGE_KEYS.STUDENT_PORTAL_ACCOUNTS, updated);
    notifySubscribers('studentPortalAccounts', updated);

    setDoc(doc(db, 'student_portal_accounts', normalized.id), cleanForFirestore(normalized), { merge: true })
      .catch(err => console.warn('Firestore updateStudentPortalAccount warning:', err));

    if (normalized.studentId) {
      const nextStudents = memoryCache.students.map((s) =>
        s.id === normalized.studentId
          ? {
              ...s,
              email: normalized.email || normalized.username,
              password: normalized.password,
              uid: normalized.uid || s.uid,
              portalEmail: normalized.email || normalized.username,
              portalPassword: normalized.password,
              portalEnabled: enabled,
            }
          : s
      );
      memoryCache.students = nextStudents;
      safeSet(STORAGE_KEYS.STUDENTS, nextStudents);
      notifySubscribers('students', nextStudents);

      setDoc(
        doc(db, 'students', normalized.studentId),
        cleanForFirestore({
          email: normalized.email || normalized.username,
          password: normalized.password,
          uid: normalized.uid,
          portalEmail: normalized.email || normalized.username,
          portalPassword: normalized.password,
          portalEnabled: enabled,
        }),
        { merge: true }
      ).catch((err) => console.warn('Firestore student portal mirror warning:', err));
    }

    this.logActivity(
      'Student Portal Account Updated',
      `Updated portal credentials/status for ${normalized.studentName} (${normalized.rollNumber})`,
      'student_portal',
      user,
      role
    );
    return normalized;
  },

  toggleStudentPortalAccess(
    id: string,
    user: string = 'Admin',
    role: UserRole = 'admin'
  ): StudentPortalAccount | null {
    const target = memoryCache.studentPortalAccounts.find(a => a.id === id);
    if (!target) return null;

    const nextEnabled = !target.enabled;
    const updatedAccount: StudentPortalAccount = {
      ...target,
      enabled: nextEnabled,
      status: nextEnabled ? 'Active' : 'Disabled',
      updatedAt: new Date().toISOString(),
    };

    const updated = memoryCache.studentPortalAccounts.map(a =>
      a.id === id ? updatedAccount : a
    );
    memoryCache.studentPortalAccounts = updated;
    safeSet(STORAGE_KEYS.STUDENT_PORTAL_ACCOUNTS, updated);
    notifySubscribers('studentPortalAccounts', updated);

    setDoc(doc(db, 'student_portal_accounts', id), cleanForFirestore(updatedAccount), { merge: true })
      .catch(err => console.warn('Firestore toggleStudentPortalAccess warning:', err));

    if (target.studentId) {
      const nextStudents = memoryCache.students.map((s) =>
        s.id === target.studentId ? { ...s, portalEnabled: nextEnabled } : s
      );
      memoryCache.students = nextStudents;
      safeSet(STORAGE_KEYS.STUDENTS, nextStudents);
      notifySubscribers('students', nextStudents);

      setDoc(
        doc(db, 'students', target.studentId),
        { portalEnabled: nextEnabled },
        { merge: true }
      ).catch((err) => console.warn('Firestore toggle student doc warning:', err));
    }

    this.logActivity(
      `Student Portal ${nextEnabled ? 'Enabled' : 'Disabled'}`,
      `${nextEnabled ? 'Enabled' : 'Disabled'} portal login for ${target.studentName} (${target.rollNumber})`,
      'student_portal',
      user,
      role
    );
    return updatedAccount;
  },

  deleteStudentPortalAccount(
    id: string,
    user: string = 'Admin',
    role: UserRole = 'admin'
  ): boolean {
    const target = memoryCache.studentPortalAccounts.find(a => a.id === id);
    if (!target) return false;

    const filtered = memoryCache.studentPortalAccounts.filter(a => a.id !== id);
    memoryCache.studentPortalAccounts = filtered;
    safeSet(STORAGE_KEYS.STUDENT_PORTAL_ACCOUNTS, filtered);
    notifySubscribers('studentPortalAccounts', filtered);

    deleteDoc(doc(db, 'student_portal_accounts', id))
      .catch(err => console.warn('Firestore deleteStudentPortalAccount warning:', err));

    if (target.studentId) {
      const nextStudents = memoryCache.students.map((s) =>
        s.id === target.studentId ? { ...s, portalEnabled: false } : s
      );
      memoryCache.students = nextStudents;
      safeSet(STORAGE_KEYS.STUDENTS, nextStudents);
      notifySubscribers('students', nextStudents);

      setDoc(
        doc(db, 'students', target.studentId),
        { portalEnabled: false },
        { merge: true }
      ).catch(() => {});
    }

    this.logActivity(
      'Student Portal Access Revoked',
      `Revoked portal access for ${target.studentName} (${target.rollNumber})`,
      'student_portal',
      user,
      role
    );
    return true;
  },

  // Attendance
  getAttendance(): AttendanceRecord[] {
    initStorage();
    return memoryCache.attendance;
  },

  saveAttendance(attendance: AttendanceRecord[]): void {
    memoryCache.attendance = attendance;
    safeSet(STORAGE_KEYS.ATTENDANCE, attendance);
    notifySubscribers('attendance', attendance);
  },

  async saveBatchAttendanceConfirmed(
    recordsOrBatch: StudentBatch | Omit<AttendanceRecord, 'id'>[],
    dateOrUser?: string,
    recordsOrRole?: Array<{
      studentId: string;
      studentRoll: string;
      studentName: string;
      status: AttendanceStatus;
      notes?: string;
    }> | UserRole,
    optUser: string = 'Teacher',
    optRole: UserRole = 'teacher'
  ): Promise<{ savedCount: number; skippedLockedCount: number; savedRecords: AttendanceRecord[] }> {
    let batch: StudentBatch;
    let date: string;
    let records: Array<{
      studentId: string;
      studentRoll: string;
      studentName: string;
      status: AttendanceStatus;
      notes?: string;
    }>;
    let user = optUser;
    let role = optRole;

    if (Array.isArray(recordsOrBatch)) {
      records = recordsOrBatch;
      batch = recordsOrBatch[0]?.batch || '';
      date = recordsOrBatch[0]?.date || new Date().toISOString().split('T')[0];
      user = (dateOrUser as string) || 'Teacher';
      role = (recordsOrRole as UserRole) || 'teacher';
    } else {
      batch = recordsOrBatch;
      date = dateOrUser as string;
      records = recordsOrRole as Array<{
        studentId: string;
        studentRoll: string;
        studentName: string;
        status: AttendanceStatus;
        notes?: string;
      }>;
    }

    if (!records || records.length === 0) {
      return { savedCount: 0, skippedLockedCount: 0, savedRecords: [] };
    }

    initStorage();
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const timestampStr = `${date} ${timeStr}`;

    // Snapshot previous records BEFORE saving
    const previousRecordsByKey = new Map<string, AttendanceRecord>();
    memoryCache.attendance.forEach(a => {
      if (a.date === date && records.some(r => r.studentId === a.studentId)) {
        previousRecordsByKey.set(`${a.studentId}_${a.date}`, a);
      }
    });

    const permittedRecords =
      role === 'teacher'
        ? records.filter((r) => {
            const existing = previousRecordsByKey.get(`${r.studentId}_${date}`);
            return !existing || existing.status === 'Neutral';
          })
        : records;

    const skippedLockedCount = records.length - permittedRecords.length;
    if (permittedRecords.length === 0) {
      return { savedCount: 0, skippedLockedCount, savedRecords: [] };
    }

    const newRecords: AttendanceRecord[] = permittedRecords.map((r) => {
      const docId = `att_${r.studentId}_${date}`;
      const rec = r as Partial<AttendanceRecord>;
      const prevRec = previousRecordsByKey.get(`${r.studentId}_${date}`);
      const studentObj = memoryCache.students.find(s => s.id === r.studentId);
      const cleanedPrevRemarks =
        prevRec?.remarks && !prevRec.remarks.toLowerCase().includes('neutralized')
          ? prevRec.remarks
          : '';
      return {
        ...r,
        id: docId,
        studentSerial: rec.studentSerial || getStudentSerialDisplay(studentObj),
        batch: rec.batch || batch,
        batchId: rec.batchId,
        studentClass: rec.studentClass,
        timing: rec.timing,
        teacherId: rec.teacherId,
        teacherName: rec.teacherName,
        date,
        time: rec.time || timeStr,
        timestamp: rec.timestamp || timestampStr,
        source: (rec.source as AttendanceSource) || 'Manual',
        remarks: rec.remarks !== undefined ? rec.remarks : cleanedPrevRemarks,
      };
    });

    // 1. Commit to Firestore FIRST and wait for confirmed persistence
    let committedRecords: AttendanceRecord[] = [];
    let txLockedCount = 0;

    if (role === 'teacher') {
      const results = await Promise.all(
        newRecords.map((rec) =>
          runTransaction(db, async (tx) => {
            const attRef = doc(db, 'attendance', rec.id);
            const snap = await tx.get(attRef);
            if (snap.exists()) {
              const existingData = snap.data() as Partial<AttendanceRecord>;
              if (existingData.status && existingData.status !== 'Neutral') {
                return false;
              }
            }
            tx.set(
              attRef,
              cleanForFirestore({
                ...rec,
                pendingChangeRequestId: '',
                remarks: rec.remarks || '',
              }),
              { merge: true }
            );
            return true;
          })
        )
      );
      committedRecords = newRecords.filter((_, i) => results[i]);
      txLockedCount = newRecords.length - committedRecords.length;
    } else {
      const firestoreBatch = writeBatch(db);
      newRecords.forEach(rec => {
        firestoreBatch.set(
          doc(db, 'attendance', rec.id),
          cleanForFirestore({
            ...rec,
            pendingChangeRequestId: '',
            remarks: rec.remarks || '',
          }),
          { merge: true }
        );
      });
      await firestoreBatch.commit();
      committedRecords = newRecords;
    }

    if (committedRecords.length === 0) {
      return {
        savedCount: 0,
        skippedLockedCount: skippedLockedCount + txLockedCount,
        savedRecords: [],
      };
    }

    // Auto-close any obsolete Neutral->X pending requests for these students on this date
    const staleNeutralReqs = (memoryCache.attendanceRequests || []).filter(
      req =>
        String(req.status).toLowerCase() === 'pending' &&
        req.previousStatus === 'Neutral' &&
        committedRecords.some(cr => cr.studentId === req.studentId && cr.date === req.date)
    );
    if (staleNeutralReqs.length > 0) {
      try {
        const cleanBatch = writeBatch(db);
        const nowIso = new Date().toISOString();
        staleNeutralReqs.forEach(req => {
          cleanBatch.set(
            doc(db, 'attendance_requests', req.id),
            {
              status: 'Rejected',
              reviewedBy: 'System',
              reviewedAt: nowIso,
              rejectionReason: 'Superseded by initial attendance entry.',
            },
            { merge: true }
          );
        });
        await cleanBatch.commit();
      } catch (cleanErr) {
        console.warn('Stale Neutral request cleanup notice:', cleanErr);
      }
    }

    // 2. Only AFTER Firestore confirms commit, update memoryCache, localStorage, subscribers & WhatsApp
    const committedIds = new Set(committedRecords.map(r => r.studentId));
    const filtered = memoryCache.attendance.filter(
      a => !(a.date === date && committedIds.has(a.studentId))
    );
    const updated = [...committedRecords, ...filtered];
    memoryCache.attendance = updated;
    safeSet(STORAGE_KEYS.ATTENDANCE, updated);
    notifySubscribers('attendance', updated);

    WhatsAppService.dispatchAttendanceNotifications({
      newRecords: committedRecords,
      previousRecordsByKey,
      students: memoryCache.students,
      triggeredBy: user,
    }).catch(err => console.warn('WhatsApp attendance dispatch warning:', err));

    const presentCount = committedRecords.filter(r => r.status === 'Present').length;
    this.logActivity(
      'Attendance Saved',
      `Marked attendance for ${batch || 'class'} on ${date}. ${presentCount}/${committedRecords.length} Present.`,
      'attendance',
      user,
      role
    );

    return {
      savedCount: committedRecords.length,
      skippedLockedCount: skippedLockedCount + txLockedCount,
      savedRecords: committedRecords,
    };
  },

  saveBatchAttendance(
    recordsOrBatch: StudentBatch | Omit<AttendanceRecord, 'id'>[],
    dateOrUser?: string,
    recordsOrRole?: Array<{
      studentId: string;
      studentRoll: string;
      studentName: string;
      status: AttendanceStatus;
      notes?: string;
    }> | UserRole,
    optUser: string = 'Teacher',
    optRole: UserRole = 'teacher'
  ): { savedCount: number; skippedLockedCount: number } {
    this.saveBatchAttendanceConfirmed(
      recordsOrBatch,
      dateOrUser,
      recordsOrRole,
      optUser,
      optRole
    ).catch(e => console.error('saveBatchAttendance async commit error:', e));
    const count = Array.isArray(recordsOrBatch)
      ? recordsOrBatch.length
      : Array.isArray(recordsOrRole)
      ? recordsOrRole.length
      : 0;
    return { savedCount: count, skippedLockedCount: 0 };
  },

  getStudentAttendanceStats(studentId: string, filterMonth?: string): {
    total: number;
    present: number;
    absent: number;
    leave: number;
    late: number;
    rate: number;
  } {
    let records = this.getAttendance().filter(r => r.studentId === studentId);
    if (filterMonth) {
      records = records.filter(r => {
        const d = new Date(r.date);
        const m = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return m.toLowerCase() === filterMonth.toLowerCase();
      });
    }
    // Exclude Neutral records from active attendance calculation
    const activeRecords = records.filter(r => r.status !== 'Neutral');
    const total = activeRecords.length;
    const present = activeRecords.filter(r => r.status === 'Present').length;
    const absent = activeRecords.filter(r => r.status === 'Absent').length;
    const leave = activeRecords.filter(r => r.status === 'Leave').length;
    const late = activeRecords.filter(r => r.status === 'Late').length;
    const rate = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 100;
    return { total, present, absent, leave, late, rate };
  },

  deleteAttendanceForDate(
    date: string, 
    batch?: StudentBatch | string, 
    user: string = 'Admin', 
    role: UserRole = 'admin'
  ): boolean {
    const toDelete = memoryCache.attendance.filter(
      a => a.date === date && (!batch || a.batch === batch)
    );
    if (toDelete.length === 0) return false;

    const remaining = memoryCache.attendance.filter(
      a => !(a.date === date && (!batch || a.batch === batch))
    );
    memoryCache.attendance = remaining;
    safeSet(STORAGE_KEYS.ATTENDANCE, remaining);
    notifySubscribers('attendance', remaining);

    // Delete in Firestore
    try {
      const firestoreBatch = writeBatch(db);
      toDelete.forEach(rec => {
        firestoreBatch.delete(doc(db, 'attendance', rec.id));
      });
      firestoreBatch.commit().catch(e => console.warn('Firestore deleteAttendanceForDate warning:', e));
    } catch (e) {
      console.warn('deleteAttendanceForDate Firestore warning:', e);
    }

    this.logActivity(
      'Attendance History Cleared',
      `Permanently cleared attendance history for ${date} (${toDelete.length} records removed).`,
      'attendance',
      user,
      role
    );
    return true;
  },

  neutralizeStudentAttendance(
    studentId: string, 
    date: string, 
    user: string = 'Admin', 
    role: UserRole = 'admin'
  ): boolean {
    const existingIndex = memoryCache.attendance.findIndex(
      a => a.studentId === studentId && a.date === date
    );

    let updatedRecord: AttendanceRecord;
    let updated: AttendanceRecord[];

    if (existingIndex === -1) {
      const student = memoryCache.students.find(s => s.id === studentId);
      if (!student) return false;
      const nowTime = new Date().toTimeString().split(' ')[0];
      const deterministicId = `att_${student.id}_${date}`;
      updatedRecord = {
        id: deterministicId,
        studentId: student.id,
        studentRoll: student.rollNumber,
        studentName: student.fullName,
        batch: student.batch,
        studentClass: student.studentClass || 'Class 1',
        timing: student.timing || 'Morning',
        teacherId: user,
        teacherName: user,
        date: date,
        time: nowTime,
        timestamp: `${date} ${nowTime}`,
        status: 'Neutral',
        source: 'Manual',
        remarks: 'Neutralized by Administrator'
      };
      updated = [...memoryCache.attendance, updatedRecord];
    } else {
      const existingRecord = memoryCache.attendance[existingIndex];
      updatedRecord = {
        ...existingRecord,
        status: 'Neutral',
        remarks: 'Neutralized by Administrator'
      };
      updated = [...memoryCache.attendance];
      updated[existingIndex] = updatedRecord;
    }

    memoryCache.attendance = updated;
    safeSet(STORAGE_KEYS.ATTENDANCE, updated);
    notifySubscribers('attendance', updated);

    // Sync to Firestore
    setDoc(doc(db, 'attendance', updatedRecord.id), cleanForFirestore(updatedRecord), { merge: true })
      .catch(e => console.warn('Firestore neutralizeStudentAttendance warning:', e));

    this.logActivity(
      'Attendance Neutralized',
      `Reset attendance to Neutral for ${updatedRecord.studentName} on ${date}.`,
      'attendance',
      user,
      role
    );
    return true;
  },

  // Weekly Tests
  getTests(): WeeklyTest[] {
    initStorage();
    return memoryCache.tests;
  },

  saveTests(tests: WeeklyTest[]): void {
    memoryCache.tests = tests;
    safeSet(STORAGE_KEYS.TESTS, tests);
    notifySubscribers('tests', tests);

    try {
      const batch = writeBatch(db);
      tests.forEach(t => {
        batch.set(doc(db, 'tests', t.id), cleanForFirestore(t), { merge: true });
      });
      batch.commit().catch(e => console.warn('Firestore saveTests batch warning:', e));
    } catch (e) {
      console.warn('saveTests Firestore warning:', e);
    }
  },

  addTest(testData: Omit<WeeklyTest, 'id'>, user: string = 'Teacher', role: UserRole = 'teacher'): WeeklyTest {
    const isPublished = testData.published !== false;
    const newTest: WeeklyTest = {
      ...testData,
      published: isPublished,
      publishedAt: isPublished ? (testData.publishedAt || new Date().toISOString()) : undefined,
      publishedBy: isPublished ? (testData.publishedBy || user) : undefined,
      resultRevision: testData.resultRevision || 1,
      id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    
    const updated = [newTest, ...memoryCache.tests];
    memoryCache.tests = updated;
    safeSet(STORAGE_KEYS.TESTS, updated);
    notifySubscribers('tests', updated);

    // Save to Firestore and dispatch WhatsApp results strictly after successful save when published
    setDoc(doc(db, 'tests', newTest.id), cleanForFirestore(newTest))
      .then(() => {
        if (newTest.published === true) {
          WhatsAppService.dispatchWeeklyTestNotifications({
            test: newTest,
            previousTest: null,
            students: memoryCache.students,
            triggeredBy: user,
            isUpdate: false,
          }).catch(err => console.warn('WhatsApp test notification warning:', err));
        }
      })
      .catch(err => console.warn('Firestore addTest warning:', err));

    this.logActivity(
      newTest.published ? 'Weekly Test Published' : 'Weekly Test Saved as Draft',
      `${newTest.published ? 'Published' : 'Saved draft'} marks for "${newTest.testTitle}" (${newTest.batch}). ${newTest.scores.length} scores recorded.`,
      'test',
      user,
      role
    );
    return newTest;
  },

  updateTest(updatedTest: WeeklyTest, user: string = 'Teacher', role: UserRole = 'teacher'): WeeklyTest {
    const previousTest = memoryCache.tests.find(t => t.id === updatedTest.id) || null;
    const isPublished = updatedTest.published !== false;
    const nextRevision = (previousTest?.resultRevision || 1) + (isPublished ? 1 : 0);

    const finalizedTest: WeeklyTest = {
      ...updatedTest,
      published: isPublished,
      publishedAt: isPublished ? (updatedTest.publishedAt || new Date().toISOString()) : previousTest?.publishedAt,
      publishedBy: isPublished ? (updatedTest.publishedBy || user) : previousTest?.publishedBy,
      resultRevision: nextRevision,
    };

    const updated = memoryCache.tests.map(t => t.id === finalizedTest.id ? finalizedTest : t);
    memoryCache.tests = updated;
    safeSet(STORAGE_KEYS.TESTS, updated);
    notifySubscribers('tests', updated);

    // Update in Firestore and trigger WhatsApp notifications strictly after Firestore save succeeds
    setDoc(doc(db, 'tests', finalizedTest.id), cleanForFirestore(finalizedTest), { merge: true })
      .then(() => {
        if (finalizedTest.published === true) {
          WhatsAppService.dispatchWeeklyTestNotifications({
            test: finalizedTest,
            previousTest,
            students: memoryCache.students,
            triggeredBy: user,
            isUpdate: Boolean(previousTest?.published === true),
          }).catch(err => console.warn('WhatsApp test update notification warning:', err));
        }
      })
      .catch(err => console.warn('Firestore updateTest warning:', err));

    this.logActivity(
      finalizedTest.published ? 'Weekly Test Updated & Published' : 'Weekly Test Draft Updated',
      `Updated test: "${finalizedTest.testTitle}"`,
      'test',
      user,
      role
    );
    return finalizedTest;
  },

  async publishTest(testId: string, user: string = 'Teacher', role: UserRole = 'teacher'): Promise<WeeklyTest | null> {
    const existing = memoryCache.tests.find(t => t.id === testId);
    if (!existing) return null;

    const publishedTest: WeeklyTest = {
      ...existing,
      published: true,
      publishedAt: new Date().toISOString(),
      publishedBy: user,
      resultRevision: existing.resultRevision || 1,
    };

    const updated = memoryCache.tests.map(t => t.id === testId ? publishedTest : t);
    memoryCache.tests = updated;
    safeSet(STORAGE_KEYS.TESTS, updated);
    notifySubscribers('tests', updated);

    await setDoc(doc(db, 'tests', publishedTest.id), cleanForFirestore(publishedTest), { merge: true });

    await WhatsAppService.dispatchWeeklyTestNotifications({
      test: publishedTest,
      previousTest: existing,
      students: memoryCache.students,
      triggeredBy: user,
      isUpdate: false,
    });

    this.logActivity(
      'Weekly Test Published',
      `Published test "${publishedTest.testTitle}" (${publishedTest.batch}) and dispatched parent WhatsApp notifications.`,
      'test',
      user,
      role
    );

    return publishedTest;
  },

  deleteTest(id: string, user: string = 'Teacher', role: UserRole = 'teacher'): boolean {
    const target = memoryCache.tests.find(t => t.id === id);
    if (!target) return false;

    const filtered = memoryCache.tests.filter(t => t.id !== id);
    memoryCache.tests = filtered;
    safeSet(STORAGE_KEYS.TESTS, filtered);
    notifySubscribers('tests', filtered);

    // Delete in Firestore
    deleteDoc(doc(db, 'tests', id))
      .catch(err => console.warn('Firestore deleteTest warning:', err));

    this.logActivity(
      'Weekly Test Deleted',
      `Deleted test: "${target.testTitle}" (${target.date})`,
      'test',
      user,
      role
    );
    return true;
  },

  // Fees (in Pakistani Rupees - PKR)
  getFees(): FeeRecord[] {
    initStorage();
    return memoryCache.fees;
  },

  saveFees(fees: FeeRecord[]): void {
    memoryCache.fees = fees;
    safeSet(STORAGE_KEYS.FEES, fees);
    notifySubscribers('fees', fees);

    try {
      const batch = writeBatch(db);
      fees.forEach(f => {
        batch.set(doc(db, 'fees', f.id), cleanForFirestore(f), { merge: true });
      });
      batch.commit().catch(e => console.warn('Firestore saveFees batch warning:', e));
    } catch (e) {
      console.warn('saveFees Firestore warning:', e);
    }
  },

  addFeeRecord(
    feeData: Omit<FeeRecord, 'id'>,
    user: string = 'Admin',
    role: UserRole = 'admin'
  ): FeeRecord {
    const newFee: FeeRecord = {
      ...feeData,
      id: `fee_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };

    const updated = [newFee, ...memoryCache.fees];
    memoryCache.fees = updated;
    safeSet(STORAGE_KEYS.FEES, updated);
    notifySubscribers('fees', updated);

    // Save to Firestore
    setDoc(doc(db, 'fees', newFee.id), cleanForFirestore(newFee))
      .catch(err => console.warn('Firestore addFeeRecord warning:', err));

    this.logActivity(
      'Fee Voucher Issued',
      `Generated tuition fee record for ${newFee.studentName} (${newFee.month}) - Total: Rs. ${newFee.totalAmount.toLocaleString()} PKR`,
      'fee',
      user,
      role
    );
    return newFee;
  },

  recordPayment(
    feeId: string,
    amount: number,
    paymentMethod: FeeRecord['paymentMethod'] = 'Bank Transfer',
    receiptNumber?: string,
    notes?: string,
    user: string = 'Admin',
    role: UserRole = 'admin'
  ): FeeRecord | null {
    const fees = memoryCache.fees;
    const targetIndex = fees.findIndex(f => f.id === feeId);
    if (targetIndex === -1) return null;

    const record = fees[targetIndex];
    const newPaid = record.paidAmount + amount;
    const newPending = Math.max(0, record.totalAmount - newPaid);
    const newStatus: FeeRecord['status'] = newPending === 0 ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending';

    const updated: FeeRecord = {
      ...record,
      paidAmount: newPaid,
      pendingAmount: newPending,
      status: newStatus,
      lastPaymentDate: new Date().toISOString().split('T')[0],
      paymentMethod,
      receiptNumber: receiptNumber || record.receiptNumber || `PKR-REC-${Date.now().toString().slice(-6)}`,
      notes: notes ? `${record.notes ? record.notes + ' | ' : ''}${notes}` : record.notes
    };

    const updatedFees = [...fees];
    updatedFees[targetIndex] = updated;
    memoryCache.fees = updatedFees;
    safeSet(STORAGE_KEYS.FEES, updatedFees);
    notifySubscribers('fees', updatedFees);

    // Update in Firestore
    setDoc(doc(db, 'fees', updated.id), cleanForFirestore(updated), { merge: true })
      .catch(err => console.warn('Firestore recordPayment warning:', err));

    this.logActivity(
      'Fee Payment Recorded',
      `Received payment of Rs. ${amount.toLocaleString()} PKR from ${updated.studentName}. Status: ${updated.status}`,
      'fee',
      user,
      role
    );
    return updated;
  },

  deleteFee(id: string, user: string = 'Admin', role: UserRole = 'admin'): boolean {
    const target = memoryCache.fees.find(f => f.id === id);
    if (!target) return false;

    const filtered = memoryCache.fees.filter(f => f.id !== id);
    memoryCache.fees = filtered;
    safeSet(STORAGE_KEYS.FEES, filtered);
    notifySubscribers('fees', filtered);

    // Delete in Firestore
    deleteDoc(doc(db, 'fees', id))
      .catch(err => console.warn('Firestore deleteFee warning:', err));

    this.logActivity(
      'Fee Record Removed',
      `Removed fee record for ${target.studentName} (${target.month})`,
      'fee',
      user,
      role
    );
    return true;
  },

  deleteStudentAndFeeHistory(studentId: string, user: string = 'Admin', role: UserRole = 'admin'): boolean {
    const targetStudent = memoryCache.students.find(s => s.id === studentId);
    const targetStudentName = targetStudent?.fullName || 'Student';
    const targetRoll = targetStudent?.rollNumber || '';

    // 1. Delete student record
    if (targetStudent) {
      this.deleteStudent(studentId, user, role);
    }

    // 2. Delete all related fee records
    const matchingFees = memoryCache.fees.filter(f => f.studentId === studentId);
    if (matchingFees.length > 0) {
      const remainingFees = memoryCache.fees.filter(f => f.studentId !== studentId);
      memoryCache.fees = remainingFees;
      safeSet(STORAGE_KEYS.FEES, remainingFees);
      notifySubscribers('fees', remainingFees);

      try {
        const batch = writeBatch(db);
        matchingFees.forEach(f => {
          batch.delete(doc(db, 'fees', f.id));
        });
        batch.commit().catch(e => console.warn('Firestore fee batch deletion warning:', e));
      } catch (e) {
        console.warn('deleteStudentAndFeeHistory batch error:', e);
      }
    }

    this.logActivity(
      'Student & Fee History Deleted',
      `Permanently deleted student ${targetStudentName} (${targetRoll}) and all ${matchingFees.length} associated fee vouchers.`,
      'student',
      user,
      role
    );
    return true;
  },

  // Activity Logs / Notifications
  getActivityLogs(): ActivityLog[] {
    initStorage();
    return memoryCache.logs;
  },

  logActivity(
    action: string,
    detail: string,
    category: ActivityLog['category'],
    user: string = 'User',
    role: UserRole = 'admin'
  ): void {
    const now = new Date();
    const timeStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
      ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: timeStr,
      user,
      role,
      action,
      detail,
      category
    };

    const updated = [newLog, ...memoryCache.logs.slice(0, 49)];
    memoryCache.logs = updated;
    safeSet(STORAGE_KEYS.LOGS, updated);
    notifySubscribers('logs', updated);

    // Save to Firestore
    setDoc(doc(db, 'logs', newLog.id), cleanForFirestore(newLog))
      .catch(err => console.warn('Firestore logActivity warning:', err));
  },

  // Settings
  getSettings(): AcademySettings {
    initStorage();
    if (!memoryCache.settings.principalName || memoryCache.settings.principalName.includes('Ahmad Malik')) {
      memoryCache.settings.principalName = 'Farooq Shahzad';
      safeSet(STORAGE_KEYS.SETTINGS, memoryCache.settings);
    }
    return memoryCache.settings;
  },

  updateSettings(settings: AcademySettings, user: string = 'Admin', role: UserRole = 'admin'): void {
    memoryCache.settings = settings;
    safeSet(STORAGE_KEYS.SETTINGS, settings);
    notifySubscribers('settings', settings);

    // Save to Firestore
    setDoc(doc(db, 'settings', 'academy_settings'), cleanForFirestore(settings))
      .catch(err => console.warn('Firestore updateSettings warning:', err));

    this.logActivity(
      'Settings Updated',
      'Academy profile, currency and institutional configuration updated',
      'system',
      user,
      role
    );
  },

  async resetDashboardData(_adminUser: string = 'Admin'): Promise<void> {
    initStorage();

    // 1. Immediately reset logs, attendance, and test analytics in memory & localStorage
    //    Important: NEVER delete students, teachers, fees, admissions, or academy settings.
    memoryCache.logs = [];
    memoryCache.attendance = [];
    memoryCache.tests = [];

    const clearedStudents = (memoryCache.students || []).map(s => ({
      ...s,
      lastPunchDate: '',
      lastPunchTime: '',
      lastPunchState: undefined,
      punchStatus: 'Not Punched' as const
    }));
    memoryCache.students = clearedStudents;

    safeSet(STORAGE_KEYS.LOGS, []);
    safeSet(STORAGE_KEYS.ATTENDANCE, []);
    safeSet(STORAGE_KEYS.TESTS, []);
    safeSet(STORAGE_KEYS.ZK_PUNCHES, []);
    safeSet(STORAGE_KEYS.STUDENTS, clearedStudents);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

    notifySubscribers('logs', []);
    notifySubscribers('attendance', []);
    notifySubscribers('tests', []);
    notifySubscribers('students', clearedStudents);

    // 2. Delete logs, activity_logs, system_logs, attendance, tests, and zkteco_punches from Firestore
    const collectionsToClear = [
      'logs',
      'activity_logs',
      'system_logs',
      'attendance',
      'tests',
      'zkteco_punches'
    ];

    for (const colName of collectionsToClear) {
      try {
        const snap = await getDocs(collection(db, colName));
        if (!snap.empty) {
          const docs = snap.docs;
          const chunkSize = 400;
          for (let i = 0; i < docs.length; i += chunkSize) {
            const batch = writeBatch(db);
            docs.slice(i, i + chunkSize).forEach(docSnap => {
              batch.delete(doc(db, colName, docSnap.id));
            });
            await batch.commit();
          }
        }
      } catch (err) {
        console.warn(`Firestore reset warning for collection "${colName}":`, err);
      }
    }

    // 3. Clear today's punch indicators on existing student records without deleting any student
    try {
      const studentSnap = await getDocs(collection(db, 'students'));
      if (!studentSnap.empty) {
        const docs = studentSnap.docs;
        const chunkSize = 400;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const batch = writeBatch(db);
          docs.slice(i, i + chunkSize).forEach(docSnap => {
            batch.set(
              doc(db, 'students', docSnap.id),
              { lastPunchDate: '', lastPunchTime: '', lastPunchState: null, punchStatus: 'Not Punched' },
              { merge: true }
            );
          });
          await batch.commit();
        }
      }
    } catch (err) {
      console.warn('Firestore student punch state reset warning:', err);
    }
  },

  resetToDemoData(): void {
    memoryCache.students = INITIAL_STUDENTS;
    memoryCache.attendance = INITIAL_ATTENDANCE;
    memoryCache.tests = INITIAL_TESTS;
    memoryCache.fees = INITIAL_FEES;
    memoryCache.logs = INITIAL_LOGS;
    memoryCache.settings = DEFAULT_SETTINGS;
    memoryCache.teachers = INITIAL_TEACHERS;

    safeSet(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    safeSet(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    safeSet(STORAGE_KEYS.TESTS, INITIAL_TESTS);
    safeSet(STORAGE_KEYS.FEES, INITIAL_FEES);
    safeSet(STORAGE_KEYS.LOGS, INITIAL_LOGS);
    safeSet(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    safeSet(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

    seedInitialFirestoreData();

    notifySubscribers('students', INITIAL_STUDENTS);
    notifySubscribers('attendance', INITIAL_ATTENDANCE);
    notifySubscribers('tests', INITIAL_TESTS);
    notifySubscribers('fees', INITIAL_FEES);
    notifySubscribers('logs', INITIAL_LOGS);
    notifySubscribers('settings', DEFAULT_SETTINGS);
    notifySubscribers('teachers', INITIAL_TEACHERS);
  },

  // Real-Time Event Subscriptions for React Components
  subscribeStudents(callback: (students: Student[]) => void): () => void {
    subscribers.students.add(callback);
    callback(this.getStudents());
    return () => subscribers.students.delete(callback);
  },

  subscribeAttendance(callback: (attendance: AttendanceRecord[]) => void): () => void {
    subscribers.attendance.add(callback);
    callback(this.getAttendance());
    return () => subscribers.attendance.delete(callback);
  },

  subscribeTests(callback: (tests: WeeklyTest[]) => void): () => void {
    subscribers.tests.add(callback);
    callback(this.getTests());
    return () => subscribers.tests.delete(callback);
  },

  subscribeFees(callback: (fees: FeeRecord[]) => void): () => void {
    subscribers.fees.add(callback);
    callback(this.getFees());
    return () => subscribers.fees.delete(callback);
  },

  subscribeLogs(callback: (logs: ActivityLog[]) => void): () => void {
    subscribers.logs.add(callback);
    callback(this.getActivityLogs());
    return () => subscribers.logs.delete(callback);
  },

  subscribeTeachers(callback: (teachers: TeacherAccount[]) => void): () => void {
    subscribers.teachers.add(callback);
    callback(this.getTeacherAccounts());
    return () => subscribers.teachers.delete(callback);
  },

  subscribeStudentPortalAccounts(callback: (accounts: StudentPortalAccount[]) => void): () => void {
    subscribers.studentPortalAccounts.add(callback);
    callback(this.getStudentPortalAccounts());
    return () => subscribers.studentPortalAccounts.delete(callback);
  },

  subscribeSettings(callback: (settings: AcademySettings) => void): () => void {
    subscribers.settings.add(callback);
    callback(this.getSettings());
    return () => subscribers.settings.delete(callback);
  },

  subscribeAll(callback: (event: { type: string; data: any }) => void): () => void {
    subscribers.all.add(callback);
    return () => subscribers.all.delete(callback);
  },

  // Attendance Change Approval System & Audit History
  getAttendanceChangeHistory(): AttendanceChangeHistoryRecord[] {
    initStorage();
    return memoryCache.attendanceChangeHistory || [];
  },

  subscribeAttendanceChangeHistory(callback: (history: AttendanceChangeHistoryRecord[]) => void): () => void {
    subscribers.attendanceChangeHistory.add(callback);
    callback(this.getAttendanceChangeHistory());
    return () => subscribers.attendanceChangeHistory.delete(callback);
  },

  recordAttendanceChangeHistory(
    entry: Omit<AttendanceChangeHistoryRecord, 'id' | 'timestamp'>
  ): AttendanceChangeHistoryRecord {
    initStorage();
    const record: AttendanceChangeHistoryRecord = {
      ...entry,
      id: `att_hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [record, ...(memoryCache.attendanceChangeHistory || [])].slice(0, 250);
    memoryCache.attendanceChangeHistory = updated;
    safeSet(STORAGE_KEYS.ATTENDANCE_CHANGE_HISTORY, updated);
    notifySubscribers('attendanceChangeHistory', updated);

    setDoc(doc(db, 'attendance_change_history', record.id), cleanForFirestore(record))
      .catch(err => console.warn('Firestore attendance_change_history write warning:', err));

    return record;
  },

  getAttendanceRequests(): AttendanceRequest[] {
    initStorage();
    return memoryCache.attendanceRequests;
  },

  subscribeAttendanceRequests(callback: (requests: AttendanceRequest[]) => void): () => void {
    subscribers.attendanceRequests.add(callback);
    callback(this.getAttendanceRequests());
    return () => subscribers.attendanceRequests.delete(callback);
  },

  async submitAttendanceChangeRequestConfirmed(
    data: Omit<AttendanceRequest, 'id' | 'status' | 'createdAt'>
  ): Promise<{ request: AttendanceRequest; created: boolean; duplicate: boolean }> {
    initStorage();

    if (data.previousStatus === 'Neutral') {
      throw new Error(
        'Cannot submit a change request from Neutral/unmarked status. Please mark initial attendance directly first.'
      );
    }
    if (data.previousStatus === data.requestedStatus) {
      throw new Error(`Attendance is already "${data.previousStatus}". Choose a different status.`);
    }

    const attendanceRecordId = data.attendanceRecordId || `att_${data.studentId}_${data.date}`;

    // Verify against live Firestore first so duplicate pending locks across tabs/devices are caught cleanly
    const liveReqQuery = query(
      collection(db, 'attendance_requests'),
      where('studentId', '==', data.studentId)
    );
    const liveSnap = await getDocs(liveReqQuery);
    const liveDuplicateDoc = liveSnap.docs.find(d => {
      const normalized = normalizeAttendanceRequest(d.id, d.data() as Record<string, any>);
      return (
        normalized.status === 'Pending' &&
        normalized.previousStatus !== 'Neutral' &&
        (normalized.date === data.date || normalized.attendanceRecordId === attendanceRecordId)
      );
    });

    if (liveDuplicateDoc) {
      const existingReq = normalizeAttendanceRequest(
        liveDuplicateDoc.id,
        liveDuplicateDoc.data() as Record<string, any>
      );
      return { request: existingReq, created: false, duplicate: true };
    }

    const requestType =
      data.requestType ||
      (data.previousStatus === 'Absent' && data.requestedStatus === 'Late'
        ? 'absent_to_late'
        : 'attendance_status_change');

    const nowIso = new Date().toISOString();
    const studentObj = memoryCache.students.find(s => s.id === data.studentId);
    const newRequest: AttendanceRequest = {
      ...data,
      studentSerial: data.studentSerial || getStudentSerialDisplay(studentObj),
      attendanceRecordId,
      reason:
        String(data.reason || '').trim() ||
        `Requested change from ${data.previousStatus} to ${data.requestedStatus}`,
      requestType,
      id: `att_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'Pending',
      timestamp: data.timestamp || nowIso,
      createdAt: nowIso,
    };

    // Atomic Firestore transaction: creates attendance_requests doc + marks pendingChangeRequestId on attendance doc
    const txResult = await runTransaction(db, async (tx) => {
      const reqRef = doc(db, 'attendance_requests', newRequest.id);
      const attRef = doc(db, 'attendance', attendanceRecordId);
      const attSnap = await tx.get(attRef);

      if (attSnap.exists()) {
        const attData = attSnap.data() as Record<string, any>;
        if (attData.status === 'Neutral') {
          throw new Error(
            'Initial attendance is Neutral. Please mark attendance directly instead of requesting an edit.'
          );
        }
        if (attData.pendingChangeRequestId) {
          const prevReqRef = doc(db, 'attendance_requests', String(attData.pendingChangeRequestId));
          const prevReqSnap = await tx.get(prevReqRef);
          if (prevReqSnap.exists()) {
            const prevNorm = normalizeAttendanceRequest(
              prevReqSnap.id,
              prevReqSnap.data() as Record<string, any>
            );
            if (prevNorm.status === 'Pending' && prevNorm.previousStatus !== 'Neutral') {
              return { duplicate: true, existing: prevNorm };
            }
          }
        }
        tx.set(attRef, { pendingChangeRequestId: newRequest.id }, { merge: true });
      }
      tx.set(reqRef, cleanForFirestore(newRequest));
      return { duplicate: false, existing: null as AttendanceRequest | null };
    });

    if (txResult.duplicate && txResult.existing) {
      return { request: txResult.existing, created: false, duplicate: true };
    }

    // ONLY update local cache, audit history, and notifications AFTER Firestore confirms commit
    const updated = [
      newRequest,
      ...memoryCache.attendanceRequests.filter(r => r.id !== newRequest.id),
    ];
    memoryCache.attendanceRequests = updated;
    safeSet(STORAGE_KEYS.ATTENDANCE_REQUESTS, updated);
    notifySubscribers('attendanceRequests', updated);

    this.recordAttendanceChangeHistory({
      requestId: newRequest.id,
      studentId: newRequest.studentId,
      studentRoll: newRequest.studentRoll,
      studentSerial: newRequest.studentSerial,
      studentName: newRequest.studentName,
      batch: newRequest.batch,
      batchId: newRequest.batchId,
      date: newRequest.date,
      previousStatus: newRequest.previousStatus,
      newStatus: newRequest.requestedStatus,
      action: 'Requested',
      reason: newRequest.reason,
      teacherName: newRequest.teacherName,
    });

    this.logActivity(
      'Attendance Approval Requested',
      `${newRequest.teacherName} requested to change ${newRequest.studentName} (${newRequest.studentRoll}) on ${newRequest.date} from ${newRequest.previousStatus} to ${newRequest.requestedStatus}. Reason: ${newRequest.reason}`,
      'attendance',
      newRequest.teacherName,
      'teacher'
    );

    this.addAppNotification({
      title: 'Attendance Status Change Request',
      body: `${newRequest.teacherName} requested to change ${newRequest.studentName} (${newRequest.studentRoll}) on ${newRequest.date} from ${newRequest.previousStatus} to ${newRequest.requestedStatus}. Reason: ${newRequest.reason}`,
      targetRole: 'admin',
      type: 'attendance_change_request',
      linkTab: 'settings'
    });

    return { request: newRequest, created: true, duplicate: false };
  },

  submitAttendanceChangeRequest(
    data: Omit<AttendanceRequest, 'id' | 'status' | 'createdAt'>
  ): { request: AttendanceRequest; created: boolean; duplicate: boolean } {
    initStorage();
    const attendanceRecordId = data.attendanceRecordId || `att_${data.studentId}_${data.date}`;
    const existingPending = (memoryCache.attendanceRequests || []).find(
      r =>
        String(r.status).toLowerCase() === 'pending' &&
        r.previousStatus !== 'Neutral' &&
        ((r.studentId === data.studentId && r.date === data.date) ||
          (r.attendanceRecordId && r.attendanceRecordId === attendanceRecordId))
    );
    if (existingPending) {
      return { request: existingPending, created: false, duplicate: true };
    }
    const nowIso = new Date().toISOString();
    const optimisticPreview: AttendanceRequest = {
      ...data,
      attendanceRecordId,
      id: `att_req_pending_${Date.now()}`,
      status: 'Pending',
      timestamp: data.timestamp || nowIso,
      createdAt: nowIso,
    };
    if (data.previousStatus === 'Neutral') {
      return { request: optimisticPreview, created: false, duplicate: false };
    }
    this.submitAttendanceChangeRequestConfirmed(data).catch(err =>
      console.error('submitAttendanceChangeRequest async error:', err)
    );
    return { request: optimisticPreview, created: true, duplicate: false };
  },

  createAttendanceRequest(data: Omit<AttendanceRequest, 'id' | 'status' | 'createdAt'>): AttendanceRequest {
    return this.submitAttendanceChangeRequest(data).request;
  },

  async approveAttendanceRequest(
    requestId: string,
    adminUser: string = 'Admin',
    adminId: string = 'admin',
    adminRole: UserRole = 'admin'
  ): Promise<boolean> {
    initStorage();
    if (adminRole !== 'admin') {
      this.logActivity(
        'Unauthorized Attendance Approval Blocked',
        `${adminUser} (${adminRole}) attempted to approve attendance request ${requestId}.`,
        'attendance',
        adminUser,
        adminRole
      );
      return false;
    }

    // Fetch live from Firestore if not yet in cache
    let req = memoryCache.attendanceRequests.find(r => r.id === requestId);
    if (!req) {
      const snap = await getDoc(doc(db, 'attendance_requests', requestId));
      if (snap.exists()) {
        req = normalizeAttendanceRequest(snap.id, snap.data() as Record<string, any>);
      }
    }
    if (!req || String(req.status).toLowerCase() !== 'pending') return false;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const reviewedAtIso = now.toISOString();

    const updatedRequest: AttendanceRequest = {
      ...req,
      status: 'Approved',
      reviewedBy: adminUser,
      reviewedByAdminId: adminId,
      reviewedAt: reviewedAtIso
    };

    const docId = req.attendanceRecordId || `att_${req.studentId}_${req.date}`;
    const prevRecord = memoryCache.attendance.find(
      a => a.id === docId || (a.studentId === req.studentId && a.date === req.date)
    );
    const newRecord: AttendanceRecord = {
      ...(prevRecord || {}),
      id: docId,
      studentId: req.studentId,
      studentRoll: req.studentRoll,
      studentSerial: req.studentSerial || prevRecord?.studentSerial,
      studentName: req.studentName,
      batch: (req.batch || prevRecord?.batch || '') as any,
      batchId: req.batchId || prevRecord?.batchId,
      studentClass: req.studentClass || prevRecord?.studentClass,
      timing: req.timing || prevRecord?.timing,
      teacherId: req.teacherId || prevRecord?.teacherId,
      teacherName: req.teacherName || prevRecord?.teacherName,
      date: req.date,
      time: prevRecord?.time || timeStr,
      timestamp: `${req.date} ${timeStr}`,
      status: req.requestedStatus,
      source: prevRecord?.source || 'Manual',
      remarks: `Status changed from ${req.previousStatus} to ${req.requestedStatus} upon Admin approval by ${adminUser}${req.reason ? ` (${req.reason})` : ''}`
    };

    // Transactional Firestore write — NEVER fake cache success if transaction fails
    const txApproved = await runTransaction(db, async (tx) => {
      const reqRef = doc(db, 'attendance_requests', requestId);
      const attRef = doc(db, 'attendance', docId);
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists()) {
        throw new Error(`Attendance request ${requestId} no longer exists in Firebase.`);
      }
      const liveNorm = normalizeAttendanceRequest(
        reqSnap.id,
        reqSnap.data() as Record<string, any>
      );
      if (liveNorm.status !== 'Pending') {
        return false;
      }
      tx.set(reqRef, cleanForFirestore(updatedRequest), { merge: true });
      tx.set(
        attRef,
        cleanForFirestore({
          ...newRecord,
          pendingChangeRequestId: '',
          lastApprovedRequestId: requestId,
          reviewedBy: adminUser,
          reviewedByAdminId: adminId,
          reviewedAt: reviewedAtIso,
        }),
        { merge: true }
      );
      return true;
    });

    if (!txApproved) {
      return false;
    }

    const updatedList = memoryCache.attendanceRequests.map(r => r.id === requestId ? updatedRequest : r);
    memoryCache.attendanceRequests = updatedList;
    safeSet(STORAGE_KEYS.ATTENDANCE_REQUESTS, updatedList);
    notifySubscribers('attendanceRequests', updatedList);

    const prevKey = `${req.studentId}_${req.date}`;
    const previousRecordsByKey = new Map<string, AttendanceRecord>();
    if (prevRecord) previousRecordsByKey.set(prevKey, prevRecord);

    const filtered = memoryCache.attendance.filter(a => a.id !== docId && !(a.studentId === req!.studentId && a.date === req!.date));
    const updatedAttendance = [newRecord, ...filtered];
    memoryCache.attendance = updatedAttendance;
    safeSet(STORAGE_KEYS.ATTENDANCE, updatedAttendance);
    notifySubscribers('attendance', updatedAttendance);

    WhatsAppService.dispatchAttendanceNotifications({
      newRecords: [newRecord],
      previousRecordsByKey,
      students: memoryCache.students,
      triggeredBy: adminUser,
    }).catch(err => console.warn('WhatsApp approveAttendanceRequest notice:', err));

    this.recordAttendanceChangeHistory({
      requestId: req.id,
      studentId: req.studentId,
      studentRoll: req.studentRoll,
      studentSerial: req.studentSerial,
      studentName: req.studentName,
      batch: req.batch,
      batchId: req.batchId,
      date: req.date,
      previousStatus: req.previousStatus,
      newStatus: req.requestedStatus,
      action: 'Approved',
      reason: req.reason,
      teacherName: req.teacherName,
      reviewedBy: adminUser,
      reviewedByAdminId: adminId,
    });

    this.logActivity(
      'Attendance Request Approved',
      `Admin (${adminUser}) approved status change for ${req.studentName} (${req.date}): ${req.previousStatus} ➔ ${req.requestedStatus}`,
      'attendance',
      adminUser,
      'admin'
    );

    this.addAppNotification({
      title: 'Attendance Change Approved',
      body: `${adminUser} approved your request for ${req.studentName} (${req.date}): ${req.previousStatus} -> ${req.requestedStatus}.`,
      targetRole: 'teacher',
      targetTeacherId: req.teacherId,
      type: 'attendance_change_decision',
      linkTab: 'attendance'
    });

    return true;
  },

  async rejectAttendanceRequest(
    requestId: string,
    adminUser: string = 'Admin',
    adminId: string = 'admin',
    adminRole: UserRole = 'admin',
    rejectionReason?: string
  ): Promise<boolean> {
    initStorage();
    if (adminRole !== 'admin') {
      this.logActivity(
        'Unauthorized Attendance Rejection Blocked',
        `${adminUser} (${adminRole}) attempted to reject attendance request ${requestId}.`,
        'attendance',
        adminUser,
        adminRole
      );
      return false;
    }

    let req = memoryCache.attendanceRequests.find(r => r.id === requestId);
    if (!req) {
      const snap = await getDoc(doc(db, 'attendance_requests', requestId));
      if (snap.exists()) {
        req = normalizeAttendanceRequest(snap.id, snap.data() as Record<string, any>);
      }
    }
    if (!req || String(req.status).toLowerCase() !== 'pending') return false;

    const reviewedAtIso = new Date().toISOString();
    const updatedRequest: AttendanceRequest = {
      ...req,
      status: 'Rejected',
      reviewedBy: adminUser,
      reviewedByAdminId: adminId,
      reviewedAt: reviewedAtIso,
      ...(rejectionReason?.trim() ? { rejectionReason: rejectionReason.trim() } : {})
    };

    const docId = req.attendanceRecordId || `att_${req.studentId}_${req.date}`;

    // Transactional Firestore write — preserves original attendance status and clears pendingChangeRequestId
    const txRejected = await runTransaction(db, async (tx) => {
      const reqRef = doc(db, 'attendance_requests', requestId);
      const attRef = doc(db, 'attendance', docId);
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists()) {
        throw new Error(`Attendance request ${requestId} no longer exists in Firebase.`);
      }
      const liveNorm = normalizeAttendanceRequest(
        reqSnap.id,
        reqSnap.data() as Record<string, any>
      );
      if (liveNorm.status !== 'Pending') {
        return false;
      }
      const attSnap = await tx.get(attRef);
      if (attSnap.exists()) {
        tx.set(attRef, { pendingChangeRequestId: '' }, { merge: true });
      }
      tx.set(reqRef, cleanForFirestore(updatedRequest), { merge: true });
      return true;
    });

    if (!txRejected) {
      return false;
    }

    const updatedList = memoryCache.attendanceRequests.map(r => r.id === requestId ? updatedRequest : r);
    memoryCache.attendanceRequests = updatedList;
    safeSet(STORAGE_KEYS.ATTENDANCE_REQUESTS, updatedList);
    notifySubscribers('attendanceRequests', updatedList);

    this.recordAttendanceChangeHistory({
      requestId: req.id,
      studentId: req.studentId,
      studentRoll: req.studentRoll,
      studentSerial: req.studentSerial,
      studentName: req.studentName,
      batch: req.batch,
      batchId: req.batchId,
      date: req.date,
      previousStatus: req.previousStatus,
      newStatus: req.previousStatus,
      action: 'Rejected',
      reason: rejectionReason?.trim() || req.reason,
      teacherName: req.teacherName,
      reviewedBy: adminUser,
      reviewedByAdminId: adminId,
    });

    this.logActivity(
      'Attendance Request Rejected',
      `Admin (${adminUser}) rejected status change for ${req.studentName} (${req.date}) to ${req.requestedStatus}. Original status (${req.previousStatus}) preserved.`,
      'attendance',
      adminUser,
      'admin'
    );

    this.addAppNotification({
      title: 'Attendance Change Rejected',
      body: `${adminUser} rejected your request to change ${req.studentName} (${req.date}) from ${req.previousStatus} to ${req.requestedStatus}.`,
      targetRole: 'teacher',
      targetTeacherId: req.teacherId,
      type: 'attendance_change_decision',
      linkTab: 'attendance'
    });

    return true;
  },

  deleteAttendanceRequest(requestId: string, user: string = 'Admin', role: UserRole = 'admin'): boolean {
    initStorage();
    const req = memoryCache.attendanceRequests.find(r => r.id === requestId);
    if (!req) return false;

    const filtered = memoryCache.attendanceRequests.filter(r => r.id !== requestId);
    memoryCache.attendanceRequests = filtered;
    safeSet(STORAGE_KEYS.ATTENDANCE_REQUESTS, filtered);
    notifySubscribers('attendanceRequests', filtered);

    deleteDoc(doc(db, 'attendance_requests', requestId))
      .catch(err => console.warn('Firestore delete attendance request warning:', err));

    this.logActivity(
      'Attendance Request Deleted',
      `Removed attendance request for ${req.studentName} (${req.date})`,
      'attendance',
      user,
      role
    );
    return true;
  },

  deleteAttendanceRequestsBatch(requestIds: string[], user: string = 'Admin', role: UserRole = 'admin'): boolean {
    initStorage();
    if (!requestIds || requestIds.length === 0) return false;

    const idSet = new Set(requestIds);
    const count = memoryCache.attendanceRequests.filter(r => idSet.has(r.id)).length;

    const filtered = memoryCache.attendanceRequests.filter(r => !idSet.has(r.id));
    memoryCache.attendanceRequests = filtered;
    safeSet(STORAGE_KEYS.ATTENDANCE_REQUESTS, filtered);
    notifySubscribers('attendanceRequests', filtered);

    try {
      const batch = writeBatch(db);
      requestIds.forEach(id => {
        batch.delete(doc(db, 'attendance_requests', id));
      });
      batch.commit().catch(e => console.warn('Firestore batch delete attendance_requests error:', e));
    } catch (e) {
      console.warn('deleteAttendanceRequestsBatch error:', e);
    }

    this.logActivity(
      'Attendance Requests Cleared',
      `Deleted ${count} attendance change approval request(s)`,
      'attendance',
      user,
      role
    );
    return true;
  },

  // =========================================================================
  // ZKTeco K40 ADMS Biometric & Attendance Integration
  // =========================================================================

  /**
   * Records a biometric punch from a ZKTeco K40 device or ADMS endpoint.
   * Matches USERID (or PIN) with the student's roll number.
   * Automatically sets attendance status to "Present" and marks Pending Verification students as Active.
   */
  recordBiometricPunch(
    userId: string, 
    timestampStr?: string, 
    sn: string = 'K40-ADMS-01', 
    rawPayload: string = ''
  ): { success: boolean; student?: Student; record?: AttendanceRecord; error?: string } {
    initStorage();
    const students = this.getStudents();
    const cleanUserId = userId.trim();

    // 1. Resolve student by roll number, biometricPin, numeric digits, or ID
    const student = students.find(s => {
      if (s.biometricPin && s.biometricPin.toLowerCase() === cleanUserId.toLowerCase()) return true;
      if (s.rollNumber && s.rollNumber.toLowerCase() === cleanUserId.toLowerCase()) return true;
      if (s.id && s.id.toLowerCase() === cleanUserId.toLowerCase()) return true;
      
      // Numeric matching: e.g. "1" matches "OK-2025-001" or "001"
      const stdNumeric = s.rollNumber.replace(/[^0-9]/g, '');
      const userNumeric = cleanUserId.replace(/[^0-9]/g, '');
      if (stdNumeric && userNumeric && (
        stdNumeric === userNumeric || 
        parseInt(stdNumeric, 10) === parseInt(userNumeric, 10) ||
        stdNumeric.endsWith(userNumeric)
      )) {
        return true;
      }
      return false;
    });

    const now = new Date();
    let dateStr = now.toISOString().split('T')[0];
    let timeStr = now.toTimeString().split(' ')[0];

    if (timestampStr) {
      // Format: "YYYY-MM-DD HH:mm:ss" or ISO
      const parts = timestampStr.trim().split(/[\sT]+/);
      if (parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
        dateStr = parts[0];
      }
      if (parts[1]) {
        timeStr = parts[1].split('.')[0];
      }
    }

    if (!student) {
      console.warn(`[ZKTeco ADMS] Punch received for unknown USERID: "${userId}" at ${dateStr} ${timeStr}`);
      return { 
        success: false, 
        error: `No student enrolled with Roll / PIN: "${userId}". Please register student first.` 
      };
    }

    // 2. Determine IN/OUT vs Standard punch transition
    const docId = `att_${student.id}_${dateStr}`;
    const existingAttendance = this.getAttendance();
    const existingRecord = existingAttendance.find(a => a.id === docId || (a.studentId === student.id && a.date === dateStr));
    const inOutEnabled = Boolean(memoryCache.deviceConfig?.inOutModeEnabled);

    const alreadyPunchedInToday =
      Boolean(
        existingRecord &&
          (existingRecord.punchState === 'in' ||
            (existingRecord.source === 'Device' &&
              (existingRecord.status === 'Present' || existingRecord.status === 'Late') &&
              !existingRecord.checkOutTime))
      ) ||
      (student.lastPunchDate === dateStr && student.lastPunchState === 'in');

    let punchState: 'in' | 'out' | 'single' = 'single';
    let punchType: 'IN' | 'OUT' | 'STANDARD' = 'STANDARD';
    let checkInTime = existingRecord?.checkInTime || timeStr;
    let checkOutTime: string | undefined = existingRecord?.checkOutTime;
    let punchCount = 1;
    let remarks = `Biometric scan at ${timeStr} verified via ZKTeco K40 device (${sn})`;

    if (inOutEnabled) {
      if (alreadyPunchedInToday && existingRecord?.punchState !== 'out' && student.lastPunchState !== 'out') {
        punchState = 'out';
        punchType = 'OUT';
        checkInTime = existingRecord?.checkInTime || student.lastPunchTime || timeStr;
        checkOutTime = timeStr;
        punchCount = (existingRecord?.punchCount || 1) + 1;
        remarks = `Punch OUT at ${timeStr} (IN: ${checkInTime}) via ZKTeco K40 (${sn})`;
      } else {
        punchState = 'in';
        punchType = 'IN';
        checkInTime = timeStr;
        checkOutTime = undefined;
        punchCount = 1;
        remarks = `Punch IN at ${timeStr} via ZKTeco K40 (${sn}) — Awaiting OUT`;
      }
    }

    const rules = memoryCache.attendanceRules || DEFAULT_ATTENDANCE_RULES;
    const evalResult = evaluateBatchLateArrival({
      punchTime: checkInTime,
      timing: student.timing,
      batch: student.batch,
      rules,
    });
    const arrivalStatus: 'Present' | 'Late' =
      punchState === 'out' && existingRecord?.status === 'Late'
        ? 'Late'
        : evalResult.status;

    if (arrivalStatus === 'Late' && evalResult.cutoffUsed) {
      remarks = `${remarks} · ${evalResult.batchType} Late arrival (cutoff ${evalResult.cutoffUsed})`;
    } else if (!evalResult.ruleEnabled) {
      remarks = `${remarks} · ${evalResult.batchType} Neutral mode`;
    }

    const newRecord: AttendanceRecord = {
      id: docId,
      studentId: student.id,
      studentRoll: student.rollNumber,
      studentName: student.fullName,
      batch: student.batch,
      studentClass: student.studentClass,
      timing: student.timing,
      date: dateStr,
      time: timeStr,
      timestamp: `${dateStr} ${timeStr}`,
      status: arrivalStatus,
      source: 'Device',
      deviceId: sn,
      punchState,
      checkInTime,
      checkOutTime,
      punchCount,
      remarks
    };

    // Update in memory cache and local storage
    const filtered = existingAttendance.filter(a => a.id !== docId);
    const updatedAttendance = [newRecord, ...filtered];
    memoryCache.attendance = updatedAttendance;
    safeSet(STORAGE_KEYS.ATTENDANCE, updatedAttendance);
    notifySubscribers('attendance', updatedAttendance);

    // Save directly to Firestore attendance & zkteco_punches collections
    try {
      setDoc(doc(db, 'attendance', docId), cleanForFirestore(newRecord), { merge: true })
        .catch(err => console.warn('Firestore ZKTeco attendance sync warning:', err));

      const punchDocId = `punch_${Date.now()}_${student.id}`;
      setDoc(doc(db, 'zkteco_punches', punchDocId), cleanForFirestore({
        id: punchDocId,
        userId: cleanUserId,
        studentId: student.id,
        studentRoll: student.rollNumber,
        studentName: student.fullName,
        timestamp: `${dateStr} ${timeStr}`,
        date: dateStr,
        time: timeStr,
        status: arrivalStatus,
        punchState,
        punchType,
        deviceId: sn,
        rawPayload,
        syncedToFirestore: true
      })).catch(() => {});
    } catch (e) {
      console.warn('Firestore write warning:', e);
    }

    // 3. Update Student verification & today's punch state
    const resolvedPunchStatus =
      punchState === 'in' ? 'IN' : punchState === 'out' ? 'OUT' : 'Punched';
    const updatedStudent: Student = {
      ...student,
      status: student.status === 'Pending Verification' ? 'Active' : student.status,
      biometricEnrolled: true,
      deviceSyncStatus: 'Enrolled',
      enrollRequested: false,
      zkDeviceId: sn,
      verificationDate: student.verificationDate || dateStr,
      lastPunchDate: dateStr,
      lastPunchTime: timeStr,
      lastPunchState: punchState,
      punchStatus: resolvedPunchStatus
    };

    const updatedStudents = memoryCache.students.map(s => s.id === student.id ? updatedStudent : s);
    memoryCache.students = updatedStudents;
    safeSet(STORAGE_KEYS.STUDENTS, updatedStudents);
    notifySubscribers('students', updatedStudents);

    try {
      setDoc(doc(db, 'students', student.id), cleanForFirestore(updatedStudent), { merge: true })
        .catch(err => console.warn('Firestore student activation sync warning:', err));
    } catch (e) {
      console.warn('Firestore update warning:', e);
    }

    if (student.status === 'Pending Verification' || !student.biometricEnrolled) {
      this.logActivity(
        'Biometric Enrolled & Activated',
        `Fingerprint captured on ZKTeco K40. Student ${student.fullName} (${student.rollNumber}) status updated to Active.`,
        'student',
        'ZKTeco Bridge',
        'admin'
      );
    }

    // Log the attendance punch
    this.logActivity(
      inOutEnabled ? `ZKTeco K40 Punch ${punchType}` : 'ZKTeco K40 Punch',
      `${punchType}: ${student.fullName} (${student.rollNumber}) punched at ${timeStr} via ZKTeco K40`,
      'attendance',
      'ZKTeco ADMS',
      'admin'
    );

    return { 
      success: true, 
      student: updatedStudent, 
      record: newRecord 
    };
  },

  /**
   * Sends an enrollment request for a student to the ZKTeco Bridge Queue.
   * Student status remains 'Pending Verification' until biometric is captured on the K40 device.
   */
  queueBiometricEnrollment(studentId: string): ZKTecoEnrollRequest | null {
    initStorage();
    const student = this.getStudentById(studentId);
    if (!student) return null;

    const pin = student.biometricPin || student.rollNumber.replace(/[^0-9]/g, '') || student.rollNumber;
    const req: ZKTecoEnrollRequest = {
      id: `zk_enroll_${student.id}`,
      studentId: student.id,
      rollNumber: student.rollNumber,
      fullName: student.fullName,
      pin,
      status: 'Pending Verification',
      createdAt: new Date().toISOString()
    };

    // Save request to Firestore
    try {
      setDoc(doc(db, 'zkteco_enrollments', req.id), cleanForFirestore(req), { merge: true })
        .catch(err => console.warn('Firestore zkteco_enrollments warning:', err));
    } catch (e) {
      console.warn('Firestore zkteco_enrollments error:', e);
    }

    // Send to local bridge server if running
    try {
      fetch('/api/zkteco/enroll-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      }).catch(() => {
        // Local bridge endpoint might be asynchronous or simulated
      });
    } catch {}

    this.logActivity(
      'Biometric Enroll Requested',
      `Enroll request queued for ${student.fullName} (PIN ${pin}) on ZKTeco K40.`,
      'student',
      'Admin',
      'admin'
    );

    return req;
  },

  /**
   * Confirms biometric fingerprint enrollment and activates student record in Firestore.
   */
  confirmBiometricVerification(studentId: string, deviceId: string = 'ZKTeco-K40'): Student | null {
    initStorage();
    const student = this.getStudentById(studentId);
    if (!student) return null;

    const today = new Date().toISOString().split('T')[0];
    const updatedStudent: Student = {
      ...student,
      status: 'Active',
      biometricEnrolled: true,
      zkDeviceId: deviceId,
      verificationDate: today
    };

    const updatedStudents = memoryCache.students.map(s => s.id === student.id ? updatedStudent : s);
    memoryCache.students = updatedStudents;
    safeSet(STORAGE_KEYS.STUDENTS, updatedStudents);
    notifySubscribers('students', updatedStudents);

    try {
      setDoc(doc(db, 'students', student.id), cleanForFirestore(updatedStudent), { merge: true })
        .catch(err => console.warn('Firestore confirmBiometricVerification warning:', err));
      
      setDoc(doc(db, 'zkteco_enrollments', `zk_enroll_${student.id}`), {
        status: 'Active',
        enrolledAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    } catch (e) {
      console.warn('Firestore update warning:', e);
    }

    this.logActivity(
      'Student Biometric Verified',
      `Confirmed fingerprint enrollment for ${student.fullName} (${student.rollNumber}). Account activated.`,
      'student',
      'Admin',
      'admin'
    );

    return updatedStudent;
  },

  /**
   * Bulk imports an array of students (e.g. from Excel .xlsx upload) into Firestore and local cache.
   * New students get deviceSyncStatus: 'Pending' and enrollRequested: true by default.
   */
  async importStudentsBatch(
    newStudentsData: Array<Omit<Student, 'id'>>,
    user: string = 'Admin',
    role: UserRole = 'admin'
  ): Promise<Student[]> {
    initStorage();
    if (!newStudentsData || newStudentsData.length === 0) return [];

    const reservedRolls = new Set<string>();
    const reservedSerials = new Set<string>();
    newStudentsData.forEach(d => {
      if (d.rollNumber) reservedRolls.add(String(d.rollNumber).trim().toUpperCase());
      if (d.formattedSerialNumber) reservedSerials.add(String(d.formattedSerialNumber).trim().toUpperCase());
    });

    const timestamp = Date.now();
    const createdStudents: Student[] = [];
    for (let index = 0; index < newStudentsData.length; index++) {
      const data = newStudentsData[index];
      let finalRoll = String(data.rollNumber || '').trim();
      let finalFormattedSerial = String(data.formattedSerialNumber || '').trim();
      let finalSerialSeq = Number(data.serialNumber) || parseTrailingNumber(finalFormattedSerial) || 0;

      if (!finalRoll || !finalFormattedSerial || finalSerialSeq <= 0) {
        const allocated = await this.allocateNextStudentSerialAndRoll(reservedRolls, reservedSerials);
        if (!finalRoll) finalRoll = allocated.rollNumber;
        if (!finalFormattedSerial) finalFormattedSerial = allocated.formattedSerialNumber;
        if (finalSerialSeq <= 0) finalSerialSeq = allocated.serialNumber;
      }

      const pin = data.biometricPin || finalRoll.replace(/[^0-9]/g, '') || `${index + 1}`;
      createdStudents.push({
        ...data,
        rollNumber: finalRoll,
        serialNumber: finalSerialSeq,
        formattedSerialNumber: finalFormattedSerial,
        id: `std_${timestamp}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        status: data.status || 'Pending Verification',
        deviceSyncStatus: 'Pending',
        enrollRequested: false,
        enrollRequestedAt: undefined,
        biometricEnrolled: false,
        biometricPin: pin,
        enrollmentDate: data.enrollmentDate || new Date().toISOString().split('T')[0],
      });
    }

    // Update in-memory state and localStorage
    const updatedList = [...createdStudents, ...memoryCache.students];
    memoryCache.students = updatedList;
    safeSet(STORAGE_KEYS.STUDENTS, updatedList);
    notifySubscribers('students', updatedList);

    // Write batch directly to Firestore
    try {
      const chunkSize = 400; // Firestore 500 ops limit safe margin
      for (let i = 0; i < createdStudents.length; i += chunkSize) {
        const chunk = createdStudents.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(student => {
          batch.set(doc(db, 'students', student.id), cleanForFirestore(student), { merge: true });
          
          // Also create initial enroll request for ZKTeco device
          batch.set(doc(db, 'zkteco_enrollments', `zk_enroll_${student.id}`), {
            id: `zk_enroll_${student.id}`,
            studentId: student.id,
            rollNumber: student.rollNumber,
            fullName: student.fullName,
            pin: student.biometricPin,
            status: 'Pending Verification',
            createdAt: new Date().toISOString()
          }, { merge: true });
        });
        await batch.commit();
      }
      await this.recordUsedStudentIdsInRegistry(createdStudents, { awaitSync: true });
    } catch (e) {
      console.warn('Firestore importStudentsBatch warning:', e);
    }

    this.logActivity(
      'Bulk Student Import',
      `Imported ${createdStudents.length} candidates from Excel sheet with independent Roll & Serial Numbers. Biometric enrollment initialized.`,
      'student',
      user,
      role
    );

    return createdStudents;
  },

  // =========================================================================
  // Device Configuration & Web-App Initiated Enrollment
  // =========================================================================

  getDeviceConfig(): ZKTecoDeviceConfig {
    initStorage();
    return memoryCache.deviceConfig;
  },

  async updateDeviceConfig(config: Partial<ZKTecoDeviceConfig>): Promise<ZKTecoDeviceConfig> {
    initStorage();
    const updated: ZKTecoDeviceConfig = {
      ...memoryCache.deviceConfig,
      ...config
    };
    memoryCache.deviceConfig = updated;
    safeSet(STORAGE_KEYS.DEVICE_CONFIG, updated);
    notifySubscribers('deviceConfig', updated);

    try {
      const firestorePayload = cleanForFirestore({
        ...updated,
        inOutMode: Boolean(updated.inOutModeEnabled),
      });
      await Promise.all([
        setDoc(doc(db, 'settings', 'zkteco_device'), firestorePayload, { merge: true }),
        setDoc(
          doc(db, 'settings', 'global'),
          {
            inOutModeEnabled: Boolean(updated.inOutModeEnabled),
            inOutMode: Boolean(updated.inOutModeEnabled),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ),
      ]);
      fetch('/api/zkteco/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(() => {});
    } catch (e) {
      console.warn('Error saving zkteco_device to Firestore:', e);
    }

    this.logActivity(
      'Device Settings Updated',
      `Updated ZKTeco Device IP to ${updated.ip}:${updated.port} (IN/OUT Mode: ${updated.inOutModeEnabled ? 'ON' : 'OFF'})`,
      'system',
      'Admin',
      'admin'
    );

    return updated;
  },

  subscribeDeviceConfig(callback: (config: ZKTecoDeviceConfig) => void): () => void {
    subscribers.deviceConfig.add(callback);
    callback(this.getDeviceConfig());
    return () => subscribers.deviceConfig.delete(callback);
  },

  getAttendanceRules(): AttendanceRulesSettings {
    initStorage();
    return memoryCache.attendanceRules || DEFAULT_ATTENDANCE_RULES;
  },

  subscribeAttendanceRules(callback: (rules: AttendanceRulesSettings) => void): () => void {
    subscribers.attendanceRules.add(callback);
    callback(this.getAttendanceRules());
    return () => subscribers.attendanceRules.delete(callback);
  },

  async updateAttendanceRules(
    rules: Partial<AttendanceRulesSettings>,
    updatedBy: string = 'Admin'
  ): Promise<AttendanceRulesSettings> {
    initStorage();
    const current = this.getAttendanceRules();
    const updated: AttendanceRulesSettings = {
      morningLateTime: String(rules.morningLateTime ?? current.morningLateTime ?? '08:00').trim(),
      morningLateEnabled: Boolean(rules.morningLateEnabled ?? current.morningLateEnabled ?? false),
      eveningLateTime: String(rules.eveningLateTime ?? current.eveningLateTime ?? '17:00').trim(),
      eveningLateEnabled: Boolean(rules.eveningLateEnabled ?? current.eveningLateEnabled ?? false),
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
    memoryCache.attendanceRules = updated;
    safeSet(STORAGE_KEYS.ATTENDANCE_RULES, updated);
    notifySubscribers('attendanceRules', updated);

    try {
      await setDoc(doc(db, 'settings', 'attendance_rules'), cleanForFirestore(updated), { merge: true });
    } catch (e) {
      console.warn('Error saving attendance_rules to Firestore:', e);
      throw e;
    }

    this.logActivity(
      'Attendance Rules Updated',
      `Morning Late: ${updated.morningLateEnabled ? updated.morningLateTime : 'Disabled (Neutral)'} · Evening Late: ${updated.eveningLateEnabled ? updated.eveningLateTime : 'Disabled (Neutral)'}`,
      'attendance',
      updatedBy,
      'admin'
    );

    return updated;
  },

  /**
   * Sends an enrollment request to ZKTeco hardware device and sets student to deviceSyncStatus: 'Pending', enrollRequested: true
   */
  async sendEnrollRequest(studentId: string): Promise<boolean> {
    initStorage();
    const student = this.getStudentById(studentId);
    if (!student) return false;

    const pin = student.biometricPin || student.rollNumber.replace(/[^0-9]/g, '') || student.rollNumber;
    const updatedStudent: Student = {
      ...student,
      deviceSyncStatus: 'Pending',
      enrollRequested: true,
      enrollRequestedAt: new Date().toISOString()
    };

    const updatedStudents = memoryCache.students.map(s => s.id === student.id ? updatedStudent : s);
    memoryCache.students = updatedStudents;
    safeSet(STORAGE_KEYS.STUDENTS, updatedStudents);
    notifySubscribers('students', updatedStudents);

    try {
      await setDoc(doc(db, 'students', student.id), cleanForFirestore(updatedStudent), { merge: true });
      await setDoc(doc(db, 'zkteco_enrollments', `zk_enroll_${student.id}`), {
        id: `zk_enroll_${student.id}`,
        studentId: student.id,
        rollNumber: student.rollNumber,
        fullName: student.fullName,
        pin,
        status: 'Pending Verification',
        createdAt: new Date().toISOString()
      }, { merge: true });

      // Signal bridge server endpoint
      fetch('/api/zkteco/enroll-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          rollNumber: student.rollNumber,
          fullName: student.fullName,
          pin
        })
      }).catch(() => {});
    } catch (e) {
      console.warn('sendEnrollRequest Firestore write warning:', e);
    }

    this.logActivity(
      'Enroll Request Sent',
      `Sent biometric enrollment command to ZKTeco device for ${student.fullName} (${student.rollNumber})`,
      'student',
      'Admin',
      'admin'
    );
    return true;
  },

  /**
   * Simulates a ZKTeco biometric fingerprint punch from the Web App.
   * Respects IN/OUT Mode setting:
   * - Standard Mode (OFF): First punch -> Green (Present).
   * - IN/OUT Mode (ON): 1st punch -> Yellow (IN); 2nd punch -> Green (OUT).
   */
  async simulateFingerprintPunch(
    studentRollOrId: string,
    customDate?: string,
    customTime?: string
  ): Promise<{ success: boolean; student?: Student; record?: AttendanceRecord; punchState?: 'in' | 'out' | 'single'; error?: string }> {
    initStorage();
    const cleanQuery = studentRollOrId.trim().toLowerCase();
    const students = this.getStudents();

    const student = students.find(s => {
      if (s.id.toLowerCase() === cleanQuery) return true;
      if (s.rollNumber.toLowerCase() === cleanQuery) return true;
      if (s.biometricPin && s.biometricPin.toLowerCase() === cleanQuery) return true;
      const numRoll = s.rollNumber.replace(/[^0-9]/g, '');
      const numQuery = cleanQuery.replace(/[^0-9]/g, '');
      if (numRoll && numQuery && (numRoll === numQuery || parseInt(numRoll, 10) === parseInt(numQuery, 10))) return true;
      return false;
    });

    if (!student) {
      return { success: false, error: `Student not found with Roll Number or ID: "${studentRollOrId}"` };
    }

    const now = new Date();
    const dateStr = customDate || now.toISOString().split('T')[0];
    const timeStr = customTime || now.toTimeString().split(' ')[0];
    const timestampStr = `${dateStr} ${timeStr}`;

    const docId = `att_${student.id}_${dateStr}`;
    const existingRecord = memoryCache.attendance.find(a => a.id === docId || (a.studentId === student.id && a.date === dateStr));
    const inOutEnabled = Boolean(memoryCache.deviceConfig?.inOutModeEnabled);

    const alreadyPunchedInToday =
      Boolean(
        existingRecord &&
          (existingRecord.punchState === 'in' ||
            (existingRecord.source === 'Device' &&
              (existingRecord.status === 'Present' || existingRecord.status === 'Late') &&
              !existingRecord.checkOutTime))
      ) ||
      (student.lastPunchDate === dateStr && student.lastPunchState === 'in');

    let punchState: 'in' | 'out' | 'single' = 'single';
    let punchType: 'IN' | 'OUT' | 'STANDARD' = 'STANDARD';
    let checkInTime = existingRecord?.checkInTime || timeStr;
    let checkOutTime: string | undefined = existingRecord?.checkOutTime;
    let punchCount = 1;
    let remarks = `Simulated fingerprint punch via ZKTeco Virtual Device at ${timeStr}`;

    if (inOutEnabled) {
      if (alreadyPunchedInToday && existingRecord?.punchState !== 'out' && student.lastPunchState !== 'out') {
        punchState = 'out';
        punchType = 'OUT';
        checkInTime = existingRecord?.checkInTime || student.lastPunchTime || timeStr;
        checkOutTime = timeStr;
        punchCount = (existingRecord?.punchCount || 1) + 1;
        remarks = `Simulated Punch OUT at ${timeStr} (IN: ${checkInTime}) via ZKTeco Virtual Device`;
      } else {
        punchState = 'in';
        punchType = 'IN';
        checkInTime = timeStr;
        checkOutTime = undefined;
        punchCount = 1;
        remarks = `Simulated Punch IN at ${timeStr} via ZKTeco Virtual Device — Awaiting OUT`;
      }
    }

    // Fetch latest Morning/Evening Late Rules from Firestore settings/attendance_rules (with cache fallback)
    let rules: AttendanceRulesSettings = memoryCache.attendanceRules || DEFAULT_ATTENDANCE_RULES;
    try {
      const rulesSnap = await getDoc(doc(db, 'settings', 'attendance_rules'));
      if (rulesSnap.exists()) {
        const raw = rulesSnap.data() as any;
        rules = {
          morningLateTime: String(raw?.morningLateTime || raw?.lateTime || DEFAULT_ATTENDANCE_RULES.morningLateTime).trim(),
          morningLateEnabled: Boolean(raw?.morningLateEnabled ?? false),
          eveningLateTime: String(raw?.eveningLateTime || DEFAULT_ATTENDANCE_RULES.eveningLateTime).trim(),
          eveningLateEnabled: Boolean(raw?.eveningLateEnabled ?? false),
        };
      }
    } catch {}

    const evalResult = evaluateBatchLateArrival({
      punchTime: checkInTime,
      timing: student.timing,
      batch: student.batch,
      rules,
    });
    const arrivalStatus: 'Present' | 'Late' =
      punchState === 'out' && existingRecord?.status === 'Late'
        ? 'Late'
        : evalResult.status;

    if (arrivalStatus === 'Late' && evalResult.cutoffUsed) {
      remarks = `${remarks} · ${evalResult.batchType} Late arrival (cutoff ${evalResult.cutoffUsed})`;
    } else if (!evalResult.ruleEnabled) {
      remarks = `${remarks} · ${evalResult.batchType} Neutral mode`;
    }

    const newRecord: AttendanceRecord = {
      id: docId,
      studentId: student.id,
      studentRoll: student.rollNumber,
      studentName: student.fullName,
      batch: student.batch,
      studentClass: student.studentClass,
      timing: student.timing,
      date: dateStr,
      time: timeStr,
      timestamp: timestampStr,
      status: arrivalStatus,
      source: 'Device',
      deviceId: 'ZKTeco-K40-Virtual',
      punchState,
      checkInTime,
      checkOutTime,
      punchCount,
      remarks
    };

    // Update in memory cache and local storage immediately
    const filteredAttendance = memoryCache.attendance.filter(a => a.id !== docId);
    const updatedAttendance = [newRecord, ...filteredAttendance];
    memoryCache.attendance = updatedAttendance;
    safeSet(STORAGE_KEYS.ATTENDANCE, updatedAttendance);
    notifySubscribers('attendance', updatedAttendance);

    // Save directly to Firestore attendance & punch audit log
    try {
      await setDoc(doc(db, 'attendance', docId), cleanForFirestore(newRecord), { merge: true });
      const punchDocId = `punch_${Date.now()}_${student.id}`;
      await setDoc(doc(db, 'zkteco_punches', punchDocId), cleanForFirestore({
        id: punchDocId,
        userId: student.biometricPin || student.rollNumber.replace(/[^0-9]/g, '') || '1',
        studentId: student.id,
        studentRoll: student.rollNumber,
        studentName: student.fullName,
        timestamp: timestampStr,
        date: dateStr,
        time: timeStr,
        status: arrivalStatus,
        punchState,
        punchType,
        deviceId: 'ZKTeco-K40-Virtual',
        rawPayload: `${student.rollNumber}\t${timestampStr}\t${punchType}`,
        syncedToFirestore: true
      }));
    } catch (e) {
      console.warn('Firestore attendance simulate write warning:', e);
    }

    // Activate/Enroll student & persist today's punch state
    const resolvedPunchStatus =
      punchState === 'in' ? 'IN' : punchState === 'out' ? 'OUT' : 'Punched';
    const updatedStudent: Student = {
      ...student,
      status: student.status === 'Pending Verification' ? 'Active' : student.status,
      biometricEnrolled: true,
      deviceSyncStatus: 'Enrolled',
      enrollRequested: false,
      zkDeviceId: 'ZKTeco-K40-Virtual',
      verificationDate: student.verificationDate || dateStr,
      lastPunchDate: dateStr,
      lastPunchTime: timeStr,
      lastPunchState: punchState,
      punchStatus: resolvedPunchStatus
    };

    const updatedStudents = memoryCache.students.map(s => s.id === student.id ? updatedStudent : s);
    memoryCache.students = updatedStudents;
    safeSet(STORAGE_KEYS.STUDENTS, updatedStudents);
    notifySubscribers('students', updatedStudents);

    try {
      await setDoc(doc(db, 'students', student.id), cleanForFirestore(updatedStudent), { merge: true });
    } catch (e) {
      console.warn('Firestore student status update warning:', e);
    }

    this.logActivity(
      inOutEnabled ? `Simulate Device Punch (${punchType})` : 'Simulate Device Punch',
      `${punchType}: ${student.fullName} (${student.rollNumber}) punched at ${timeStr} via ZKTeco Virtual Device`,
      'attendance',
      'Device Simulator',
      'admin'
    );

    // Notify backend buffer without double-toggling Firestore state
    try {
      fetch('/api/zkteco/simulate-punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: student.rollNumber,
          userId: student.biometricPin || student.rollNumber.replace(/[^0-9]/g, '') || '1',
          sn: 'K40-ADMS-01',
          auditOnly: true,
          punchState,
          punchType
        })
      }).catch(() => {});
    } catch {}

    return {
      success: true,
      student: updatedStudent,
      record: newRecord,
      punchState
    };
  },

  // Sunday Class Override Requests
  getSundayRequests(): SundayClassRequest[] {
    initStorage();
    return memoryCache.sundayRequests || [];
  },

  subscribeSundayRequests(callback: (requests: SundayClassRequest[]) => void): () => void {
    subscribers.sundayRequests.add(callback);
    callback(this.getSundayRequests());
    return () => subscribers.sundayRequests.delete(callback);
  },

  createSundayRequest(data: Omit<SundayClassRequest, 'id' | 'status' | 'createdAt'>): SundayClassRequest {
    initStorage();
    const newRequest: SundayClassRequest = {
      ...data,
      id: `sun_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const updated = [newRequest, ...(memoryCache.sundayRequests || [])];
    memoryCache.sundayRequests = updated;
    safeSet(STORAGE_KEYS.SUNDAY_REQUESTS, updated);
    notifySubscribers('sundayRequests', updated);

    setDoc(doc(db, 'sunday_requests', newRequest.id), cleanForFirestore(newRequest))
      .catch(err => console.warn('Firestore sunday_requests write warning:', err));

    this.logActivity(
      'Sunday Class Requested',
      `Teacher ${data.teacherName} requested Sunday attendance for class ${data.className} on ${data.date}. Reason: ${data.reason}`,
      'attendance',
      data.teacherName,
      'teacher'
    );

    // Also trigger in-app notification for admin
    this.addAppNotification({
      title: 'Sunday Class Request',
      body: `Teacher ${data.teacherName} requested Sunday attendance for ${data.className} on ${data.date}`,
      targetRole: 'admin',
      type: 'sunday_request',
      linkTab: 'attendance'
    });

    return newRequest;
  },

  async approveSundayRequest(requestId: string, adminUser: string = 'Admin'): Promise<boolean> {
    initStorage();
    const req = (memoryCache.sundayRequests || []).find(r => r.id === requestId);
    if (!req) return false;

    const updatedRequest: SundayClassRequest = {
      ...req,
      status: 'Approved',
      reviewedBy: adminUser,
      reviewedAt: new Date().toISOString()
    };

    const updatedList = memoryCache.sundayRequests.map(r => r.id === requestId ? updatedRequest : r);
    memoryCache.sundayRequests = updatedList;
    safeSet(STORAGE_KEYS.SUNDAY_REQUESTS, updatedList);
    notifySubscribers('sundayRequests', updatedList);

    try {
      await setDoc(doc(db, 'sunday_requests', requestId), cleanForFirestore(updatedRequest), { merge: true });
    } catch (e) {
      console.warn('approveSundayRequest Firestore warning:', e);
    }

    this.logActivity(
      'Sunday Class Request Approved',
      `Approved Sunday class attendance for ${req.className} on ${req.date} (Teacher: ${req.teacherName})`,
      'attendance',
      adminUser,
      'admin'
    );

    // Notify teacher
    this.addAppNotification({
      title: 'Sunday Class Approved',
      body: `Admin approved your Sunday class request for ${req.className} on ${req.date}. You can now mark attendance.`,
      targetRole: 'teacher',
      targetTeacherId: req.teacherId,
      type: 'sunday_approved',
      linkTab: 'attendance'
    });

    return true;
  },

  async rejectSundayRequest(requestId: string, adminUser: string = 'Admin'): Promise<boolean> {
    initStorage();
    const req = (memoryCache.sundayRequests || []).find(r => r.id === requestId);
    if (!req) return false;

    const updatedRequest: SundayClassRequest = {
      ...req,
      status: 'Rejected',
      reviewedBy: adminUser,
      reviewedAt: new Date().toISOString()
    };

    const updatedList = memoryCache.sundayRequests.map(r => r.id === requestId ? updatedRequest : r);
    memoryCache.sundayRequests = updatedList;
    safeSet(STORAGE_KEYS.SUNDAY_REQUESTS, updatedList);
    notifySubscribers('sundayRequests', updatedList);

    try {
      await setDoc(doc(db, 'sunday_requests', requestId), cleanForFirestore(updatedRequest), { merge: true });
    } catch (e) {
      console.warn('rejectSundayRequest Firestore warning:', e);
    }

    this.logActivity(
      'Sunday Class Request Rejected',
      `Rejected Sunday class request for ${req.className} on ${req.date} (Teacher: ${req.teacherName})`,
      'attendance',
      adminUser,
      'admin'
    );

    return true;
  },

  deleteSundayRequest(requestId: string): boolean {
    initStorage();
    const filtered = (memoryCache.sundayRequests || []).filter(r => r.id !== requestId);
    memoryCache.sundayRequests = filtered;
    safeSet(STORAGE_KEYS.SUNDAY_REQUESTS, filtered);
    notifySubscribers('sundayRequests', filtered);

    deleteDoc(doc(db, 'sunday_requests', requestId))
      .catch(err => console.warn('Firestore delete sunday_requests warning:', err));

    return true;
  },

  // Student Leave Requests
  getLeaveRequests(): StudentLeaveRequest[] {
    initStorage();
    return memoryCache.leaveRequests || [];
  },

  subscribeLeaveRequests(callback: (requests: StudentLeaveRequest[]) => void): () => void {
    subscribers.leaveRequests.add(callback);
    callback(this.getLeaveRequests());
    return () => subscribers.leaveRequests.delete(callback);
  },

  createLeaveRequest(data: Omit<StudentLeaveRequest, 'id' | 'status' | 'createdAt'>): StudentLeaveRequest {
    initStorage();
    const newRequest: StudentLeaveRequest = {
      ...data,
      id: `leave_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const updated = [newRequest, ...(memoryCache.leaveRequests || [])];
    memoryCache.leaveRequests = updated;
    safeSet(STORAGE_KEYS.LEAVE_REQUESTS, updated);
    notifySubscribers('leaveRequests', updated);

    // Save to Firestore leave_requests node
    setDoc(doc(db, 'leave_requests', newRequest.id), cleanForFirestore(newRequest))
      .catch(err => console.warn('Firestore leave_requests write warning:', err));

    // Reset student's attendance on requested date(s) so it temporarily shows as Neutral / Pending Approval
    const targetDates = this.getDatesInRange(data.startDate, data.endDate);
    const filteredAttendance = (memoryCache.attendance || []).filter(
      a => !(a.studentId === data.studentId && targetDates.includes(a.date))
    );
    memoryCache.attendance = filteredAttendance;
    safeSet(STORAGE_KEYS.ATTENDANCE, filteredAttendance);
    notifySubscribers('attendance', filteredAttendance);

    try {
      const b = writeBatch(db);
      targetDates.forEach(d => {
        b.delete(doc(db, 'attendance', `att_${data.studentId}_${d}`));
      });
      b.commit().catch(e => console.warn('Firestore attendance reset on leave creation warning:', e));
    } catch (e) {
      console.warn('createLeaveRequest attendance reset warning:', e);
    }

    this.logActivity(
      'Student Leave Requested',
      `Leave requested for ${data.studentName} (${data.studentRoll}) from ${data.startDate} to ${data.endDate}. Reason: ${data.reason}`,
      'attendance',
      data.submittedByName,
      data.submittedByRole === 'admin' ? 'admin' : 'teacher'
    );

    // In-app alert for Admin
    this.addAppNotification({
      title: 'New Student Leave Request',
      body: `Teacher ${data.submittedByName} requested leave for ${data.studentName} (${data.studentRoll}) on ${data.startDate}. Reason: ${data.reason}`,
      targetRole: 'admin',
      type: 'leave_request',
      linkTab: 'attendance'
    });

    return newRequest;
  },

  getDatesInRange(startDate: string, endDate?: string): string[] {
    if (!startDate) return [];
    if (!endDate || endDate < startDate) return [startDate];
    const dates: string[] = [];
    const curr = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    let safety = 0;
    while (curr <= end && safety < 60) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
      safety++;
    }
    return dates.length > 0 ? dates : [startDate];
  },

  async approveLeaveRequest(requestId: string, adminUser: string = 'Admin'): Promise<boolean> {
    initStorage();
    const req = (memoryCache.leaveRequests || []).find(r => r.id === requestId);
    if (!req) return false;

    const updatedRequest: StudentLeaveRequest = {
      ...req,
      status: 'Approved',
      reviewedBy: adminUser,
      reviewedAt: new Date().toISOString()
    };

    const updatedList = memoryCache.leaveRequests.map(r => r.id === requestId ? updatedRequest : r);
    memoryCache.leaveRequests = updatedList;
    safeSet(STORAGE_KEYS.LEAVE_REQUESTS, updatedList);
    notifySubscribers('leaveRequests', updatedList);

    try {
      await setDoc(doc(db, 'leave_requests', requestId), cleanForFirestore(updatedRequest), { merge: true });
    } catch (e) {
      console.warn('approveLeaveRequest Firestore warning:', e);
    }

    // Determine target dates
    const targetDates = this.getDatesInRange(req.startDate, req.endDate);
    const nowTime = new Date().toTimeString().split(' ')[0];

    // Find student details for class and batch info
    const student = (memoryCache.students || []).find(s => s.id === req.studentId);
    const studentClass = req.studentClass || student?.studentClass || 'Class 1';
    const batch = (req.batch || student?.batch || '') as StudentBatch;
    const timing = student?.timing || (batch.toLowerCase().includes('evening') || studentClass.toLowerCase().includes('evening') ? 'Evening' : 'Morning');

    // Create AttendanceRecord with status 'Leave' and reason saved for each date
    const newRecords: AttendanceRecord[] = targetDates.map(d => ({
      id: `att_${req.studentId}_${d}`,
      studentId: req.studentId,
      studentRoll: req.studentRoll,
      studentName: req.studentName,
      studentClass,
      timing,
      batch,
      date: d,
      time: nowTime,
      timestamp: `${d} ${nowTime}`,
      status: 'Leave' as AttendanceStatus,
      notes: `Approved Leave: ${req.reason}`,
      source: 'Manual',
      teacherName: adminUser
    }));

    const previousRecordsByKey = new Map<string, AttendanceRecord>();
    (memoryCache.attendance || []).forEach(a => {
      if (a.studentId === req.studentId && targetDates.includes(a.date)) {
        previousRecordsByKey.set(`${a.studentId}_${a.date}`, a);
      }
    });

    // Update memory and Firestore attendance
    const filteredAttendance = (memoryCache.attendance || []).filter(
      a => !(a.studentId === req.studentId && targetDates.includes(a.date))
    );
    const finalAttendance = [...newRecords, ...filteredAttendance];
    memoryCache.attendance = finalAttendance;
    safeSet(STORAGE_KEYS.ATTENDANCE, finalAttendance);
    notifySubscribers('attendance', finalAttendance);

    try {
      const b = writeBatch(db);
      newRecords.forEach(rec => {
        b.set(doc(db, 'attendance', rec.id), cleanForFirestore(rec), { merge: true });
      });
      await b.commit();
      WhatsAppService.dispatchAttendanceNotifications({
        newRecords,
        previousRecordsByKey,
        students: memoryCache.students,
        triggeredBy: adminUser,
      }).catch(err => console.warn('WhatsApp approveLeaveRequest notice:', err));
    } catch (e) {
      console.warn('approveLeaveRequest attendance batch warning:', e);
    }

    this.logActivity(
      'Student Leave Approved',
      `Approved leave for ${req.studentName} (${req.studentRoll}) from ${req.startDate} to ${req.endDate}. Attendance status changed to Leave (${req.reason}).`,
      'attendance',
      adminUser,
      'admin'
    );

    // Notify teacher who submitted
    this.addAppNotification({
      title: 'Leave Request Approved',
      body: `Admin approved leave for ${req.studentName} (${req.studentRoll}) for ${req.startDate}. Attendance marked as Leave.`,
      targetRole: 'teacher',
      type: 'leave_request',
      linkTab: 'attendance'
    });

    return true;
  },

  async rejectLeaveRequest(requestId: string, adminUser: string = 'Admin'): Promise<boolean> {
    initStorage();
    const req = (memoryCache.leaveRequests || []).find(r => r.id === requestId);
    if (!req) return false;

    const updatedRequest: StudentLeaveRequest = {
      ...req,
      status: 'Rejected',
      reviewedBy: adminUser,
      reviewedAt: new Date().toISOString()
    };

    const updatedList = memoryCache.leaveRequests.map(r => r.id === requestId ? updatedRequest : r);
    memoryCache.leaveRequests = updatedList;
    safeSet(STORAGE_KEYS.LEAVE_REQUESTS, updatedList);
    notifySubscribers('leaveRequests', updatedList);

    try {
      await setDoc(doc(db, 'leave_requests', requestId), cleanForFirestore(updatedRequest), { merge: true });
    } catch (e) {
      console.warn('rejectLeaveRequest Firestore warning:', e);
    }

    // Reset student's attendance status to Neutral / empty for that day
    const targetDates = this.getDatesInRange(req.startDate, req.endDate);
    const filteredAttendance = (memoryCache.attendance || []).filter(
      a => !(a.studentId === req.studentId && targetDates.includes(a.date))
    );
    memoryCache.attendance = filteredAttendance;
    safeSet(STORAGE_KEYS.ATTENDANCE, filteredAttendance);
    notifySubscribers('attendance', filteredAttendance);

    try {
      const b = writeBatch(db);
      targetDates.forEach(d => {
        b.delete(doc(db, 'attendance', `att_${req.studentId}_${d}`));
      });
      await b.commit();
    } catch (e) {
      console.warn('rejectLeaveRequest attendance delete warning:', e);
    }

    this.logActivity(
      'Student Leave Rejected',
      `Rejected leave request for ${req.studentName} (${req.studentRoll}). Attendance status reset to Neutral for ${req.startDate}.`,
      'attendance',
      adminUser,
      'admin'
    );

    // Notify teacher who submitted
    this.addAppNotification({
      title: 'Leave Request Rejected',
      body: `Admin rejected leave request for ${req.studentName} (${req.studentRoll}). Attendance reset to Neutral.`,
      targetRole: 'teacher',
      type: 'leave_request',
      linkTab: 'attendance'
    });

    return true;
  },

  deleteLeaveRequest(requestId: string): boolean {
    initStorage();
    const filtered = (memoryCache.leaveRequests || []).filter(r => r.id !== requestId);
    memoryCache.leaveRequests = filtered;
    safeSet(STORAGE_KEYS.LEAVE_REQUESTS, filtered);
    notifySubscribers('leaveRequests', filtered);

    deleteDoc(doc(db, 'leave_requests', requestId))
      .catch(err => console.warn('Firestore delete leave_requests warning:', err));

    return true;
  },

  // In-App Push Notifications
  getAppNotifications(): AppPushNotification[] {
    initStorage();
    return memoryCache.notifications || [];
  },

  subscribeAppNotifications(callback: (notifications: AppPushNotification[]) => void): () => void {
    subscribers.notifications.add(callback);
    callback(this.getAppNotifications());
    return () => subscribers.notifications.delete(callback);
  },

  addAppNotification(notification: Omit<AppPushNotification, 'id' | 'timestamp' | 'read'>): AppPushNotification {
    initStorage();
    const newNotification: AppPushNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false
    };

    const updated = [newNotification, ...(memoryCache.notifications || [])].slice(0, 100);
    memoryCache.notifications = updated;
    safeSet(STORAGE_KEYS.NOTIFICATIONS, updated);
    notifySubscribers('notifications', updated);

    setDoc(doc(db, 'app_notifications', newNotification.id), cleanForFirestore(newNotification))
      .catch(err => console.warn('Firestore app_notifications write warning:', err));

    return newNotification;
  },

  markNotificationRead(id: string): void {
    initStorage();
    const updated = (memoryCache.notifications || []).map(n => n.id === id ? { ...n, read: true } : n);
    memoryCache.notifications = updated;
    safeSet(STORAGE_KEYS.NOTIFICATIONS, updated);
    notifySubscribers('notifications', updated);

    setDoc(doc(db, 'app_notifications', id), { read: true }, { merge: true })
      .catch(err => console.warn('Firestore mark read warning:', err));
  },

  markAllNotificationsRead(): void {
    initStorage();
    const updated = (memoryCache.notifications || []).map(n => ({ ...n, read: true }));
    memoryCache.notifications = updated;
    safeSet(STORAGE_KEYS.NOTIFICATIONS, updated);
    notifySubscribers('notifications', updated);
  },

  clearAllNotifications(): void {
    initStorage();
    memoryCache.notifications = [];
    safeSet(STORAGE_KEYS.NOTIFICATIONS, []);
    notifySubscribers('notifications', []);
  },

  // Attendance Schedule & Day Control
  getAttendanceScheduleSettings(): AttendanceScheduleSettings {
    initStorage();
    return memoryCache.attendanceSchedule || DEFAULT_ATTENDANCE_SCHEDULE;
  },

  subscribeAttendanceScheduleSettings(callback: (settings: AttendanceScheduleSettings) => void): () => void {
    subscribers.attendanceSchedule.add(callback);
    callback(this.getAttendanceScheduleSettings());
    return () => subscribers.attendanceSchedule.delete(callback);
  },

  async saveAttendanceScheduleSettings(settings: AttendanceScheduleSettings, user: string = 'Admin'): Promise<void> {
    initStorage();
    const payload: AttendanceScheduleSettings = {
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: user
    };

    memoryCache.attendanceSchedule = payload;
    safeSet(STORAGE_KEYS.ATTENDANCE_SETTINGS, payload);
    notifySubscribers('attendanceSchedule', payload);

    try {
      await setDoc(doc(db, 'attendance_settings', 'global'), cleanForFirestore(payload), { merge: true });
      await setDoc(doc(db, 'settings', 'attendance_settings'), cleanForFirestore(payload), { merge: true });
    } catch (e) {
      console.warn('saveAttendanceScheduleSettings Firestore warning:', e);
    }

    this.logActivity(
      'Attendance Schedule Updated',
      `Admin updated weekly attendance permissions (Sunday: ${payload.sunday ? 'ON' : 'OFF'}, Monday: ${payload.monday ? 'ON' : 'OFF'})`,
      'attendance',
      user,
      'admin'
    );
  },

  isAttendanceDayAllowed(dateString?: string, classNameOrBatch?: string): { 
    isAllowed: boolean; 
    dayName: string; 
    isSunday: boolean;
    isClassSpecificOverride?: boolean;
    overrideAction?: 'enable' | 'holiday';
    overrideTargetClass?: string;
  } {
    initStorage();
    const targetDate = dateString ? new Date(dateString + 'T00:00:00') : new Date();
    const dayIndex = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayKey = daysMap[dayIndex];
    const schedule = this.getAttendanceScheduleSettings();
    const dayName = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
    const isSunday = dayIndex === 0;

    const norm = (s?: string) => (s || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();
    const currentClassNorm = norm(classNameOrBatch);

    // 1. Check dateOverridesList (class/batch specific or ALL classes)
    if (dateString && Array.isArray(schedule.dateOverridesList) && schedule.dateOverridesList.length > 0) {
      const overridesForDate = schedule.dateOverridesList.filter(o => o.date === dateString);

      // 1a. If a specific class or batch was requested, check for a matching override
      if (classNameOrBatch) {
        const classOverride = overridesForDate.find(o => {
          const target = o.targetClass;
          if (target === 'ALL' || target === 'ALL Classes' || norm(target) === 'all' || norm(target) === 'allclasses') {
            return false;
          }
          if (target === classNameOrBatch) return true;
          const tNorm = norm(target);
          return tNorm === currentClassNorm || (currentClassNorm.includes(tNorm) && tNorm.length > 3) || (tNorm.includes(currentClassNorm) && currentClassNorm.length > 3);
        });

        if (classOverride) {
          return {
            isAllowed: classOverride.isAllowed,
            dayName,
            isSunday,
            isClassSpecificOverride: true,
            overrideAction: classOverride.action,
            overrideTargetClass: classOverride.targetClass
          };
        }
      }

      // 1b. Check for global "ALL Classes" override on this date
      const globalOverride = overridesForDate.find(o => 
        o.targetClass === 'ALL' || o.targetClass === 'ALL Classes' || norm(o.targetClass) === 'all' || norm(o.targetClass) === 'allclasses'
      );
      if (globalOverride) {
        return {
          isAllowed: globalOverride.isAllowed,
          dayName,
          isSunday,
          isClassSpecificOverride: false,
          overrideAction: globalOverride.action,
          overrideTargetClass: 'ALL Classes'
        };
      }
    }

    // 2. Check legacy specificDateOverrides if set
    if (dateString && schedule.specificDateOverrides && schedule.specificDateOverrides[dateString] !== undefined) {
      const allowed = schedule.specificDateOverrides[dateString];
      return {
        isAllowed: allowed,
        dayName,
        isSunday,
        isClassSpecificOverride: false,
        overrideAction: allowed ? 'enable' : 'holiday',
        overrideTargetClass: 'ALL Classes'
      };
    }

    // 3. Check general day of week toggle
    const isAllowed = Boolean(schedule[dayKey]);
    return {
      isAllowed,
      dayName,
      isSunday,
      isClassSpecificOverride: false
    };
  },

  async addSpecificDateOverride(override: SpecificDateOverride, user: string = 'Admin'): Promise<void> {
    initStorage();
    const schedule = this.getAttendanceScheduleSettings();
    const existingList = Array.isArray(schedule.dateOverridesList) ? [...schedule.dateOverridesList] : [];
    // Remove any identical date + targetClass override
    const filtered = existingList.filter(o => !(o.date === override.date && o.targetClass === override.targetClass));
    filtered.push(override);

    const legacyOverrides = { ...(schedule.specificDateOverrides || {}) };
    if (override.targetClass === 'ALL' || override.targetClass === 'ALL Classes') {
      legacyOverrides[override.date] = override.isAllowed;
    }

    const updated: AttendanceScheduleSettings = {
      ...schedule,
      dateOverridesList: filtered,
      specificDateOverrides: legacyOverrides
    };

    await this.saveAttendanceScheduleSettings(updated, user);
  },

  async removeSpecificDateOverride(overrideIdOrDate: string, user: string = 'Admin'): Promise<void> {
    initStorage();
    const schedule = this.getAttendanceScheduleSettings();
    const existingList = Array.isArray(schedule.dateOverridesList) ? [...schedule.dateOverridesList] : [];
    const filtered = existingList.filter(o => o.id !== overrideIdOrDate && o.date !== overrideIdOrDate);

    const legacyOverrides = { ...(schedule.specificDateOverrides || {}) };
    delete legacyOverrides[overrideIdOrDate];

    const updated: AttendanceScheduleSettings = {
      ...schedule,
      dateOverridesList: filtered,
      specificDateOverrides: legacyOverrides
    };

    await this.saveAttendanceScheduleSettings(updated, user);
  },

  // Teacher Portal Welcome Message Settings
  getWelcomeMessageSettings(): WelcomeMessageSettings {
    initStorage();
    return memoryCache.welcomeMessage || DEFAULT_WELCOME_MESSAGE_SETTINGS;
  },

  subscribeWelcomeMessageSettings(callback: (settings: WelcomeMessageSettings) => void): () => void {
    subscribers.welcomeMessage.add(callback);
    callback(this.getWelcomeMessageSettings());
    return () => subscribers.welcomeMessage.delete(callback);
  },

  async saveWelcomeMessageSettings(settings: WelcomeMessageSettings, user: string = 'Admin'): Promise<void> {
    initStorage();
    const payload: WelcomeMessageSettings = {
      ...settings,
      durationMinutes: settings.durationMinutes || 2,
      updatedAt: new Date().toISOString(),
      updatedBy: user
    };

    memoryCache.welcomeMessage = payload;
    safeSet(STORAGE_KEYS.WELCOME_MESSAGE_SETTINGS, payload);
    notifySubscribers('welcomeMessage', payload);

    try {
      await setDoc(doc(db, 'welcome_message_settings', 'global'), cleanForFirestore(payload), { merge: true });
      await setDoc(doc(db, 'settings', 'welcome_message_settings'), cleanForFirestore(payload), { merge: true });
    } catch (e) {
      console.warn('saveWelcomeMessageSettings Firestore warning:', e);
    }

    this.logActivity(
      'Teacher Welcome Message Updated',
      `Admin updated the scrolling faculty banner message: "${payload.message.substring(0, 40)}..."`,
      'system',
      user,
      'admin'
    );
  }
};

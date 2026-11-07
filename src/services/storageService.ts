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
  WelcomeMessageSettings
} from '../types';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDocs 
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
};

export const DEFAULT_DEVICE_CONFIG: ZKTecoDeviceConfig = {
  ip: '192.168.1.201',
  port: 4370,
  sn: 'K40-ADMS-01',
  status: 'Disconnected',
  lastSeen: '',
  firmware: 'Ver 6.60 (Build 2026)',
  pushVersion: '2.4.1',
  autoSync: true
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
  specificDateOverrides: {}
};

export const DEFAULT_WELCOME_MESSAGE_SETTINGS: WelcomeMessageSettings = {
  enabled: true,
  message: "Welcome back! Don't forget to mark attendance.",
  template: "Welcome back! Don't forget to mark attendance.",
  speed: 'normal',
  durationMinutes: 2
};

const INITIAL_TEACHERS: TeacherAccount[] = [
  {
    id: 'teacher_nabila',
    name: 'Nabila Teacher (나빌라 강사)',
    username: 'nabila',
    password: 'Korean2026!#',
    email: 'nabila@okkorean.com',
    phone: '+92 300 4455667',
    assignedBatch: 'Batch A (Morning 09:00 - 11:00)',
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
    assignedBatch: 'Batch A (Morning 09:00 - 11:00)',
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
    assignedBatch: 'Batch B (Afternoon 14:00 - 16:00)',
    assignedClasses: ['Evening Class 1', 'Evening Class 2'],
    status: 'Active',
    allowedMenus: ['dashboard', 'attendance', 'tests', 'reports'],
    createdAt: '2026-09-10',
  }
];

const INITIAL_STUDENTS: Student[] = [];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

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

const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log_01',
    timestamp: '2026-10-24 10:45 AM',
    user: 'Admin',
    role: 'admin',
    action: 'System Initialized',
    detail: 'OK Korean Language Centre LMS ready for candidate enrollments.',
    category: 'system'
  }
];

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
  all: new Set(),
};

// BroadcastChannel for instant cross-tab sync on same machine
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('ok_lms_realtime');
    broadcastChannel.onmessage = (event) => {
      const { type, data } = event.data || {};
      if (type && memoryCache[type as keyof CacheStore]) {
        memoryCache[type as keyof CacheStore] = data;
        safeSet(STORAGE_KEYS[type.toUpperCase() as keyof typeof STORAGE_KEYS], data);
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
    if (list.length > 0 || !snapshot.empty) {
      memoryCache.tests = list;
      safeSet(STORAGE_KEYS.TESTS, list);
      notifySubscribers('tests', list);
    }
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
    const list: ActivityLog[] = snapshot.docs.map(docSnap => ({
      ...docSnap.data() as ActivityLog,
      id: docSnap.id
    }));
    if (list.length > 0 || !snapshot.empty) {
      list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      memoryCache.logs = list;
      safeSet(STORAGE_KEYS.LOGS, list);
      notifySubscribers('logs', list);
    }
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
      const data = docSnap.data() as ZKTecoDeviceConfig;
      memoryCache.deviceConfig = data;
      safeSet(STORAGE_KEYS.DEVICE_CONFIG, data);
      notifySubscribers('deviceConfig', data);
    }
  }, (err) => {
    console.warn('Live sync notice (deviceConfig):', err.message);
  });

  // 9. Live Sync: Attendance Approval Requests
  onSnapshot(collection(db, 'attendance_requests'), (snapshot) => {
    const list: AttendanceRequest[] = snapshot.docs.map(docSnap => ({
      ...docSnap.data() as AttendanceRequest,
      id: docSnap.id
    }));
    // Sort newest first
    list.sort((a, b) => (b.createdAt || b.timestamp || '').localeCompare(a.createdAt || a.timestamp || ''));
    memoryCache.attendanceRequests = list;
    safeSet(STORAGE_KEYS.ATTENDANCE_REQUESTS, list);
    notifySubscribers('attendanceRequests', list);
  }, (err) => {
    console.warn('Live sync notice (attendance_requests):', err.message);
  });

  // 10. Live Sync: Sunday Class Override Requests
  onSnapshot(collection(db, 'sunday_requests'), (snapshot) => {
    const list: SundayClassRequest[] = snapshot.docs.map(docSnap => ({
      ...docSnap.data() as SundayClassRequest,
      id: docSnap.id
    }));
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    memoryCache.sundayRequests = list;
    safeSet(STORAGE_KEYS.SUNDAY_REQUESTS, list);
    notifySubscribers('sundayRequests', list);
  }, (err) => {
    console.warn('Live sync notice (sunday_requests):', err.message);
  });

  // 11. Live Sync: Student Leave Requests
  onSnapshot(collection(db, 'leave_requests'), (snapshot) => {
    const list: StudentLeaveRequest[] = snapshot.docs.map(docSnap => ({
      ...docSnap.data() as StudentLeaveRequest,
      id: docSnap.id
    }));
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    memoryCache.leaveRequests = list;
    safeSet(STORAGE_KEYS.LEAVE_REQUESTS, list);
    notifySubscribers('leaveRequests', list);
  }, (err) => {
    console.warn('Live sync notice (leave_requests):', err.message);
  });

  // 12. Live Sync: In-App Push Notifications
  onSnapshot(collection(db, 'app_notifications'), (snapshot) => {
    const list: AppPushNotification[] = snapshot.docs.map(docSnap => ({
      ...docSnap.data() as AppPushNotification,
      id: docSnap.id
    }));
    list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
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

  addStudent(studentData: Omit<Student, 'id'>, user: string = 'Admin', role: UserRole = 'admin'): Student {
    const newStudent: Student = {
      ...studentData,
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    
    // Immediate optimistic update
    const updated = [newStudent, ...memoryCache.students];
    memoryCache.students = updated;
    safeSet(STORAGE_KEYS.STUDENTS, updated);
    notifySubscribers('students', updated);

    // Save to Firestore real-time collection
    setDoc(doc(db, 'students', newStudent.id), cleanForFirestore(newStudent))
      .catch(err => console.warn('Firestore addStudent warning:', err));

    this.logActivity(
      'Student Added',
      `Registered ${newStudent.fullName} (${newStudent.rollNumber}) in ${newStudent.batch}`,
      'student',
      user,
      role
    );
    return newStudent;
  },

  updateStudent(updatedStudent: Student, user: string = 'Admin', role: UserRole = 'admin'): Student {
    const updatedList = memoryCache.students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    memoryCache.students = updatedList;
    safeSet(STORAGE_KEYS.STUDENTS, updatedList);
    notifySubscribers('students', updatedList);

    // Update in Firestore
    setDoc(doc(db, 'students', updatedStudent.id), cleanForFirestore(updatedStudent), { merge: true })
      .catch(err => console.warn('Firestore updateStudent warning:', err));

    this.logActivity(
      'Student Updated',
      `Updated profile information for ${updatedStudent.fullName} (${updatedStudent.rollNumber})`,
      'student',
      user,
      role
    );
    return updatedStudent;
  },

  deleteStudent(id: string, user: string = 'Admin', role: UserRole = 'admin'): boolean {
    const target = memoryCache.students.find(s => s.id === id);
    if (!target) return false;

    const filtered = memoryCache.students.filter(s => s.id !== id);
    memoryCache.students = filtered;
    safeSet(STORAGE_KEYS.STUDENTS, filtered);
    notifySubscribers('students', filtered);

    // Delete in Firestore
    deleteDoc(doc(db, 'students', id))
      .catch(err => console.warn('Firestore deleteStudent warning:', err));

    this.logActivity(
      'Student Removed',
      `Removed student record: ${target.fullName} (${target.rollNumber})`,
      'student',
      user,
      role
    );
    return true;
  },

  deleteStudentsBatch(ids: string[], user: string = 'Admin', role: UserRole = 'admin'): boolean {
    if (!ids || ids.length === 0) return false;
    const idSet = new Set(ids);
    const targetCount = memoryCache.students.filter(s => idSet.has(s.id)).length;
    
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
  ): void {
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
      batch = recordsOrBatch[0]?.batch || 'Batch A (Morning 09:00 - 11:00)';
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

    if (!records || records.length === 0) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const timestampStr = `${date} ${timeStr}`;

    // Use deterministic unique ID per student and date: att_${studentId}_${date}
    const newRecords: AttendanceRecord[] = records.map((r) => {
      const docId = `att_${r.studentId}_${date}`;
      const rec = r as Partial<AttendanceRecord>;
      return {
        ...r,
        id: docId,
        batch,
        studentClass: rec.studentClass,
        timing: rec.timing,
        teacherId: rec.teacherId,
        teacherName: rec.teacherName,
        date,
        time: rec.time || timeStr,
        timestamp: rec.timestamp || timestampStr,
        source: (rec.source as AttendanceSource) || 'Manual'
      };
    });

    // Replace matching student records for this date in memory cache
    const filtered = memoryCache.attendance.filter(
      a => !(a.date === date && records.some(r => r.studentId === a.studentId))
    );
    const updated = [...newRecords, ...filtered];
    memoryCache.attendance = updated;
    safeSet(STORAGE_KEYS.ATTENDANCE, updated);
    notifySubscribers('attendance', updated);

    // Sync to Firestore with deterministic doc ID
    try {
      const firestoreBatch = writeBatch(db);
      newRecords.forEach(rec => {
        firestoreBatch.set(doc(db, 'attendance', rec.id), cleanForFirestore(rec), { merge: true });
      });
      firestoreBatch.commit().catch(e => console.warn('Firestore attendance batch warning:', e));
    } catch (e) {
      console.warn('saveBatchAttendance Firestore warning:', e);
    }

    const presentCount = records.filter(r => r.status === 'Present').length;
    this.logActivity(
      'Attendance Saved',
      `Marked attendance for ${batch} on ${date}. ${presentCount}/${records.length} Present.`,
      'attendance',
      user,
      role
    );
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
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const leave = records.filter(r => r.status === 'Leave').length;
    const late = records.filter(r => r.status === 'Late').length;
    const rate = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 100;
    return { total, present, absent, leave, late, rate };
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
    const newTest: WeeklyTest = {
      ...testData,
      id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    
    const updated = [newTest, ...memoryCache.tests];
    memoryCache.tests = updated;
    safeSet(STORAGE_KEYS.TESTS, updated);
    notifySubscribers('tests', updated);

    // Save to Firestore
    setDoc(doc(db, 'tests', newTest.id), cleanForFirestore(newTest))
      .catch(err => console.warn('Firestore addTest warning:', err));

    this.logActivity(
      'Weekly Test Recorded',
      `Entered marks for "${newTest.testTitle}" (${newTest.batch}). ${newTest.scores.length} scores recorded.`,
      'test',
      user,
      role
    );
    return newTest;
  },

  updateTest(updatedTest: WeeklyTest, user: string = 'Teacher', role: UserRole = 'teacher'): WeeklyTest {
    const updated = memoryCache.tests.map(t => t.id === updatedTest.id ? updatedTest : t);
    memoryCache.tests = updated;
    safeSet(STORAGE_KEYS.TESTS, updated);
    notifySubscribers('tests', updated);

    // Update in Firestore
    setDoc(doc(db, 'tests', updatedTest.id), cleanForFirestore(updatedTest), { merge: true })
      .catch(err => console.warn('Firestore updateTest warning:', err));

    this.logActivity(
      'Weekly Test Updated',
      `Updated test: "${updatedTest.testTitle}"`,
      'test',
      user,
      role
    );
    return updatedTest;
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

  subscribeSettings(callback: (settings: AcademySettings) => void): () => void {
    subscribers.settings.add(callback);
    callback(this.getSettings());
    return () => subscribers.settings.delete(callback);
  },

  subscribeAll(callback: (event: { type: string; data: any }) => void): () => void {
    subscribers.all.add(callback);
    return () => subscribers.all.delete(callback);
  },

  // Attendance Change Approval System
  getAttendanceRequests(): AttendanceRequest[] {
    initStorage();
    return memoryCache.attendanceRequests;
  },

  subscribeAttendanceRequests(callback: (requests: AttendanceRequest[]) => void): () => void {
    subscribers.attendanceRequests.add(callback);
    callback(this.getAttendanceRequests());
    return () => subscribers.attendanceRequests.delete(callback);
  },

  createAttendanceRequest(data: Omit<AttendanceRequest, 'id' | 'status' | 'createdAt'>): AttendanceRequest {
    initStorage();
    const newRequest: AttendanceRequest = {
      ...data,
      id: `att_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const updated = [newRequest, ...memoryCache.attendanceRequests];
    memoryCache.attendanceRequests = updated;
    safeSet(STORAGE_KEYS.ATTENDANCE_REQUESTS, updated);
    notifySubscribers('attendanceRequests', updated);

    // Save to Firestore
    setDoc(doc(db, 'attendance_requests', newRequest.id), cleanForFirestore(newRequest))
      .catch(err => console.warn('Firestore attendance_requests write warning:', err));

    this.logActivity(
      'Attendance Approval Requested',
      `${newRequest.teacherName} requested to change ${newRequest.studentName}'s attendance on ${newRequest.date} from ${newRequest.previousStatus} to ${newRequest.requestedStatus}`,
      'attendance',
      newRequest.teacherName,
      'teacher'
    );

    return newRequest;
  },

  async approveAttendanceRequest(requestId: string, adminUser: string = 'Admin'): Promise<boolean> {
    initStorage();
    const req = memoryCache.attendanceRequests.find(r => r.id === requestId);
    if (!req) return false;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    // 1. Update the request status
    const updatedRequest: AttendanceRequest = {
      ...req,
      status: 'Approved',
      reviewedBy: adminUser,
      reviewedAt: now.toISOString()
    };

    const updatedList = memoryCache.attendanceRequests.map(r => r.id === requestId ? updatedRequest : r);
    memoryCache.attendanceRequests = updatedList;
    safeSet(STORAGE_KEYS.ATTENDANCE_REQUESTS, updatedList);
    notifySubscribers('attendanceRequests', updatedList);

    // 2. Update the actual attendance record in memory & Firestore
    const docId = `att_${req.studentId}_${req.date}`;
    const newRecord: AttendanceRecord = {
      id: docId,
      studentId: req.studentId,
      studentRoll: req.studentRoll,
      studentName: req.studentName,
      batch: req.batch as any,
      studentClass: req.studentClass,
      timing: req.timing,
      date: req.date,
      time: timeStr,
      timestamp: `${req.date} ${timeStr}`,
      status: req.requestedStatus,
      source: 'Manual',
      remarks: `Status changed to ${req.requestedStatus} upon Admin approval by ${adminUser}`
    };

    const filtered = memoryCache.attendance.filter(a => a.id !== docId && !(a.studentId === req.studentId && a.date === req.date));
    const updatedAttendance = [newRecord, ...filtered];
    memoryCache.attendance = updatedAttendance;
    safeSet(STORAGE_KEYS.ATTENDANCE, updatedAttendance);
    notifySubscribers('attendance', updatedAttendance);

    // Sync changes to Firestore
    try {
      await setDoc(doc(db, 'attendance_requests', requestId), cleanForFirestore(updatedRequest), { merge: true });
      await setDoc(doc(db, 'attendance', docId), cleanForFirestore(newRecord), { merge: true });
    } catch (e) {
      console.warn('approveAttendanceRequest Firestore sync warning:', e);
    }

    this.logActivity(
      'Attendance Request Approved',
      `Admin approved status change for ${req.studentName} (${req.date}): ${req.previousStatus} ➔ ${req.requestedStatus}`,
      'attendance',
      adminUser,
      'admin'
    );

    return true;
  },

  async rejectAttendanceRequest(requestId: string, adminUser: string = 'Admin'): Promise<boolean> {
    initStorage();
    const req = memoryCache.attendanceRequests.find(r => r.id === requestId);
    if (!req) return false;

    const updatedRequest: AttendanceRequest = {
      ...req,
      status: 'Rejected',
      reviewedBy: adminUser,
      reviewedAt: new Date().toISOString()
    };

    const updatedList = memoryCache.attendanceRequests.map(r => r.id === requestId ? updatedRequest : r);
    memoryCache.attendanceRequests = updatedList;
    safeSet(STORAGE_KEYS.ATTENDANCE_REQUESTS, updatedList);
    notifySubscribers('attendanceRequests', updatedList);

    try {
      await setDoc(doc(db, 'attendance_requests', requestId), cleanForFirestore(updatedRequest), { merge: true });
    } catch (e) {
      console.warn('rejectAttendanceRequest Firestore warning:', e);
    }

    this.logActivity(
      'Attendance Request Rejected',
      `Admin rejected status change for ${req.studentName} (${req.date}) to ${req.requestedStatus}`,
      'attendance',
      adminUser,
      'admin'
    );

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

    // 2. Create or update attendance record for today as "Present"
    const docId = `att_${student.id}_${dateStr}`;
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
      status: 'Present',
      source: 'Device',
      deviceId: sn,
      remarks: `Biometric scan at ${timeStr} verified via ZKTeco K40 device (${sn})`
    };

    // Update in memory cache and local storage
    const existingAttendance = this.getAttendance();
    const filtered = existingAttendance.filter(a => a.id !== docId);
    const updatedAttendance = [newRecord, ...filtered];
    memoryCache.attendance = updatedAttendance;
    safeSet(STORAGE_KEYS.ATTENDANCE, updatedAttendance);
    notifySubscribers('attendance', updatedAttendance);

    // Save directly to Firestore attendance collection
    try {
      setDoc(doc(db, 'attendance', docId), cleanForFirestore(newRecord), { merge: true })
        .catch(err => console.warn('Firestore ZKTeco attendance sync warning:', err));
    } catch (e) {
      console.warn('Firestore write warning:', e);
    }

    // 3. Student Registration & Verification Flow:
    // If the student was 'Pending Verification', mark them 'Active' now that fingerprint is verified!
    let updatedStudent = student;
    if (student.status === 'Pending Verification' || !student.biometricEnrolled) {
      updatedStudent = {
        ...student,
        status: 'Active',
        biometricEnrolled: true,
        zkDeviceId: sn,
        verificationDate: dateStr,
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
      'ZKTeco K40 Punch',
      `Present: ${student.fullName} (${student.rollNumber}) punched at ${timeStr} via ZKTeco K40`,
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

    const timestamp = Date.now();
    const createdStudents: Student[] = newStudentsData.map((data, index) => {
      const pin = data.biometricPin || data.rollNumber.replace(/[^0-9]/g, '') || `${index + 1}`;
      return {
        ...data,
        id: `std_${timestamp}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        status: data.status || 'Pending Verification',
        deviceSyncStatus: 'Pending',
        enrollRequested: false,
        enrollRequestedAt: undefined,
        biometricEnrolled: false,
        biometricPin: pin,
        enrollmentDate: data.enrollmentDate || new Date().toISOString().split('T')[0]
      };
    });

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
    } catch (e) {
      console.warn('Firestore importStudentsBatch warning:', e);
    }

    this.logActivity(
      'Bulk Student Import',
      `Imported ${createdStudents.length} candidates from Excel sheet. Biometric enrollment initialized.`,
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
      await setDoc(doc(db, 'settings', 'zkteco_device'), cleanForFirestore(updated), { merge: true });
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
      `Updated ZKTeco Device IP to ${updated.ip}:${updated.port}`,
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
   * Immediately records attendance to Firestore with source: 'Device' and status: 'Present'.
   * Instantly turns the student's fingerprint icon from Red to Green!
   */
  async simulateFingerprintPunch(
    studentRollOrId: string,
    customDate?: string,
    customTime?: string
  ): Promise<{ success: boolean; student?: Student; record?: AttendanceRecord; error?: string }> {
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
      status: 'Present',
      source: 'Device',
      deviceId: 'ZKTeco-K40-Virtual',
      remarks: `Simulated fingerprint punch via ZKTeco Virtual Device at ${timeStr}`
    };

    // Update in memory cache and local storage immediately
    const filteredAttendance = memoryCache.attendance.filter(a => a.id !== docId);
    const updatedAttendance = [newRecord, ...filteredAttendance];
    memoryCache.attendance = updatedAttendance;
    safeSet(STORAGE_KEYS.ATTENDANCE, updatedAttendance);
    notifySubscribers('attendance', updatedAttendance);

    // Save directly to Firestore attendance collection
    try {
      await setDoc(doc(db, 'attendance', docId), cleanForFirestore(newRecord), { merge: true });
    } catch (e) {
      console.warn('Firestore attendance simulate write warning:', e);
    }

    // Activate/Enroll student if pending
    let updatedStudent = student;
    if (student.status === 'Pending Verification' || !student.biometricEnrolled || student.deviceSyncStatus === 'Pending') {
      updatedStudent = {
        ...student,
        status: 'Active',
        biometricEnrolled: true,
        deviceSyncStatus: 'Enrolled',
        enrollRequested: false,
        zkDeviceId: 'ZKTeco-K40-Virtual',
        verificationDate: dateStr
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
    }

    this.logActivity(
      'Simulate Device Punch',
      `Present: ${student.fullName} (${student.rollNumber}) punched at ${timeStr} via ZKTeco Virtual Device`,
      'attendance',
      'Device Simulator',
      'admin'
    );

    // Also trigger backend endpoint for sync log
    try {
      fetch('/api/zkteco/simulate-punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: student.rollNumber,
          userId: student.biometricPin || student.rollNumber.replace(/[^0-9]/g, '') || '1',
          sn: 'K40-ADMS-01'
        })
      }).catch(() => {});
    } catch {}

    return {
      success: true,
      student: updatedStudent,
      record: newRecord
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
    const batch = (req.batch || student?.batch || (studentClass.includes('Evening') ? 'Batch C (Evening 18:00 - 20:00)' : 'Batch A (Morning 09:00 - 11:00)')) as StudentBatch;
    const timing = student?.timing || (batch.includes('Evening') ? 'Evening' : 'Morning');

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

  isAttendanceDayAllowed(dateString?: string): { isAllowed: boolean; dayName: string; isSunday: boolean } {
    initStorage();
    const targetDate = dateString ? new Date(dateString + 'T00:00:00') : new Date();
    const dayIndex = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayKey = daysMap[dayIndex];
    const schedule = this.getAttendanceScheduleSettings();

    // 1. Check specific date override if set
    if (dateString && schedule.specificDateOverrides && schedule.specificDateOverrides[dateString] !== undefined) {
      return {
        isAllowed: schedule.specificDateOverrides[dateString],
        dayName: dayKey.charAt(0).toUpperCase() + dayKey.slice(1),
        isSunday: dayIndex === 0
      };
    }

    // 2. Check general day of week toggle
    const isAllowed = Boolean(schedule[dayKey]);
    return {
      isAllowed,
      dayName: dayKey.charAt(0).toUpperCase() + dayKey.slice(1),
      isSunday: dayIndex === 0
    };
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

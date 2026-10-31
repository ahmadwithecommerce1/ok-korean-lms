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
  ZKTecoDeviceConfig
} from '../types';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  writeBatch 
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

const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std_01',
    rollNumber: 'OK-2025-001',
    fullName: 'Ali Hassan',
    koreanName: '알리 하산',
    fatherName: 'Hassan Mahmood',
    contactNumber: '+92 301 5550192',
    parentWhatsApp: '+92 300 1234567',
    email: 'ali.hassan@example.com',
    level: 'Level 1 - Beginner (TOPIK I)',
    batch: 'Batch A (Morning 09:00 - 11:00)',
    studentClass: 'Class 1',
    timing: 'Morning',
    status: 'Active',
    enrollmentDate: '2026-08-01',
    biometricEnrolled: true,
    deviceSyncStatus: 'Enrolled',
    enrollRequested: false,
    notes: 'Excels in Hangul pronunciation and basic vocabulary.'
  },
  {
    id: 'std_02',
    rollNumber: 'OK-2025-002',
    fullName: 'Sara Fatima',
    koreanName: '사라 파티마',
    fatherName: 'Muhammad Tariq',
    contactNumber: '+92 302 4441299',
    parentWhatsApp: '+92 302 9998877',
    email: 'sara.fatima@example.com',
    level: 'Level 2 - Elementary (TOPIK I)',
    batch: 'Batch A (Morning 09:00 - 11:00)',
    studentClass: 'Class 2',
    timing: 'Morning',
    status: 'Active',
    enrollmentDate: '2026-08-10',
    biometricEnrolled: true,
    deviceSyncStatus: 'Enrolled',
    enrollRequested: false,
    notes: 'Aiming for TOPIK Level 2 certification.'
  },
  {
    id: 'std_03',
    rollNumber: 'OK-2025-003',
    fullName: 'Zain Ul Abideen',
    koreanName: '자인 울 아비딘',
    fatherName: 'Abideen Shah',
    contactNumber: '+92 305 7776655',
    parentWhatsApp: '+92 305 8881122',
    email: 'zain.abideen@example.com',
    level: 'Level 3 - Intermediate (TOPIK II)',
    batch: 'Batch B (Afternoon 14:00 - 16:00)',
    studentClass: 'Class 1',
    timing: 'Evening',
    status: 'Active',
    enrollmentDate: '2026-07-15',
    biometricEnrolled: true,
    deviceSyncStatus: 'Enrolled',
    enrollRequested: false,
    notes: 'Prepares for EPS-TOPIK employment visa exam.'
  },
  {
    id: 'std_04',
    rollNumber: 'OK-2025-004',
    fullName: 'Hamza Bilal',
    koreanName: '함자 빌랄',
    fatherName: 'Bilal Ahmed',
    contactNumber: '+92 311 2223344',
    parentWhatsApp: '+92 311 5556677',
    email: 'hamza.bilal@example.com',
    level: 'Level 1 - Beginner (TOPIK I)',
    batch: 'Batch A (Morning 09:00 - 11:00)',
    studentClass: 'Class 3',
    timing: 'Morning',
    status: 'Pending Verification',
    enrollmentDate: '2026-09-01',
    biometricEnrolled: false,
    deviceSyncStatus: 'Pending',
    enrollRequested: true,
    enrollRequestedAt: '2026-10-27T08:30:00Z',
    notes: 'Awaiting fingerprint enrollment on K40 device.'
  },
  {
    id: 'std_05',
    rollNumber: 'OK-2025-005',
    fullName: 'Ayesha Noor',
    koreanName: '아예샤 누르',
    fatherName: 'Noor Alam',
    contactNumber: '+92 333 9991122',
    parentWhatsApp: '+92 333 4443322',
    email: 'ayesha.noor@example.com',
    level: 'Level 2 - Elementary (TOPIK I)',
    batch: 'Batch B (Afternoon 14:00 - 16:00)',
    studentClass: 'Class 2',
    timing: 'Evening',
    status: 'Active',
    enrollmentDate: '2026-08-20',
    biometricEnrolled: true,
    deviceSyncStatus: 'Enrolled',
    enrollRequested: false,
    notes: 'Excellent grammar retention and test consistency.'
  },
  {
    id: 'std_06',
    rollNumber: 'OK-2025-006',
    fullName: 'Usman Ghani',
    koreanName: '우스만 가니',
    fatherName: 'Ghani Rahman',
    contactNumber: '+92 345 8887711',
    parentWhatsApp: '+92 345 1112233',
    email: 'usman.ghani@example.com',
    level: 'Level 4 - Upper-Intermediate (TOPIK II)',
    batch: 'Batch C (Evening 18:00 - 20:00)',
    studentClass: 'Class 4',
    timing: 'Evening',
    status: 'Active',
    enrollmentDate: '2026-06-10',
    biometricEnrolled: true,
    deviceSyncStatus: 'Enrolled',
    enrollRequested: false,
    notes: 'Working professional taking evening classes for GKS scholarship.'
  },
  {
    id: 'std_07',
    rollNumber: 'OK-2025-007',
    fullName: 'Khadija Rehman',
    koreanName: '카디자 레만',
    fatherName: 'Abdul Rehman',
    contactNumber: '+92 321 6665544',
    parentWhatsApp: '+92 321 8883344',
    email: 'khadija.rehman@example.com',
    level: 'Level 1 - Beginner (TOPIK I)',
    batch: 'Batch D (Weekend Intensive)',
    studentClass: 'Class 1',
    timing: 'Morning + Evening (Both)',
    status: 'On Leave',
    enrollmentDate: '2026-08-25',
    biometricEnrolled: false,
    deviceSyncStatus: 'Pending',
    enrollRequested: false,
    notes: 'Medical leave approved until next weekend.'
  }
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att_01', studentId: 'std_01', studentRoll: 'OK-2025-001', studentName: 'Ali Hassan', batch: 'Batch A (Morning 09:00 - 11:00)', date: '2026-10-24', time: '09:05:12', timestamp: '2026-10-24 09:05:12', status: 'Present', source: 'Device' },
  { id: 'att_02', studentId: 'std_02', studentRoll: 'OK-2025-002', studentName: 'Sara Fatima', batch: 'Batch A (Morning 09:00 - 11:00)', date: '2026-10-24', time: '09:08:45', timestamp: '2026-10-24 09:08:45', status: 'Present', source: 'Device' },
  { id: 'att_03', studentId: 'std_04', studentRoll: 'OK-2025-004', studentName: 'Hamza Bilal', batch: 'Batch A (Morning 09:00 - 11:00)', date: '2026-10-24', time: '09:12:00', timestamp: '2026-10-24 09:12:00', status: 'Present', source: 'Manual' },
  { id: 'att_04', studentId: 'std_03', studentRoll: 'OK-2025-003', studentName: 'Zain Ul Abideen', batch: 'Batch B (Afternoon 14:00 - 16:00)', date: '2026-10-24', time: '14:02:18', timestamp: '2026-10-24 14:02:18', status: 'Present', source: 'Device' },
  { id: 'att_05', studentId: 'std_05', studentRoll: 'OK-2025-005', studentName: 'Ayesha Noor', batch: 'Batch B (Afternoon 14:00 - 16:00)', date: '2026-10-24', time: '14:25:00', timestamp: '2026-10-24 14:25:00', status: 'Late', source: 'Manual' },
  { id: 'att_06', studentId: 'std_06', studentRoll: 'OK-2025-006', studentName: 'Usman Ghani', batch: 'Batch C (Evening 18:00 - 20:00)', date: '2026-10-24', time: '18:01:50', timestamp: '2026-10-24 18:01:50', status: 'Present', source: 'Device' },
  { id: 'att_07', studentId: 'std_07', studentRoll: 'OK-2025-007', studentName: 'Khadija Rehman', batch: 'Batch D (Weekend Intensive)', date: '2026-10-24', time: '09:00:00', timestamp: '2026-10-24 09:00:00', status: 'Leave', source: 'Manual' },
  { id: 'att_10', studentId: 'std_01', studentRoll: 'OK-2025-001', studentName: 'Ali Hassan', batch: 'Batch A (Morning 09:00 - 11:00)', date: '2026-10-23', time: '09:04:10', timestamp: '2026-10-23 09:04:10', status: 'Present', source: 'Device' },
  { id: 'att_11', studentId: 'std_02', studentRoll: 'OK-2025-002', studentName: 'Sara Fatima', batch: 'Batch A (Morning 09:00 - 11:00)', date: '2026-10-23', time: '09:07:30', timestamp: '2026-10-23 09:07:30', status: 'Present', source: 'Device' },
  { id: 'att_12', studentId: 'std_04', studentRoll: 'OK-2025-004', studentName: 'Hamza Bilal', batch: 'Batch A (Morning 09:00 - 11:00)', date: '2026-10-23', time: '09:00:00', timestamp: '2026-10-23 09:00:00', status: 'Absent', source: 'Manual' },
  { id: 'att_13', studentId: 'std_03', studentRoll: 'OK-2025-003', studentName: 'Zain Ul Abideen', batch: 'Batch B (Afternoon 14:00 - 16:00)', date: '2026-10-23', time: '14:01:20', timestamp: '2026-10-23 14:01:20', status: 'Present', source: 'Device' },
  { id: 'att_14', studentId: 'std_05', studentRoll: 'OK-2025-005', studentName: 'Ayesha Noor', batch: 'Batch B (Afternoon 14:00 - 16:00)', date: '2026-10-23', time: '14:04:11', timestamp: '2026-10-23 14:04:11', status: 'Present', source: 'Device' },
];

export const DEFAULT_SUBJECTS_CONFIG: SubjectConfig[] = [
  { key: 'vocabulary', label: 'Vocabulary', shortLabel: 'Vocab', enabled: true, maxMarks: 20 },
  { key: 'grammar', label: 'Grammar', shortLabel: 'Grammar', enabled: true, maxMarks: 20 },
  { key: 'reading', label: 'Reading', shortLabel: 'Reading', enabled: true, maxMarks: 20 },
  { key: 'sentences', label: 'Sentence Construction', shortLabel: 'Sentences', enabled: true, maxMarks: 20 },
  { key: 'listeningSpeaking', label: 'Speaking / Listening', shortLabel: 'Spk/List', enabled: true, maxMarks: 20 },
  { key: 'mcqs', label: 'Multiple Choice Questions (MCQs)', shortLabel: 'MCQs', enabled: true, maxMarks: 20 },
];

const INITIAL_TESTS: WeeklyTest[] = [
  {
    id: 'test_01',
    testTitle: 'Weekly Assessment 6 - Hangul Honorifics, MCQs & Verb Particles',
    date: '2026-10-22',
    month: 'October 2026',
    batch: 'Batch A (Morning 09:00 - 11:00)',
    topicCovered: '존댓말 (Honorific endings), 은/는 vs 이/가 particles, conversation dialogues, and EPS-TOPIK MCQs.',
    totalMaxMarks: 100,
    subjectsConfig: [
      { key: 'vocabulary', label: 'Vocabulary', shortLabel: 'Vocab', enabled: true, maxMarks: 20 },
      { key: 'grammar', label: 'Grammar', shortLabel: 'Grammar', enabled: true, maxMarks: 20 },
      { key: 'reading', label: 'Reading', shortLabel: 'Reading', enabled: true, maxMarks: 20 },
      { key: 'listeningSpeaking', label: 'Speaking / Listening', shortLabel: 'Spk/List', enabled: true, maxMarks: 20 },
      { key: 'mcqs', label: 'Multiple Choice Questions (MCQs)', shortLabel: 'MCQs', enabled: true, maxMarks: 20 },
    ],
    scores: [
      { studentId: 'std_02', studentRoll: 'OK-2025-002', studentName: 'Sara Fatima', vocabulary: 19, grammar: 19, reading: 19, listeningSpeaking: 19, mcqs: 19, totalScore: 95, maxPossibleScore: 100, percentage: 95, grade: 'A+' },
      { studentId: 'std_01', studentRoll: 'OK-2025-001', studentName: 'Ali Hassan', vocabulary: 18, grammar: 18, reading: 17, listeningSpeaking: 17, mcqs: 18, totalScore: 88, maxPossibleScore: 100, percentage: 88, grade: 'A' },
      { studentId: 'std_04', studentRoll: 'OK-2025-004', studentName: 'Hamza Bilal', vocabulary: 15, grammar: 14, reading: 16, listeningSpeaking: 16, mcqs: 16, totalScore: 77, maxPossibleScore: 100, percentage: 77, grade: 'B' }
    ]
  },
  {
    id: 'test_02',
    testTitle: 'Weekly Assessment 5 - TOPIK II Sentence Connectors & MCQs',
    date: '2026-10-15',
    month: 'October 2026',
    batch: 'Batch B (Afternoon 14:00 - 16:00)',
    topicCovered: '연결어미: -(으)면서, -(으)려고, -기 때문에, and 25-point comprehensive MCQ section.',
    totalMaxMarks: 100,
    subjectsConfig: [
      { key: 'vocabulary', label: 'Vocabulary', shortLabel: 'Vocab', enabled: true, maxMarks: 25 },
      { key: 'grammar', label: 'Grammar', shortLabel: 'Grammar', enabled: true, maxMarks: 25 },
      { key: 'reading', label: 'Reading', shortLabel: 'Reading', enabled: true, maxMarks: 25 },
      { key: 'listeningSpeaking', label: 'Speaking / Listening', shortLabel: 'Spk/List', enabled: false, maxMarks: 0 },
      { key: 'mcqs', label: 'Multiple Choice Questions (MCQs)', shortLabel: 'MCQs', enabled: true, maxMarks: 25 },
    ],
    scores: [
      { studentId: 'std_05', studentRoll: 'OK-2025-005', studentName: 'Ayesha Noor', vocabulary: 24, grammar: 25, reading: 22, mcqs: 23, totalScore: 94, maxPossibleScore: 100, percentage: 94, grade: 'A+' },
      { studentId: 'std_03', studentRoll: 'OK-2025-003', studentName: 'Zain Ul Abideen', vocabulary: 21, grammar: 20, reading: 22, mcqs: 22, totalScore: 85, maxPossibleScore: 100, percentage: 85, grade: 'A' }
    ]
  },
  {
    id: 'test_03',
    testTitle: 'Weekly Assessment 4 - Essential Daily Dialogue & MCQs',
    date: '2026-10-08',
    month: 'October 2026',
    batch: 'Batch A (Morning 09:00 - 11:00)',
    topicCovered: 'Daily routine verbs, past tense conjugations, numbers, and multiple choice quiz.',
    totalMaxMarks: 100,
    subjectsConfig: [
      { key: 'vocabulary', label: 'Vocabulary', shortLabel: 'Vocab', enabled: true, maxMarks: 20 },
      { key: 'grammar', label: 'Grammar', shortLabel: 'Grammar', enabled: true, maxMarks: 20 },
      { key: 'reading', label: 'Reading', shortLabel: 'Reading', enabled: true, maxMarks: 20 },
      { key: 'listeningSpeaking', label: 'Speaking / Listening', shortLabel: 'Spk/List', enabled: true, maxMarks: 20 },
      { key: 'mcqs', label: 'Multiple Choice Questions (MCQs)', shortLabel: 'MCQs', enabled: true, maxMarks: 20 },
    ],
    scores: [
      { studentId: 'std_02', studentRoll: 'OK-2025-002', studentName: 'Sara Fatima', vocabulary: 19, grammar: 19, reading: 19, listeningSpeaking: 19, mcqs: 19, totalScore: 95, maxPossibleScore: 100, percentage: 95, grade: 'A+' },
      { studentId: 'std_01', studentRoll: 'OK-2025-001', studentName: 'Ali Hassan', vocabulary: 18, grammar: 18, reading: 17, listeningSpeaking: 17, mcqs: 18, totalScore: 88, maxPossibleScore: 100, percentage: 88, grade: 'A' },
      { studentId: 'std_04', studentRoll: 'OK-2025-004', studentName: 'Hamza Bilal', vocabulary: 16, grammar: 15, reading: 15, listeningSpeaking: 16, mcqs: 16, totalScore: 78, maxPossibleScore: 100, percentage: 78, grade: 'B' }
    ]
  }
];

// Fee records in Pakistani Rupees (PKR)
const INITIAL_FEES: FeeRecord[] = [
  {
    id: 'fee_01',
    studentId: 'std_01',
    studentRoll: 'OK-2025-001',
    studentName: 'Ali Hassan',
    batch: 'Batch A (Morning 09:00 - 11:00)',
    month: 'October 2026',
    totalAmount: 25000,
    paidAmount: 25000,
    pendingAmount: 0,
    dueDate: '2026-10-05',
    lastPaymentDate: '2026-10-03',
    paymentMethod: 'Bank Transfer',
    status: 'Paid',
    receiptNumber: 'PKR-REC-1011',
    notes: 'Paid in full on time.'
  },
  {
    id: 'fee_02',
    studentId: 'std_02',
    studentRoll: 'OK-2025-002',
    studentName: 'Sara Fatima',
    batch: 'Batch A (Morning 09:00 - 11:00)',
    month: 'October 2026',
    totalAmount: 25000,
    paidAmount: 25000,
    pendingAmount: 0,
    dueDate: '2026-10-05',
    lastPaymentDate: '2026-10-04',
    paymentMethod: 'Cash',
    status: 'Paid',
    receiptNumber: 'PKR-REC-1012',
    notes: 'Received by front desk admin.'
  },
  {
    id: 'fee_03',
    studentId: 'std_03',
    studentRoll: 'OK-2025-003',
    studentName: 'Zain Ul Abideen',
    batch: 'Batch B (Afternoon 14:00 - 16:00)',
    month: 'October 2026',
    totalAmount: 30000,
    paidAmount: 18000,
    pendingAmount: 12000,
    dueDate: '2026-10-10',
    lastPaymentDate: '2026-10-08',
    paymentMethod: 'EasyPaisa / JazzCash',
    status: 'Partial',
    receiptNumber: 'PKR-REC-1015',
    notes: 'Agreed remaining Rs. 12,000 to be cleared by Oct 28.'
  },
  {
    id: 'fee_04',
    studentId: 'std_04',
    studentRoll: 'OK-2025-004',
    studentName: 'Hamza Bilal',
    batch: 'Batch A (Morning 09:00 - 11:00)',
    month: 'October 2026',
    totalAmount: 25000,
    paidAmount: 0,
    pendingAmount: 25000,
    dueDate: '2026-10-05',
    status: 'Pending',
    notes: 'First reminder sent via WhatsApp.'
  },
  {
    id: 'fee_05',
    studentId: 'std_05',
    studentRoll: 'OK-2025-005',
    studentName: 'Ayesha Noor',
    batch: 'Batch B (Afternoon 14:00 - 16:00)',
    month: 'October 2026',
    totalAmount: 30000,
    paidAmount: 30000,
    pendingAmount: 0,
    dueDate: '2026-10-10',
    lastPaymentDate: '2026-10-06',
    paymentMethod: 'Bank Transfer',
    status: 'Paid',
    receiptNumber: 'PKR-REC-1018',
    notes: 'Bank transfer confirmed.'
  },
  {
    id: 'fee_06',
    studentId: 'std_06',
    studentRoll: 'OK-2025-006',
    studentName: 'Usman Ghani',
    batch: 'Batch C (Evening 18:00 - 20:00)',
    month: 'October 2026',
    totalAmount: 35000,
    paidAmount: 35000,
    pendingAmount: 0,
    dueDate: '2026-10-05',
    lastPaymentDate: '2026-10-02',
    paymentMethod: 'Bank Transfer',
    status: 'Paid',
    receiptNumber: 'PKR-REC-1008',
    notes: 'Advance corporate sponsorship.'
  },
  {
    id: 'fee_07',
    studentId: 'std_07',
    studentRoll: 'OK-2025-007',
    studentName: 'Khadija Rehman',
    batch: 'Batch D (Weekend Intensive)',
    month: 'October 2026',
    totalAmount: 28000,
    paidAmount: 0,
    pendingAmount: 28000,
    dueDate: '2026-10-15',
    status: 'Pending',
    notes: 'Student requested extension due to sick leave.'
  }
];

const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log_01',
    timestamp: '2026-10-24 10:45 AM',
    user: 'Admin',
    role: 'admin',
    action: 'Attendance Saved',
    detail: 'Attendance marked for Batch A (Morning 09:00 - 11:00) with 3 Present.',
    category: 'attendance'
  },
  {
    id: 'log_02',
    timestamp: '2026-10-24 09:30 AM',
    user: 'Admin',
    role: 'admin',
    action: 'Fee Payment Recorded',
    detail: 'Fee payment of Rs. 25,000 PKR recorded for Ali Hassan (OK-2025-001).',
    category: 'fee'
  },
  {
    id: 'log_03',
    timestamp: '2026-10-22 04:15 PM',
    user: 'Teacher Kim',
    role: 'teacher',
    action: 'Weekly Test Recorded',
    detail: 'Assessment 6 results entered for 3 students. Top score: Sara Fatima (95%).',
    category: 'test'
  },
  {
    id: 'log_04',
    timestamp: '2026-10-20 11:00 AM',
    user: 'Admin',
    role: 'admin',
    action: 'Teacher Access Configured',
    detail: 'Granted attendance, tests, reports, and whatsapp access to Teacher Kim Ji-won.',
    category: 'teacher'
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
};

// Migrate old principal name if needed
if (!memoryCache.settings.principalName || memoryCache.settings.principalName.includes('Ahmad Malik')) {
  memoryCache.settings.principalName = 'Farooq Shahzad';
  safeSet(STORAGE_KEYS.SETTINGS, memoryCache.settings);
}

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
    const list: Student[] = snapshot.docs.map(docSnap => ({
      ...docSnap.data() as Student,
      id: docSnap.id
    }));
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
}

// Auto-boot live sync immediately upon module evaluation
initStorage();

export const StorageService = {
  // Students
  getStudents(): Student[] {
    initStorage();
    return memoryCache.students;
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
  }
};

export type UserRole = 'admin' | 'teacher';

export type TabId = 
  | 'dashboard' 
  | 'students' 
  | 'attendance' 
  | 'tests' 
  | 'fees' 
  | 'reports' 
  | 'whatsapp' 
  | 'settings';

export type StudentClass = 
  | 'Class 1' 
  | 'Class 2' 
  | 'Class 3' 
  | 'Class 4' 
  | 'Class 5' 
  | 'Class 6' 
  | 'Class 7';

export type ClassTiming = 
  | 'Morning' 
  | 'Evening' 
  | 'Morning + Evening (Both)';

export interface TeacherAccount {
  id: string;
  name: string;
  username: string;
  password: string;
  email?: string;
  phone?: string;
  assignedBatch?: string;
  assignedClasses?: string[]; // e.g. ['Morning Class 1', 'Morning Class 2', 'Morning Class 3']
  status: 'Active' | 'Suspended';
  allowedMenus: TabId[];
  createdAt: string;
  failedAttempts?: number;
  blockedAt?: string;
}

export interface UserSession {
  username: string;
  name: string;
  role: UserRole;
  avatar?: string;
  loginTime: string;
  allowedMenus?: TabId[];
  assignedBatch?: string;
  assignedClasses?: string[];
}

export type StudentLevel = 
  | 'Level 1 - Beginner (TOPIK I)'
  | 'Level 2 - Elementary (TOPIK I)'
  | 'Level 3 - Intermediate (TOPIK II)'
  | 'Level 4 - Upper-Intermediate (TOPIK II)'
  | 'Level 5 - Advanced (TOPIK II)';

export type StudentBatch = 
  | 'Batch A (Morning 09:00 - 11:00)'
  | 'Batch B (Afternoon 14:00 - 16:00)'
  | 'Batch C (Evening 18:00 - 20:00)'
  | 'Batch D (Weekend Intensive)';

export type StudentStatus = 'Active' | 'Pending Verification' | 'On Leave' | 'Graduated' | 'Inactive';

export interface Student {
  id: string;
  rollNumber: string;
  fullName: string;
  koreanName?: string;
  fatherName: string;
  contactNumber: string;
  parentWhatsApp: string;
  email?: string;
  level: StudentLevel;
  batch: StudentBatch;
  studentClass?: StudentClass | string;
  timing?: ClassTiming | string;
  status: StudentStatus;
  enrollmentDate: string;
  notes?: string;
  biometricEnrolled?: boolean;
  biometricPin?: string;
  zkDeviceId?: string;
  verificationDate?: string;
  deviceSyncStatus?: 'Pending' | 'Enrolled' | 'Failed';
  enrollRequested?: boolean;
  enrollRequestedAt?: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Late';
export type AttendanceSource = 'Manual' | 'Device';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  batch: StudentBatch;
  studentClass?: string;
  timing?: string;
  teacherId?: string;
  teacherName?: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // YYYY-MM-DD HH:mm:ss or ISO
  status: AttendanceStatus;
  time?: string; // HH:mm:ss
  remarks?: string;
  source: AttendanceSource;
  deviceId?: string;
}

export interface ZKTecoDeviceConfig {
  ip: string;
  port: number;
  sn: string;
  status: 'Connected' | 'Disconnected';
  lastSeen?: string;
  firmware?: string;
  pushVersion?: string;
  autoSync?: boolean;
}

export interface ZKTecoDeviceStatus {
  sn: string;
  ip?: string;
  port?: number;
  firmware?: string;
  lastHeartbeat: string;
  totalPunches: number;
  status: 'Connected' | 'Disconnected' | 'online' | 'offline';
  pendingCommandsCount: number;
}

export interface ZKTecoPunchLog {
  id: string;
  userId: string;
  studentId?: string;
  studentRoll?: string;
  studentName?: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  date: string;
  time: string;
  status: 'Present';
  rawPayload: string;
  deviceId?: string;
  syncedToFirestore: boolean;
}

export interface ZKTecoEnrollRequest {
  id: string;
  studentId: string;
  rollNumber: string;
  fullName: string;
  pin: string;
  status: 'Pending Verification' | 'Active' | 'Enrolled' | 'Failed';
  createdAt: string;
  enrolledAt?: string;
}

export type SubjectKey = 'vocabulary' | 'grammar' | 'reading' | 'sentences' | 'listeningSpeaking' | 'mcqs';

export interface SubjectConfig {
  key: SubjectKey;
  label: string;
  shortLabel: string;
  enabled: boolean;
  maxMarks: number;
}

export interface TestScore {
  studentId: string;
  studentRoll: string;
  studentName: string;
  vocabulary?: number;
  grammar?: number;
  reading?: number;
  sentences?: number;
  listeningSpeaking?: number;
  mcqs?: number;
  totalScore: number; // Total obtained marks
  maxPossibleScore?: number; // Total maximum marks
  percentage: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface WeeklyTest {
  id: string;
  testTitle: string;
  date: string; // YYYY-MM-DD
  month: string; // e.g. "October 2026"
  batch: StudentBatch;
  topicCovered: string;
  subjectsConfig?: SubjectConfig[];
  totalMaxMarks?: number;
  scores: TestScore[];
}

export type FeeStatus = 'Paid' | 'Pending' | 'Partial';

export interface FeeRecord {
  id: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  batch: StudentBatch;
  month: string; // e.g. "October 2026"
  totalAmount: number; // in PKR
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  lastPaymentDate?: string;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'EasyPaisa / JazzCash' | 'Card' | 'Online';
  status: FeeStatus;
  receiptNumber?: string;
  notes?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  detail: string;
  category: 'student' | 'attendance' | 'test' | 'fee' | 'system' | 'whatsapp' | 'teacher';
}

export interface AcademySettings {
  academyName: string;
  academyKoreanName: string;
  tagline: string;
  address: string;
  contactPhone: string;
  email: string;
  principalName: string;
  currency: string;
  currencySymbol: string;
  registrationNumber: string;
}

export type LanguageCode = 'en' | 'kr' | 'ur';

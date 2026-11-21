export type UserRole = 'admin' | 'teacher' | 'staff' | 'student';

export type TabId =
  | 'dashboard'
  | 'analytics-insights'
  | 'students'
  | 'admissions'
  | 'batch-classes'
  | 'academic-calendar'
  | 'teacher-monitor'
  | 'teacher-management'
  | 'attendance'
  | 'biometric'
  | 'tests'
  | 'courses-curriculum'
  | 'study-materials'
  | 'assignments-homework'
  | 'topik-preparation'
  | 'fees'
  | 'expense-management'
  | 'salary-payroll'
  | 'financial-reports'
  | 'whatsapp'
  | 'notifications-centre'
  | 'announcements'
  | 'email-communication'
  | 'reports'
  | 'user-roles-permissions'
  | 'activity-audit-logs'
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

export type TeacherEmploymentStatus = 'Full-Time' | 'Part-Time' | 'Contract' | 'On Leave';

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
  // Extended HR / Teacher Management fields
  roleType?: 'teacher' | 'staff';
  designation?: string;
  specialization?: string;
  baseSalary?: number;
  employmentStatus?: TeacherEmploymentStatus;
  joiningDate?: string;
  bankAccount?: string;
  notes?: string;
}

export interface StudentPortalAccount {
  id: string;
  studentId: string;
  studentName: string;
  koreanName?: string;
  rollNumber: string;
  username: string;
  email?: string;
  password: string;
  uid?: string;
  assignedBatch: string;
  studentClass?: string;
  timing?: string;
  enabled: boolean;
  status: 'Active' | 'Disabled';
  createdAt: string;
  updatedAt?: string;
}

export interface UserSession {
  teacherId?: string;
  studentId?: string;
  studentRoll?: string;
  studentClass?: string;
  timing?: string;
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

export type StudentBatch = string;

export type StudentStatus =
  | 'Active'
  | 'Pending Verification'
  | 'On Leave'
  | 'Graduated'
  | 'Inactive'
  | 'Stuck / Inactive';

export type StudentPunchStatus = 'Not Punched' | 'IN' | 'OUT' | 'Punched';

export interface Student {
  id: string;
  serialNumber?: number;
  formattedSerialNumber?: string;
  rollNumber: string;
  fullName: string;
  koreanName?: string;
  fatherName: string;
  contactNumber: string;
  parentWhatsApp: string;
  email?: string;
  level: StudentLevel;
  batch: StudentBatch;
  batchId?: string;
  batchCode?: string;
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
  lastPunchDate?: string;
  lastPunchTime?: string;
  lastPunchState?: 'in' | 'out' | 'single';
  punchStatus?: StudentPunchStatus;
  whatsappOptOut?: boolean;
  whatsappConsentUpdatedAt?: string;
  uid?: string;
  password?: string;
  personalEmail?: string;
  portalEmail?: string;
  portalPassword?: string;
  portalUid?: string;
  portalEnabled?: boolean;
  portalGrantedAt?: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Leave' | 'Late' | 'Neutral';
export type AttendanceSource = 'Manual' | 'Device';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentRoll: string;
  studentSerial?: string;
  studentName: string;
  batch: StudentBatch;
  batchId?: string;
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
  punchState?: 'in' | 'out' | 'single';
  checkInTime?: string;
  checkOutTime?: string;
  punchCount?: number;
}

export interface ZKTecoDeviceConfig {
  ip: string;
  port: number;
  sn: string;
  backendApiUrl?: string;
  status: 'Connected' | 'Disconnected';
  lastSeen?: string;
  firmware?: string;
  pushVersion?: string;
  autoSync?: boolean;
  inOutModeEnabled?: boolean;
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
  status: 'Present' | 'Late';
  punchState?: 'in' | 'out' | 'single';
  punchType?: 'IN' | 'OUT' | 'STANDARD';
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
  studentSerial?: string;
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
  remarks?: string;
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
  published?: boolean;
  publishedAt?: string;
  publishedBy?: string;
  resultRevision?: number;
}

export type FeeStatus = 'Paid' | 'Pending' | 'Partial';

export interface FeeRecord {
  id: string;
  studentId: string;
  studentRoll: string;
  studentSerial?: string;
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
  category: 'student' | 'attendance' | 'test' | 'fee' | 'system' | 'whatsapp' | 'teacher' | 'student_portal';
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

export interface AttendanceRequest {
  id: string;
  attendanceRecordId?: string;
  studentId: string;
  studentRoll: string;
  studentSerial?: string;
  studentName: string;
  studentClass?: string;
  timing?: string;
  batch: string;
  batchId?: string;
  date: string;
  previousStatus: AttendanceStatus;
  requestedStatus: AttendanceStatus;
  reason?: string;
  requestType?: string;
  teacherId: string;
  teacherName: string;
  timestamp: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  reviewedBy?: string;
  reviewedByAdminId?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface AttendanceChangeHistoryRecord {
  id: string;
  requestId?: string;
  studentId: string;
  studentRoll: string;
  studentSerial?: string;
  studentName: string;
  batch: string;
  batchId?: string;
  date: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  action: 'Requested' | 'Approved' | 'Rejected';
  reason?: string;
  teacherName: string;
  reviewedBy?: string;
  reviewedByAdminId?: string;
  timestamp: string;
}

export interface RollNumberSettings {
  prefix: string;
  academicYear: string;
  yearFormat?: 'YYYY' | 'YY';
  startingSerial: number;
  nextSerialNumber: number;
  digits: number;
  separator: string;
  resetAnnually?: boolean;
  lastResetYear?: string;
  autoGenerate: boolean;
  allowManualOverride: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SerialNumberSettings {
  prefix: string;
  startingSerial: number;
  nextSerialNumber: number;
  digits: number;
  separator: string;
  resetAnnually: boolean;
  lastResetYear?: string;
  autoGenerate: boolean;
  allowManualOverride: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface IdRegistryRecord {
  usedRollNumbers: string[];
  usedSerialNumbers: string[];
  usedSerialSeqs: number[];
  highestRollSeqByYear?: Record<string, number>;
  highestSerialSeq?: number;
  updatedAt?: string;
}

export interface SundayClassRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  className: string; // e.g. "Morning Class 1"
  batch?: string;
  date: string; // YYYY-MM-DD (Sunday)
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface StudentLeaveRequest {
  id: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  studentClass?: string;
  batch?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedByRole: UserRole;
  submittedByName: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface AppPushNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  targetRole: 'admin' | 'teacher' | 'all';
  targetTeacherId?: string;
  type: 
    | 'attendance_marked' 
    | 'attendance_change_request'
    | 'attendance_change_decision'
    | 'teacher_reminder' 
    | 'fee_due' 
    | 'sunday_request' 
    | 'sunday_approved' 
    | 'leave_request' 
    | 'test_alert';
  read: boolean;
  linkTab?: TabId;
}

export type AttendanceDayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface SpecificDateOverride {
  id: string; // e.g. `${date}_${targetClass}`
  date: string; // YYYY-MM-DD
  targetClass: string; // e.g. "ALL" | "Morning Class 1" | "Morning Class 2" | ...
  action: 'enable' | 'holiday';
  isAllowed: boolean;
  notes?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface AttendanceScheduleSettings {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  specificDateOverrides?: Record<string, boolean>; // e.g. "2026-11-08": true (legacy support)
  dateOverridesList?: SpecificDateOverride[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface WelcomeMessageSettings {
  enabled: boolean;
  message: string;
  template?: string;
  speed?: 'very_very_slow' | 'very_slow' | 'slow' | 'medium' | 'high' | 'fast' | 'normal' | 'ultra_slow' | 'glacial' | string;
  durationMinutes?: number; // 2 minutes
  updatedAt?: string;
  updatedBy?: string;
}

export type AdmissionRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface AdmissionRequest {
  id: string;
  fullName: string;
  koreanName?: string;
  fatherName: string;
  contactNumber: string;
  parentWhatsApp: string;
  email?: string;
  level: string;
  batch: string;
  batchId?: string;
  batchCode?: string;
  studentClass?: string;
  timing?: string;
  enrollmentDate?: string;
  address?: string;
  city?: string;
  cnic?: string;
  qualification?: string;
  notes?: string;
  source?: string;
  status: AdmissionRequestStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedRollNumber?: string;
  approvedSerialNumber?: string;
  approvedStudentId?: string;
  raw?: Record<string, any>;
}

export type WhatsAppDeliveryStatus =
  | 'Sent'
  | 'Pending'
  | 'Failed'
  | 'Not Configured'
  | 'Skipped (Opted Out)';

export type WhatsAppNotificationType = 'attendance' | 'test_result' | 'fee_reminder' | 'general';

export type EditedAttendancePolicy =
  | 'resend_updated'
  | 'notify_only_if_absent_or_late'
  | 'do_not_resend';

export interface WhatsAppAutomationConfig {
  autoSendOnAttendanceSave: boolean;
  editedAttendancePolicy: EditedAttendancePolicy;
  autoSendOnTestPublish: boolean;
  sendUpdatedTestResultNotification: boolean;
  useApprovedTemplates: boolean;
  defaultCountryCode: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface WhatsAppNotificationLog {
  id: string;
  uniqueKey: string;
  studentId: string;
  studentRoll: string;
  studentName: string;
  batch: string;
  studentClass?: string;
  timing?: string;
  parentWhatsApp: string;
  normalizedPhone: string;
  notificationType: WhatsAppNotificationType;
  messageContent: string;
  templateName?: string;
  templateParams?: string[];
  relatedRecordId: string;
  relatedDate: string;
  triggerSource:
    | 'auto_attendance'
    | 'auto_attendance_edit'
    | 'auto_test_publish'
    | 'auto_test_update'
    | 'manual_hub';
  isUpdatedNotification?: boolean;
  status: WhatsAppDeliveryStatus;
  retryCount: number;
  maxRetries: number;
  apiResponse?: {
    messageId?: string;
    statusCode?: number;
    provider?: string;
    mode?: 'template' | 'text';
    raw?: any;
  };
  errorDetails?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  triggeredBy?: string;
}

export interface WhatsAppServerConfigStatus {
  configured: boolean;
  provider: string;
  apiVersion: string;
  phoneNumberIdMasked: string | null;
  templatesConfigured: {
    attendance: boolean;
    test: boolean;
  };
  missingEnvVars: string[];
}

export type TeacherOnlineStatus = 'Online' | 'Active' | 'Away' | 'Inactive' | 'Offline';

export interface TeacherActivityRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherUsername?: string;
  assignedBatch?: string;
  status: TeacherOnlineStatus;
  loginTime: any; // Firestore Timestamp | string | Date
  logoutTime: any | null; // Firestore Timestamp | string | Date | null
  sessionDuration: string; // e.g. "2 hours 15 mins"
  totalSessionTime?: string; // Legacy compatibility mirror of sessionDuration
  lastActiveTabTime?: any; // Firestore Timestamp | string | Date
  date?: string; // YYYY-MM-DD
  lastActiveAt?: any;
}

export interface AttendanceRulesSettings {
  morningLateTime: string; // HH:mm e.g. "08:00"
  morningLateEnabled: boolean;
  eveningLateTime: string; // HH:mm e.g. "17:00"
  eveningLateEnabled: boolean;
  lateTime?: string; // legacy optional mirror
  updatedAt?: string;
  updatedBy?: string;
}

export type ExpenseCategory =
  | 'Rent & Utilities'
  | 'Staff & Faculty'
  | 'Study Materials & Printing'
  | 'Equipment & Biometric'
  | 'Marketing'
  | 'Maintenance'
  | 'Other';

export type PaymentMethodType =
  | 'Cash'
  | 'Bank Transfer'
  | 'EasyPaisa / JazzCash'
  | 'Card'
  | 'Online';

export interface ExpenseRecord {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number; // PKR
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethodType;
  vendor?: string;
  referenceNo?: string;
  description?: string;
  recordedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PayrollRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherUsername?: string;
  designation?: string;
  month: string; // e.g. "November 2026"
  monthKey: string; // e.g. "2026-11"
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  paidAmount: number;
  status: 'Paid' | 'Pending' | 'Partial';
  paymentDate?: string;
  paymentMethod?: PaymentMethodType;
  receiptNumber?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BatchRecord {
  id: string;
  name: string;
  code: string;
  level: StudentLevel | string;
  timing: ClassTiming | string;
  scheduleDays: string;
  startTime: string;
  endTime: string;
  classroom: string;
  capacity: number;
  teacherId?: string;
  teacherName?: string;
  status: 'Active' | 'Upcoming' | 'Completed' | 'Inactive';
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AcademicEventType =
  | 'Exam'
  | 'Holiday'
  | 'Class Schedule'
  | 'Announcement'
  | 'Workshop';

export interface AcademicEvent {
  id: string;
  title: string;
  type: AcademicEventType;
  date: string; // YYYY-MM-DD
  endDate?: string;
  startTime?: string;
  endTime?: string;
  targetBatch?: string;
  location?: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SyllabusWeekItem {
  week: number;
  topic: string;
  grammarPoints: string;
  vocabularyTarget: string;
}

export interface CourseRecord {
  id: string;
  title: string;
  code: string;
  level: StudentLevel | string;
  topikTrack: 'TOPIK I' | 'TOPIK II' | 'EPS-TOPIK' | 'General Korean';
  durationWeeks: number;
  totalHours: number;
  tuitionFee: number;
  instructorName?: string;
  description: string;
  syllabus: SyllabusWeekItem[];
  status: 'Active' | 'Draft' | 'Archived';
  createdAt: string;
  updatedAt?: string;
}

export type StudyMaterialCategory =
  | 'PDF Document'
  | 'Worksheet'
  | 'Vocabulary List'
  | 'Audio / Listening'
  | 'Slide Deck'
  | 'Grammar Guide';

export interface StudyMaterialRecord {
  id: string;
  title: string;
  category: StudyMaterialCategory;
  courseId?: string;
  courseTitle: string;
  level: string;
  batch?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  fileUrl?: string;
  description?: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AssignmentSubmissionStatus = 'Pending' | 'Submitted' | 'Late' | 'Graded';

export interface AssignmentSubmissionEntry {
  studentId: string;
  studentRoll: string;
  studentName: string;
  status: AssignmentSubmissionStatus;
  submittedAt?: string;
  marks?: number;
  remarks?: string;
}

export interface AssignmentRecord {
  id: string;
  title: string;
  description: string;
  courseLevel: string;
  targetType: 'Batch' | 'Student';
  targetBatch?: string;
  targetStudentId?: string;
  targetStudentName?: string;
  dueDate: string; // YYYY-MM-DD
  maxMarks: number;
  submissions: AssignmentSubmissionEntry[];
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TopikResource {
  id: string;
  topikLevel: 'TOPIK I' | 'TOPIK II';
  category: 'Vocabulary' | 'Grammar' | 'Reading Strategy' | 'Listening Strategy';
  koreanTerm: string;
  meaning: string;
  grammarPattern?: string;
  exampleSentence?: string;
  translation?: string;
  createdBy?: string;
  createdAt: string;
}

export interface TopikPracticeResult {
  studentId: string;
  studentRoll: string;
  studentName: string;
  score: number;
  maxScore: number;
  passed: boolean;
  date: string;
}

export interface TopikPracticeTest {
  id: string;
  title: string;
  topikLevel: 'TOPIK I' | 'TOPIK II';
  section: 'Reading' | 'Listening' | 'Writing' | 'Full Mock';
  date: string;
  durationMinutes: number;
  totalMarks: number;
  passingScore: number;
  questionsCount: number;
  results: TopikPracticeResult[];
  createdBy?: string;
  createdAt: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  message: string;
  priority: 'Normal' | 'Important' | 'Urgent';
  targetAudience: 'All Students' | 'Specific Batch' | 'Teachers Only' | 'Everyone';
  targetBatch?: string;
  status: 'Published' | 'Draft' | 'Archived';
  publishDate: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EmailRecipient {
  id?: string;
  name: string;
  email: string;
  roleLabel: string;
}

export interface EmailLogRecord {
  id: string;
  recipientType: 'Student' | 'Parent' | 'Teacher' | 'Custom';
  recipients: EmailRecipient[];
  subject: string;
  body: string;
  templateName?: string;
  status: 'Sent' | 'Failed' | 'Not Configured';
  provider?: string;
  messageId?: string;
  errorDetails?: string;
  sentBy?: string;
  createdAt: string;
}

export interface EmailServerConfigStatus {
  configured: boolean;
  provider: string;
  fromAddress: string | null;
  missingEnvVars: string[];
}

export interface RolePermissionMatrix {
  admin: TabId[];
  teacher: TabId[];
  staff: TabId[];
  updatedAt?: string;
  updatedBy?: string;
}

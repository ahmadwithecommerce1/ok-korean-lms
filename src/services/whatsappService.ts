import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  AttendanceRecord,
  FeeRecord,
  Student,
  TestScore,
  UserRole,
  WeeklyTest,
  WhatsAppAutomationConfig,
  WhatsAppNotificationLog,
  WhatsAppNotificationType,
  WhatsAppServerConfigStatus,
} from '../types';

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppAutomationConfig = {
  autoSendOnAttendanceSave: true,
  editedAttendancePolicy: 'resend_updated',
  autoSendOnTestPublish: true,
  sendUpdatedTestResultNotification: true,
  useApprovedTemplates: false,
  defaultCountryCode: '92',
};

const LOCAL_NOTIFS_KEY = 'ok_korean_whatsapp_notifications_v1';
const LOCAL_CONFIG_KEY = 'ok_korean_whatsapp_config_v1';

let cachedLogs: WhatsAppNotificationLog[] = (() => {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY);
    return raw ? (JSON.parse(raw) as WhatsAppNotificationLog[]) : [];
  } catch {
    return [];
  }
})();

let cachedConfig: WhatsAppAutomationConfig = (() => {
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    return raw ? { ...DEFAULT_WHATSAPP_CONFIG, ...JSON.parse(raw) } : DEFAULT_WHATSAPP_CONFIG;
  } catch {
    return DEFAULT_WHATSAPP_CONFIG;
  }
})();

let cachedServerStatus: WhatsAppServerConfigStatus = {
  configured: false,
  provider: 'Meta WhatsApp Cloud API',
  apiVersion: 'v21.0',
  phoneNumberIdMasked: null,
  templatesConfigured: { attendance: false, test: false },
  missingEnvVars: ['WHATSAPP_CLOUD_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
};

const logListeners = new Set<(logs: WhatsAppNotificationLog[]) => void>();
const configListeners = new Set<(config: WhatsAppAutomationConfig) => void>();
const serverStatusListeners = new Set<(status: WhatsAppServerConfigStatus) => void>();

let logsUnsub: Unsubscribe | null = null;
let configUnsub: Unsubscribe | null = null;
const inFlightKeys = new Set<string>();

function persistLocalLogs(logs: WhatsAppNotificationLog[]) {
  try {
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(logs.slice(0, 300)));
  } catch {}
}

function persistLocalConfig(config: WhatsAppAutomationConfig) {
  try {
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(config));
  } catch {}
}

function notifyLogListeners() {
  logListeners.forEach((cb) => {
    try {
      cb(cachedLogs);
    } catch (e) {
      console.error('WhatsApp log listener error:', e);
    }
  });
}

function notifyConfigListeners() {
  configListeners.forEach((cb) => {
    try {
      cb(cachedConfig);
    } catch (e) {
      console.error('WhatsApp config listener error:', e);
    }
  });
}

function notifyServerStatusListeners() {
  serverStatusListeners.forEach((cb) => {
    try {
      cb(cachedServerStatus);
    } catch (e) {
      console.error('WhatsApp server status listener error:', e);
    }
  });
}

function ensureWhatsAppListeners() {
  if (!logsUnsub) {
    try {
      logsUnsub = onSnapshot(
        collection(db, 'whatsapp_notifications'),
        (snapshot) => {
          const list: WhatsAppNotificationLog[] = snapshot.docs.map((d) => ({
            ...(d.data() as WhatsAppNotificationLog),
            id: d.id,
          }));
          list.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
          cachedLogs = list;
          persistLocalLogs(list);
          notifyLogListeners();
        },
        (err) => {
          console.warn('Live sync notice (whatsapp_notifications):', err.message);
        }
      );
    } catch (err) {
      console.warn('Unable to subscribe whatsapp_notifications:', err);
    }
  }

  if (!configUnsub) {
    try {
      configUnsub = onSnapshot(
        doc(db, 'settings', 'whatsapp_config'),
        (docSnap) => {
          if (docSnap.exists()) {
            cachedConfig = {
              ...DEFAULT_WHATSAPP_CONFIG,
              ...(docSnap.data() as Partial<WhatsAppAutomationConfig>),
            };
            persistLocalConfig(cachedConfig);
            notifyConfigListeners();
          }
        },
        (err) => {
          console.warn('Live sync notice (whatsapp_config):', err.message);
        }
      );
    } catch (err) {
      console.warn('Unable to subscribe whatsapp_config:', err);
    }
  }
}

export function validateWhatsAppPhone(
  rawPhone?: string,
  defaultCountryCode: string = cachedConfig.defaultCountryCode || '92'
): {
  valid: boolean;
  normalized: string;
  formattedE164: string;
  reason?: string;
} {
  const raw = String(rawPhone || '').trim();
  if (!raw || raw.toLowerCase() === 'not provided' || raw.toLowerCase() === 'n/a') {
    return {
      valid: false,
      normalized: '',
      formattedE164: '',
      reason: 'Missing parent WhatsApp number.',
    };
  }

  const cleanedCountry = (defaultCountryCode || '92').replace(/\D/g, '') || '92';
  const hadPlus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');

  if (!hadPlus && digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (!hadPlus && digits.startsWith('0')) {
    digits = `${cleanedCountry}${digits.slice(1)}`;
  } else if (!hadPlus && digits.length === 10 && digits.startsWith('3') && cleanedCountry === '92') {
    digits = `${cleanedCountry}${digits}`;
  }

  if (digits.startsWith(`${cleanedCountry}0`) && digits.length > cleanedCountry.length + 9) {
    digits = `${cleanedCountry}${digits.slice(cleanedCountry.length + 1)}`;
  }

  if (digits.length < 10 || digits.length > 15 || /^0+$/.test(digits)) {
    return {
      valid: false,
      normalized: digits,
      formattedE164: digits ? `+${digits}` : '',
      reason: 'Expected 10-15 digits with country code (e.g. +92 300 1234567).',
    };
  }

  return {
    valid: true,
    normalized: digits,
    formattedE164: `+${digits}`,
  };
}

export function getPerformanceFeedback(percentage: number): string {
  if (percentage >= 90) {
    return 'Outstanding performance! Shows strong mastery of Korean vocabulary, grammar, and comprehension.';
  }
  if (percentage >= 80) {
    return 'Very good progress! Consistent accuracy and solid grasp of weekly Korean lessons.';
  }
  if (percentage >= 70) {
    return 'Good effort! Encouraging progress—continued daily practice will push scores even higher.';
  }
  if (percentage >= 60) {
    return 'Satisfactory effort. Regular revision of sentence structures and vocabulary is recommended.';
  }
  if (percentage >= 50) {
    return 'Needs improvement. Additional study hours and review of core grammar points are advised.';
  }
  return 'Requires immediate academic attention. Please coordinate with the teacher for extra revision support.';
}

export function buildAttendanceMessage(params: {
  studentName: string;
  studentRoll: string;
  date: string;
  batch: string;
  attendanceStatus: string;
  studentClass?: string;
  timing?: string;
  isUpdated?: boolean;
}): string {
  const {
    studentName,
    studentRoll,
    date,
    batch,
    attendanceStatus,
    studentClass,
    timing,
    isUpdated,
  } = params;

  const classTiming = [studentClass, timing].filter(Boolean).join(' · ');
  const headerNotice = isUpdated
    ? 'This is an UPDATED official attendance notification from OK Korean Language Center.'
    : 'This is an official attendance notification from OK Korean Language Center.';

  const lines = [
    'Dear Parent/Guardian,',
    '',
    headerNotice,
    '',
    `Student: ${studentName}`,
    `Student ID: ${studentRoll}`,
    `Date: ${date}`,
    `Batch: ${batch}`,
    ...(classTiming ? [`Class Timing: ${classTiming}`] : []),
    `Attendance Status: ${attendanceStatus}`,
    '',
    'Thank you for your cooperation.',
    '',
    'OK Korean Language Center',
  ];

  return lines.join('\n');
}

export function buildWeeklyTestMessage(params: {
  studentName: string;
  studentRoll: string;
  testTitle: string;
  testDate: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade?: string;
  remarks?: string;
  feedback?: string;
  isUpdated?: boolean;
}): string {
  const {
    studentName,
    studentRoll,
    testTitle,
    testDate,
    totalMarks,
    obtainedMarks,
    percentage,
    grade,
    remarks,
    feedback,
    isUpdated,
  } = params;

  const resolvedFeedback = feedback || getPerformanceFeedback(percentage);
  const resolvedRemarks = (remarks || '').trim() || 'Evaluated in weekly assessment.';

  const introLine = isUpdated
    ? "Your child's UPDATED weekly Korean language assessment result is now available."
    : "Your child's weekly Korean language assessment result is now available.";

  const lines = [
    'Dear Parent/Guardian,',
    '',
    introLine,
    '',
    `Student: ${studentName}`,
    `Student ID: ${studentRoll}`,
    `Test: ${testTitle}`,
    `Date: ${testDate}`,
    `Total Marks: ${totalMarks}`,
    `Obtained Marks: ${obtainedMarks}`,
    `Percentage: ${percentage}%`,
    ...(grade ? [`Grade: ${grade}`] : []),
    `Teacher Remarks: ${resolvedRemarks}`,
    `Performance Feedback: ${resolvedFeedback}`,
    '',
    'Thank you for supporting your child\'s Korean language learning journey.',
    '',
    'OK Korean Language Center',
  ];

  return lines.join('\n');
}

export function buildFeeReminderMessage(params: {
  studentName: string;
  studentRoll: string;
  month: string;
  pendingAmount: number;
  totalAmount?: number;
  dueDate?: string;
}): string {
  const { studentName, studentRoll, month, pendingAmount, totalAmount, dueDate } = params;
  return [
    'Dear Parent/Guardian,',
    '',
    'This is an official tuition fee reminder from OK Korean Language Centre.',
    '',
    `Student: ${studentName}`,
    `Student ID: ${studentRoll}`,
    `Billing Period: ${month}`,
    ...(typeof totalAmount === 'number' ? [`Total Fee: Rs. ${totalAmount.toLocaleString()} PKR`] : []),
    `Pending Balance: Rs. ${pendingAmount.toLocaleString()} PKR`,
    `Due Date: ${dueDate || 'Due Upon Receipt'}`,
    '',
    'Kindly submit the pending fee via Bank Transfer, EasyPaisa/JazzCash, or at the Academy Accounts Office.',
    '',
    'Thank you for your cooperation.',
    'OK Korean Language Centre',
  ].join('\n');
}

export function buildWhatsAppWebUrl(rawPhone: string | undefined, message: string, defaultCountryCode?: string): string {
  const validation = validateWhatsAppPhone(rawPhone, defaultCountryCode || cachedConfig.defaultCountryCode || '92');
  const digits = validation.normalized || String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return `https://wa.me/?text=${encodeURIComponent(message)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function upsertCachedLog(log: WhatsAppNotificationLog) {
  const existingIdx = cachedLogs.findIndex((l) => l.id === log.id);
  if (existingIdx >= 0) {
    cachedLogs = cachedLogs.map((l) => (l.id === log.id ? log : l));
  } else {
    cachedLogs = [log, ...cachedLogs];
  }
  cachedLogs.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
  persistLocalLogs(cachedLogs);
  notifyLogListeners();
}

async function sendPayloadToServer(payload: Record<string, any>): Promise<WhatsAppNotificationLog | null> {
  const res = await fetch('/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data?.notification) {
    upsertCachedLog(data.notification as WhatsAppNotificationLog);
    return data.notification as WhatsAppNotificationLog;
  }
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to dispatch WhatsApp notification.');
  }
  return null;
}

export const WhatsAppService = {
  getNotificationLogs(): WhatsAppNotificationLog[] {
    ensureWhatsAppListeners();
    return cachedLogs;
  },

  subscribeNotificationLogs(cb: (logs: WhatsAppNotificationLog[]) => void): () => void {
    ensureWhatsAppListeners();
    logListeners.add(cb);
    cb(cachedLogs);
    return () => logListeners.delete(cb);
  },

  getAutomationConfig(): WhatsAppAutomationConfig {
    ensureWhatsAppListeners();
    return cachedConfig;
  },

  subscribeAutomationConfig(cb: (config: WhatsAppAutomationConfig) => void): () => void {
    ensureWhatsAppListeners();
    configListeners.add(cb);
    cb(cachedConfig);
    return () => configListeners.delete(cb);
  },

  getServerConfigStatus(): WhatsAppServerConfigStatus {
    return cachedServerStatus;
  },

  subscribeServerConfigStatus(cb: (status: WhatsAppServerConfigStatus) => void): () => void {
    serverStatusListeners.add(cb);
    cb(cachedServerStatus);
    return () => serverStatusListeners.delete(cb);
  },

  async refreshServerConfigStatus(): Promise<WhatsAppServerConfigStatus> {
    try {
      const res = await fetch('/api/whatsapp/config-status');
      if (res.ok) {
        const status = (await res.json()) as WhatsAppServerConfigStatus;
        cachedServerStatus = status;
        notifyServerStatusListeners();
        return status;
      }
    } catch (err) {
      console.warn('WhatsApp config-status fetch warning:', err);
    }
    return cachedServerStatus;
  },

  async saveAutomationConfig(
    config: WhatsAppAutomationConfig,
    adminName: string = 'Admin'
  ): Promise<void> {
    const payload: WhatsAppAutomationConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: adminName,
    };
    cachedConfig = payload;
    persistLocalConfig(payload);
    notifyConfigListeners();

    await setDoc(doc(db, 'settings', 'whatsapp_config'), payload, { merge: true });
  },

  /**
   * Automated trigger: Called strictly AFTER attendance records are saved to Firestore.
   */
  async dispatchAttendanceNotifications(params: {
    newRecords: AttendanceRecord[];
    previousRecordsByKey: Map<string, AttendanceRecord>;
    students: Student[];
    triggeredBy: string;
  }): Promise<{ attempted: number; sent: number; skipped: number }> {
    ensureWhatsAppListeners();
    const config = cachedConfig;
    if (!config.autoSendOnAttendanceSave) {
      return { attempted: 0, sent: 0, skipped: params.newRecords.length };
    }

    const { newRecords, previousRecordsByKey, students, triggeredBy } = params;
    const studentMap = new Map<string, Student>(students.map((s) => [s.id, s]));

    let attempted = 0;
    let sent = 0;
    let skipped = 0;

    const tasks = newRecords.map(async (record) => {
      // Never notify parents for 'Neutral' admin reset
      if (record.status === 'Neutral') {
        skipped += 1;
        return;
      }

      const key = `${record.studentId}_${record.date}`;
      const previous = previousRecordsByKey.get(key);

      // Do NOT send messages for unchanged attendance records
      if (previous && previous.status === record.status) {
        skipped += 1;
        return;
      }

      const isEdit = Boolean(previous && previous.status !== record.status);
      if (isEdit) {
        if (config.editedAttendancePolicy === 'do_not_resend') {
          skipped += 1;
          return;
        }
        if (
          config.editedAttendancePolicy === 'notify_only_if_absent_or_late' &&
          record.status !== 'Absent' &&
          record.status !== 'Late'
        ) {
          skipped += 1;
          return;
        }
      }

      const student = studentMap.get(record.studentId);
      const studentRoll = student?.rollNumber || record.studentRoll || record.studentId;
      const studentName = student?.fullName || record.studentName;
      const batch = student?.batch || record.batch;
      const timing = record.timing || student?.timing;
      const studentClass = record.studentClass || student?.studentClass;

      const uniqueKey = isEdit
        ? `att_${record.studentId}_${record.date}_edit_${previous!.status}_to_${record.status}`
        : `att_${record.studentId}_${record.date}_initial_${record.status}`;
      const notificationId = `wa_${uniqueKey}`;

      // Guard in-flight duplicates & already Sent records
      if (inFlightKeys.has(uniqueKey)) {
        skipped += 1;
        return;
      }
      const alreadySent = cachedLogs.some(
        (l) => l.uniqueKey === uniqueKey && (l.status === 'Sent' || l.status === 'Pending')
      );
      if (alreadySent) {
        skipped += 1;
        return;
      }

      inFlightKeys.add(uniqueKey);
      attempted += 1;

      try {
        const messageContent = buildAttendanceMessage({
          studentName,
          studentRoll,
          date: record.date,
          batch,
          attendanceStatus: record.status,
          studentClass,
          timing,
          isUpdated: isEdit,
        });

        const log = await sendPayloadToServer({
          notificationId,
          uniqueKey,
          studentId: record.studentId,
          studentRoll,
          studentName,
          batch,
          studentClass,
          timing,
          parentWhatsApp: student?.parentWhatsApp || '',
          notificationType: 'attendance' as WhatsAppNotificationType,
          messageContent,
          templateParams: [studentName, studentRoll, record.date, batch, record.status],
          relatedRecordId: record.id,
          relatedDate: record.date,
          triggerSource: isEdit ? 'auto_attendance_edit' : 'auto_attendance',
          isUpdatedNotification: isEdit,
          triggeredBy,
          useApprovedTemplate: config.useApprovedTemplates,
          defaultCountryCode: config.defaultCountryCode || '92',
        });

        if (log?.status === 'Sent') {
          sent += 1;
        }
      } catch (err) {
        console.warn(`Attendance WhatsApp notification failed for ${studentName}:`, err);
      } finally {
        inFlightKeys.delete(uniqueKey);
      }
    });

    await Promise.allSettled(tasks);
    return { attempted, sent, skipped };
  },

  /**
   * Automated trigger: Called strictly AFTER weekly test is saved & published to Firestore.
   */
  async dispatchWeeklyTestNotifications(params: {
    test: WeeklyTest;
    previousTest?: WeeklyTest | null;
    students: Student[];
    triggeredBy: string;
    isUpdate?: boolean;
  }): Promise<{ attempted: number; sent: number; skipped: number }> {
    ensureWhatsAppListeners();
    const config = cachedConfig;
    const { test, previousTest, students, triggeredBy, isUpdate } = params;

    // Never send unpublished or empty tests
    if (test.published !== true || !Array.isArray(test.scores) || test.scores.length === 0) {
      return { attempted: 0, sent: 0, skipped: test.scores?.length || 0 };
    }

    if (!config.autoSendOnTestPublish) {
      return { attempted: 0, sent: 0, skipped: test.scores.length };
    }

    const wasPreviouslyPublished = Boolean(previousTest && previousTest.published === true);
    if (isUpdate && wasPreviouslyPublished && !config.sendUpdatedTestResultNotification) {
      return { attempted: 0, sent: 0, skipped: test.scores.length };
    }

    const prevScoresMap = new Map<string, TestScore>(
      (previousTest?.scores || []).map((sc) => [sc.studentId, sc])
    );
    const studentMap = new Map<string, Student>(students.map((s) => [s.id, s]));
    const revision = test.resultRevision || 1;

    let attempted = 0;
    let sent = 0;
    let skipped = 0;

    const tasks = test.scores.map(async (score) => {
      const totalMax = score.maxPossibleScore || test.totalMaxMarks || 100;
      // Never send incomplete results
      if (!score.studentId || totalMax <= 0 || typeof score.totalScore !== 'number') {
        skipped += 1;
        return;
      }

      const prevScore = prevScoresMap.get(score.studentId);
      const isStudentScoreUpdate = Boolean(
        isUpdate &&
          wasPreviouslyPublished &&
          prevScore &&
          (prevScore.totalScore !== score.totalScore ||
            prevScore.percentage !== score.percentage ||
            prevScore.grade !== score.grade ||
            (prevScore.remarks || '') !== (score.remarks || '') ||
            (prevScore.maxPossibleScore || previousTest?.totalMaxMarks) !== totalMax)
      );

      // If this is an edit on an already-published test, skip students whose scores didn't change
      if (isUpdate && wasPreviouslyPublished && prevScore && !isStudentScoreUpdate) {
        skipped += 1;
        return;
      }

      const student = studentMap.get(score.studentId);
      const studentName = student?.fullName || score.studentName;
      const studentRoll = student?.rollNumber || score.studentRoll || score.studentId;
      const uniqueKey = isStudentScoreUpdate
        ? `test_${test.id}_${score.studentId}_v${revision}_${score.totalScore}_${score.percentage}`
        : `test_${test.id}_${score.studentId}_pub`;
      const notificationId = `wa_${uniqueKey}`;

      if (inFlightKeys.has(uniqueKey)) {
        skipped += 1;
        return;
      }
      const alreadySent = cachedLogs.some(
        (l) => l.uniqueKey === uniqueKey && (l.status === 'Sent' || l.status === 'Pending')
      );
      if (alreadySent) {
        skipped += 1;
        return;
      }

      inFlightKeys.add(uniqueKey);
      attempted += 1;

      try {
        const messageContent = buildWeeklyTestMessage({
          studentName,
          studentRoll,
          testTitle: test.testTitle,
          testDate: test.date,
          totalMarks: totalMax,
          obtainedMarks: score.totalScore,
          percentage: score.percentage,
          grade: score.grade,
          remarks: score.remarks,
          isUpdated: isStudentScoreUpdate,
        });

        const log = await sendPayloadToServer({
          notificationId,
          uniqueKey,
          studentId: score.studentId,
          studentRoll,
          studentName,
          batch: student?.batch || test.batch,
          studentClass: student?.studentClass,
          timing: student?.timing,
          parentWhatsApp: student?.parentWhatsApp || '',
          notificationType: 'test_result' as WhatsAppNotificationType,
          messageContent,
          templateParams: [
            studentName,
            test.testTitle,
            test.date,
            String(totalMax),
            String(score.totalScore),
            `${score.percentage}%`,
            score.grade,
          ],
          relatedRecordId: test.id,
          relatedDate: test.date,
          triggerSource: isStudentScoreUpdate ? 'auto_test_update' : 'auto_test_publish',
          isUpdatedNotification: isStudentScoreUpdate,
          triggeredBy,
          useApprovedTemplate: config.useApprovedTemplates,
          defaultCountryCode: config.defaultCountryCode || '92',
        });

        if (log?.status === 'Sent') {
          sent += 1;
        }
      } catch (err) {
        console.warn(`Weekly test WhatsApp notification failed for ${studentName}:`, err);
      } finally {
        inFlightKeys.delete(uniqueKey);
      }
    });

    await Promise.allSettled(tasks);
    return { attempted, sent, skipped };
  },

  async sendManualNotification(params: {
    student: Student;
    notificationType: WhatsAppNotificationType;
    messageContent: string;
    triggeredBy: string;
  }): Promise<WhatsAppNotificationLog | null> {
    const { student, notificationType, messageContent, triggeredBy } = params;
    const nowId = Date.now();
    const uniqueKey = `manual_${student.id}_${notificationType}_${nowId}`;

    return sendPayloadToServer({
      notificationId: `wa_${uniqueKey}`,
      uniqueKey,
      studentId: student.id,
      studentRoll: student.rollNumber,
      studentName: student.fullName,
      batch: student.batch,
      studentClass: student.studentClass,
      timing: student.timing,
      parentWhatsApp: student.parentWhatsApp,
      notificationType,
      messageContent,
      relatedRecordId: `manual_${nowId}`,
      relatedDate: new Date().toISOString().split('T')[0],
      triggerSource: 'manual_hub',
      triggeredBy,
      useApprovedTemplate: false,
      defaultCountryCode: cachedConfig.defaultCountryCode || '92',
      allowResend: true,
    });
  },

  async dispatchFeeReminderNotification(params: {
    fee: FeeRecord;
    student?: Student;
    triggeredBy: string;
  }): Promise<WhatsAppNotificationLog | null> {
    const { fee, student, triggeredBy } = params;
    const nowId = Date.now();
    const messageContent = buildFeeReminderMessage({
      studentName: student?.fullName || fee.studentName,
      studentRoll: student?.rollNumber || fee.studentRoll,
      month: fee.month,
      pendingAmount: fee.pendingAmount,
      totalAmount: fee.totalAmount,
      dueDate: fee.dueDate,
    });
    const uniqueKey = `fee_${fee.id}_${nowId}`;
    return sendPayloadToServer({
      notificationId: `wa_${uniqueKey}`,
      uniqueKey,
      studentId: fee.studentId,
      studentRoll: student?.rollNumber || fee.studentRoll,
      studentName: student?.fullName || fee.studentName,
      batch: student?.batch || fee.batch,
      studentClass: student?.studentClass,
      timing: student?.timing,
      parentWhatsApp: student?.parentWhatsApp || '',
      notificationType: 'fee_reminder',
      messageContent,
      relatedRecordId: fee.id,
      relatedDate: fee.dueDate || new Date().toISOString().split('T')[0],
      triggerSource: 'manual_hub',
      triggeredBy,
      useApprovedTemplate: false,
      defaultCountryCode: cachedConfig.defaultCountryCode || '92',
      allowResend: true,
    });
  },

  async retryNotification(
    notificationId: string,
    adminName: string,
    role: UserRole
  ): Promise<WhatsAppNotificationLog | null> {
    const res = await fetch('/api/whatsapp/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId, triggeredBy: adminName, role }),
    });
    const data = await res.json();
    if (data?.notification) {
      upsertCachedLog(data.notification as WhatsAppNotificationLog);
      return data.notification as WhatsAppNotificationLog;
    }
    if (!res.ok) {
      throw new Error(data?.error || 'Retry failed');
    }
    return null;
  },

  async resendNotification(
    notificationId: string,
    customMessageContent: string,
    adminName: string,
    role: UserRole
  ): Promise<WhatsAppNotificationLog | null> {
    const res = await fetch('/api/whatsapp/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationId,
        customMessageContent,
        triggeredBy: adminName,
        role,
      }),
    });
    const data = await res.json();
    if (data?.notification) {
      upsertCachedLog(data.notification as WhatsAppNotificationLog);
      return data.notification as WhatsAppNotificationLog;
    }
    if (!res.ok) {
      throw new Error(data?.error || 'Manual resend failed');
    }
    return null;
  },

  async retryAllFailed(
    logs: WhatsAppNotificationLog[],
    adminName: string,
    role: UserRole
  ): Promise<{ total: number; sent: number; failed: number }> {
    const retryable = logs.filter(
      (l) => l.status === 'Failed' || l.status === 'Not Configured' || l.status === 'Pending'
    );
    let sent = 0;
    let failed = 0;

    for (const item of retryable) {
      try {
        const res = await this.retryNotification(item.id, adminName, role);
        if (res?.status === 'Sent') sent += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    return { total: retryable.length, sent, failed };
  },

  async deleteNotificationLog(notificationId: string): Promise<void> {
    cachedLogs = cachedLogs.filter((l) => l.id !== notificationId);
    persistLocalLogs(cachedLogs);
    notifyLogListeners();
    await deleteDoc(doc(db, 'whatsapp_notifications', notificationId));
  },
};

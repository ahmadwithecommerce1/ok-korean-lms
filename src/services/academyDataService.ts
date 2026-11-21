import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { StorageService } from './storageService';
import {
  AcademicEvent,
  AnnouncementRecord,
  AssignmentRecord,
  AssignmentSubmissionStatus,
  BatchRecord,
  CourseRecord,
  EmailLogRecord,
  EmailRecipient,
  EmailServerConfigStatus,
  ExpenseRecord,
  PayrollRecord,
  RolePermissionMatrix,
  StudyMaterialRecord,
  TopikPracticeResult,
  TopikPracticeTest,
  TopikResource,
  UserRole,
} from '../types';

const LS_KEYS = {
  BATCHES: 'ok_korean_batches_v1',
  EVENTS: 'ok_korean_academic_events_v1',
  COURSES: 'ok_korean_courses_v1',
  MATERIALS: 'ok_korean_study_materials_v1',
  ASSIGNMENTS: 'ok_korean_assignments_v1',
  TOPIK_RESOURCES: 'ok_korean_topik_resources_v1',
  TOPIK_TESTS: 'ok_korean_topik_tests_v1',
  EXPENSES: 'ok_korean_expenses_v1',
  PAYROLL: 'ok_korean_payroll_v1',
  ANNOUNCEMENTS: 'ok_korean_announcements_v1',
  EMAIL_LOGS: 'ok_korean_email_logs_v1',
  ROLE_MATRIX: 'ok_korean_role_matrix_v1',
};

export const DEFAULT_ROLE_MATRIX: RolePermissionMatrix = {
  admin: [
    'dashboard',
    'analytics-insights',
    'students',
    'admissions',
    'batch-classes',
    'academic-calendar',
    'teacher-monitor',
    'teacher-management',
    'attendance',
    'biometric',
    'tests',
    'courses-curriculum',
    'study-materials',
    'assignments-homework',
    'topik-preparation',
    'fees',
    'expense-management',
    'salary-payroll',
    'financial-reports',
    'whatsapp',
    'notifications-centre',
    'announcements',
    'email-communication',
    'reports',
    'user-roles-permissions',
    'activity-audit-logs',
    'settings',
  ],
  teacher: [
    'dashboard',
    'attendance',
    'tests',
    'batch-classes',
    'academic-calendar',
    'courses-curriculum',
    'study-materials',
    'assignments-homework',
    'topik-preparation',
    'reports',
    'whatsapp',
    'notifications-centre',
    'announcements',
  ],
  staff: [
    'dashboard',
    'students',
    'batch-classes',
    'academic-calendar',
    'fees',
    'whatsapp',
    'notifications-centre',
    'announcements',
    'email-communication',
    'reports',
  ],
};

function cleanForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  }
  return cleaned as Partial<T>;
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

interface CollectionManager<T extends { id: string }> {
  getAll: () => T[];
  subscribe: (cb: (items: T[]) => void) => () => void;
  setLocal: (items: T[]) => void;
}

function createCollectionManager<T extends { id: string }>(
  collectionName: string,
  lsKey: string,
  sortFn?: (a: T, b: T) => number
): CollectionManager<T> {
  let cache: T[] = safeRead<T[]>(lsKey, []);
  const listeners = new Set<(items: T[]) => void>();
  let unsub: Unsubscribe | null = null;

  const notify = () => {
    listeners.forEach((cb) => {
      try {
        cb(cache);
      } catch (e) {
        console.error(`Subscriber error (${collectionName}):`, e);
      }
    });
  };

  const setLocal = (items: T[]) => {
    const next = sortFn ? [...items].sort(sortFn) : [...items];
    cache = next;
    safeWrite(lsKey, next);
    notify();
  };

  const ensureSub = () => {
    if (unsub) return;
    try {
      unsub = onSnapshot(
        collection(db, collectionName),
        (snapshot) => {
          const items = snapshot.docs.map((d) => ({
            ...(d.data() as T),
            id: d.id,
          }));
          if (sortFn) items.sort(sortFn);
          cache = items;
          safeWrite(lsKey, items);
          notify();
        },
        (err) => {
          console.warn(`Firestore live sync notice (${collectionName}):`, err.message);
        }
      );
    } catch (err) {
      console.warn(`Failed to initialize subscription for ${collectionName}:`, err);
    }
  };

  return {
    getAll: () => {
      ensureSub();
      return cache;
    },
    subscribe: (cb) => {
      ensureSub();
      listeners.add(cb);
      cb(cache);
      return () => {
        listeners.delete(cb);
      };
    },
    setLocal,
  };
}

const byCreatedDesc = <T extends { createdAt?: string }>(a: T, b: T) =>
  (b.createdAt || '').localeCompare(a.createdAt || '');

const byDateDesc = <T extends { date?: string; createdAt?: string }>(a: T, b: T) => {
  const cmp = (b.date || '').localeCompare(a.date || '');
  return cmp !== 0 ? cmp : (b.createdAt || '').localeCompare(a.createdAt || '');
};

const batchesMgr = createCollectionManager<BatchRecord>('batches', LS_KEYS.BATCHES, byCreatedDesc);
const eventsMgr = createCollectionManager<AcademicEvent>('academic_events', LS_KEYS.EVENTS, byDateDesc);
const coursesMgr = createCollectionManager<CourseRecord>('courses', LS_KEYS.COURSES, byCreatedDesc);
const materialsMgr = createCollectionManager<StudyMaterialRecord>('study_materials', LS_KEYS.MATERIALS, byCreatedDesc);
const assignmentsMgr = createCollectionManager<AssignmentRecord>('assignments', LS_KEYS.ASSIGNMENTS, byCreatedDesc);
const topikResMgr = createCollectionManager<TopikResource>('topik_resources', LS_KEYS.TOPIK_RESOURCES, byCreatedDesc);
const topikTestsMgr = createCollectionManager<TopikPracticeTest>('topik_practice_tests', LS_KEYS.TOPIK_TESTS, byDateDesc);
const expensesMgr = createCollectionManager<ExpenseRecord>('expenses', LS_KEYS.EXPENSES, byDateDesc);
const payrollMgr = createCollectionManager<PayrollRecord>('payroll_records', LS_KEYS.PAYROLL, byCreatedDesc);
const announcementsMgr = createCollectionManager<AnnouncementRecord>('announcements', LS_KEYS.ANNOUNCEMENTS, byCreatedDesc);
const emailLogsMgr = createCollectionManager<EmailLogRecord>('email_logs', LS_KEYS.EMAIL_LOGS, byCreatedDesc);

let cachedRoleMatrix: RolePermissionMatrix = safeRead<RolePermissionMatrix>(LS_KEYS.ROLE_MATRIX, DEFAULT_ROLE_MATRIX);
const roleMatrixListeners = new Set<(m: RolePermissionMatrix) => void>();
let roleMatrixUnsub: Unsubscribe | null = null;

function ensureRoleMatrixSub() {
  if (roleMatrixUnsub) return;
  try {
    roleMatrixUnsub = onSnapshot(
      doc(db, 'settings', 'role_permissions'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<RolePermissionMatrix>;
          cachedRoleMatrix = {
            admin: data.admin || DEFAULT_ROLE_MATRIX.admin,
            teacher: data.teacher || DEFAULT_ROLE_MATRIX.teacher,
            staff: data.staff || DEFAULT_ROLE_MATRIX.staff,
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          };
          safeWrite(LS_KEYS.ROLE_MATRIX, cachedRoleMatrix);
          roleMatrixListeners.forEach((cb) => cb(cachedRoleMatrix));
        }
      },
      (err) => console.warn('Role permissions sync warning:', err.message)
    );
  } catch (e) {
    console.warn('Unable to subscribe role_permissions:', e);
  }
}

export const AcademyDataService = {
  // ---------------- BATCHES & CLASSES ----------------
  getBatches: () => batchesMgr.getAll(),
  getActiveBatches: () =>
    batchesMgr.getAll().filter((b) => b.status === 'Active' || b.status === 'Upcoming'),
  subscribeBatches: (cb: (items: BatchRecord[]) => void) => batchesMgr.subscribe(cb),
  getBatchEnrolledStudents(batch: Pick<BatchRecord, 'id' | 'name' | 'code'>) {
    const students = StorageService.getStudents();
    const normName = (batch.name || '').trim().toLowerCase();
    const normCode = (batch.code || '').trim().toLowerCase();
    return students.filter(
      (s) =>
        (batch.id && s.batchId === batch.id) ||
        (normName && (s.batch || '').trim().toLowerCase() === normName) ||
        (normCode && (s.batchCode || '').trim().toLowerCase() === normCode)
    );
  },
  async saveBatch(
    batchInput: Omit<BatchRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<BatchRecord> {
    const existing = batchesMgr.getAll();
    const isEdit = Boolean(batchInput.id);
    const prevRecord = isEdit ? existing.find((b) => b.id === batchInput.id) : undefined;
    const dup = existing.find(
      (b) =>
        b.id !== batchInput.id &&
        (b.code.trim().toLowerCase() === batchInput.code.trim().toLowerCase() ||
          b.name.trim().toLowerCase() === batchInput.name.trim().toLowerCase())
    );
    if (dup) {
      throw new Error(`A batch with code "${dup.code}" or name "${dup.name}" already exists.`);
    }

    const now = new Date().toISOString();
    const record: BatchRecord = {
      ...batchInput,
      id: batchInput.id || `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: batchInput.createdAt || now,
      updatedAt: now,
    };

    const next = isEdit
      ? existing.map((b) => (b.id === record.id ? record : b))
      : [record, ...existing];
    batchesMgr.setLocal(next);
    await setDoc(doc(db, 'batches', record.id), cleanForFirestore(record), { merge: true });

    // Cascade batch metadata updates to linked students so Directory & Attendance remain in sync
    if (isEdit && prevRecord) {
      const students = StorageService.getStudents();
      const prevNameNorm = prevRecord.name.trim().toLowerCase();
      const prevCodeNorm = (prevRecord.code || '').trim().toLowerCase();
      const impacted = students.filter(
        (s) =>
          s.batchId === prevRecord.id ||
          (s.batch || '').trim().toLowerCase() === prevNameNorm ||
          (prevCodeNorm && (s.batchCode || '').trim().toLowerCase() === prevCodeNorm)
      );

      if (impacted.length > 0) {
        const levelChanged = Boolean(record.level && record.level !== prevRecord.level);
        const updatedStudents = students.map((s) => {
          const isMatch = impacted.some((imp) => imp.id === s.id);
          if (!isMatch) return s;
          return {
            ...s,
            batch: record.name,
            batchId: record.id,
            batchCode: record.code,
            timing: record.timing || s.timing,
            ...(levelChanged ? { level: record.level as any } : {}),
          };
        });
        StorageService.saveStudents(updatedStudents);
        try {
          const fsBatch = writeBatch(db);
          impacted.forEach((s) => {
            fsBatch.set(
              doc(db, 'students', s.id),
              cleanForFirestore({
                batch: record.name,
                batchId: record.id,
                batchCode: record.code,
                timing: record.timing || s.timing,
                ...(levelChanged ? { level: record.level } : {}),
              }),
              { merge: true }
            );
          });
          await fsBatch.commit();
        } catch (err) {
          console.warn('Batch cascade student sync warning:', err);
        }
      }
    }

    StorageService.logActivity(
      isEdit ? 'Batch Updated' : 'Batch Created',
      `${isEdit ? 'Updated' : 'Created'} batch ${record.name} (${record.code}) · ${record.classroom}`,
      'system',
      actor,
      role
    );
    return record;
  },
  async deleteBatch(
    id: string,
    actor = 'Admin',
    role: UserRole = 'admin',
    options?: { allowWhenEnrolled?: boolean }
  ): Promise<void> {
    const existing = batchesMgr.getAll();
    const target = existing.find((b) => b.id === id);
    if (target) {
      const enrolled = this.getBatchEnrolledStudents(target);
      if (enrolled.length > 0 && !options?.allowWhenEnrolled) {
        throw new Error(
          `Cannot delete batch "${target.name}" while ${enrolled.length} student(s) are enrolled. Deactivate it or confirm detachment instead.`
        );
      }
      if (enrolled.length > 0 && options?.allowWhenEnrolled) {
        const students = StorageService.getStudents();
        const enrolledIds = new Set(enrolled.map((e) => e.id));
        const updatedStudents = students.map((s) =>
          enrolledIds.has(s.id) ? { ...s, batchId: '', batchCode: '', batch: '' } : s
        );
        StorageService.saveStudents(updatedStudents);
        try {
          const fsBatch = writeBatch(db);
          enrolled.forEach((s) => {
            fsBatch.set(
              doc(db, 'students', s.id),
              { batchId: '', batchCode: '', batch: '' },
              { merge: true }
            );
          });
          await fsBatch.commit();
        } catch (err) {
          console.warn('Batch delete detach students Firestore warning:', err);
        }
      }
    }
    batchesMgr.setLocal(existing.filter((b) => b.id !== id));
    await deleteDoc(doc(db, 'batches', id));
    if (target) {
      StorageService.logActivity(
        'Batch Deleted',
        `Removed batch ${target.name} (${target.code})`,
        'system',
        actor,
        role
      );
    }
  },

  // ---------------- ACADEMIC CALENDAR EVENTS ----------------
  getEvents: () => eventsMgr.getAll(),
  subscribeEvents: (cb: (items: AcademicEvent[]) => void) => eventsMgr.subscribe(cb),
  async saveEvent(
    input: Omit<AcademicEvent, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<AcademicEvent> {
    const existing = eventsMgr.getAll();
    const isEdit = Boolean(input.id);
    const now = new Date().toISOString();
    const record: AcademicEvent = {
      ...input,
      id: input.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdBy: input.createdAt ? input.createdBy : actor,
      createdAt: input.createdAt || now,
      updatedAt: now,
    };
    const next = isEdit ? existing.map((e) => (e.id === record.id ? record : e)) : [record, ...existing];
    eventsMgr.setLocal(next);
    await setDoc(doc(db, 'academic_events', record.id), cleanForFirestore(record), { merge: true });
    StorageService.logActivity(
      isEdit ? 'Calendar Event Updated' : 'Calendar Event Added',
      `[${record.type}] ${record.title} on ${record.date}`,
      'system',
      actor,
      role
    );
    return record;
  },
  async deleteEvent(id: string, actor = 'Admin', role: UserRole = 'admin'): Promise<void> {
    const existing = eventsMgr.getAll();
    const target = existing.find((e) => e.id === id);
    eventsMgr.setLocal(existing.filter((e) => e.id !== id));
    await deleteDoc(doc(db, 'academic_events', id));
    if (target) {
      StorageService.logActivity('Calendar Event Removed', `Deleted event "${target.title}" (${target.date})`, 'system', actor, role);
    }
  },

  // ---------------- COURSES & CURRICULUM ----------------
  getCourses: () => coursesMgr.getAll(),
  subscribeCourses: (cb: (items: CourseRecord[]) => void) => coursesMgr.subscribe(cb),
  async saveCourse(
    input: Omit<CourseRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<CourseRecord> {
    const existing = coursesMgr.getAll();
    const isEdit = Boolean(input.id);
    const dup = existing.find(
      (c) => c.id !== input.id && c.code.trim().toLowerCase() === input.code.trim().toLowerCase()
    );
    if (dup) {
      throw new Error(`Course code "${dup.code}" already exists.`);
    }
    const now = new Date().toISOString();
    const record: CourseRecord = {
      ...input,
      id: input.id || `course_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: input.createdAt || now,
      updatedAt: now,
    };
    const next = isEdit ? existing.map((c) => (c.id === record.id ? record : c)) : [record, ...existing];
    coursesMgr.setLocal(next);
    await setDoc(doc(db, 'courses', record.id), cleanForFirestore(record), { merge: true });
    StorageService.logActivity(
      isEdit ? 'Course Updated' : 'Course Added',
      `${record.code}: ${record.title} (${record.topikTrack})`,
      'system',
      actor,
      role
    );
    return record;
  },
  async deleteCourse(id: string, actor = 'Admin', role: UserRole = 'admin'): Promise<void> {
    const existing = coursesMgr.getAll();
    const target = existing.find((c) => c.id === id);
    coursesMgr.setLocal(existing.filter((c) => c.id !== id));
    await deleteDoc(doc(db, 'courses', id));
    if (target) {
      StorageService.logActivity('Course Deleted', `Deleted course ${target.code} - ${target.title}`, 'system', actor, role);
    }
  },

  // ---------------- STUDY MATERIALS ----------------
  getMaterials: () => materialsMgr.getAll(),
  subscribeMaterials: (cb: (items: StudyMaterialRecord[]) => void) => materialsMgr.subscribe(cb),
  async saveMaterial(
    input: Omit<StudyMaterialRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<StudyMaterialRecord> {
    const existing = materialsMgr.getAll();
    const isEdit = Boolean(input.id);
    const now = new Date().toISOString();
    const record: StudyMaterialRecord = {
      ...input,
      id: input.id || `mat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      uploadedBy: input.uploadedBy || actor,
      createdAt: input.createdAt || now,
      updatedAt: now,
    };
    const next = isEdit ? existing.map((m) => (m.id === record.id ? record : m)) : [record, ...existing];
    materialsMgr.setLocal(next);
    await setDoc(doc(db, 'study_materials', record.id), cleanForFirestore(record), { merge: true });
    StorageService.logActivity(
      isEdit ? 'Study Material Updated' : 'Study Material Uploaded',
      `${record.title} (${record.category}) for ${record.courseTitle}`,
      'system',
      actor,
      role
    );
    return record;
  },
  async deleteMaterial(id: string, actor = 'Admin', role: UserRole = 'admin'): Promise<void> {
    const existing = materialsMgr.getAll();
    const target = existing.find((m) => m.id === id);
    materialsMgr.setLocal(existing.filter((m) => m.id !== id));
    await deleteDoc(doc(db, 'study_materials', id));
    if (target) {
      StorageService.logActivity('Study Material Deleted', `Removed material "${target.title}"`, 'system', actor, role);
    }
  },

  // ---------------- ASSIGNMENTS & HOMEWORK ----------------
  getAssignments: () => assignmentsMgr.getAll(),
  subscribeAssignments: (cb: (items: AssignmentRecord[]) => void) => assignmentsMgr.subscribe(cb),
  async saveAssignment(
    input: Omit<AssignmentRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<AssignmentRecord> {
    const existing = assignmentsMgr.getAll();
    const isEdit = Boolean(input.id);
    const now = new Date().toISOString();
    const record: AssignmentRecord = {
      ...input,
      id: input.id || `asgn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdBy: input.createdBy || actor,
      createdAt: input.createdAt || now,
      updatedAt: now,
    };
    const next = isEdit ? existing.map((a) => (a.id === record.id ? record : a)) : [record, ...existing];
    assignmentsMgr.setLocal(next);
    await setDoc(doc(db, 'assignments', record.id), cleanForFirestore(record), { merge: true });
    StorageService.logActivity(
      isEdit ? 'Assignment Updated' : 'Assignment Created',
      `${record.title} · Due ${record.dueDate}`,
      'test',
      actor,
      role
    );
    return record;
  },
  async updateAssignmentSubmission(
    assignmentId: string,
    studentId: string,
    update: { status: AssignmentSubmissionStatus; marks?: number; remarks?: string },
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<void> {
    const existing = assignmentsMgr.getAll();
    const target = existing.find((a) => a.id === assignmentId);
    if (!target) return;
    const now = new Date().toISOString();
    const nextSubs = target.submissions.map((sub) =>
      sub.studentId === studentId
        ? {
            ...sub,
            status: update.status,
            marks: update.marks,
            remarks: update.remarks,
            submittedAt:
              update.status === 'Submitted' || update.status === 'Late' || update.status === 'Graded'
                ? sub.submittedAt || now.split('T')[0]
                : sub.submittedAt,
          }
        : sub
    );
    const updated: AssignmentRecord = { ...target, submissions: nextSubs, updatedAt: now };
    assignmentsMgr.setLocal(existing.map((a) => (a.id === assignmentId ? updated : a)));
    await setDoc(doc(db, 'assignments', assignmentId), cleanForFirestore(updated), { merge: true });
    StorageService.logActivity(
      'Assignment Submission Updated',
      `Updated "${target.title}" status to ${update.status}`,
      'test',
      actor,
      role
    );
  },
  async deleteAssignment(id: string, actor = 'Admin', role: UserRole = 'admin'): Promise<void> {
    const existing = assignmentsMgr.getAll();
    const target = existing.find((a) => a.id === id);
    assignmentsMgr.setLocal(existing.filter((a) => a.id !== id));
    await deleteDoc(doc(db, 'assignments', id));
    if (target) {
      StorageService.logActivity('Assignment Deleted', `Deleted assignment "${target.title}"`, 'test', actor, role);
    }
  },

  // ---------------- TOPIK PREPARATION ----------------
  getTopikResources: () => topikResMgr.getAll(),
  subscribeTopikResources: (cb: (items: TopikResource[]) => void) => topikResMgr.subscribe(cb),
  async saveTopikResource(
    input: Omit<TopikResource, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<TopikResource> {
    const existing = topikResMgr.getAll();
    const isEdit = Boolean(input.id);
    const record: TopikResource = {
      ...input,
      id: input.id || `topk_res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdBy: input.createdBy || actor,
      createdAt: input.createdAt || new Date().toISOString(),
    };
    const next = isEdit ? existing.map((r) => (r.id === record.id ? record : r)) : [record, ...existing];
    topikResMgr.setLocal(next);
    await setDoc(doc(db, 'topik_resources', record.id), cleanForFirestore(record), { merge: true });
    StorageService.logActivity(
      isEdit ? 'TOPIK Resource Updated' : 'TOPIK Resource Added',
      `[${record.topikLevel} · ${record.category}] ${record.koreanTerm}`,
      'system',
      actor,
      role
    );
    return record;
  },
  async deleteTopikResource(id: string, actor = 'Admin', role: UserRole = 'admin'): Promise<void> {
    const existing = topikResMgr.getAll();
    const target = existing.find((r) => r.id === id);
    topikResMgr.setLocal(existing.filter((r) => r.id !== id));
    await deleteDoc(doc(db, 'topik_resources', id));
    if (target) {
      StorageService.logActivity('TOPIK Resource Removed', `Removed "${target.koreanTerm}"`, 'system', actor, role);
    }
  },

  getTopikPracticeTests: () => topikTestsMgr.getAll(),
  subscribeTopikPracticeTests: (cb: (items: TopikPracticeTest[]) => void) => topikTestsMgr.subscribe(cb),
  async saveTopikPracticeTest(
    input: Omit<TopikPracticeTest, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<TopikPracticeTest> {
    const existing = topikTestsMgr.getAll();
    const isEdit = Boolean(input.id);
    const record: TopikPracticeTest = {
      ...input,
      id: input.id || `topk_tst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdBy: input.createdBy || actor,
      createdAt: input.createdAt || new Date().toISOString(),
    };
    const next = isEdit ? existing.map((t) => (t.id === record.id ? record : t)) : [record, ...existing];
    topikTestsMgr.setLocal(next);
    await setDoc(doc(db, 'topik_practice_tests', record.id), cleanForFirestore(record), { merge: true });
    StorageService.logActivity(
      isEdit ? 'TOPIK Mock Test Updated' : 'TOPIK Mock Test Created',
      `${record.title} (${record.topikLevel} · ${record.section})`,
      'test',
      actor,
      role
    );
    return record;
  },
  async recordTopikMockAttempt(
    testId: string,
    result: TopikPracticeResult,
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<void> {
    const existing = topikTestsMgr.getAll();
    const target = existing.find((t) => t.id === testId);
    if (!target) return;
    const filtered = (target.results || []).filter((r) => r.studentId !== result.studentId);
    const updated: TopikPracticeTest = { ...target, results: [result, ...filtered] };
    topikTestsMgr.setLocal(existing.map((t) => (t.id === testId ? updated : t)));
    await setDoc(doc(db, 'topik_practice_tests', testId), cleanForFirestore(updated), { merge: true });
    StorageService.logActivity(
      'TOPIK Mock Score Recorded',
      `${result.studentName} scored ${result.score}/${result.maxScore} in ${target.title}`,
      'test',
      actor,
      role
    );
  },
  async deleteTopikPracticeTest(id: string, actor = 'Admin', role: UserRole = 'admin'): Promise<void> {
    const existing = topikTestsMgr.getAll();
    const target = existing.find((t) => t.id === id);
    topikTestsMgr.setLocal(existing.filter((t) => t.id !== id));
    await deleteDoc(doc(db, 'topik_practice_tests', id));
    if (target) {
      StorageService.logActivity('TOPIK Mock Test Deleted', `Deleted "${target.title}"`, 'test', actor, role);
    }
  },

  // ---------------- EXPENSE MANAGEMENT ----------------
  getExpenses: () => expensesMgr.getAll(),
  subscribeExpenses: (cb: (items: ExpenseRecord[]) => void) => expensesMgr.subscribe(cb),
  async saveExpense(
    input: Omit<ExpenseRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<ExpenseRecord> {
    const existing = expensesMgr.getAll();
    const isEdit = Boolean(input.id);
    const now = new Date().toISOString();
    const record: ExpenseRecord = {
      ...input,
      id: input.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recordedBy: input.recordedBy || actor,
      createdAt: input.createdAt || now,
      updatedAt: now,
    };
    const next = isEdit ? existing.map((e) => (e.id === record.id ? record : e)) : [record, ...existing];
    expensesMgr.setLocal(next);
    await setDoc(doc(db, 'expenses', record.id), cleanForFirestore(record), { merge: true });
    StorageService.logActivity(
      isEdit ? 'Expense Updated' : 'Expense Recorded',
      `${record.title} (${record.category}): Rs. ${record.amount.toLocaleString()} PKR`,
      'fee',
      actor,
      role
    );
    return record;
  },
  async deleteExpense(id: string, actor = 'Admin', role: UserRole = 'admin'): Promise<void> {
    const existing = expensesMgr.getAll();
    const target = existing.find((e) => e.id === id);
    expensesMgr.setLocal(existing.filter((e) => e.id !== id));
    await deleteDoc(doc(db, 'expenses', id));
    if (target) {
      StorageService.logActivity(
        'Expense Deleted',
        `Deleted expense "${target.title}" (Rs. ${target.amount.toLocaleString()})`,
        'fee',
        actor,
        role
      );
    }
  },

  // ---------------- SALARY & PAYROLL ----------------
  getPayrollRecords: () => payrollMgr.getAll(),
  subscribePayroll: (cb: (items: PayrollRecord[]) => void) => payrollMgr.subscribe(cb),
  async savePayrollRecord(
    input: Omit<PayrollRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<PayrollRecord> {
    const existing = payrollMgr.getAll();
    const isEdit = Boolean(input.id);
    const duplicate = existing.find(
      (p) => p.id !== input.id && p.teacherId === input.teacherId && p.monthKey === input.monthKey
    );
    if (duplicate) {
      throw new Error(`A payroll record for ${duplicate.teacherName} in ${duplicate.month} already exists.`);
    }
    const now = new Date().toISOString();
    const record: PayrollRecord = {
      ...input,
      id: input.id || `pay_${input.teacherId}_${input.monthKey}`,
      recordedBy: input.recordedBy || actor,
      createdAt: input.createdAt || now,
      updatedAt: now,
    };
    const next = isEdit ? existing.map((p) => (p.id === record.id ? record : p)) : [record, ...existing];
    payrollMgr.setLocal(next);
    await setDoc(doc(db, 'payroll_records', record.id), cleanForFirestore(record), { merge: true });
    StorageService.logActivity(
      isEdit ? 'Payroll Updated' : 'Payroll Generated',
      `${record.teacherName} (${record.month}) · Net Rs. ${record.netSalary.toLocaleString()} (${record.status})`,
      'teacher',
      actor,
      role
    );
    return record;
  },
  async deletePayrollRecord(id: string, actor = 'Admin', role: UserRole = 'admin'): Promise<void> {
    const existing = payrollMgr.getAll();
    const target = existing.find((p) => p.id === id);
    payrollMgr.setLocal(existing.filter((p) => p.id !== id));
    await deleteDoc(doc(db, 'payroll_records', id));
    if (target) {
      StorageService.logActivity(
        'Payroll Deleted',
        `Deleted salary record for ${target.teacherName} (${target.month})`,
        'teacher',
        actor,
        role
      );
    }
  },

  // ---------------- ANNOUNCEMENTS ----------------
  getAnnouncements: () => announcementsMgr.getAll(),
  subscribeAnnouncements: (cb: (items: AnnouncementRecord[]) => void) => announcementsMgr.subscribe(cb),
  async saveAnnouncement(
    input: Omit<AnnouncementRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<AnnouncementRecord> {
    const existing = announcementsMgr.getAll();
    const isEdit = Boolean(input.id);
    const now = new Date().toISOString();
    const record: AnnouncementRecord = {
      ...input,
      id: input.id || `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdBy: input.createdBy || actor,
      createdAt: input.createdAt || now,
      updatedAt: now,
    };
    const next = isEdit ? existing.map((a) => (a.id === record.id ? record : a)) : [record, ...existing];
    announcementsMgr.setLocal(next);
    await setDoc(doc(db, 'announcements', record.id), cleanForFirestore(record), { merge: true });
    StorageService.logActivity(
      isEdit ? 'Announcement Updated' : 'Announcement Published',
      `[${record.priority}] ${record.title} → ${record.targetAudience}`,
      'system',
      actor,
      role
    );
    return record;
  },
  async deleteAnnouncement(id: string, actor = 'Admin', role: UserRole = 'admin'): Promise<void> {
    const existing = announcementsMgr.getAll();
    const target = existing.find((a) => a.id === id);
    announcementsMgr.setLocal(existing.filter((a) => a.id !== id));
    await deleteDoc(doc(db, 'announcements', id));
    if (target) {
      StorageService.logActivity('Announcement Deleted', `Removed announcement "${target.title}"`, 'system', actor, role);
    }
  },

  // ---------------- EMAIL COMMUNICATION ----------------
  getEmailLogs: () => emailLogsMgr.getAll(),
  subscribeEmailLogs: (cb: (items: EmailLogRecord[]) => void) => emailLogsMgr.subscribe(cb),
  async fetchEmailConfigStatus(): Promise<EmailServerConfigStatus> {
    try {
      const res = await fetch('/api/email/config-status');
      if (res.ok) {
        return (await res.json()) as EmailServerConfigStatus;
      }
    } catch (e) {
      console.warn('Email config status fetch warning:', e);
    }
    return {
      configured: false,
      provider: 'None Configured',
      fromAddress: null,
      missingEnvVars: ['RESEND_API_KEY (or SMTP_HOST, SMTP_USER, SMTP_PASS)'],
    };
  },
  async sendEmail(params: {
    recipientType: 'Student' | 'Parent' | 'Teacher' | 'Custom';
    recipients: EmailRecipient[];
    subject: string;
    body: string;
    templateName?: string;
    sentBy: string;
    role: UserRole;
  }): Promise<{ ok: boolean; configured: boolean; emailLog: EmailLogRecord; error?: string }> {
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (data?.emailLog) {
      const existing = emailLogsMgr.getAll();
      const filtered = existing.filter((l) => l.id !== data.emailLog.id);
      emailLogsMgr.setLocal([data.emailLog as EmailLogRecord, ...filtered]);
    }
    if (data?.emailLog?.status === 'Sent') {
      StorageService.logActivity(
        'Email Dispatched',
        `Sent "${params.subject}" to ${params.recipients.length} recipient(s)`,
        'system',
        params.sentBy,
        params.role
      );
    }
    return data;
  },

  // ---------------- ROLE PERMISSIONS MATRIX ----------------
  getRolePermissionMatrix(): RolePermissionMatrix {
    ensureRoleMatrixSub();
    return cachedRoleMatrix;
  },
  subscribeRolePermissionMatrix(cb: (m: RolePermissionMatrix) => void): () => void {
    ensureRoleMatrixSub();
    roleMatrixListeners.add(cb);
    cb(cachedRoleMatrix);
    return () => roleMatrixListeners.delete(cb);
  },
  async saveRolePermissionMatrix(
    matrix: RolePermissionMatrix,
    actor = 'Admin',
    role: UserRole = 'admin'
  ): Promise<void> {
    const payload: RolePermissionMatrix = {
      ...matrix,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };
    cachedRoleMatrix = payload;
    safeWrite(LS_KEYS.ROLE_MATRIX, payload);
    roleMatrixListeners.forEach((cb) => cb(payload));
    await setDoc(doc(db, 'settings', 'role_permissions'), cleanForFirestore(payload), { merge: true });
    StorageService.logActivity(
      'Role Permissions Updated',
      `Updated default Admin / Teacher / Staff permission matrix`,
      'system',
      actor,
      role
    );
  },
};

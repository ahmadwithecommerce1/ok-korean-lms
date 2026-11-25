import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  AdmissionRequest,
  AdmissionRequestStatus,
  Student,
  StudentBatch,
  StudentLevel,
  ClassTiming
} from '../types';
import { StorageService, formatRollNumberFromSettings, getStudentSerialDisplay } from './storageService';
import { AcademyDataService } from './academyDataService';

function pickFirstNonEmpty(...candidates: any[]): string {
  for (const val of candidates) {
    if (val === null || val === undefined) continue;
    const str = String(val).trim();
    if (str.length > 0) return str;
  }
  return '';
}

function parseDateValue(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return new Date(val).toISOString();
  if (typeof val?.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (typeof val?.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

function normalizeStatus(rawStatus: any): AdmissionRequestStatus {
  const s = String(rawStatus || '').trim().toLowerCase();
  if (s === 'approved' || s === 'accepted' || s === 'enrolled') return 'Approved';
  if (s === 'rejected' || s === 'declined') return 'Rejected';
  return 'Pending';
}

function resolveDynamicBatch(rawBatch?: string, rawTiming?: string): {
  batch: StudentBatch;
  batchId?: string;
  batchCode?: string;
  timing?: string;
} {
  const allBatches = AcademyDataService.getBatches();
  const activeBatches = allBatches.filter((b) => b.status === 'Active' || b.status === 'Upcoming');
  const pool = activeBatches.length > 0 ? activeBatches : allBatches;
  const raw = String(rawBatch || '').trim();
  const rawLower = raw.toLowerCase();
  const timingLower = String(rawTiming || '').trim().toLowerCase();

  if (pool.length > 0) {
    const exactMatch = pool.find(
      (b) =>
        b.id === raw ||
        b.code.toLowerCase() === rawLower ||
        b.name.toLowerCase() === rawLower ||
        (rawLower && b.name.toLowerCase().includes(rawLower))
    );
    if (exactMatch) {
      return {
        batch: exactMatch.name,
        batchId: exactMatch.id,
        batchCode: exactMatch.code,
        timing: exactMatch.timing,
      };
    }
    if (timingLower) {
      const timingMatch = pool.find((b) => String(b.timing || '').toLowerCase().includes(timingLower));
      if (timingMatch) {
        return {
          batch: timingMatch.name,
          batchId: timingMatch.id,
          batchCode: timingMatch.code,
          timing: timingMatch.timing,
        };
      }
    }
    return {
      batch: raw || pool[0].name,
      batchId: raw ? undefined : pool[0].id,
      batchCode: raw ? undefined : pool[0].code,
      timing: rawTiming || pool[0].timing,
    };
  }

  return { batch: raw || 'Unassigned' };
}

function mapStudentLevel(rawLevel?: string): StudentLevel {
  const s = String(rawLevel || '').toLowerCase();
  if (s.includes('level 5') || s.includes('advanced')) {
    return 'Level 5 - Advanced (TOPIK II)';
  }
  if (s.includes('level 4') || s.includes('upper')) {
    return 'Level 4 - Upper-Intermediate (TOPIK II)';
  }
  if (s.includes('level 3') || s.includes('intermediate') || s.includes('topik ii')) {
    return 'Level 3 - Intermediate (TOPIK II)';
  }
  if (s.includes('level 2') || s.includes('elementary')) {
    return 'Level 2 - Elementary (TOPIK I)';
  }
  return 'Level 1 - Beginner (TOPIK I)';
}

function mapClassTiming(rawTiming?: string, mappedBatch?: StudentBatch): ClassTiming {
  const s = String(rawTiming || '').toLowerCase();
  if (s.includes('both')) return 'Morning + Evening (Both)';
  if (s.includes('evening') || mappedBatch?.includes('Evening')) return 'Evening';
  return 'Morning';
}

function normalizePhoneDigits(phone?: string): string {
  return String(phone || '').replace(/\D/g, '');
}

function normalizeAdmissionDoc(id: string, rawInput: Record<string, any>): AdmissionRequest {
  const data: Record<string, any> = {
    ...(typeof rawInput.formData === 'object' && rawInput.formData !== null ? rawInput.formData : {}),
    ...(typeof rawInput.student === 'object' && rawInput.student !== null ? rawInput.student : {}),
    ...rawInput,
  };

  const fullName = pickFirstNonEmpty(
    data.fullNameEnglish,
    data.full_name_english,
    data.englishName,
    data.fullName,
    data.full_name,
    data.studentName,
    data.student_name,
    data.name,
    data.applicantName
  );

  const koreanName = pickFirstNonEmpty(
    data.koreanName,
    data.korean_name,
    data.hangulName
  );

  const fatherName = pickFirstNonEmpty(
    data.fatherGuardianName,
    data.father_guardian_name,
    data.fatherName,
    data.father_name,
    data.guardianName,
    data.guardian_name,
    data.father,
    data.guardian
  );

  const contactNumber = pickFirstNonEmpty(
    data.studentContactPhone,
    data.student_contact_phone,
    data.studentPhone,
    data.student_phone,
    data.contactNumber,
    data.contact_number,
    data.phone,
    data.phoneNumber,
    data.phone_number,
    data.mobile,
    data.mobileNumber
  );

  const parentWhatsApp = pickFirstNonEmpty(
    data.parentWhatsapp,
    data.parentWhatsApp,
    data.parent_whatsapp,
    data.whatsappNumber,
    data.whatsapp_number,
    data.whatsapp,
    data.parentPhone,
    data.parent_phone,
    data.guardianPhone
  );

  const email = pickFirstNonEmpty(
    data.emailAddress,
    data.email_address,
    data.email,
    data.studentEmail
  );

  const level = pickFirstNonEmpty(
    data.courseLevel,
    data.course_level,
    data.level,
    data.course,
    data.program
  ) || 'Level 1 - Beginner (TOPIK I)';

  const batch = pickFirstNonEmpty(
    data.assignedBatch,
    data.assigned_batch,
    data.batch,
    data.preferredBatch,
    data.preferred_batch,
    data.shift
  ) || 'Morning';

  const studentClass = pickFirstNonEmpty(
    data.class,
    data.studentClass,
    data.student_class,
    data.className
  ) || 'Class 1';

  const timing = pickFirstNonEmpty(
    data.classTiming,
    data.class_timing,
    data.timing,
    data.preferredTiming,
    data.preferred_timing,
    data.shift
  );

  const enrollmentDate = pickFirstNonEmpty(
    data.enrollmentDate,
    data.enrollment_date,
    data.admissionDate,
    data.admission_date
  );

  const notes = pickFirstNonEmpty(
    data.academicNotes,
    data.academic_notes,
    data.notes,
    data.message,
    data.comments,
    data.remarks
  );

  const createdAt = parseDateValue(
    data.createdAt || data.created_at || data.submittedAt || data.submitted_at || data.timestamp
  );

  return {
    id,
    fullName,
    koreanName: koreanName || undefined,
    fatherName,
    contactNumber,
    parentWhatsApp,
    email: email || undefined,
    level,
    batch,
    studentClass,
    timing: timing || undefined,
    enrollmentDate: enrollmentDate || undefined,
    address: pickFirstNonEmpty(data.address, data.homeAddress, data.residentialAddress) || undefined,
    city: pickFirstNonEmpty(data.city) || undefined,
    cnic: pickFirstNonEmpty(data.cnic, data.idCard, data.nationalId) || undefined,
    qualification: pickFirstNonEmpty(data.qualification, data.education) || undefined,
    notes: notes || undefined,
    source: pickFirstNonEmpty(data.source) || 'Official Website Form',
    status: normalizeStatus(data.status),
    createdAt,
    reviewedBy: pickFirstNonEmpty(data.reviewedBy) || undefined,
    reviewedAt: data.reviewedAt ? parseDateValue(data.reviewedAt) : undefined,
    approvedRollNumber: pickFirstNonEmpty(data.approvedRollNumber) || undefined,
    approvedSerialNumber: pickFirstNonEmpty(data.approvedSerialNumber) || undefined,
    approvedStudentId: pickFirstNonEmpty(data.approvedStudentId) || undefined,
    raw: rawInput,
  };
}

let cachedRequests: AdmissionRequest[] = [];
const requestListeners = new Set<(requests: AdmissionRequest[]) => void>();
let firestoreUnsubscribe: Unsubscribe | null = null;
const inFlightApprovalIds = new Set<string>();

function notifyRequestListeners(): void {
  requestListeners.forEach((cb) => {
    try {
      cb(cachedRequests);
    } catch (err) {
      console.error('Admission listener callback error:', err);
    }
  });
}

function ensureAdmissionListener(): void {
  if (firestoreUnsubscribe) return;
  try {
    firestoreUnsubscribe = onSnapshot(
      collection(db, 'admission_requests'),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) =>
          normalizeAdmissionDoc(docSnap.id, docSnap.data() as Record<string, any>)
        );
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        cachedRequests = list;
        notifyRequestListeners();
      },
      (err) => {
        console.warn('Live sync notice (admission_requests):', err.message);
      }
    );
  } catch (err) {
    console.warn('Unable to attach admission_requests listener:', err);
  }
}

export function generateNextRollNumber(reservedRolls?: Set<string>): string {
  const existingStudents = StorageService.getStudents();
  const cfg = StorageService.getRollNumberSettings();
  const usedRolls = new Set<string>(
    existingStudents.map((s) => (s.rollNumber || '').trim().toUpperCase())
  );
  if (reservedRolls) {
    reservedRolls.forEach((r) => usedRolls.add(r.trim().toUpperCase()));
  }

  let maxNumber = Math.max(0, (cfg.startingSerial || 1) - 1, (cfg.nextSerialNumber || 1) - 1);

  usedRolls.forEach((roll) => {
    const match = roll.match(/(\d+)$/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed) && parsed > maxNumber) {
        maxNumber = parsed;
      }
    }
  });

  let nextNum = Math.max(cfg.startingSerial || 1, cfg.nextSerialNumber || 1, maxNumber + 1);
  let candidate = formatRollNumberFromSettings(nextNum, cfg);
  while (usedRolls.has(candidate.toUpperCase())) {
    nextNum += 1;
    candidate = formatRollNumberFromSettings(nextNum, cfg);
  }

  if (reservedRolls) {
    reservedRolls.add(candidate.toUpperCase());
  }

  return candidate;
}

function findExistingEnrolledStudent(request: AdmissionRequest): Student | undefined {
  const existingStudents = StorageService.getStudents();

  if (request.approvedStudentId) {
    const byId = existingStudents.find((s) => s.id === request.approvedStudentId);
    if (byId) return byId;
  }

  const byRequestTag = existingStudents.find((s) =>
    (s.notes || '').includes(`#${request.id}`)
  );
  if (byRequestTag) return byRequestTag;

  const reqName = request.fullName.trim().toLowerCase();
  const reqFather = request.fatherName.trim().toLowerCase();
  const reqPhone = normalizePhoneDigits(request.contactNumber || request.parentWhatsApp);

  if (reqName && reqFather && reqPhone) {
    return existingStudents.find((s) => {
      const sName = (s.fullName || '').trim().toLowerCase();
      const sFather = (s.fatherName || '').trim().toLowerCase();
      const sContact = normalizePhoneDigits(s.contactNumber);
      const sWa = normalizePhoneDigits(s.parentWhatsApp);
      return sName === reqName && sFather === reqFather && (sContact === reqPhone || sWa === reqPhone);
    });
  }

  return undefined;
}

export interface BulkApproveResult {
  approved: Array<{ request: AdmissionRequest; student: Student }>;
  skippedDuplicates: Array<{ request: AdmissionRequest; existingStudent: Student }>;
  failed: Array<{ request: AdmissionRequest; error: string }>;
}

export const AdmissionService = {
  getAdmissionRequests(): AdmissionRequest[] {
    ensureAdmissionListener();
    return cachedRequests;
  },

  subscribeAdmissionRequests(callback: (requests: AdmissionRequest[]) => void): () => void {
    ensureAdmissionListener();
    requestListeners.add(callback);
    callback(cachedRequests);
    return () => {
      requestListeners.delete(callback);
    };
  },

  async approveAdmissionRequest(
    request: AdmissionRequest,
    adminName: string = 'Admin',
    reservedRolls?: Set<string>,
    reservedSerials?: Set<string>
  ): Promise<{ student: Student; wasDuplicate: boolean }> {
    if (inFlightApprovalIds.has(request.id)) {
      throw new Error(`Approval for ${request.fullName || request.id} is already in progress.`);
    }

    inFlightApprovalIds.add(request.id);
    try {
      if (!request.fullName || !request.fullName.trim()) {
        throw new Error('Cannot approve request: Student Full Name is missing.');
      }

      // Duplicate guard: prevent enrolling the same student twice
      const existingStudent = findExistingEnrolledStudent(request);
      if (existingStudent) {
        const reviewedAt = new Date().toISOString();
        const existingSerialDisplay = getStudentSerialDisplay(existingStudent);
        await setDoc(
          doc(db, 'admission_requests', request.id),
          {
            status: 'Approved',
            reviewedBy: adminName,
            reviewedAt,
            approvedRollNumber: existingStudent.rollNumber,
            approvedSerialNumber: existingSerialDisplay,
            approvedStudentId: existingStudent.id,
          },
          { merge: true }
        );

        cachedRequests = cachedRequests.map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: 'Approved',
                reviewedBy: adminName,
                reviewedAt,
                approvedRollNumber: existingStudent.rollNumber,
                approvedSerialNumber: existingSerialDisplay,
                approvedStudentId: existingStudent.id,
              }
            : r
        );
        notifyRequestListeners();

        return { student: existingStudent, wasDuplicate: true };
      }

      if (request.status === 'Approved') {
        throw new Error(`Request for ${request.fullName} has already been approved.`);
      }

      const allocated = await StorageService.allocateNextStudentSerialAndRoll(reservedRolls, reservedSerials);
      const rollNumber = allocated.rollNumber;
      const resolvedBatch = resolveDynamicBatch(request.batch, request.timing);
      const mappedLevel = mapStudentLevel(request.level);
      const mappedTiming = mapClassTiming(request.timing || resolvedBatch.timing, resolvedBatch.batch);
      const enrollmentDate =
        request.enrollmentDate ||
        (request.createdAt ? request.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);

      const extraDetails: string[] = [];
      if (request.city) extraDetails.push(`City: ${request.city}`);
      if (request.cnic) extraDetails.push(`CNIC: ${request.cnic}`);
      if (request.qualification) extraDetails.push(`Education: ${request.qualification}`);
      if (request.address) extraDetails.push(`Address: ${request.address}`);
      if (request.notes) extraDetails.push(request.notes);
      extraDetails.push(`Admitted from Official Website Request (#${request.id})`);

      const reviewedAt = new Date().toISOString();

      const createdStudent = StorageService.addStudent(
        {
          serialNumber: allocated.serialNumber,
          formattedSerialNumber: allocated.formattedSerialNumber,
          rollNumber,
          fullName: request.fullName,
          koreanName: request.koreanName || undefined,
          fatherName: request.fatherName || 'Not provided',
          contactNumber: request.contactNumber || request.parentWhatsApp || 'Not provided',
          parentWhatsApp: request.parentWhatsApp || request.contactNumber || 'Not provided',
          email: request.email || undefined,
          level: mappedLevel,
          batch: resolvedBatch.batch,
          batchId: resolvedBatch.batchId,
          batchCode: resolvedBatch.batchCode,
          studentClass: request.studentClass || 'Class 1',
          timing: mappedTiming,
          status: 'Active',
          enrollmentDate,
          notes: extraDetails.join(' · '),
          deviceSyncStatus: 'Pending',
          enrollRequested: true,
          enrollRequestedAt: new Date().toISOString(),
        },
        adminName,
        'admin'
      );

      // Persist status to Firestore admission_requests collection BEFORE marking success in cache
      await setDoc(
        doc(db, 'admission_requests', request.id),
        {
          status: 'Approved',
          reviewedBy: adminName,
          reviewedAt,
          approvedRollNumber: createdStudent.rollNumber,
          approvedSerialNumber: createdStudent.formattedSerialNumber || allocated.formattedSerialNumber,
          approvedStudentId: createdStudent.id,
        },
        { merge: true }
      );

      StorageService.sendEnrollRequest(createdStudent.id).catch(() => {});

      cachedRequests = cachedRequests.map((r) =>
        r.id === request.id
          ? {
              ...r,
              status: 'Approved',
              reviewedBy: adminName,
              reviewedAt,
              approvedRollNumber: createdStudent.rollNumber,
              approvedSerialNumber: createdStudent.formattedSerialNumber || allocated.formattedSerialNumber,
              approvedStudentId: createdStudent.id,
            }
          : r
      );
      notifyRequestListeners();

      StorageService.logActivity(
        'Admission Request Approved',
        `Approved online application for ${request.fullName} (Serial ${createdStudent.formattedSerialNumber || allocated.formattedSerialNumber} · Roll ${createdStudent.rollNumber})`,
        'student',
        adminName,
        'admin'
      );

      return { student: createdStudent, wasDuplicate: false };
    } finally {
      inFlightApprovalIds.delete(request.id);
    }
  },

  async approveAllPendingRequests(
    pendingRequests: AdmissionRequest[],
    adminName: string = 'Admin'
  ): Promise<BulkApproveResult> {
    const result: BulkApproveResult = {
      approved: [],
      skippedDuplicates: [],
      failed: [],
    };

    const reservedRolls = new Set<string>();
    const reservedSerials = new Set<string>();
    const eligiblePending = pendingRequests.filter((r) => r.status === 'Pending');

    for (const req of eligiblePending) {
      try {
        const { student, wasDuplicate } = await this.approveAdmissionRequest(
          req,
          adminName,
          reservedRolls,
          reservedSerials
        );
        if (wasDuplicate) {
          result.skippedDuplicates.push({ request: req, existingStudent: student });
        } else {
          result.approved.push({ request: req, student });
        }
      } catch (err: any) {
        result.failed.push({
          request: req,
          error: err?.message || 'Unexpected error during approval',
        });
      }
    }

    return result;
  },

  async rejectAdmissionRequest(
    request: AdmissionRequest,
    adminName: string = 'Admin'
  ): Promise<void> {
    const reviewedAt = new Date().toISOString();

    await setDoc(
      doc(db, 'admission_requests', request.id),
      {
        status: 'Rejected',
        reviewedBy: adminName,
        reviewedAt,
      },
      { merge: true }
    );

    cachedRequests = cachedRequests.map((r) =>
      r.id === request.id
        ? {
            ...r,
            status: 'Rejected',
            reviewedBy: adminName,
            reviewedAt,
          }
        : r
    );
    notifyRequestListeners();

    StorageService.logActivity(
      'Admission Request Rejected',
      `Rejected online admission application from ${request.fullName || 'Applicant'}`,
      'student',
      adminName,
      'admin'
    );
  },

  async deleteAdmissionHistoryRecords(
    requestIds: string[],
    adminName: string = 'Admin'
  ): Promise<number> {
    // Strictly only allow deleting non-pending historical records (Approved / Rejected)
    const allowedToDelete = cachedRequests.filter(
      (r) => requestIds.includes(r.id) && (r.status === 'Approved' || r.status === 'Rejected')
    );

    if (allowedToDelete.length === 0) {
      return 0;
    }

    const idsSet = new Set(allowedToDelete.map((r) => r.id));

    if (allowedToDelete.length === 1) {
      await deleteDoc(doc(db, 'admission_requests', allowedToDelete[0].id));
    } else {
      const CHUNK_SIZE = 450;
      for (let i = 0; i < allowedToDelete.length; i += CHUNK_SIZE) {
        const chunk = allowedToDelete.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((r) => {
          batch.delete(doc(db, 'admission_requests', r.id));
        });
        await batch.commit();
      }
    }

    cachedRequests = cachedRequests.filter((r) => !idsSet.has(r.id));
    notifyRequestListeners();

    StorageService.logActivity(
      'Admission History Cleared',
      `Removed ${allowedToDelete.length} historical admission request record${allowedToDelete.length === 1 ? '' : 's'} without modifying enrolled students or pending requests`,
      'student',
      adminName,
      'admin'
    );

    return allowedToDelete.length;
  },

  async clearAdmissionHistory(adminName: string = 'Admin'): Promise<number> {
    const historicalIds = cachedRequests
      .filter((r) => r.status === 'Approved' || r.status === 'Rejected')
      .map((r) => r.id);
    return this.deleteAdmissionHistoryRecords(historicalIds, adminName);
  },
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageCircle,
  Send,
  CheckCheck,
  CalendarCheck,
  Award,
  CreditCard,
  Bell,
  Phone,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  RotateCcw,
  X,
  Loader2,
  UserCheck,
  Ban,
  Trash2,
  History,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { StorageService, getStudentSerialDisplay } from '../services/storageService';
import { AcademyDataService } from '../services/academyDataService';
import {
  WhatsAppService,
  buildAttendanceMessage,
  buildFeeReminderMessage,
  buildWeeklyTestMessage,
  buildWhatsAppWebUrl,
  validateWhatsAppPhone,
  DEFAULT_WHATSAPP_CONFIG,
} from '../services/whatsappService';
import { useAuth } from '../context/AuthContext';
import {
  AnnouncementRecord,
  AttendanceRecord,
  EditedAttendancePolicy,
  FeeRecord,
  Student,
  TestScore,
  WeeklyTest,
  WhatsAppAutomationConfig,
  WhatsAppDeliveryStatus,
  WhatsAppNotificationLog,
  WhatsAppNotificationType,
  WhatsAppServerConfigStatus,
} from '../types';

export const WhatsAppPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => StorageService.getAttendance());
  const [tests, setTests] = useState<WeeklyTest[]>(() => StorageService.getTests());
  const [fees, setFees] = useState<FeeRecord[]>(() => StorageService.getFees());
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>(() => AcademyDataService.getAnnouncements());

  const [logs, setLogs] = useState<WhatsAppNotificationLog[]>(() => WhatsAppService.getNotificationLogs());
  const [automationConfig, setAutomationConfig] = useState<WhatsAppAutomationConfig>(() =>
    WhatsAppService.getAutomationConfig()
  );
  const [serverStatus, setServerStatus] = useState<WhatsAppServerConfigStatus>(() =>
    WhatsAppService.getServerConfigStatus()
  );

  useEffect(() => {
    const unsubStudents = StorageService.subscribeStudents(setStudents);
    const unsubAtt = StorageService.subscribeAttendance(setAttendance);
    const unsubTests = StorageService.subscribeTests(setTests);
    const unsubFees = StorageService.subscribeFees(setFees);
    const unsubAnn = AcademyDataService.subscribeAnnouncements(setAnnouncements);
    const unsubLogs = WhatsAppService.subscribeNotificationLogs(setLogs);
    const unsubCfg = WhatsAppService.subscribeAutomationConfig(setAutomationConfig);
    const unsubServer = WhatsAppService.subscribeServerConfigStatus(setServerStatus);

    WhatsAppService.refreshServerConfigStatus();

    return () => {
      unsubStudents();
      unsubAtt();
      unsubTests();
      unsubFees();
      unsubAnn();
      unsubLogs();
      unsubCfg();
      unsubServer();
    };
  }, []);

  // View sub-tab (preserves composer as default)
  const [activeView, setActiveView] = useState<'composer' | 'history' | 'settings'>('composer');

  // Composer state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [selectedTemplate, setSelectedTemplate] = useState<'attendance' | 'test' | 'fee' | 'general'>('attendance');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // History Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyStudentFilter, setHistoryStudentFilter] = useState<string>('All');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'All' | WhatsAppNotificationType>('All');
  const [historyBatchFilter, setHistoryBatchFilter] = useState<string>('All');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'All' | WhatsAppDeliveryStatus>('All');

  // Action & Modal state
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [isSendingManual, setIsSendingManual] = useState(false);
  const [manualPreviewOpen, setManualPreviewOpen] = useState(false);

  const [resendTarget, setResendTarget] = useState<WhatsAppNotificationLog | null>(null);
  const [resendDraftMessage, setResendDraftMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const showFeedback = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // Ensure selectedStudentId stays valid once students hydrate
  useEffect(() => {
    if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return students;
    return students.filter((s) => {
      return (
        (s.fullName || '').toLowerCase().includes(term) ||
        (s.id || '').toLowerCase().includes(term) ||
        (s.rollNumber || '').toLowerCase().includes(term) ||
        getStudentSerialDisplay(s).toLowerCase().includes(term) ||
        (s.parentWhatsApp || '').toLowerCase().includes(term)
      );
    });
  }, [students, searchTerm]);

  const student = students.find((s) => s.id === selectedStudentId) || students[0];

  // Contextual student attendance, test, and fee data
  const latestAttendance = useMemo(() => {
    if (!student) return undefined;
    return attendance
      .filter((a) => a.studentId === student.id && a.status !== 'Neutral')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  }, [attendance, student]);

  const studentFee = fees.find((f) => f.studentId === student?.id);
  const pendingAmount = studentFee ? studentFee.pendingAmount : 0;

  const { latestTest, testScore } = useMemo(() => {
    if (!student) return { latestTest: tests[0], testScore: undefined };
    for (const t of tests) {
      const found = t.scores?.find((sc: TestScore) => sc.studentId === student.id);
      if (found) return { latestTest: t, testScore: found };
    }
    return { latestTest: tests[0], testScore: undefined };
  }, [tests, student]);

  // Template builders using real official formatting & dynamic student records
  const getTemplateMessage = (
    type: 'attendance' | 'test' | 'fee' | 'general',
    targetStudent: Student | undefined = student
  ): string => {
    if (!targetStudent) return '';

    const sAtt = attendance
      .filter((a) => a.studentId === targetStudent.id && a.status !== 'Neutral')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

    let sTest: WeeklyTest | undefined = tests[0];
    let sScore: TestScore | undefined;
    for (const t of tests) {
      const match = t.scores?.find((sc) => sc.studentId === targetStudent.id);
      if (match) {
        sTest = t;
        sScore = match;
        break;
      }
    }
    const sFee = fees.find((f) => f.studentId === targetStudent.id);

    switch (type) {
      case 'attendance':
        return buildAttendanceMessage({
          studentName: targetStudent.fullName,
          studentRoll: targetStudent.rollNumber,
          date: sAtt?.date || new Date().toISOString().split('T')[0],
          batch: sAtt?.batch || targetStudent.batch,
          attendanceStatus: sAtt?.status || 'Present',
          studentClass: sAtt?.studentClass || targetStudent.studentClass,
          timing: sAtt?.timing || targetStudent.timing,
        });

      case 'test':
        return buildWeeklyTestMessage({
          studentName: targetStudent.fullName,
          studentRoll: targetStudent.rollNumber,
          testTitle: sTest?.testTitle || 'Weekly Korean Language Assessment',
          testDate: sTest?.date || new Date().toISOString().split('T')[0],
          totalMarks: sScore?.maxPossibleScore || sTest?.totalMaxMarks || 100,
          obtainedMarks: sScore ? sScore.totalScore : 0,
          percentage: sScore ? sScore.percentage : 0,
          grade: sScore?.grade,
          remarks: sScore?.remarks,
        });

      case 'fee':
        return buildFeeReminderMessage({
          studentName: targetStudent.fullName,
          studentRoll: targetStudent.rollNumber,
          month: sFee?.month || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          pendingAmount: sFee ? sFee.pendingAmount : 0,
          totalAmount: sFee?.totalAmount,
          dueDate: sFee?.dueDate || 'Due Upon Receipt',
        });

      case 'general': {
        const latestPublishedNotice = announcements.find(
          (a) =>
            a.status === 'Published' &&
            (a.targetAudience === 'Everyone' ||
              a.targetAudience === 'All Students' ||
              (a.targetAudience === 'Specific Batch' && a.targetBatch === targetStudent.batch))
        );
        const noticeTitle = latestPublishedNotice?.title || `Academic Update (${targetStudent.batch.split(' (')[0]})`;
        const noticeBody =
          latestPublishedNotice?.message ||
          `Please note that regular ${targetStudent.level} classes for ${targetStudent.batch} are proceeding on schedule. Ensure punctual arrival and regular revision.`;
        return [
          'Dear Parent/Guardian,',
          '',
          `Notice for ${targetStudent.fullName} (${targetStudent.rollNumber}) · ${targetStudent.batch}:`,
          '',
          `Subject: ${noticeTitle}`,
          noticeBody,
          '',
          'For inquiries, please contact the OK Korean Language Centre administration.',
          'OK Korean Language Centre',
        ].join('\n');
      }
    }
  };

  const [messageText, setMessageText] = useState<string>(() => getTemplateMessage('attendance'));

  // Refresh template preview automatically on first student load if empty
  useEffect(() => {
    if (!messageText && student) {
      setMessageText(getTemplateMessage(selectedTemplate, student));
    }
  }, [student]);

  const handleTemplateSwitch = (type: 'attendance' | 'test' | 'fee' | 'general') => {
    setSelectedTemplate(type);
    setMessageText(getTemplateMessage(type, student));
  };

  const handleStudentSwitch = (id: string) => {
    setSelectedStudentId(id);
    const newStudent = students.find((s) => s.id === id);
    if (newStudent) {
      setMessageText(getTemplateMessage(selectedTemplate, newStudent));
    }
  };

  // Validate selected student's parent WhatsApp number
  const phoneValidation = validateWhatsAppPhone(
    student?.parentWhatsApp,
    automationConfig.defaultCountryCode || '92'
  );
  const cleanPhone = phoneValidation.normalized || student?.parentWhatsApp?.replace(/[^0-9]/g, '') || '';
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Overview KPI Stats
  const stats = useMemo(() => {
    const total = logs.length;
    const attendanceSent = logs.filter(
      (l) => l.notificationType === 'attendance' && l.status === 'Sent'
    ).length;
    const testSent = logs.filter(
      (l) => l.notificationType === 'test_result' && l.status === 'Sent'
    ).length;
    const pendingCount = logs.filter(
      (l) => l.status === 'Pending' || l.status === 'Not Configured'
    ).length;
    const failedCount = logs.filter((l) => l.status === 'Failed').length;
    const sentCount = logs.filter((l) => l.status === 'Sent').length;
    return { total, attendanceSent, testSent, pendingCount, failedCount, sentCount };
  }, [logs]);

  // Student-specific recent logs
  const selectedStudentLogs = useMemo(() => {
    if (!student) return [];
    return logs.filter((l) => l.studentId === student.id);
  }, [logs, student]);

  // Available batch options from logs & students
  const batchOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.batch && set.add(s.batch));
    logs.forEach((l) => l.batch && set.add(l.batch));
    return Array.from(set);
  }, [students, logs]);

  // Auto-Prepared Notifications Queue built from real Firestore records
  const preparedNotifications = useMemo(() => {
    const studentMap = new Map<string, Student>(students.map((s) => [s.id, s]));
    const items: Array<{
      id: string;
      student: Student;
      type: 'attendance' | 'test' | 'fee';
      badge: string;
      summary: string;
      message: string;
    }> = [];

    const latestAttByStudent = new Map<string, AttendanceRecord>();
    attendance
      .filter((a) => a.status !== 'Neutral')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .forEach((rec) => {
        if (!latestAttByStudent.has(rec.studentId)) {
          latestAttByStudent.set(rec.studentId, rec);
        }
      });

    latestAttByStudent.forEach((rec) => {
      const stu = studentMap.get(rec.studentId);
      if (!stu) return;
      items.push({
        id: `prep_att_${rec.id}`,
        student: stu,
        type: 'attendance',
        badge: `Attendance: ${rec.status}`,
        summary: `${rec.date} · ${stu.batch.split(' (')[0]}`,
        message: buildAttendanceMessage({
          studentName: stu.fullName,
          studentRoll: stu.rollNumber,
          date: rec.date,
          batch: rec.batch || stu.batch,
          attendanceStatus: rec.status,
          studentClass: rec.studentClass || stu.studentClass,
          timing: rec.timing || stu.timing,
        }),
      });
    });

    tests.slice(0, 3).forEach((t) => {
      (t.scores || []).slice(0, 6).forEach((sc) => {
        const stu = studentMap.get(sc.studentId);
        if (!stu) return;
        const maxMarks = sc.maxPossibleScore || t.totalMaxMarks || 100;
        items.push({
          id: `prep_tst_${t.id}_${stu.id}`,
          student: stu,
          type: 'test',
          badge: `Test: ${sc.totalScore}/${maxMarks} (${sc.percentage}%)`,
          summary: `${t.testTitle} · ${t.date}`,
          message: buildWeeklyTestMessage({
            studentName: stu.fullName,
            studentRoll: stu.rollNumber,
            testTitle: t.testTitle,
            testDate: t.date,
            totalMarks: maxMarks,
            obtainedMarks: sc.totalScore,
            percentage: sc.percentage,
            grade: sc.grade,
            remarks: sc.remarks,
          }),
        });
      });
    });

    fees
      .filter((f) => f.status !== 'Paid' && f.pendingAmount > 0)
      .slice(0, 8)
      .forEach((f) => {
        const stu = studentMap.get(f.studentId);
        if (!stu) return;
        items.push({
          id: `prep_fee_${f.id}`,
          student: stu,
          type: 'fee',
          badge: `Due: Rs. ${f.pendingAmount.toLocaleString()} PKR`,
          summary: `${f.month} · Due ${f.dueDate}`,
          message: buildFeeReminderMessage({
            studentName: stu.fullName,
            studentRoll: stu.rollNumber,
            month: f.month,
            pendingAmount: f.pendingAmount,
            totalAmount: f.totalAmount,
            dueDate: f.dueDate,
          }),
        });
      });

    return items.slice(0, 12);
  }, [students, attendance, tests, fees]);

  // Filtered History
  const filteredLogs = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return logs.filter((log) => {
      if (historyStudentFilter !== 'All' && log.studentId !== historyStudentFilter) return false;
      if (historyTypeFilter !== 'All' && log.notificationType !== historyTypeFilter) return false;
      if (historyBatchFilter !== 'All' && log.batch !== historyBatchFilter) return false;
      if (historyStatusFilter !== 'All' && log.status !== historyStatusFilter) return false;
      if (historyDateFilter && log.relatedDate !== historyDateFilter && !(log.createdAt || '').startsWith(historyDateFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        (log.studentName || '').toLowerCase().includes(q) ||
        (log.studentRoll || '').toLowerCase().includes(q) ||
        (log.parentWhatsApp || '').toLowerCase().includes(q) ||
        (log.messageContent || '').toLowerCase().includes(q)
      );
    });
  }, [
    logs,
    historySearch,
    historyStudentFilter,
    historyTypeFilter,
    historyBatchFilter,
    historyDateFilter,
    historyStatusFilter,
  ]);

  const mapTemplateToNotificationType = (
    tpl: 'attendance' | 'test' | 'fee' | 'general'
  ): WhatsAppNotificationType => {
    if (tpl === 'attendance') return 'attendance';
    if (tpl === 'test') return 'test_result';
    if (tpl === 'fee') return 'fee_reminder';
    return 'general';
  };

  const handleConfirmManualCloudSend = async () => {
    if (!student) return;
    setIsSendingManual(true);
    try {
      const result = await WhatsAppService.sendManualNotification({
        student,
        notificationType: mapTemplateToNotificationType(selectedTemplate),
        messageContent: messageText,
        triggeredBy: user?.name || 'Admin',
      });

      if (result?.status === 'Sent') {
        showFeedback('success', `WhatsApp message delivered to ${student.fullName}'s guardian (${result.normalizedPhone}).`);
      } else if (result?.status === 'Not Configured') {
        showFeedback('warning', 'Message saved in Not Configured state. Configure WhatsApp Business Cloud API env vars on server to enable delivery.');
      } else if (result?.status === 'Skipped (Opted Out)') {
        showFeedback('warning', `${student.fullName}'s guardian has opted out of WhatsApp alerts.`);
      } else {
        showFeedback('error', result?.errorDetails || 'Failed to deliver WhatsApp message.');
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Error sending WhatsApp message.');
    } finally {
      setIsSendingManual(false);
      setManualPreviewOpen(false);
    }
  };

  const handleRetrySingle = async (log: WhatsAppNotificationLog) => {
    if (!isAdmin) return;
    setRetryingIds((prev) => ({ ...prev, [log.id]: true }));
    try {
      const updated = await WhatsAppService.retryNotification(
        log.id,
        user?.name || 'Admin',
        user?.role || 'admin'
      );
      if (updated?.status === 'Sent') {
        showFeedback('success', `Retry succeeded for ${log.studentName}.`);
      } else if (updated?.status === 'Not Configured') {
        showFeedback('warning', 'WhatsApp Cloud API credentials are still not configured on the server.');
      } else {
        showFeedback('error', updated?.errorDetails || 'Retry attempt failed.');
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to retry notification.');
    } finally {
      setRetryingIds((prev) => ({ ...prev, [log.id]: false }));
    }
  };

  const handleRetryAllFailed = async () => {
    if (!isAdmin) return;
    setIsRetryingAll(true);
    try {
      const res = await WhatsAppService.retryAllFailed(
        logs,
        user?.name || 'Admin',
        user?.role || 'admin'
      );
      showFeedback(
        res.sent > 0 ? 'success' : 'warning',
        `Processed ${res.total} queued/failed notification(s): ${res.sent} sent, ${res.failed} remaining.`
      );
    } catch (err: any) {
      showFeedback('error', err?.message || 'Bulk retry failed.');
    } finally {
      setIsRetryingAll(false);
    }
  };

  const handleConfirmResend = async () => {
    if (!isAdmin || !resendTarget) return;
    setIsResending(true);
    try {
      const updated = await WhatsAppService.resendNotification(
        resendTarget.id,
        resendDraftMessage,
        user?.name || 'Admin',
        user?.role || 'admin'
      );
      if (updated?.status === 'Sent') {
        showFeedback('success', `Manual resend delivered to ${resendTarget.studentName}'s guardian.`);
      } else if (updated?.status === 'Not Configured') {
        showFeedback('warning', 'Resend logged as Not Configured because Cloud API credentials are missing.');
      } else {
        showFeedback('error', updated?.errorDetails || 'Manual resend failed.');
      }
    } catch (err: any) {
      showFeedback('error', err?.message || 'Unable to resend notification.');
    } finally {
      setIsResending(false);
      setResendTarget(null);
    }
  };

  const handleSaveAutomationPolicy = async () => {
    if (!isAdmin) return;
    setSavingPolicy(true);
    try {
      await WhatsAppService.saveAutomationConfig(automationConfig, user?.name || 'Admin');
      showFeedback('success', 'WhatsApp automation & notification policy saved to Firebase.');
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to save automation policy.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const getStatusBadge = (status: WhatsAppDeliveryStatus) => {
    switch (status) {
      case 'Sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Sent
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'Not Configured':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
            <AlertTriangle className="w-3 h-3" />
            Not Configured
          </span>
        );
      case 'Skipped (Opted Out)':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            <Ban className="w-3 h-3" />
            Opted Out
          </span>
        );
    }
  };

  const getTypeBadge = (type: WhatsAppNotificationType, isUpdated?: boolean) => {
    const labelMap: Record<WhatsAppNotificationType, string> = {
      attendance: isUpdated ? 'Attendance (Updated)' : 'Daily Attendance',
      test_result: isUpdated ? 'Test Result (Updated)' : 'Weekly Test Result',
      fee_reminder: 'Tuition Reminder',
      general: 'General Notice',
    };
    const colorMap: Record<WhatsAppNotificationType, string> = {
      attendance: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      test_result: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      fee_reminder: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      general: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${colorMap[type]}`}>
        {labelMap[type]}
      </span>
    );
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold max-w-md animate-fadeIn">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 flex-wrap">
            <MessageCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Parent WhatsApp Communication Hub</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                serverStatus.configured
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${serverStatus.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {serverStatus.configured ? 'Cloud API Connected' : 'API Not Configured'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated parent WhatsApp alerts for daily attendance & published weekly tests, plus manual communication & delivery tracking.
          </p>
        </div>

        {/* Sub-view Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setActiveView('composer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'composer'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Composer & Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'history'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Notification History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-black/15 dark:bg-white/15">
              {logs.length}
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveView('settings')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'settings'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Automation Policy</span>
            </button>
          )}
        </div>
      </div>

      {/* Clear Cloud API Configuration Warning (shown honestly if credentials are not configured) */}
      {!serverStatus.configured && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/35 border border-amber-300 dark:border-amber-800/70 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">
                WhatsApp Business Cloud API Credentials Not Configured
              </p>
              <p className="mt-0.5 opacity-90 leading-relaxed">
                Automated notifications triggered by Attendance & Weekly Tests are safely recorded in Firebase with status{' '}
                <strong className="font-mono">Not Configured</strong> instead of falsely reporting delivery. Set{' '}
                <code className="px-1.5 py-0.5 rounded bg-amber-500/20 font-mono text-[11px]">
                  {serverStatus.missingEnvVars.join(', ')}
                </code>{' '}
                in your server environment variables, then use <strong>Retry</strong> in Notification History.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => WhatsAppService.refreshServerConfigStatus()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-check Server</span>
          </button>
        </div>
      )}

      {/* Notification Overview KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Logged
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {stats.total}
          </p>
          <span className="text-[11px] text-slate-400">{stats.sentCount} delivered</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Attendance Sent
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {stats.attendanceSent}
          </p>
          <span className="text-[11px] text-slate-400">Daily presence alerts</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Weekly Test Sent
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {stats.testSent}
          </p>
          <span className="text-[11px] text-slate-400">Published assessment cards</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Pending / Config
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {stats.pendingCount}
          </p>
          <span className="text-[11px] text-slate-400">Awaiting API send</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Failed
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {stats.failedCount}
          </p>
          <span className="text-[11px] text-slate-400">Eligible for retry</span>
        </div>
      </div>

      {/* VIEW 1: COMPOSER & LIVE WHATSAPP VISUAL SIMULATOR (Original UI preserved + upgraded) */}
      {activeView === 'composer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (7 cols): Student Selector & Template Editor */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
              {/* Student Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Recipient Student
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search student by name, roll ID, or WhatsApp..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white bg-slate-50/50 dark:bg-slate-800 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSwitch(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-white bg-slate-50/50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {filteredStudents.length === 0 ? (
                    <option value="" disabled>No students found</option>
                  ) : (
                    filteredStudents.map((s, idx) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({getStudentSerialDisplay(s, idx)} · {s.rollNumber}) · WhatsApp: {s.parentWhatsApp}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Quick Info Capsule with Validation & Opt-Out Status */}
              {student && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {student.fullName}'s Guardian ({getStudentSerialDisplay(student)} · {student.rollNumber})
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          {student.parentWhatsApp || 'No number recorded'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                          phoneValidation.valid
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {phoneValidation.valid ? `Valid E.164: ${phoneValidation.formattedE164}` : 'Invalid Phone'}
                      </span>

                      <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800">
                        {student.batch.split(' (')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Consent & Quick Student History Link */}
                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {student.whatsappOptOut ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                          <Ban className="w-3.5 h-3.5" />
                          Parent Opted Out of Automated Alerts
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <UserCheck className="w-3.5 h-3.5" />
                          Parent WhatsApp Consent Active
                        </span>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            StorageService.updateStudentWhatsAppConsent(
                              student.id,
                              !student.whatsappOptOut,
                              user?.name || 'Admin',
                              'admin'
                            );
                            showFeedback(
                              'info',
                              `${student.fullName} WhatsApp consent set to ${!student.whatsappOptOut ? 'Opted Out' : 'Active'}.`
                            );
                          }}
                          className="text-[11px] font-bold underline text-indigo-500 hover:text-indigo-400 cursor-pointer"
                        >
                          {student.whatsappOptOut ? 'Re-enable' : 'Opt Out'}
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setHistoryStudentFilter(student.id);
                        setActiveView('history');
                      }}
                      className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      View Student Log ({selectedStudentLogs.length}) →
                    </button>
                  </div>
                </div>
              )}

              {/* Template Choice Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select Notification Template
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTemplateSwitch('attendance')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                      selectedTemplate === 'attendance'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <CalendarCheck className={`w-4 h-4 ${selectedTemplate === 'attendance' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">Daily Attendance</span>
                      <span className="text-[10px] text-slate-400">{latestAttendance ? `${latestAttendance.status} (${latestAttendance.date})` : 'Official template'}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTemplateSwitch('test')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                      selectedTemplate === 'test'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Award className={`w-4 h-4 ${selectedTemplate === 'test' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">Weekly Test</span>
                      <span className="text-[10px] text-slate-400">{testScore ? `${testScore.percentage}% (${testScore.grade})` : 'Result card'}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTemplateSwitch('fee')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                      selectedTemplate === 'fee'
                        ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/40 ring-1 ring-rose-500'
                        : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 ${selectedTemplate === 'fee' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">Tuition Due</span>
                      <span className="text-[10px] text-slate-400">Rs. {pendingAmount.toLocaleString()}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTemplateSwitch('general')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                      selectedTemplate === 'general'
                        ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/40 ring-1 ring-amber-500'
                        : 'border-slate-200 dark:border-slate-850 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Bell className={`w-4 h-4 ${selectedTemplate === 'general' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">General</span>
                      <span className="text-[10px] text-slate-400">Notice/Workshop</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Editable Text Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Message Body (Editable)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>
                <textarea
                  rows={10}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50/40 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Dispatch Buttons: Preview & Cloud API + Direct wa.me Fallback */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  disabled={!student || !messageText.trim() || isSendingManual}
                  onClick={() => setManualPreviewOpen(true)}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview & Send via Cloud API</span>
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-emerald-500" />
                  <span>Launch WhatsApp Web</span>
                </a>
              </div>
            </div>

            {/* Right Column (5 cols): WhatsApp Chat Visual Simulator (Original preserved) */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="bg-[#efeae2] rounded-3xl border border-slate-300/80 shadow-lg overflow-hidden flex flex-col h-full min-h-[480px]">
                {/* WhatsApp App Top Bar */}
                <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white overflow-hidden ring-1 ring-white/60 shrink-0 p-0.5">
                      <img
                        src="/logo.png"
                        alt="OK Korean Language Center"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">OK Korean Language Center</p>
                      <p className="text-[10px] text-emerald-200">Official Parent Communication</p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-200">
                    {serverStatus.configured ? 'Cloud API' : 'Preview'}
                  </div>
                </div>

                {/* Chat Body */}
                <div className="flex-1 p-4 flex flex-col justify-end overflow-y-auto">
                  <div className="self-center bg-white/80 backdrop-blur-xs text-[10px] font-semibold text-slate-600 px-3 py-1 rounded-full shadow-xs mb-4">
                    TODAY
                  </div>

                  {/* Message Bubble (WhatsApp Style) */}
                  <div className="max-w-[92%] bg-[#d9fdd3] text-slate-800 rounded-2xl rounded-tr-xs p-3.5 shadow-sm text-xs leading-relaxed space-y-1.5 self-end relative">
                    <div className="whitespace-pre-wrap font-sans text-xs">
                      {messageText}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 pt-1">
                      <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="p-3 bg-[#f0f2f5] border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px]">
                    To: <strong className="font-mono">{phoneValidation.formattedE164 || student?.parentWhatsApp || 'No number'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualPreviewOpen(true)}
                    disabled={!student || !messageText.trim()}
                    className="text-emerald-700 font-bold hover:underline cursor-pointer disabled:opacity-40"
                  >
                    Direct API Send →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Student-Specific Recent Notification Records */}
          {student && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-500" />
                  <span>Recent Automated Notifications for {student.fullName} ({student.rollNumber})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryStudentFilter(student.id);
                    setActiveView('history');
                  }}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  View Full History →
                </button>
              </div>

              {selectedStudentLogs.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">
                  No automated or manual WhatsApp notifications logged for {student.fullName} yet. Marking attendance or publishing weekly test marks will appear here automatically.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedStudentLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getTypeBadge(log.notificationType, log.isUpdatedNotification)}
                          {getStatusBadge(log.status)}
                          <span className="text-[11px] font-mono text-slate-400">
                            {formatTimestamp(log.updatedAt || log.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 truncate max-w-2xl">
                          {log.messageContent.replace(/\s+/g, ' ')}
                        </p>
                        {log.errorDetails && (
                          <p className="text-[11px] text-rose-500 font-medium">{log.errorDetails}</p>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                          {(log.status === 'Failed' || log.status === 'Not Configured' || log.status === 'Pending') && (
                            <button
                              type="button"
                              onClick={() => handleRetrySingle(log)}
                              disabled={retryingIds[log.id]}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 font-bold text-[11px] cursor-pointer"
                            >
                              {retryingIds[log.id] ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setResendTarget(log);
                              setResendDraftMessage(log.messageContent);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
                          >
                            Preview & Resend
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Auto-Prepared Notifications Queue (From Real Student Records) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Auto-Prepared Parent Notifications (Attendance, Weekly Tests & Pending Fees)</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Automatically generated from live Firestore student records. Load into composer or launch directly in WhatsApp.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                {preparedNotifications.length} Ready
              </span>
            </div>

            {preparedNotifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                No attendance, weekly test, or pending fee records available yet to auto-prepare notifications.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {preparedNotifications.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex flex-col justify-between gap-2.5 text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 dark:text-white truncate">{item.student.fullName}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="font-mono text-[10px] text-emerald-500 font-bold">{getStudentSerialDisplay(item.student)}</span>
                          <span className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400">{item.student.rollNumber}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          item.type === 'attendance'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : item.type === 'test'
                            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}>
                          {item.badge}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.summary}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(item.student.id);
                          setSelectedTemplate(item.type);
                          setMessageText(item.message);
                          setManualPreviewOpen(true);
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer text-center"
                      >
                        Load & Send
                      </button>
                      <a
                        href={buildWhatsAppWebUrl(
                          item.student.parentWhatsApp,
                          item.message,
                          automationConfig.defaultCountryCode || '92'
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-[11px] hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Open in WhatsApp Web / Desktop"
                      >
                        <ExternalLink className="w-3 h-3 text-emerald-500" />
                        <span>wa.me</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: AUTOMATIC NOTIFICATION HISTORY & FILTERING */}
      {activeView === 'history' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                <Filter className="w-4 h-4 text-emerald-500" />
                <span>Filter Notification History</span>
              </div>

              {isAdmin && (stats.failedCount > 0 || stats.pendingCount > 0) && (
                <button
                  type="button"
                  onClick={handleRetryAllFailed}
                  disabled={isRetryingAll}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isRetryingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>Retry All Pending / Failed ({stats.failedCount + stats.pendingCount})</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search student, ID, phone, text..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Student Filter */}
              <select
                value={historyStudentFilter}
                onChange={(e) => setHistoryStudentFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="All">All Students</option>
                {students.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({getStudentSerialDisplay(s, idx)} · {s.rollNumber})
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="All">All Types</option>
                <option value="attendance">Daily Attendance</option>
                <option value="test_result">Weekly Test Results</option>
                <option value="fee_reminder">Tuition Reminder</option>
                <option value="general">General Notice</option>
              </select>

              {/* Batch Filter */}
              <select
                value={historyBatchFilter}
                onChange={(e) => setHistoryBatchFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="All">All Batches</option>
                {batchOptions.map((b) => (
                  <option key={b} value={b}>
                    {b.split(' (')[0]}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Sent">Sent</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Not Configured">Not Configured</option>
                <option value="Skipped (Opted Out)">Opted Out</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Filter Date:</span>
                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                />
                {(historyDateFilter ||
                  historySearch ||
                  historyStudentFilter !== 'All' ||
                  historyTypeFilter !== 'All' ||
                  historyBatchFilter !== 'All' ||
                  historyStatusFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearch('');
                      setHistoryStudentFilter('All');
                      setHistoryTypeFilter('All');
                      setHistoryBatchFilter('All');
                      setHistoryDateFilter('');
                      setHistoryStatusFilter('All');
                    }}
                    className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <span className="text-slate-500 dark:text-slate-400 font-mono">
                Showing {filteredLogs.length} of {logs.length} notifications
              </span>
            </div>
          </div>

          {/* History List */}
          {filteredLogs.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
              <MessageCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No notification history matching your filters
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Automated notifications appear here as soon as attendance is saved or weekly test results are published.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {log.studentName}
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700">
                          {log.studentRoll}
                        </span>
                        {getTypeBadge(log.notificationType, log.isUpdatedNotification)}
                        {getStatusBadge(log.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>WhatsApp: {log.normalizedPhone ? `+${log.normalizedPhone}` : log.parentWhatsApp}</span>
                        <span>·</span>
                        <span>Batch: {log.batch?.split(' (')[0] || '—'}</span>
                        <span>·</span>
                        <span>Date: {log.relatedDate}</span>
                        <span>·</span>
                        <span>Updated: {formatTimestamp(log.updatedAt || log.createdAt)}</span>
                        {log.triggeredBy && (
                          <>
                            <span>·</span>
                            <span>By: {log.triggeredBy}</span>
                          </>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs font-sans whitespace-pre-wrap text-slate-700 dark:text-slate-200 leading-relaxed">
                        {log.messageContent}
                      </div>

                      {log.apiResponse?.messageId && (
                        <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                          Meta Cloud API Message ID: {log.apiResponse.messageId} ({log.apiResponse.mode || 'text'})
                        </p>
                      )}

                      {log.errorDetails && (
                        <p className="text-[11px] font-medium text-rose-500">
                          Delivery Notice: {log.errorDetails}
                        </p>
                      )}
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex flex-row md:flex-col items-center md:items-stretch gap-2 shrink-0">
                        {(log.status === 'Failed' || log.status === 'Not Configured' || log.status === 'Pending') && (
                          <button
                            type="button"
                            onClick={() => handleRetrySingle(log)}
                            disabled={retryingIds[log.id]}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {retryingIds[log.id] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                            <span>Retry</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setResendTarget(log);
                            setResendDraftMessage(log.messageContent);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600/15 hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white border border-emerald-500/30 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview & Resend</span>
                        </button>

                        <a
                          href={buildWhatsAppWebUrl(
                            log.normalizedPhone || log.parentWhatsApp,
                            log.messageContent,
                            automationConfig.defaultCountryCode || '92'
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
                          title="Fallback: Launch pre-filled message in WhatsApp Web"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Launch WhatsApp</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Remove notification log entry for ${log.studentName}?`)) {
                              WhatsAppService.deleteNotificationLog(log.id);
                            }
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
                          title="Delete notification log record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: ADMIN AUTOMATION & NOTIFICATION POLICY */}
      {activeView === 'settings' && isAdmin && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>Automated Parent Notification Policy</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure triggers, duplicate/edit behavior, country code defaults, and Meta Cloud API template mode.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveAutomationPolicy}
              disabled={savingPolicy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
            >
              {savingPolicy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Save Automation Policy</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Daily Attendance Trigger */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white block">
                    Automatic Attendance Notifications
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Notify parents immediately when Teacher/Admin saves attendance to Firebase.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={automationConfig.autoSendOnAttendanceSave}
                  onChange={(e) =>
                    setAutomationConfig((prev) => ({
                      ...prev,
                      autoSendOnAttendanceSave: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 accent-emerald-600 cursor-pointer shrink-0"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  When Attendance Is Edited Later
                </label>
                <select
                  value={automationConfig.editedAttendancePolicy}
                  onChange={(e) =>
                    setAutomationConfig((prev) => ({
                      ...prev,
                      editedAttendancePolicy: e.target.value as EditedAttendancePolicy,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="resend_updated">Send Updated Attendance Notification</option>
                  <option value="notify_only_if_absent_or_late">Notify Only If Changed to Absent or Late</option>
                  <option value="do_not_resend">Do Not Resend When Edited Later</option>
                </select>
              </div>
            </div>

            {/* Weekly Test Trigger */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white block">
                    Automatic Weekly Test Notifications
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Notify parents automatically when test marks are saved and published (never for drafts).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={automationConfig.autoSendOnTestPublish}
                  onChange={(e) =>
                    setAutomationConfig((prev) => ({
                      ...prev,
                      autoSendOnTestPublish: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 accent-emerald-600 cursor-pointer shrink-0"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Notify on Corrected Results
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Send an [Updated Result] alert only to students whose score/grade/remarks changed.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={automationConfig.sendUpdatedTestResultNotification}
                  onChange={(e) =>
                    setAutomationConfig((prev) => ({
                      ...prev,
                      sendUpdatedTestResultNotification: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 accent-emerald-600 cursor-pointer shrink-0"
                />
              </div>
            </div>

            {/* International Phone & Meta Template Mode */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="block font-bold text-sm text-slate-900 dark:text-white">
                Default Country Calling Code (Local Numbers)
              </label>
              <input
                type="text"
                value={automationConfig.defaultCountryCode}
                onChange={(e) =>
                  setAutomationConfig((prev) => ({
                    ...prev,
                    defaultCountryCode: e.target.value.replace(/\D/g, '') || '92',
                  }))
                }
                placeholder="92"
                className="w-32 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
              />
              <p className="text-slate-500 dark:text-slate-400">
                Used to normalize local numbers (e.g. 03001234567 → +923001234567). Numbers already starting with + or country code are kept intact.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-sm text-slate-900 dark:text-white block">
                    Use Approved Meta Message Templates
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Required for business-initiated WhatsApp conversations outside the 24-hour window when template names are configured in server env vars.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={automationConfig.useApprovedTemplates}
                  onChange={(e) =>
                    setAutomationConfig((prev) => ({
                      ...prev,
                      useApprovedTemplates: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 accent-emerald-600 cursor-pointer shrink-0"
                />
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Server Templates Configured: Attendance ({serverStatus.templatesConfigured.attendance ? 'Yes' : 'No'}), Weekly Test ({serverStatus.templatesConfigured.test ? 'Yes' : 'No'})
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-cyan-500" />
              <span>Server-Side Security & Credential Status</span>
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              API Provider: <strong>{serverStatus.provider}</strong> ({serverStatus.apiVersion}) · Phone Number ID:{' '}
              <code className="font-mono">{serverStatus.phoneNumberIdMasked || 'Not Configured'}</code>. Access tokens remain strictly on the Express backend and are never sent to the browser.
            </p>
          </div>
        </div>
      )}

      {/* MODAL 1: Manual Message Preview Before Cloud API Dispatch */}
      {manualPreviewOpen && student && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Preview Message Before Sending
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    To: {student.fullName}'s Guardian ({phoneValidation.formattedE164 || student.parentWhatsApp})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManualPreviewOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!phoneValidation.valid && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 font-semibold">
                {phoneValidation.reason} Sending will fail validation until updated.
              </div>
            )}

            {student.whatsappOptOut && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-500 font-semibold">
                Guardian has opted out of WhatsApp alerts. Delivery will be skipped.
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs whitespace-pre-wrap max-h-64 overflow-y-auto text-slate-800 dark:text-slate-100 leading-relaxed">
              {messageText}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setManualPreviewOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmManualCloudSend}
                disabled={isSendingManual}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
              >
                {isSendingManual ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isSendingManual ? 'Sending...' : 'Confirm & Send Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Admin Preview & Manual Resend from History */}
      {resendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Manual Resend · {resendTarget.studentName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Guardian WhatsApp: {resendTarget.normalizedPhone ? `+${resendTarget.normalizedPhone}` : resendTarget.parentWhatsApp}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResendTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={9}
              value={resendDraftMessage}
              onChange={(e) => setResendDraftMessage(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setResendTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResend}
                disabled={isResending || !resendDraftMessage.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50"
              >
                {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isResending ? 'Resending...' : 'Confirm Resend'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

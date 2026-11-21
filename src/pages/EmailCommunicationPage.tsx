import React, { useEffect, useMemo, useState } from 'react';
import {
  Mail,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Users,
  History,
} from 'lucide-react';
import { AcademyDataService } from '../services/academyDataService';
import { StorageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import {
  EmailLogRecord,
  EmailRecipient,
  EmailServerConfigStatus,
  FeeRecord,
  Student,
  TeacherAccount,
  WeeklyTest,
} from '../types';

export const EmailCommunicationPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => StorageService.getTeacherAccounts());
  const [fees, setFees] = useState<FeeRecord[]>(() => StorageService.getFees());
  const [tests, setTests] = useState<WeeklyTest[]>(() => StorageService.getTests());
  const [emailLogs, setEmailLogs] = useState<EmailLogRecord[]>(() => AcademyDataService.getEmailLogs());

  const [configStatus, setConfigStatus] = useState<EmailServerConfigStatus>({
    configured: false,
    provider: 'Checking...',
    fromAddress: null,
    missingEnvVars: [],
  });

  const [recipientType, setRecipientType] = useState<'Student' | 'Parent' | 'Teacher' | 'Custom'>('Student');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [customEmail, setCustomEmail] = useState('');
  const [templateKey, setTemplateKey] = useState<'custom' | 'fee' | 'test' | 'notice'>('notice');
  const [subject, setSubject] = useState('Official Academic Notice · OK Korean Language Centre');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'error'; msg: string } | null>(null);

  const loadConfig = async () => {
    const status = await AcademyDataService.fetchEmailConfigStatus();
    setConfigStatus(status);
  };

  useEffect(() => {
    const u1 = StorageService.subscribeStudents(setStudents);
    const u2 = StorageService.subscribeTeachers(setTeachers);
    const u3 = StorageService.subscribeFees(setFees);
    const u4 = StorageService.subscribeTests(setTests);
    const u5 = AcademyDataService.subscribeEmailLogs(setEmailLogs);
    loadConfig();
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, []);

  const selectableRecipients = useMemo(() => {
    if (recipientType === 'Teacher') {
      return teachers
        .filter((t) => Boolean(t.email))
        .map((t) => ({
          id: t.id,
          name: t.name,
          email: t.email || '',
          roleLabel: 'Instructor / Staff',
        }));
    }
    if (recipientType === 'Student' || recipientType === 'Parent') {
      return students
        .filter((s) => Boolean(s.email || s.personalEmail || s.portalEmail))
        .map((s) => ({
          id: s.id,
          name: recipientType === 'Parent' ? `Guardian of ${s.fullName}` : s.fullName,
          email: s.email || s.personalEmail || s.portalEmail || '',
          roleLabel: `${recipientType} (${s.rollNumber})`,
        }));
    }
    return [];
  }, [recipientType, students, teachers]);

  const activeRecipient: EmailRecipient | null = useMemo(() => {
    if (recipientType === 'Custom') {
      return customEmail.trim()
        ? { name: customEmail.trim(), email: customEmail.trim(), roleLabel: 'Custom Recipient' }
        : null;
    }
    return selectableRecipients.find((r) => r.id === selectedPersonId) || selectableRecipients[0] || null;
  }, [recipientType, customEmail, selectableRecipients, selectedPersonId]);

  const applyTemplate = (tpl: 'custom' | 'fee' | 'test' | 'notice', target: EmailRecipient | null) => {
    setTemplateKey(tpl);
    const stu = students.find((s) => s.id === target?.id);
    if (tpl === 'fee' && stu) {
      const f = fees.find((x) => x.studentId === stu.id && x.status !== 'Paid');
      setSubject(`Tuition Fee Statement · ${stu.fullName} (${stu.rollNumber})`);
      setBody(
        `Dear ${target?.name || 'Parent/Guardian'},\n\nThis is an official fee update from OK Korean Language Centre.\n\nStudent: ${stu.fullName} (${stu.rollNumber})\nBatch: ${stu.batch}\nPending Amount: Rs. ${(f?.pendingAmount ?? 0).toLocaleString()} PKR\nDue Date: ${f?.dueDate || 'Upon Receipt'}\n\nPlease contact the accounts office for payment assistance.\n\nBest regards,\nOK Korean Language Centre`
      );
      return;
    }
    if (tpl === 'test' && stu) {
      const latestT = tests.find((t) => t.scores?.some((sc) => sc.studentId === stu.id));
      const sc = latestT?.scores?.find((x) => x.studentId === stu.id);
      setSubject(`Weekly Test Result · ${stu.fullName} (${latestT?.testTitle || 'Assessment'})`);
      setBody(
        `Dear ${target?.name || 'Parent/Guardian'},\n\nAssessment Summary:\nStudent: ${stu.fullName} (${stu.rollNumber})\nTest: ${latestT?.testTitle || 'Weekly Korean Assessment'}\nScore: ${sc ? `${sc.totalScore}/${sc.maxPossibleScore || latestT?.totalMaxMarks || 100} (${sc.percentage}%, Grade ${sc.grade})` : 'Recorded'}\n\nBest regards,\nOK Korean Language Centre`
      );
      return;
    }
    setSubject(`Official Communication · OK Korean Language Centre`);
    setBody(
      `Dear ${target?.name || 'Member'},\n\nWe are writing to share an official update from OK Korean Language Centre.\n\nPlease reply to this email or contact the academy office if you have any questions.\n\nWarm regards,\nOK Korean Language Centre`
    );
  };

  useEffect(() => {
    if (!body && activeRecipient) {
      applyTemplate(templateKey, activeRecipient);
    }
  }, [activeRecipient?.email]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecipient || !activeRecipient.email) {
      setToast({ type: 'error', msg: 'Please select or enter a valid recipient email address.' });
      return;
    }
    setIsSending(true);
    try {
      const res = await AcademyDataService.sendEmail({
        recipientType,
        recipients: [activeRecipient],
        subject,
        body,
        templateName: templateKey,
        sentBy: user?.name || 'Admin',
        role: user?.role || 'admin',
      });
      if (res.ok && res.emailLog?.status === 'Sent') {
        setToast({ type: 'success', msg: `Email sent successfully to ${activeRecipient.email}.` });
      } else if (!res.configured || res.emailLog?.status === 'Not Configured') {
        setToast({
          type: 'warning',
          msg: 'Email service is not configured on the server. Logged honestly as Not Configured.',
        });
      } else {
        setToast({ type: 'error', msg: res.error || 'Email delivery failed.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', msg: err?.message || 'Failed to send email.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-emerald-500" />
            <span>Official Email Communication</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compose and dispatch verified emails to students, parents, and faculty via configured Resend or SMTP service.
          </p>
        </div>

        <button
          type="button"
          onClick={loadConfig}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
          <span>{configStatus.configured ? `Connected (${configStatus.provider})` : 'Service Not Configured'}</span>
        </button>
      </div>

      {/* Honest Server Config Status Banner */}
      {!configStatus.configured && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/35 border border-amber-300 dark:border-amber-800/70 text-amber-950 dark:text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm">Email Delivery Service Is Not Configured</p>
            <p className="mt-0.5 opacity-90">
              Emails are only sent when a real server mail provider is configured. Set{' '}
              <code className="font-mono px-1.5 py-0.5 rounded bg-amber-500/20">RESEND_API_KEY</code> or{' '}
              <code className="font-mono px-1.5 py-0.5 rounded bg-amber-500/20">SMTP_HOST, SMTP_USER, SMTP_PASS</code>{' '}
              in your server environment variables. Unconfigured send attempts are recorded as{' '}
              <strong className="font-mono">Not Configured</strong> instead of falsely reporting Sent.
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
            toast.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
              : toast.type === 'warning'
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-500'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-500'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : toast.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Composer */}
        <form
          onSubmit={handleSendEmail}
          className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4 text-xs"
        >
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
            <Users className="w-4 h-4 text-emerald-500" />
            <span>Compose Official Email</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Recipient Group</label>
              <select
                value={recipientType}
                onChange={(e) => {
                  setRecipientType(e.target.value as any);
                  setSelectedPersonId('');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="Student">Students</option>
                <option value="Parent">Parents / Guardians</option>
                <option value="Teacher">Faculty / Teachers</option>
                <option value="Custom">Custom Email Address</option>
              </select>
            </div>

            {recipientType === 'Custom' ? (
              <div>
                <label className="block font-semibold mb-1">Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            ) : (
              <div>
                <label className="block font-semibold mb-1">Select Recipient ({selectableRecipients.length} with email)</label>
                <select
                  value={activeRecipient?.id || ''}
                  onChange={(e) => {
                    setSelectedPersonId(e.target.value);
                    const nextRec = selectableRecipients.find((r) => r.id === e.target.value) || null;
                    applyTemplate(templateKey, nextRec);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {selectableRecipients.length === 0 ? (
                    <option value="">No email addresses saved on profiles yet</option>
                  ) : (
                    selectableRecipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.email})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'notice', label: 'Academy Notice' },
              { id: 'fee', label: 'Fee Reminder' },
              { id: 'test', label: 'Weekly Test Result' },
              { id: 'custom', label: 'Blank / Custom' },
            ].map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl.id as any, activeRecipient)}
                className={`px-3 py-1.5 rounded-lg font-semibold border cursor-pointer ${
                  templateKey === tpl.id
                    ? 'bg-emerald-600/15 border-emerald-500 text-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                {tpl.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block font-semibold mb-1">Subject *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Email Body *</label>
            <textarea
              rows={9}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-sans leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={isSending || !activeRecipient?.email}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{isSending ? 'Dispatching...' : 'Send Email via Configured Server'}</span>
          </button>
        </form>

        {/* Dispatch Logs */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-500" />
            <span>Email Delivery History ({emailLogs.length})</span>
          </h3>

          {emailLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No emails dispatched yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {emailLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate">{log.subject}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        log.status === 'Sent'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : log.status === 'Not Configured'
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-rose-500/15 text-rose-500'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-cyan-500 truncate">
                    To: {log.recipients.map((r) => r.email).join(', ')}
                  </p>
                  {log.errorDetails && <p className="text-[11px] text-amber-500">{log.errorDetails}</p>}
                  <p className="text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString()} · By {log.sentBy || 'Admin'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

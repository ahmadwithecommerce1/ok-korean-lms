import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  CreditCard,
  Award,
  CalendarCheck,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { WhatsAppService, buildFeeReminderMessage, buildWhatsAppWebUrl } from '../services/whatsappService';
import { useAuth } from '../context/AuthContext';
import {
  AppPushNotification,
  FeeRecord,
  Student,
  WeeklyTest,
  WhatsAppNotificationLog,
} from '../types';

export const NotificationsCentrePage: React.FC = () => {
  const { user } = useAuth();
  const [appNotifs, setAppNotifs] = useState<AppPushNotification[]>(() => StorageService.getAppNotifications());
  const [waLogs, setWaLogs] = useState<WhatsAppNotificationLog[]>(() => WhatsAppService.getNotificationLogs());
  const [fees, setFees] = useState<FeeRecord[]>(() => StorageService.getFees());
  const [tests, setTests] = useState<WeeklyTest[]>(() => StorageService.getTests());
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'system' | 'fees' | 'whatsapp' | 'tests'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const u1 = StorageService.subscribeAppNotifications(setAppNotifs);
    const u2 = WhatsAppService.subscribeNotificationLogs(setWaLogs);
    const u3 = StorageService.subscribeFees(setFees);
    const u4 = StorageService.subscribeTests(setTests);
    const u5 = StorageService.subscribeStudents(setStudents);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, []);

  const unpaidFees = useMemo(() => fees.filter((f) => f.status !== 'Paid' && f.pendingAmount > 0), [fees]);
  const unreadAppNotifs = appNotifs.filter((n) => !n.read).length;
  const pendingWaCount = waLogs.filter((l) => l.status !== 'Sent' && l.status !== 'Skipped (Opted Out)').length;

  const handleDispatchFeeReminder = async (fee: FeeRecord) => {
    const stu = students.find((s) => s.id === fee.studentId);
    const res = await WhatsAppService.dispatchFeeReminderNotification({
      fee,
      student: stu,
      triggeredBy: user?.name || 'Admin',
    });
    setFeedback(
      res?.status === 'Sent'
        ? `Fee reminder sent to ${fee.studentName}'s guardian via WhatsApp Cloud API.`
        : `Fee reminder logged (${res?.status || 'Not Configured'}) for ${fee.studentName}.`
    );
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-500" />
            <span>Notifications Centre</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Unified hub for system alerts, attendance notifications, weekly test broadcasts, and pending tuition reminders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => StorageService.markAllNotificationsRead()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Read</span>
          </button>
          <button
            type="button"
            onClick={() => StorageService.clearAllNotifications()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-500 text-xs font-bold cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold">
          {feedback}
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-slate-400">Unread System Alerts</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{unreadAppNotifs}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-rose-500">Pending Fee Reminders</span>
          <p className="text-2xl font-black text-rose-500 mt-1 tabular-nums">{unpaidFees.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-amber-500">WhatsApp Queue / Config</span>
          <p className="text-2xl font-black text-amber-500 mt-1 tabular-nums">{pendingWaCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase text-indigo-400">Recent Test Publications</span>
          <p className="text-2xl font-black text-indigo-400 mt-1 tabular-nums">{tests.filter((t) => t.published).length}</p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Alerts' },
          { id: 'system', label: `System & Attendance (${appNotifs.length})` },
          { id: 'fees', label: `Fee Reminders (${unpaidFees.length})` },
          { id: 'whatsapp', label: `WhatsApp Delivery (${waLogs.length})` },
          { id: 'tests', label: `Weekly Tests (${tests.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategoryFilter(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
              categoryFilter === tab.id
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending Fee Reminders Section */}
      {(categoryFilter === 'all' || categoryFilter === 'fees') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-500" />
            <span>Actionable Tuition Fee Reminders</span>
          </h3>
          {unpaidFees.length === 0 ? (
            <p className="text-xs text-slate-400">No pending or partial student tuition balances at this time.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {unpaidFees.slice(0, 10).map((f) => {
                const stu = students.find((s) => s.id === f.studentId);
                const msg = buildFeeReminderMessage({
                  studentName: stu?.fullName || f.studentName,
                  studentRoll: stu?.rollNumber || f.studentRoll,
                  month: f.month,
                  pendingAmount: f.pendingAmount,
                  totalAmount: f.totalAmount,
                  dueDate: f.dueDate,
                });
                return (
                  <div key={f.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{f.studentName}</span>{' '}
                      <span className="font-mono text-[11px] text-cyan-500">({f.studentRoll})</span>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {f.month} · Pending: <strong className="text-rose-500">Rs. {f.pendingAmount.toLocaleString()} PKR</strong> · Due: {f.dueDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDispatchFeeReminder(f)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Send Cloud API Reminder
                      </button>
                      <a
                        href={buildWhatsAppWebUrl(stu?.parentWhatsApp, msg)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-semibold text-[11px]"
                      >
                        wa.me
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* System & Attendance Alerts */}
      {(categoryFilter === 'all' || categoryFilter === 'system') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
            <span>System, Attendance & Reminder Alerts</span>
          </h3>
          {appNotifs.length === 0 ? (
            <p className="text-xs text-slate-400">No system alerts logged.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {appNotifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => StorageService.markNotificationRead(n.id)}
                  className={`py-3 flex items-start justify-between gap-3 text-xs cursor-pointer ${
                    n.read ? 'opacity-70' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                      <span className="font-bold text-slate-900 dark:text-white">{n.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(n.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-1">{n.body}</p>
                  </div>
                  {!n.read && (
                    <span className="text-[10px] font-bold text-emerald-500 shrink-0">Mark Read</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WhatsApp Logs Feed */}
      {(categoryFilter === 'all' || categoryFilter === 'whatsapp') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span>Recent WhatsApp Dispatch Feed</span>
          </h3>
          {waLogs.length === 0 ? (
            <p className="text-xs text-slate-400">No WhatsApp notifications triggered yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {waLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{log.studentName}</span>{' '}
                    <span className="text-[11px] text-slate-400">({log.notificationType}) · {log.relatedDate}</span>
                    {log.errorDetails && (
                      <p className="text-[11px] text-amber-500 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> {log.errorDetails}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    log.status === 'Sent'
                      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tests Feed */}
      {(categoryFilter === 'all' || categoryFilter === 'tests') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-400" />
            <span>Weekly Test Result Alerts</span>
          </h3>
          {tests.length === 0 ? (
            <p className="text-xs text-slate-400">No weekly test records yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {tests.slice(0, 6).map((t) => (
                <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{t.testTitle}</span>
                    <span className="block text-[11px] text-slate-400">{t.batch} · {t.date} · {t.scores?.length || 0} scores</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    t.published ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
                  }`}>
                    {t.published ? 'Published' : 'Draft'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

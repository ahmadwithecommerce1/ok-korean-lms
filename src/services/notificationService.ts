import { AppPushNotification, TabId, TeacherAccount } from '../types';
import { StorageService } from './storageService';

// Play modern subtle chime using Web Audio API
function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    // Audio context may be restricted by autoplay policy until user gesture
  }
}

export const NotificationService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('SW register notice:', err);
        });
      }
      return permission;
    } catch (e) {
      console.warn('Notification permission request error:', e);
      return 'denied';
    }
  },

  async sendNotification(params: {
    title: string;
    body: string;
    type: AppPushNotification['type'];
    targetRole?: 'admin' | 'teacher' | 'all';
    targetTeacherId?: string;
    linkTab?: TabId;
  }): Promise<AppPushNotification> {
    const { title, body, type, targetRole = 'all', targetTeacherId, linkTab } = params;

    // 1. Play subtle chime
    playChime();

    // 2. Add to in-app notification center via StorageService
    const stored = StorageService.addAppNotification({
      title,
      body,
      type,
      targetRole,
      targetTeacherId,
      linkTab
    });

    // 3. Dispatch native browser push notification if permitted
    if (this.isSupported() && Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const registration = await navigator.serviceWorker.ready;
          registration.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `ok-lms-${Date.now()}`,
            data: { url: '/', linkTab }
          });
        } else {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            data: { url: '/', linkTab }
          });
        }
      } catch (err) {
        console.warn('Native notification trigger warning:', err);
      }
    }

    return stored;
  },

  // Specific Event Triggers
  notifyAttendanceMarked(teacherName: string, className: string, count: number) {
    this.sendNotification({
      title: 'Attendance Marked',
      body: `Teacher ${teacherName} has marked attendance for ${className} (${count} students recorded).`,
      type: 'attendance_marked',
      targetRole: 'admin',
      linkTab: 'attendance'
    });
  },

  notifyTeacherReminder(teacherName: string, className: string) {
    this.sendNotification({
      title: 'Attendance Reminder',
      body: `Hello ${teacherName}, today is a working day. Please remember to mark attendance for ${className}.`,
      type: 'teacher_reminder',
      targetRole: 'teacher',
      linkTab: 'attendance'
    });
  },

  // Periodic Automated Audits (run once per session or on dashboard mount)
  runAutomatedChecks(userRole: 'admin' | 'teacher', teacherId?: string, assignedClasses?: string[]) {
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const isSunday = now.getDay() === 0;

      // 1. Check Overdue Fees (> 30 days pending)
      if (userRole === 'admin') {
        const fees = StorageService.getFees();
        const overdueFees = fees.filter(f => {
          if (f.status === 'Paid') return false;
          if (!f.dueDate) return false;
          const dueDate = new Date(f.dueDate);
          const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays >= 30;
        });

        if (overdueFees.length > 0) {
          const sample = overdueFees[0];
          // Check if we already alerted about this student in recent notifications to avoid spamming
          const existing = StorageService.getAppNotifications().some(
            n => n.type === 'fee_due' && n.body.includes(sample.studentName)
          );
          if (!existing) {
            this.sendNotification({
              title: 'Fee Due Alert',
              body: `Alert: ${sample.studentName}'s fee of Rs. ${sample.pendingAmount || sample.totalAmount} is overdue by more than 1 month!`,
              type: 'fee_due',
              targetRole: 'admin',
              linkTab: 'fees'
            });
          }
        }
      }

      // 2. Check Teacher Attendance for Today on Working Days (not Sunday)
      if (!isSunday) {
        const attendance = StorageService.getAttendance();
        const teachers: TeacherAccount[] = StorageService.getTeacherAccounts();

        if (userRole === 'admin') {
          // If past 11:00 AM, check which teachers haven't marked attendance
          const currentHour = now.getHours();
          if (currentHour >= 11) {
            teachers.forEach((t: TeacherAccount) => {
              (t.assignedClasses || []).forEach((cls: string) => {
                const marked = attendance.some(a => a.date === todayStr && (a.studentClass === cls || a.timing?.includes(cls)));
                if (!marked) {
                  const alreadyNotified = StorageService.getAppNotifications().some(
                    n => n.type === 'teacher_reminder' && n.body.includes(t.name) && n.body.includes(cls)
                  );
                  if (!alreadyNotified) {
                    this.sendNotification({
                      title: 'Teacher Attendance Alert',
                      body: `Alert: Teacher ${t.name} has not marked attendance for ${cls} today.`,
                      type: 'teacher_reminder',
                      targetRole: 'admin',
                      linkTab: 'attendance'
                    });
                  }
                }
              });
            });
          }
        } else if (userRole === 'teacher' && assignedClasses && assignedClasses.length > 0) {
          // Send reminder to teacher if any of their assigned classes hasn't been marked today
          const unmarked = assignedClasses.filter(cls => {
            return !attendance.some(a => a.date === todayStr && (a.studentClass === cls || a.timing?.includes(cls)));
          });
          if (unmarked.length > 0) {
            const alreadyReminded = StorageService.getAppNotifications().some(
              n => n.type === 'teacher_reminder' && n.timestamp.startsWith(todayStr)
            );
            if (!alreadyReminded) {
              this.sendNotification({
                title: 'Attendance Reminder',
                body: `Reminder: You haven't marked attendance for today (${unmarked.join(', ')}).`,
                type: 'teacher_reminder',
                targetRole: 'teacher',
                targetTeacherId: teacherId,
                linkTab: 'attendance'
              });
            }
          }
        }
      }

      // 3. Weekly Test Alert: Check if tests were recorded this week (Friday/Saturday/Sunday check)
      if (userRole === 'admin') {
        const dayOfWeek = now.getDay();
        // Friday (5) or Saturday (6) or Sunday (0)
        if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
          const tests = StorageService.getTests();
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          const testsThisWeek = tests.filter(t => new Date(t.date) >= oneWeekAgo);
          
          if (testsThisWeek.length === 0) {
            const alreadyNotified = StorageService.getAppNotifications().some(
              n => n.type === 'test_alert' && new Date(n.timestamp) >= oneWeekAgo
            );
            if (!alreadyNotified) {
              this.sendNotification({
                title: 'Weekly Test Alert',
                body: 'Alert: Weekly test records for classes have not been entered by the end of the week.',
                type: 'test_alert',
                targetRole: 'admin',
                linkTab: 'tests'
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error running automated alert checks:', e);
    }
  }
};

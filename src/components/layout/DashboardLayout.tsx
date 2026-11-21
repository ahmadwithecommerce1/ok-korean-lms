import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { TabId } from '../../types';
import { DashboardPage } from '../../pages/DashboardPage';
import { StudentsPage } from '../../pages/StudentsPage';
import { AdmissionRequestsPage } from '../../pages/AdmissionRequestsPage';
import { TeacherActivityMonitor } from '../../pages/TeacherActivityMonitor';
import { AttendancePage } from '../../pages/AttendancePage';
import { BiometricSettings } from '../../pages/BiometricSettings';
import { TestsPage } from '../../pages/TestsPage';
import { FeesPage } from '../../pages/FeesPage';
import { ReportsPage } from '../../pages/ReportsPage';
import { WhatsAppPage } from '../../pages/WhatsAppPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { AnalyticsPage } from '../../pages/AnalyticsPage';
import { BatchClassesPage } from '../../pages/BatchClassesPage';
import { AcademicCalendarPage } from '../../pages/AcademicCalendarPage';
import { TeacherManagementPage } from '../../pages/TeacherManagementPage';
import { CoursesCurriculumPage } from '../../pages/CoursesCurriculumPage';
import { StudyMaterialsPage } from '../../pages/StudyMaterialsPage';
import { AssignmentsPage } from '../../pages/AssignmentsPage';
import { TopikPrepPage } from '../../pages/TopikPrepPage';
import { ExpenseManagementPage } from '../../pages/ExpenseManagementPage';
import { SalaryPayrollPage } from '../../pages/SalaryPayrollPage';
import { FinancialReportsPage } from '../../pages/FinancialReportsPage';
import { NotificationsCentrePage } from '../../pages/NotificationsCentrePage';
import { AnnouncementsPage } from '../../pages/AnnouncementsPage';
import { EmailCommunicationPage } from '../../pages/EmailCommunicationPage';
import { UserRolesPage } from '../../pages/UserRolesPage';
import { ActivityLogsPage } from '../../pages/ActivityLogsPage';

import { useTheme } from '../../context/ThemeContext';
import { NotificationService } from '../../services/notificationService';
import { TeacherWelcomeMarquee } from '../common/TeacherWelcomeMarquee';

export const DashboardLayout: React.FC = () => {
  const { user, hasPermission, logout } = useAuth();
  const { activeTheme } = useTheme();
  const isAdmin = user?.role === 'admin';

  const [currentTab, setCurrentTab] = useState<TabId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Run automated alert checks for dues, attendance reminders, and tests
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'teacher')) {
      NotificationService.runAutomatedChecks(
        user.role, 
        (user as any).id || user.username, 
        user.assignedClasses
      );
    } else if (user?.role === 'student') {
      logout();
    }
  }, [user]);

  // If active tab is not permitted, fallback to first permitted menu or dashboard
  useEffect(() => {
    if (!isAdmin && !hasPermission(currentTab)) {
      const allowed = user?.allowedMenus || ['dashboard'];
      setCurrentTab(allowed[0] || 'dashboard');
    }
  }, [currentTab, isAdmin, user]);

  if (user?.role === 'student') {
    return null;
  }

  const activeTab: TabId = (!isAdmin && !hasPermission(currentTab))
    ? (user?.allowedMenus?.[0] || 'dashboard')
    : currentTab;

  return (
    <div 
      className="min-h-screen flex relative overflow-x-hidden transition-colors duration-300"
      style={{
        backgroundColor: activeTheme.bgBase,
        color: activeTheme.textPrimary
      }}
    >
      {/* Background ambient mesh glows themed dynamically */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[130px] opacity-25"
          style={{ backgroundColor: activeTheme.primary }}
        />
        <div 
          className="absolute top-1/2 -right-28 w-[450px] h-[450px] rounded-full blur-[140px] opacity-20"
          style={{ backgroundColor: activeTheme.secondary || activeTheme.primary }}
        />
        <div 
          className="absolute -bottom-24 left-1/3 w-[500px] h-[500px] rounded-full blur-[150px] opacity-15"
          style={{ backgroundColor: activeTheme.borderGlow2 || activeTheme.primary }}
        />

        {/* Subtle grid background pattern */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#888888_1px,transparent_1px),linear-gradient(to_bottom,#888888_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" 
        />
      </div>

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={activeTab}
        setCurrentTab={setCurrentTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:pl-72">
        {/* Teacher Welcome Marquee Scrolling Announcement (2 min timer) */}
        <TeacherWelcomeMarquee />

        {/* Top Header */}
        <Header
          currentTab={activeTab}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onNavigate={setCurrentTab}
        />

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto relative z-10">
          {activeTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
          {activeTab === 'analytics-insights' && hasPermission('analytics-insights') && <AnalyticsPage />}
          {activeTab === 'students' && hasPermission('students') && <StudentsPage onNavigate={setCurrentTab} />}
          {activeTab === 'admissions' && isAdmin && <AdmissionRequestsPage onNavigate={setCurrentTab} />}
          {activeTab === 'batch-classes' && hasPermission('batch-classes') && <BatchClassesPage />}
          {activeTab === 'academic-calendar' && hasPermission('academic-calendar') && <AcademicCalendarPage />}
          {activeTab === 'teacher-monitor' && isAdmin && <TeacherActivityMonitor />}
          {activeTab === 'teacher-management' && hasPermission('teacher-management') && <TeacherManagementPage />}
          {activeTab === 'attendance' && hasPermission('attendance') && <AttendancePage />}
          {activeTab === 'biometric' && isAdmin && <BiometricSettings />}
          {activeTab === 'tests' && hasPermission('tests') && <TestsPage />}
          {activeTab === 'courses-curriculum' && hasPermission('courses-curriculum') && <CoursesCurriculumPage />}
          {activeTab === 'study-materials' && hasPermission('study-materials') && <StudyMaterialsPage />}
          {activeTab === 'assignments-homework' && hasPermission('assignments-homework') && <AssignmentsPage />}
          {activeTab === 'topik-preparation' && hasPermission('topik-preparation') && <TopikPrepPage />}
          {activeTab === 'fees' && hasPermission('fees') && <FeesPage />}
          {activeTab === 'expense-management' && hasPermission('expense-management') && <ExpenseManagementPage />}
          {activeTab === 'salary-payroll' && hasPermission('salary-payroll') && <SalaryPayrollPage />}
          {activeTab === 'financial-reports' && hasPermission('financial-reports') && <FinancialReportsPage />}
          {activeTab === 'whatsapp' && hasPermission('whatsapp') && <WhatsAppPage />}
          {activeTab === 'notifications-centre' && hasPermission('notifications-centre') && <NotificationsCentrePage />}
          {activeTab === 'announcements' && hasPermission('announcements') && <AnnouncementsPage />}
          {activeTab === 'email-communication' && hasPermission('email-communication') && <EmailCommunicationPage />}
          {activeTab === 'reports' && hasPermission('reports') && <ReportsPage />}
          {activeTab === 'user-roles-permissions' && isAdmin && <UserRolesPage />}
          {activeTab === 'activity-audit-logs' && hasPermission('activity-audit-logs') && <ActivityLogsPage />}
          {activeTab === 'settings' && isAdmin && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};


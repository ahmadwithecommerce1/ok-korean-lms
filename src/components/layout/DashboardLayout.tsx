import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../context/AuthContext';
import { TabId } from '../../types';
import { DashboardPage } from '../../pages/DashboardPage';
import { StudentsPage } from '../../pages/StudentsPage';
import { AttendancePage } from '../../pages/AttendancePage';
import { TestsPage } from '../../pages/TestsPage';
import { FeesPage } from '../../pages/FeesPage';
import { ReportsPage } from '../../pages/ReportsPage';
import { WhatsAppPage } from '../../pages/WhatsAppPage';
import { SettingsPage } from '../../pages/SettingsPage';

import { useTheme } from '../../context/ThemeContext';
import { NotificationService } from '../../services/notificationService';
import { TeacherWelcomeMarquee } from '../common/TeacherWelcomeMarquee';

export const DashboardLayout: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { activeTheme, isDark } = useTheme();
  const isAdmin = user?.role === 'admin';

  const [currentTab, setCurrentTab] = useState<TabId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Run automated alert checks for dues, attendance reminders, and tests
  useEffect(() => {
    if (user) {
      NotificationService.runAutomatedChecks(
        user.role, 
        (user as any).id || user.username, 
        user.assignedClasses
      );
    }
  }, [user]);

  // If active tab is not permitted, fallback to first permitted menu or dashboard
  useEffect(() => {
    if (!isAdmin && !hasPermission(currentTab)) {
      const allowed = user?.allowedMenus || ['dashboard'];
      setCurrentTab(allowed[0] || 'dashboard');
    }
  }, [currentTab, isAdmin, user]);

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
          {activeTab === 'students' && <StudentsPage onNavigate={setCurrentTab} />}
          {activeTab === 'attendance' && <AttendancePage />}
          {activeTab === 'tests' && <TestsPage />}
          {activeTab === 'fees' && <FeesPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'whatsapp' && <WhatsAppPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
};


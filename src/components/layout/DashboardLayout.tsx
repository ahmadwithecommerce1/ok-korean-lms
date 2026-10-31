import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ThemeSettingsDrawer } from '../common/ThemeSettingsDrawer';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { TabId } from '../../types';
import { DashboardPage } from '../../pages/DashboardPage';
import { StudentsPage } from '../../pages/StudentsPage';
import { AttendancePage } from '../../pages/AttendancePage';
import { TestsPage } from '../../pages/TestsPage';
import { FeesPage } from '../../pages/FeesPage';
import { ReportsPage } from '../../pages/ReportsPage';
import { WhatsAppPage } from '../../pages/WhatsAppPage';
import { SettingsPage } from '../../pages/SettingsPage';

export const DashboardLayout: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { settings, accent, activeTheme } = useTheme();
  const isAdmin = user?.role === 'admin';

  const [currentTab, setCurrentTab] = useState<TabId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isDark = true;
  const isCollapsed = settings.sidebarCollapsed;

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

  // Dynamic font scaling container class
  const fontScaleClass = 
    settings.fontSize === 'small' ? 'text-xs sm:text-sm' :
    settings.fontSize === 'large' ? 'text-base sm:text-lg' :
    'text-sm sm:text-base';

  return (
    <div 
      className={`min-h-screen flex transition-colors duration-500 selection:bg-cyan-500 selection:text-white relative overflow-x-hidden ${fontScaleClass} text-slate-100 dark`}
      style={{
        backgroundColor: activeTheme.bgBase
      }}
    >
      {/* Background ambient mesh glows matching active theme */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[130px] opacity-25 transition-all duration-500"
          style={{ backgroundColor: activeTheme.primary }}
        />
        <div 
          className="absolute top-1/2 -right-28 w-[450px] h-[450px] rounded-full blur-[140px] opacity-20 transition-all duration-500"
          style={{ backgroundColor: activeTheme.chartColor }}
        />
        <div 
          className="absolute -bottom-24 left-1/3 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 transition-all duration-500"
          style={{ backgroundColor: activeTheme.secondary }}
        />

        {/* 9. Background Pattern Texture: Grid, Dots, or None */}
        {settings.backgroundPattern === 'grid' && (
          <div 
            className={`absolute inset-0 pointer-events-none ${
              isDark ? 'opacity-[0.03]' : 'opacity-[0.04]'
            } bg-[linear-gradient(to_right,#888888_1px,transparent_1px),linear-gradient(to_bottom,#888888_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]`} 
          />
        )}
        {settings.backgroundPattern === 'dots' && (
          <div 
            className={`absolute inset-0 pointer-events-none ${
              isDark ? 'opacity-[0.04]' : 'opacity-[0.06]'
            } bg-[radial-gradient(#888888_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]`} 
          />
        )}
      </div>

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={activeTab}
        setCurrentTab={setCurrentTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        {/* Top Header */}
        <Header
          currentTab={activeTab}
          onOpenSidebar={() => setIsSidebarOpen(true)}
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

      {/* Slide-out Theme Settings Drawer (10 Interactive Features) */}
      <ThemeSettingsDrawer />
    </div>
  );
};

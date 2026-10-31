import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoadingPage } from './components/LoadingPage';
import { SupportChatWidget } from './components/SupportChatWidget';

const AppContent: React.FC = () => {
  const { isAuthenticated, isSystemLoading, finishSystemLoading } = useAuth();

  return (
    <>
      {!isAuthenticated ? (
        <LoginPage />
      ) : isSystemLoading ? (
        <LoadingPage onComplete={finishSystemLoading} durationMs={2000} />
      ) : (
        <DashboardLayout />
      )}
      <SupportChatWidget />
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

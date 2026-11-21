import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { ColorAnimationProvider } from './context/ColorAnimationContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoadingPage } from './components/LoadingPage';
import { SupportChatWidget } from './components/SupportChatWidget';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isSystemLoading, finishSystemLoading } = useAuth();

  return (
    <>
      {!isAuthenticated ? (
        <LoginPage />
      ) : isSystemLoading ? (
        <LoadingPage onComplete={finishSystemLoading} durationMs={2000} />
      ) : (
        <DashboardLayout />
      )}
      {isAuthenticated && user?.role !== 'student' && <SupportChatWidget />}
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ColorAnimationProvider>
            <AppContent />
          </ColorAnimationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}


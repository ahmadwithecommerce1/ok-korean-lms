import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserSession, TabId } from '../types';
import { StorageService } from '../services/storageService';

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isSystemLoading: boolean;
  login: (username: string, password: string, portal: UserRole) => { success: boolean; error?: string };
  logout: () => void;
  hasPermission: (tab: TabId) => boolean;
  finishSystemLoading: () => void;
  triggerSystemLoading: () => void;
}

const AUTH_STORAGE_KEY = 'ok_korean_auth_session_v2';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isSystemLoading, setIsSystemLoading] = useState<boolean>(false);

  useEffect(() => {
    StorageService.getStudents();
    return StorageService.subscribeTeachers((teachersList) => {
      if (user && user.role === 'teacher') {
        const currentTeacher = teachersList.find(
          t => t.username.toLowerCase() === user.username.toLowerCase()
        );
        if (currentTeacher) {
          if (currentTeacher.status === 'Suspended') {
            logout();
            return;
          }
          if (JSON.stringify(currentTeacher.allowedMenus) !== JSON.stringify(user.allowedMenus)) {
            const updatedSession: UserSession = {
              ...user,
              name: currentTeacher.name,
              allowedMenus: currentTeacher.allowedMenus
            };
            setUser(updatedSession);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedSession));
          }
        }
      }
    });
  }, [user]);

  const login = (username: string, password: string, portal: UserRole): { success: boolean; error?: string } => {
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    if (portal === 'admin') {
      const isAdminMatch = 
        (trimmedUser === 'Ok-Korean' && trimmedPass === 'QWer12@#') ||
        (trimmedUser.toLowerCase() === 'admin@okkorean.com' && trimmedPass === 'admin123');

      if (isAdminMatch) {
        const session: UserSession = {
          username: 'Ok-Korean',
          name: 'Principal Administrator',
          role: 'admin',
          avatar: '/assets/aistudio/logo_-_Copy_d3a62f9d.png',
          loginTime: new Date().toISOString(),
          allowedMenus: ['dashboard', 'students', 'attendance', 'tests', 'fees', 'reports', 'whatsapp', 'settings']
        };
        setUser(session);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        setIsSystemLoading(true);
        StorageService.logActivity('Admin Logged In', 'Administrator session authenticated', 'system', 'Admin', 'admin');
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials for Admin Portal. Please verify username and password.' };
    }

    if (portal === 'teacher') {
      // Support dummy credentials teacher@okkorean.com / teacher123
      if (trimmedUser.toLowerCase() === 'teacher@okkorean.com' && trimmedPass === 'teacher123') {
        const session: UserSession = {
          username: 'rashid.minhas',
          name: 'Rashid Minhas',
          role: 'teacher',
          avatar: '/assets/aistudio/logo_-_Copy_d3a62f9d.png',
          loginTime: new Date().toISOString(),
          assignedBatch: 'Batch A (Morning 09:00 - 11:00)',
          assignedClasses: ['Morning Class 1', 'Morning Class 2', 'Morning Class 3'],
          allowedMenus: ['dashboard', 'attendance', 'tests', 'reports', 'whatsapp']
        };
        setUser(session);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        setIsSystemLoading(true);
        StorageService.logActivity('Teacher Logged In', 'Teacher session authenticated via quick test credentials', 'system', 'Rashid Minhas', 'teacher');
        return { success: true };
      }

      const teachers = StorageService.getTeacherAccounts();
      const targetTeacher = teachers.find(
        t => t.username.toLowerCase() === trimmedUser.toLowerCase()
      );

      if (!targetTeacher) {
        return { success: false, error: 'Teacher account not found. Please verify username or contact Admin.' };
      }

      if (targetTeacher.status === 'Suspended') {
        return { success: false, error: 'Account Restricted. Please contact the Administrator.' };
      }

      if (targetTeacher.password === trimmedPass) {
        // Reset failed attempts upon successful login
        if (targetTeacher.failedAttempts && targetTeacher.failedAttempts > 0) {
          StorageService.updateTeacherAccount({
            ...targetTeacher,
            failedAttempts: 0
          });
        }

        const session: UserSession = {
          username: targetTeacher.username,
          name: targetTeacher.name,
          role: 'teacher',
          avatar: '/assets/aistudio/logo_-_Copy_d3a62f9d.png',
          loginTime: new Date().toISOString(),
          assignedBatch: targetTeacher.assignedBatch || 'Batch A (Morning 09:00 - 11:00)',
          assignedClasses: targetTeacher.assignedClasses || ['Morning Class 1', 'Morning Class 2', 'Morning Class 3'],
          allowedMenus: targetTeacher.allowedMenus && targetTeacher.allowedMenus.length > 0 
            ? targetTeacher.allowedMenus 
            : ['dashboard', 'attendance', 'tests', 'reports', 'whatsapp']
        };
        setUser(session);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        setIsSystemLoading(true);
        StorageService.logActivity('Teacher Logged In', `${targetTeacher.name} (@${targetTeacher.username}) authenticated`, 'system', targetTeacher.name, 'teacher');
        return { success: true };
      } else {
        // Invalid password - increment failed attempt counter
        const newAttempts = (targetTeacher.failedAttempts || 0) + 1;
        if (newAttempts >= 3) {
          // Block / Restrict account immediately
          StorageService.updateTeacherAccount({
            ...targetTeacher,
            status: 'Suspended',
            failedAttempts: newAttempts,
            blockedAt: new Date().toISOString()
          }, 'Security System', 'admin');

          StorageService.logActivity(
            'Account Restricted',
            `Teacher account @${targetTeacher.username} restricted due to 3 consecutive failed login attempts.`,
            'teacher',
            'Security System',
            'admin'
          );

          return { success: false, error: 'Account Restricted. Please contact the Administrator.' };
        } else {
          StorageService.updateTeacherAccount({
            ...targetTeacher,
            failedAttempts: newAttempts
          });

          const remaining = 3 - newAttempts;
          return { 
            success: false, 
            error: `Invalid password. Warning: Account will be restricted after ${remaining} more failed attempt${remaining === 1 ? '' : 's'}.` 
          };
        }
      }
    }

    return { success: false, error: 'Invalid portal role selected.' };
  };

  const finishSystemLoading = () => {
    setIsSystemLoading(false);
  };

  const triggerSystemLoading = () => {
    setIsSystemLoading(true);
  };

  const logout = () => {
    if (user) {
      StorageService.logActivity('User Logged Out', `${user.name} logged out safely`, 'system', user.name, user.role);
    }
    setIsSystemLoading(false);
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const hasPermission = (tab: TabId): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (tab === 'settings') return false; // Strictly Admin only
    return !!(user.allowedMenus && user.allowedMenus.includes(tab));
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isAuthenticated: !!user, 
        isSystemLoading,
        login, 
        logout, 
        hasPermission,
        finishSystemLoading,
        triggerSystemLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

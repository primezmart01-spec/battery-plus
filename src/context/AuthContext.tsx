import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  quickAdminLogin: () => Promise<{ success: boolean; error?: string }>;
  register: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      let token = '';
      try {
        token = localStorage.getItem('cbf10_token') || '';
      } catch (_) {}

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/me', {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password: pass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          try {
            localStorage.setItem('cbf10_token', data.token);
          } catch (_) {}
        }
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch {
      return { success: false, error: 'Connection error' };
    }
  };

  const quickAdminLogin = async () => {
    return login('admin@chaudharybattery.pk', 'ChaudharyAdmin@2026!');
  };

  const register = async (data: any) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        if (resData.token) {
          try {
            localStorage.setItem('cbf10_token', resData.token);
          } catch (_) {}
        }
        setUser(resData.user);
        return { success: true };
      }
      return { success: false, error: resData.error || 'Registration failed' };
    } catch {
      return { success: false, error: 'Connection error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      try {
        localStorage.removeItem('cbf10_token');
      } catch (_) {}
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, quickAdminLogin, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

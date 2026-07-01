'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api, setToken, clearToken } from './api-client';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  displayName: string;
  company?: string | null;
  xp: number;
  streakCount: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, displayName: string, role?: string, company?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const profile = await api<AuthUser>('/me');
    setUser(profile);
  }, []);

  useEffect(() => {
    api<AuthUser>('/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const register = async (email: string, password: string, displayName: string, role = 'STUDENT', company?: string) => {
    const res = await api<{ accessToken: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, role, company: company || undefined }),
    });
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

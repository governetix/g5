"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
// import { apiClient } from '../../lib/apiClient'; // reserved for real backend integration

interface User {
  id: string;
  email: string;
}
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Placeholder: derive user from sessionStorage token (already set after login)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;
    if (token) {
      const emailDecoded = atob(token.replace('dev_demo_token_', ''));
      setUser({ id: 'u_demo', email: emailDecoded });
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }), headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error('LOGIN_FAILED');
    const data = await res.json();
    sessionStorage.setItem('auth_token', data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/logout', { method: 'POST' });
    sessionStorage.removeItem('auth_token');
    setUser(null);
  }, []);

  const value: AuthContextValue = { user, loading, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

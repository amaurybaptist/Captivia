'use client';

import { disablePush, syncExistingPushSubscription } from '@/lib/push-notifications';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  locale: string;
  isPremium: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async (storedToken: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (res.ok && localStorage.getItem('token') === storedToken) {
        const freshUser = await res.json();
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      }
    } catch {
      // Silently fail — cached user data still valid
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken && storedUser) {
          const cached = JSON.parse(storedUser) as User;
          if (!cached || typeof cached.id !== 'string' || typeof cached.email !== 'string') throw new Error('Session invalide');
          setToken(storedToken); setUser(cached);
          void refreshProfile(storedToken);
        }
      } catch { localStorage.removeItem('token'); localStorage.removeItem('user'); }
      setIsLoading(false);
    });
    return () => { active = false; };
  }, [refreshProfile]);

  useEffect(() => {
    if (token) void syncExistingPushSubscription(token).catch(() => {});
  }, [token]);

  useEffect(() => {
    const handleForceLogout = () => {
      const previous = localStorage.getItem('token');
      if (previous) void disablePush(previous).catch(() => {});
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    if (token) void disablePush(token).catch(() => {});
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

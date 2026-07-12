import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '../types';
import axios from 'axios';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isAssetManager: () => boolean;
  isDeptHead: () => boolean;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('af_token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handleLogoutEvent = () => logout();
    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, [logout]);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('af_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          setUser(res.data);
        } catch (err) {
          logout();
        }
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/login`, { email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('af_token', access_token);
    setToken(access_token);
    setUser(userData);
  };

  const isAdmin = () => user?.role === 'admin';
  const isAssetManager = () => user?.role === 'asset_manager';
  const isDeptHead = () => user?.role === 'department_head';
  const hasRole = (roles: UserRole[]) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isAdmin, isAssetManager, isDeptHead, hasRole }}>
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

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#0B0B0F]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"/></div>;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

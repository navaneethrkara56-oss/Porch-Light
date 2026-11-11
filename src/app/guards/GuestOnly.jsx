import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

export function GuestOnly({ children }) {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated) {
    if (role === 'admin') return <Navigate to="/admin/overview" replace />;
    if (role === 'agent') return <Navigate to="/agent/overview" replace />;
    return <Navigate to="/dashboard/overview" replace />;
  }

  return children;
}

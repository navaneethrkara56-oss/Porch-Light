import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

export function RequireRole({ allowedRoles = [], children }) {
  const { role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center font-mono text-xs text-dark-gray/60">
        Verifying permissions...
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/403" state={{ from: location }} replace />;
  }

  return children;
}

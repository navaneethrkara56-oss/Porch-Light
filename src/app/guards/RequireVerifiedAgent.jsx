import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { ROLES } from '@/lib/permissions';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function RequireVerifiedAgent({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center font-mono text-xs text-dark-gray/60">
        Verifying agent credentials...
      </div>
    );
  }

  // Administrators bypass agent verification
  if (role === ROLES.ADMIN) {
    return children;
  }

  // Check verification state
  if (user?.isVerified === false) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4 border border-sand-200">
          <ShieldAlert className="w-6 h-6 text-charcoal/70" />
        </div>
        <h2 className="font-serif text-2xl text-charcoal mb-2">Verification Pending</h2>
        <p className="font-mono text-xs text-dark-gray/70 leading-relaxed max-w-md mx-auto mb-6">
          Your agency credentials are currently under administrative review. Property publication and premium promotion requests are restricted until your RERA certification is verified.
        </p>
        <Link to="/agent/overview">
          <Button variant="dark">Return to Agent Overview</Button>
        </Link>
      </div>
    );
  }

  return children;
}

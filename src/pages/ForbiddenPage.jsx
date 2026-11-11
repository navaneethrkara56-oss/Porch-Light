import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function ForbiddenPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="font-mono text-xs text-heather-purple uppercase tracking-widest mb-4">
        403 — Restricted Area
      </div>
      <h1 className="font-serif text-fluid-h1 text-deep-purple mb-4 tracking-tight">
        Quiet confines.
      </h1>
      <p className="font-sans text-lg text-dark-gray/70 max-w-md mb-8">
        Your current role does not have authorization to view this section. Use the role switcher below to test other permissions.
      </p>
      <Link to="/">
        <Button variant="outline">Back to Safety</Button>
      </Link>
    </div>
  );
}

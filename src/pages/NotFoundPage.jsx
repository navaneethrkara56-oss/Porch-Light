import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="font-mono text-xs text-heather-purple uppercase tracking-widest mb-4">
        404 — Not Found
      </div>
      <h1 className="font-serif text-fluid-h1 text-deep-purple mb-4 tracking-tight">
        This address doesn't exist.
      </h1>
      <p className="font-sans text-lg text-dark-gray/70 max-w-md mb-8">
        Let's get you back to familiar grounds.
      </p>
      <Link to="/">
        <Button variant="dark">Return to Home</Button>
      </Link>
    </div>
  );
}

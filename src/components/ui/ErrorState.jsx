import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

export function ErrorState({
  title = 'Something interrupted the light',
  message = 'We encountered an error while loading this content.',
  retry,
  className = '',
}) {
  return (
    <div
      className={cn(
        'text-center py-16 px-4 flex flex-col items-center justify-center border border-border rounded-xl bg-porcelain p-8',
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mb-4 text-rose-700">
        <AlertCircle className="w-5 h-5" />
      </div>

      <h3 className="font-serif text-2xl text-dark-gray mb-2 tracking-tight">
        {title}
      </h3>
      <p className="font-mono text-xs text-dark-gray/60 max-w-sm mb-6">
        {message}
      </p>

      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

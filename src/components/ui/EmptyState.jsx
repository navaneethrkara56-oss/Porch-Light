import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export function EmptyState({
  title = 'Nothing here yet, but the porch light is on.',
  description = 'Check back shortly or explore our curated collections.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={cn(
        'text-center py-16 px-4 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-porcelain-tint/50',
        className
      )}
    >
      {/* Decorative calm porch light marker */}
      <div className="w-10 h-10 rounded-full bg-heather-purple/15 flex items-center justify-center mb-4 relative">
        <span className="w-2.5 h-2.5 rounded-full bg-electric-lemon animate-ping absolute" />
        <span className="w-2.5 h-2.5 rounded-full bg-electric-lemon relative z-10" />
      </div>

      <h3 className="font-serif text-2xl text-deep-purple mb-2 tracking-tight">
        {title}
      </h3>
      <p className="font-mono text-xs text-dark-gray/60 max-w-sm mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

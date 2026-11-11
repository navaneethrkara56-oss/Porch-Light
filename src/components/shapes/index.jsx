import React from 'react';
import { cn } from '@/lib/utils';

export function Arch({ children, className = '', ...props }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-t-[180px] border border-border bg-porcelain-tint',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Circle({ children, className = '', ...props }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-full border border-border aspect-square flex items-center justify-center',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Pill({ children, className = '', ...props }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-full border border-border px-4 py-1.5 inline-flex items-center',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Leaf({ children, reverse = false, className = '', ...props }) {
  return (
    <div
      className={cn(
        'overflow-hidden border border-border',
        reverse ? 'rounded-leaf-bl' : 'rounded-leaf-br',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Notch({ children, className = '', ...props }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden border border-border [clip-path:polygon(0_0,calc(100%-16px)_0,100%_16px,100%_100%,0_100%)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Block({ children, className = '', ...props }) {
  return (
    <div
      className={cn('border border-border bg-porcelain p-6 relative', className)}
      {...props}
    >
      {children}
    </div>
  );
}

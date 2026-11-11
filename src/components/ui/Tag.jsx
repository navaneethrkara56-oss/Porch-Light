import React from 'react';
import { cn } from '@/lib/utils';

export function Tag({
  children,
  variant = 'default', // 'default' | 'purple' | 'lemon' | 'dark' | 'outline' | 'success' | 'warning'
  size = 'md', // 'sm' | 'md'
  className = '',
  ...props
}) {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] tracking-widest',
    md: 'px-3 py-1 text-xs tracking-wider',
  };

  const variantStyles = {
    default: 'bg-black/5 text-dark-gray border border-border',
    purple: 'bg-heather-purple/15 text-deep-purple border border-heather-purple/30',
    lemon: 'bg-electric-lemon/20 text-dark-gray border border-electric-lemon/50 font-bold',
    dark: 'bg-dark-gray text-porcelain border border-dark-gray',
    outline: 'border border-border text-dark-gray/80 bg-transparent',
    success: 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-800 border border-amber-500/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono uppercase rounded-full select-none',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

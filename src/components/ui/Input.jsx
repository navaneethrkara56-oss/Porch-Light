import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    className = '',
    containerClassName = '',
    type = 'text',
    ...props
  },
  ref
) {
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
      {label && (
        <label className="font-mono text-xs uppercase tracking-wider text-dark-gray/70">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full bg-porcelain border border-dark-gray/20 rounded-md px-3.5 py-2.5 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple transition-all',
          error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
          className
        )}
        {...props}
      />
      {error && (
        <span className="font-mono text-[11px] text-rose-600">{error}</span>
      )}
      {helperText && !error && (
        <span className="font-mono text-[11px] text-dark-gray/50">{helperText}</span>
      )}
    </div>
  );
});

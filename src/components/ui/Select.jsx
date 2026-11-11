import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(function Select(
  {
    label,
    options = [],
    error,
    helperText,
    className = '',
    containerClassName = '',
    children,
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
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full bg-porcelain border border-dark-gray/20 rounded-md px-3.5 py-2.5 pr-10 text-sm text-dark-gray appearance-none focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple transition-all cursor-pointer',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
            className
          )}
          {...props}
        >
          {children
            ? children
            : options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-gray/50 pointer-events-none" />
      </div>
      {error && (
        <span className="font-mono text-[11px] text-rose-600">{error}</span>
      )}
      {helperText && !error && (
        <span className="font-mono text-[11px] text-dark-gray/50">{helperText}</span>
      )}
    </div>
  );
});

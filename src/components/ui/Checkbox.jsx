import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export const Checkbox = forwardRef(function Checkbox(
  { label, checked, onChange, disabled, className = '', ...props },
  ref
) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-2.5 cursor-pointer select-none text-sm text-dark-gray',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            'w-4 h-4 rounded border border-dark-gray/30 bg-porcelain transition-all flex items-center justify-center',
            checked && 'bg-deep-purple border-deep-purple text-white'
          )}
        >
          {checked && <Check className="w-3 h-3 stroke-[3]" />}
        </div>
      </div>
      {label && <span>{label}</span>}
    </label>
  );
});

import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function TextLink({
  to,
  href,
  children,
  className = '',
  external = false,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center gap-1.5 underline-draw text-sm transition-colors text-dark-gray hover:text-deep-purple cursor-pointer';

  if (href || external) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={cn(baseClasses, className)}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={to} className={cn(baseClasses, className)} {...props}>
      {children}
    </Link>
  );
}

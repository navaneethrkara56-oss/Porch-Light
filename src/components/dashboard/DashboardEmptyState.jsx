import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export function DashboardEmptyState({
  title = 'Nothing here yet, but the porch light is on.',
  description = 'Records will appear here as activity and verification unfold.',
  actionLabel,
  actionLink,
  onAction,
  icon: Icon = Home,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-porcelain border border-charcoal/10 shadow-xs max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-sand/60 flex items-center justify-center text-deep-purple mb-4">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="font-serif text-xl sm:text-2xl text-deep-purple font-medium mb-2">
        {title}
      </h3>
      <p className="font-sans text-sm text-dark-gray/70 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && actionLink && (
        <Link
          to={actionLink}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-deep-purple text-white text-xs font-mono uppercase tracking-wider hover:bg-deep-purple/90 transition-colors shadow-xs"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionLink && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-deep-purple text-white text-xs font-mono uppercase tracking-wider hover:bg-deep-purple/90 transition-colors shadow-xs cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

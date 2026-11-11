import React from 'react';
import { Tag } from '@/components/ui/Tag';

export function PlaceholderPage({ title, category = 'Page', subtitle = '' }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-4">
          <Tag variant="purple">{category}</Tag>
          <span className="w-1.5 h-1.5 rounded-full bg-electric-lemon" />
          <span className="font-mono text-xs uppercase text-dark-gray/60 tracking-wider">
            Porch Light Platform
          </span>
        </div>
        <h1 className="font-serif text-fluid-h1 text-deep-purple tracking-tight mb-4">
          {title}
        </h1>
        <p className="font-sans text-lg text-dark-gray/70 leading-relaxed mb-8">
          {subtitle || 'This section is being crafted to provide an unhurried, serene real estate experience across India.'}
        </p>
        <div className="p-6 border border-dashed border-dark-gray/20 rounded-xl bg-porcelain-tint/50 font-mono text-xs text-dark-gray/60 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Route mounted and ready. Full feature module scheduled in upcoming step.
        </div>
      </div>
    </div>
  );
}

import React from 'react';

export function DashboardSkeleton({ type = 'cards' }) {
  if (type === 'table') {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-10 bg-sand/60 rounded-xl w-full" />
        <div className="h-14 bg-sand/40 rounded-xl w-full" />
        <div className="h-14 bg-sand/40 rounded-xl w-full" />
        <div className="h-14 bg-sand/40 rounded-xl w-full" />
      </div>
    );
  }

  if (type === 'metrics') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-sand/50 rounded-2xl p-5 border border-charcoal/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-sand/60 rounded-lg w-1/3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-sand/50 rounded-2xl border border-charcoal/5" />
        ))}
      </div>
      <div className="h-64 bg-sand/40 rounded-2xl border border-charcoal/5" />
    </div>
  );
}

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * DashboardBackButton
 *
 * Contextual back button for nested dashboard pages, detail views, and forms.
 * Returns to previous dashboard page if history exists, otherwise falls back to the safe parent route.
 */
export function DashboardBackButton({
  to,
  fallback = '/dashboard/overview',
  fallbackTo,
  label = 'Back',
  className = '',
}) {
  const navigate = useNavigate();
  const destination = to || fallbackTo || fallback;

  const handleBack = () => {
    // Semantic named destinations (e.g. "Back to Overview") must navigate explicitly to their target
    if (to || fallbackTo || label.toLowerCase().includes('to')) {
      navigate(destination);
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(destination);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-1.5 font-mono text-xs text-charcoal/80 hover:text-deep-purple bg-sand/40 hover:bg-sand/70 border border-charcoal/15 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs min-h-[36px] ${className}`}
      aria-label={label}
    >
      <ChevronLeft className="w-3.5 h-3.5 text-deep-purple" />
      <span>{label}</span>
    </button>
  );
}

export default DashboardBackButton;

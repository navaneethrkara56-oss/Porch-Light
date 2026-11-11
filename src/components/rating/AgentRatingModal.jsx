import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Star, X, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitAgentRating } from '@/services/ratings';
import { useAuth } from '@/features/auth/AuthContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import toast from 'react-hot-toast';

const STAR_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export function AgentRatingModal({
  isOpen,
  onClose,
  transaction,
  property,
  agent,
  existingRating = null,
  onSuccess = () => {},
  onRatingSaved,
}) {
  const { user } = useAuth();
  useBodyScrollLock(isOpen);
  const initialStars = existingRating?.rating || 0;
  const [selectedStars, setSelectedStars] = useState(initialStars);
  const [hoveredStars, setHoveredStars] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedStars(existingRating?.rating || 0);
      setHoveredStars(0);
      setError(null);
    }
  }, [isOpen, existingRating]);

  if (!isOpen) return null;

  const agentName = agent?.name || property?.agent?.name || 'Priya Nambiar';
  const propertyTitle = property?.title || transaction?.propertyTitle || 'Residence';
  const currentHoverOrSelect = hoveredStars || selectedStars;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (selectedStars < 1 || selectedStars > 5) {
      setError('Please tap a star to select a rating from 1 to 5.');
      return;
    }

    if (!transaction?.id) {
      setError('Missing transaction context.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const saved = await submitAgentRating({
        transactionId: transaction.id,
        propertyId: property?.id || transaction.propertyId,
        rating: selectedStars,
        userId: user?.id,
        agentId: agent?.id || property?.agentId || transaction?.agentId,
      });

      toast.success(existingRating ? 'Agent rating updated' : 'Thank you for rating your agent');
      if (onRatingSaved) onRatingSaved(saved);
      onSuccess(saved);
      onClose();
    } catch (err) {
      console.error('Failed to submit rating', err);
      setError(err?.message || 'Unable to record rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/75 backdrop-blur-xs overflow-hidden animate-in fade-in duration-150 overscroll-none touch-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-porcelain rounded-3xl border border-charcoal/15 shadow-2xl p-6 sm:p-7 space-y-5 text-charcoal max-h-[calc(100dvh-2.5rem)] overflow-y-auto overscroll-contain touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-charcoal/10 pb-4">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-charcoal/60">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Verified Transaction Rating</span>
            </div>
            <h3 id="rating-modal-title" className="font-serif text-2xl text-charcoal font-medium">
              {existingRating ? 'Update Agent Rating' : 'Rate Your Agent'}
            </h3>
            <p className="text-xs font-sans text-charcoal/70">
              How was your service with <strong className="text-charcoal">{agentName}</strong> for{' '}
              <span className="italic">{propertyTitle}</span>?
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-full text-charcoal/50 hover:text-charcoal hover:bg-sand/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Star Rating Selector (Keyboard Accessible & Mobile Touch-Friendly) */}
        <div className="py-2 text-center space-y-3">
          <div
            className="flex items-center justify-center gap-2 sm:gap-3"
            role="radiogroup"
            aria-label="Agent Star Rating"
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = star <= currentHoverOrSelect;
              return (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={selectedStars === star}
                  aria-label={`${star} star${star > 1 ? 's' : ''} - ${STAR_LABELS[star]}`}
                  onMouseEnter={() => setHoveredStars(star)}
                  onMouseLeave={() => setHoveredStars(0)}
                  onClick={() => {
                    setSelectedStars(star);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedStars(star);
                      setError(null);
                    }
                  }}
                  className="p-2 sm:p-2.5 rounded-2xl hover:bg-amber-500/10 focus:outline-none focus:ring-2 focus:ring-deep-purple/40 transition-transform active:scale-95 cursor-pointer"
                >
                  <Star
                    className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                      isFilled
                        ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                        : 'text-charcoal/25 hover:text-amber-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Descriptive Rating Tag */}
          <div className="h-6 flex items-center justify-center font-mono text-xs">
            {currentHoverOrSelect > 0 ? (
              <span className="font-medium text-amber-900 bg-amber-100/70 px-3 py-0.5 rounded-full border border-amber-300/50">
                {currentHoverOrSelect} ★ · {STAR_LABELS[currentHoverOrSelect]}
              </span>
            ) : (
              <span className="text-charcoal/50">Tap a star to rate (1 to 5)</span>
            )}
          </div>
        </div>

        {/* Transaction Context */}
        {transaction?.id && (
          <div className="p-3 rounded-xl bg-sand/30 border border-charcoal/10 text-[11px] font-mono flex items-center justify-between text-charcoal/70">
            <span>Transaction: {transaction.id}</span>
            <span className="text-emerald-800 font-medium">Completed</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-charcoal/10">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 rounded-button bg-porcelain border border-charcoal/20 text-charcoal text-xs font-mono hover:bg-sand/40 transition-colors"
          >
            {existingRating ? 'Cancel' : 'Maybe later'}
          </button>

          <button
            type="button"
            disabled={submitting || selectedStars === 0}
            onClick={handleSubmit}
            className="px-5 py-2 rounded-button bg-deep-purple text-porcelain text-xs font-mono hover:bg-black disabled:opacity-40 transition-colors flex items-center gap-2"
          >
            {submitting ? (
              <span>Saving...</span>
            ) : (
              <span>{existingRating ? 'Update Rating' : 'Submit Rating'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}

export default AgentRatingModal;


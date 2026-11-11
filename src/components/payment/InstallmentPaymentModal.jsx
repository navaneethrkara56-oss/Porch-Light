import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createCheckoutSession } from '@/services/payments';
import { formatINR, RupeeSymbol } from '@/lib/formatINR';
import { formatDueDate as sharedFormatDueDate } from '@/lib/formatDate';
import { SmartImage } from '@/components/media/SmartImage';
import {
  X,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function InstallmentPaymentModal({ isOpen, onClose, schedule, installment }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [enrollAutopay, setEnrollAutopay] = useState(false);

  // Lock background scrolling while modal is open and restore original scroll state on close
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !processing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, processing, onClose]);

  if (!isOpen || !schedule || !installment) return null;

  const handlePayNow = async () => {
    setProcessing(true);
    setError(null);

    try {
      const res = await createCheckoutSession({
        propertyId: schedule.propertyId,
        scheduleId: schedule.customId || schedule.id,
        installmentNumber: installment.installmentNumber,
        type: schedule.type === 'emi' ? 'emi_installment' : 'rent_installment',
        autopayOptIn: !schedule.autopayEnabled && enrollAutopay,
      });

      const checkoutUrl = res?.sessionUrl || res?.data?.sessionUrl;
      if (checkoutUrl) {
        toast.loading('Redirecting to Stripe Test Checkout...');
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Failed to obtain Stripe checkout URL from server.');
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err.message || 'Could not connect to Stripe. Please try again.');
      setProcessing(false);
    }
  };

  const formatDueDate = (d) => {
    return sharedFormatDueDate(d);
  };

  const isEmi = schedule.type === 'emi';

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-charcoal/75 backdrop-blur-xs overflow-hidden animate-fade-in overscroll-none touch-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="installment-payment-title"
      onClick={processing ? undefined : onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] bg-porcelain rounded-3xl border border-charcoal/15 shadow-2xl overflow-y-auto overscroll-contain flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-charcoal/10 flex items-center justify-between shrink-0 bg-porcelain">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 block">
              {isEmi ? 'Financing Obligation' : 'Residential Lease'}
            </span>
            <h2
              id="installment-payment-title"
              className="font-serif text-xl sm:text-2xl text-charcoal font-medium mt-0.5"
            >
              Pay Scheduled Installment
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="w-9 h-9 rounded-full bg-sand/40 hover:bg-sand flex items-center justify-center text-charcoal/70 hover:text-charcoal transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close payment modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-5 flex-1">
          {/* Item Snapshot Card */}
          <div className="p-3.5 rounded-2xl bg-sand/25 border border-charcoal/10 flex items-center gap-3">
            <div className="w-14 h-12 rounded-xl overflow-hidden bg-sand/60 border border-charcoal/10 shrink-0">
              <SmartImage
                src={schedule.propertySnapshot?.image}
                alt={schedule.propertyTitle}
                aspect="video"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-serif text-base text-charcoal truncate font-normal">
                {schedule.propertyTitle}
              </div>
              <div className="font-mono text-xs text-dark-gray/60 truncate">
                {isEmi
                  ? `EMI Installment #${installment.installmentNumber} of ${schedule.totalInstallments}`
                  : `Monthly Rent Month #${installment.installmentNumber}`}
                {' • '}
                Due: {formatDueDate(installment.dueDate)}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-xs text-dark-gray/50 block text-[10px] uppercase">
                Amount Due
              </span>
              <span className="font-serif text-lg text-charcoal font-medium">
                <RupeeSymbol />
                {formatINR(installment.amount)}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <div>
                <span className="font-medium block">Payment Attempt Failed</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Stripe Gateway Notice */}
          <div className="p-4 rounded-2xl bg-sand/30 border border-charcoal/10 space-y-2.5 font-sans text-xs text-dark-gray/80">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold text-charcoal uppercase tracking-wider">
                Stripe Test Checkout
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium">
                Test Mode
              </span>
            </div>
            <p className="leading-relaxed">
              You will be redirected to the secure Stripe Checkout interface to complete this
              scheduled payment with test card details and simulated 3D Secure verification.
            </p>
          </div>

          {/* Autopay Opt-In (if not already enabled) */}
          {!schedule.autopayEnabled && (
            <div className="p-4 rounded-2xl bg-white border border-charcoal/15 font-mono text-xs space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enrollAutopay}
                  onChange={(e) => setEnrollAutopay(e.target.checked)}
                  className="mt-0.5 size-4 accent-deep-purple rounded cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold text-charcoal text-xs block">
                    Save card for future monthly Autopay
                  </span>
                  <p className="text-[11px] text-dark-gray/70 leading-relaxed font-sans">
                    Automatically deduct subsequent monthly installments on the due date. You can
                    revoke Autopay at any time.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={processing}
            onClick={handlePayNow}
            className="w-full py-3.5 px-6 rounded-full bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting to Stripe...</span>
              </>
            ) : (
              <>
                <Lock className="size-3.5" />
                <span>Proceed to Stripe</span>
                <span className="font-serif text-sm">₹{formatINR(installment.amount)}</span>
                <ArrowRight className="size-3.5 ml-1" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-dark-gray/50 text-center">
            <ShieldCheck className="size-3.5 text-emerald-700" />
            <span>Stripe PCI-DSS Level 1 Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}

export default InstallmentPaymentModal;

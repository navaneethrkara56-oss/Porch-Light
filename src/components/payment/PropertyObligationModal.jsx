import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { SmartImage } from '@/components/media/SmartImage';
import { toggleScheduleAutopay } from '@/services/payments';
import { formatINR, RupeeSymbol } from '@/lib/formatINR';
import { formatDueDate } from '@/lib/formatDate';
import toast from 'react-hot-toast';
import {
  X,
  CreditCard,
  Calendar,
  Building2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Receipt,
  Info,
  RefreshCw,
} from 'lucide-react';

export function PropertyObligationModal({
  isOpen,
  onClose,
  schedule,
  role = 'user',
  onPayInstallment,
  onScheduleUpdate,
}) {
  const [togglingAutopay, setTogglingAutopay] = useState(false);
  // Lock background scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !schedule) return null;

  const isEmi = schedule.type === 'emi';
  const isRent = schedule.type === 'rent';

  // Next actionable unpaid installment
  const nextInstallment = (schedule.installments || []).find((i) => i.status !== 'paid');
  const totalInstallments = schedule.totalInstallments || (schedule.installments || []).length || 1;
  const paidCount = schedule.paidInstallments || (schedule.installments || []).filter((i) => i.status === 'paid').length;
  const remainingCount = Math.max(0, totalInstallments - paidCount);

  const formatDate = (isoStr) => {
    return formatDueDate(isoStr);
  };

  const nextStatus = nextInstallment?.status || 'upcoming';
  const isOverdue = nextStatus === 'overdue';
  const isDueToday = nextStatus === 'due_today';

  const statusBadge = (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${
        isOverdue
          ? 'bg-rose-100 text-rose-800 border-rose-300 font-medium'
          : isDueToday
          ? 'bg-amber-100 text-amber-900 border-amber-300 font-medium'
          : 'bg-sand/70 text-charcoal/90 border-charcoal/15'
      }`}
    >
      {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-700" />}
      {isDueToday && <Clock className="w-3 h-3 text-amber-700" />}
      {!isOverdue && !isDueToday && <Calendar className="w-3 h-3 text-deep-purple/70" />}
      <span>{isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : 'Upcoming'}</span>
    </span>
  );

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-charcoal/75 backdrop-blur-xs overflow-hidden animate-fade-in overscroll-none touch-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-obligation-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-porcelain border border-charcoal/15 shadow-2xl overflow-hidden my-auto max-h-[calc(100dvh-2.5rem)] flex flex-col touch-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-charcoal/10 bg-sand/30 shrink-0">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-deep-purple font-medium block">
              {isEmi ? 'EMI Financing Plan' : 'Residential Lease Schedule'}
            </span>
            <h3 id="property-obligation-title" className="font-serif text-xl sm:text-2xl text-charcoal font-medium truncate max-w-md">
              {schedule.propertyTitle || 'Property Obligation'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sand/70 hover:bg-sand border border-charcoal/10 flex items-center justify-center text-charcoal/70 hover:text-charcoal transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {/* Property Snapshot Card */}
          <div className="p-4 rounded-2xl bg-sand/20 border border-charcoal/10 flex items-center gap-4">
            <div className="w-20 h-16 rounded-xl overflow-hidden bg-sand/60 border border-charcoal/10 shrink-0">
              <SmartImage
                src={schedule.propertySnapshot?.image}
                alt={schedule.propertyTitle}
                aspect="video"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-serif text-lg text-charcoal truncate font-medium">
                {schedule.propertyTitle}
              </div>
              <div className="font-mono text-xs text-dark-gray/70 truncate">
                {schedule.propertySnapshot?.locality ? `${schedule.propertySnapshot.locality}, ` : ''}
                {schedule.propertySnapshot?.city || 'India'}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 border border-charcoal/10 text-charcoal/80">
                  {isEmi ? 'Ownership by EMI' : 'Active Tenancy'}
                </span>
                <span className="font-mono text-[10px] text-dark-gray/50">
                  Ref: {schedule.customId}
                </span>
              </div>
            </div>
            <Link
              to={`/properties/${schedule.propertyId}`}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-[11px] text-charcoal transition-colors shrink-0"
            >
              <span>View Property</span>
              <ArrowRight className="w-3 h-3 text-deep-purple" />
            </Link>
          </div>

          {/* Key Financial Terms Grid */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-dark-gray/60 mb-2">
              Authoritative Schedule Terms
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Metric 1: Next Payment Due */}
              <div className="p-3.5 rounded-xl bg-sand/35 border border-charcoal/10 space-y-1">
                <span className="font-mono text-[10px] uppercase text-dark-gray/60 block">
                  Next Due Date
                </span>
                <div className="font-serif text-base text-charcoal font-medium whitespace-nowrap">
                  {nextInstallment ? formatDate(nextInstallment.dueDate) : 'Completed'}
                </div>
                <div className="pt-0.5">{statusBadge}</div>
              </div>

              {/* Metric 2: Recurring Amount */}
              <div className="p-3.5 rounded-xl bg-sand/35 border border-charcoal/10 space-y-1">
                <span className="font-mono text-[10px] uppercase text-dark-gray/60 block">
                  {isEmi ? 'Monthly Installment' : 'Monthly Rent'}
                </span>
                <div className="font-serif text-lg text-charcoal font-medium">
                  <RupeeSymbol />{formatINR(nextInstallment?.amount || schedule.installmentAmount || 0)}
                </div>
                <span className="font-mono text-[10px] text-dark-gray/50 block">
                  Monthly frequency
                </span>
              </div>

              {/* Metric 3: Remaining Balance / Total Obligations */}
              <div className="p-3.5 rounded-xl bg-sand/35 border border-charcoal/10 space-y-1">
                <span className="font-mono text-[10px] uppercase text-dark-gray/60 block">
                  {isEmi ? 'Remaining Balance' : 'Active Lease'}
                </span>
                <div className="font-serif text-lg text-charcoal font-medium">
                  {isEmi ? (
                    <>
                      <RupeeSymbol />{formatINR(schedule.remainingBalance || 0)}
                    </>
                  ) : (
                    <span>{remainingCount} Months</span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-dark-gray/50 block">
                  {isEmi ? `From ₹${formatINR(schedule.totalAmount)} total` : `Expires ${formatDate(schedule.endDate)}`}
                </span>
              </div>

              {/* Metric 4: Tenure / Progress */}
              <div className="p-3.5 rounded-xl bg-sand/35 border border-charcoal/10 space-y-1">
                <span className="font-mono text-[10px] uppercase text-dark-gray/60 block">
                  Schedule Progress
                </span>
                <div className="font-serif text-lg text-charcoal font-medium">
                  {paidCount} / {totalInstallments}
                </div>
                <span className="font-mono text-[10px] text-dark-gray/50 block">
                  {remainingCount} installments left
                </span>
              </div>
            </div>
          </div>

          {/* Contextual Terms Detail */}
          {isEmi ? (
            <div className="p-4 rounded-xl bg-porcelain border border-charcoal/10 space-y-2 text-xs font-sans text-dark-gray/80">
              <div className="font-mono text-[11px] uppercase tracking-wider text-charcoal font-semibold">
                Financing Snapshot
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div className="flex justify-between sm:block">
                  <span className="text-dark-gray/60 sm:block">Down Payment Paid</span>
                  <span className="text-charcoal font-medium">₹{formatINR(schedule.downPayment || 0)}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-dark-gray/60 sm:block">Financed Principal</span>
                  <span className="text-charcoal font-medium">₹{formatINR(schedule.financedPrincipal || 0)}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-dark-gray/60 sm:block">Benchmark Interest</span>
                  <span className="text-charcoal font-medium">{schedule.interestRate || 8.5}% p.a.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-porcelain border border-charcoal/10 space-y-2 text-xs font-sans text-dark-gray/80">
              <div className="font-mono text-[11px] uppercase tracking-wider text-charcoal font-semibold">
                Lease Agreement Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div className="flex justify-between sm:block">
                  <span className="text-dark-gray/60 sm:block">Lease Period</span>
                  <span className="text-charcoal font-medium">{formatDate(schedule.startDate)} – {formatDate(schedule.endDate)}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-dark-gray/60 sm:block">Security Deposit (Held)</span>
                  <span className="text-charcoal font-medium">₹{formatINR(schedule.downPayment || 0)}</span>
                </div>
                <div className="flex justify-between sm:block">
                  <span className="text-dark-gray/60 sm:block">Monthly Due Day</span>
                  <span className="text-charcoal font-medium">{schedule.dueDay ? `${schedule.dueDay}th of month` : 'Monthly'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Autopay Mandate Status & Revocation Control */}
          <div className="p-4 rounded-xl bg-porcelain border border-charcoal/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal font-semibold">
                  Recurring Autopay
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                    schedule.autopayEnabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-sand/60 text-dark-gray/70 border border-charcoal/15'
                  }`}
                >
                  {schedule.autopayEnabled ? 'Active' : 'Manual Mode'}
                </span>
              </div>
              <p className="text-[11px] text-dark-gray/70">
                {schedule.autopayEnabled
                  ? `Automatic monthly deductions enabled (${schedule.autopayCardBrand || 'Card'} •••• ${schedule.autopayCardLast4 || '••••'}).`
                  : 'Pay installments manually or enable automatic deductions.'}
              </p>
            </div>

            {role === 'user' && (
              <button
                type="button"
                disabled={togglingAutopay}
                onClick={async () => {
                  setTogglingAutopay(true);
                  try {
                    const res = await toggleScheduleAutopay(
                      schedule.customId || schedule.id,
                      !schedule.autopayEnabled
                    );
                    toast.success(
                      schedule.autopayEnabled
                        ? 'Autopay paused. You can pay upcoming installments manually.'
                        : 'Autopay activated for scheduled deductions.'
                    );
                    if (onScheduleUpdate) {
                      onScheduleUpdate(res.data);
                    }
                  } catch (err) {
                    toast.error(err.message || 'Could not update Autopay setting.');
                  } finally {
                    setTogglingAutopay(false);
                  }
                }}
                className="px-3.5 py-1.5 rounded-full border border-charcoal/20 hover:bg-sand/50 text-charcoal font-mono text-[11px] transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
              >
                {togglingAutopay
                  ? 'Updating...'
                  : schedule.autopayEnabled
                  ? 'Revoke Autopay'
                  : 'Enable Autopay'}
              </button>
            )}
          </div>

          {/* Actionable Next Payment Block */}
          {nextInstallment ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-sand/35 border border-charcoal/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-deep-purple font-medium block">
                  Next Actionable Obligation
                </span>
                <div className="font-serif text-lg text-charcoal font-medium">
                  {isEmi ? `Installment #${nextInstallment.installmentNumber}` : `Monthly Rent (${formatDate(nextInstallment.dueDate)})`}
                </div>
                <p className="font-sans text-xs text-dark-gray/70">
                  Amount due: <span className="font-semibold text-charcoal">₹{formatINR(nextInstallment.amount)}</span> • Due date: {formatDate(nextInstallment.dueDate)}
                </p>
              </div>

              {role === 'user' ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onPayInstallment) {
                      onPayInstallment(schedule, nextInstallment);
                    }
                  }}
                  className="px-5 py-2.5 rounded-full bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2 shrink-0 min-h-[42px]"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pay Now (₹{formatINR(nextInstallment.amount)})</span>
                </button>
              ) : (
                <div className="text-right">
                  <span className="font-mono text-[11px] text-dark-gray/60 bg-sand/60 px-3 py-1.5 rounded-full border border-charcoal/10 inline-block">
                    Client Escrow Obligation
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 mx-auto" />
              <div className="font-serif text-base text-emerald-950 font-medium">
                Schedule Fully Settled
              </div>
              <p className="font-sans text-xs text-emerald-900/80">
                All scheduled installments for this property have been completed.
              </p>
            </div>
          )}

          {/* Audit & Disclaimer Note */}
          <div className="flex items-start gap-2.5 text-xs font-sans text-dark-gray/60 border-t border-charcoal/10 pt-4">
            <Info className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Obligation schedules are derived directly from verified RERA checkout contracts. Past settled installments and legal deposit receipts are permanently preserved in your transaction history ledger.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-sand/30 border-t border-charcoal/10 flex items-center justify-between gap-3 shrink-0">
          <Link
            to={`/properties/${schedule.propertyId}`}
            className="sm:hidden font-mono text-xs text-deep-purple hover:underline"
          >
            View Property Details
          </Link>
          <div className="hidden sm:block" />
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-sand/70 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}


import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardBackButton } from '@/components/dashboard/DashboardBackButton';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { getPayments, getPaymentSchedules } from '@/services/payments';
import { generatePaymentReceiptPDF } from '@/services/documents';
import { getRatingForTransaction, subscribeToRatings } from '@/services/ratings';
import { AgentRatingModal } from '@/components/rating/AgentRatingModal';
import { InstallmentPaymentModal } from '@/components/payment/InstallmentPaymentModal';
import { PropertyObligationModal } from '@/components/payment/PropertyObligationModal';
import { useAuth } from '@/features/auth/AuthContext';
import { formatINR, RupeeSymbol } from '@/lib/formatINR';
import { SmartImage } from '@/components/media/SmartImage';
import {
  Receipt,
  Download,
  AlertCircle,
  CreditCard,
  Key,
  Calendar,
  Search,
  Star,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

import { formatPaymentDate, formatDueDate as sharedFormatDueDate } from '@/lib/formatDate';

const AGENT_NAMES = {
  agt_vikram: 'Vikramaditya Singhania',
  agt_meera: 'Meera Nambiar',
  agt_kabir: 'Kabir Shroff',
  agt_pooja: 'Pooja Deshmukh',
};

function formatTransactionDate(p) {
  return formatPaymentDate(p, { includeTime: true });
}

function formatDueDate(d) {
  return sharedFormatDueDate(d);
}

export function UserPaymentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') === 'history' ? 'history' : 'schedules';
  });

  const [payments, setPayments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // History filters
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all'); // 'all' | 'full' | 'emi' | 'rent'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [activeRatingTarget, setActiveRatingTarget] = useState(null);
  const [activePaymentTarget, setActivePaymentTarget] = useState(null);
  const [activeObligationSchedule, setActiveObligationSchedule] = useState(null);
  const [storeVersion, setStoreVersion] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [payRes, schedRes] = await Promise.all([
        getPayments(),
        getPaymentSchedules(),
      ]);
      setPayments(payRes.data || []);
      setSchedules(schedRes.data || []);
    } catch (err) {
      console.error('Failed to load payments or schedules:', err);
      setError(err.message || 'Could not load payment records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, storeVersion]);

  // Ratings subscription
  useEffect(() => {
    return subscribeToRatings(() => {
      setStoreVersion((v) => v + 1);
    });
  }, []);

  // Direct action deep-link support: /dashboard/payments?tab=schedules&pay=SCH-...&inst=1
  useEffect(() => {
    const payScheduleId = searchParams.get('pay');
    const payInstNum = Number(searchParams.get('inst'));

    if (payScheduleId && payInstNum && schedules.length > 0) {
      const targetSchedule = schedules.find(
        (s) => s.customId === payScheduleId || s.id === payScheduleId
      );
      if (targetSchedule) {
        const targetInst = targetSchedule.installments.find(
          (i) => i.installmentNumber === payInstNum
        );
        if (targetInst && targetInst.status !== 'paid') {
          setActivePaymentTarget({
            schedule: targetSchedule,
            installment: targetInst,
          });
        }
      }
    }
  }, [searchParams, schedules]);

  // Grouped active EMI schedules: one entry per property and plan
  const groupedEmiSchedules = useMemo(() => {
    return schedules
      .filter((s) => s.type === 'emi' && s.status === 'active')
      .map((s) => {
        const nextInst = (s.installments || []).find((i) => i.status !== 'paid');
        const remainingMonths = s.totalInstallments - (s.paidInstallments || 0);
        return {
          schedule: s,
          nextInstallment: nextInst,
          remainingMonths,
        };
      })
      .filter((item) => item.nextInstallment)
      .sort((a, b) => new Date(a.nextInstallment.dueDate) - new Date(b.nextInstallment.dueDate));
  }, [schedules]);

  // Grouped active Rent schedules: one entry per property and active lease
  const groupedRentSchedules = useMemo(() => {
    const now = new Date();
    return schedules
      .filter((s) => s.type === 'rent' && s.status === 'active')
      .filter((s) => !s.endDate || new Date(s.endDate) > now)
      .map((s) => {
        const nextInst = (s.installments || []).find((i) => i.status !== 'paid');
        const remainingMonths = s.totalInstallments - (s.paidInstallments || 0);
        return {
          schedule: s,
          nextInstallment: nextInst,
          remainingMonths,
        };
      })
      .filter((item) => item.nextInstallment)
      .sort((a, b) => new Date(a.nextInstallment.dueDate) - new Date(b.nextInstallment.dueDate));
  }, [schedules]);

  // Filtered payment history
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (historyTypeFilter === 'full') {
        const isFull = p.type === 'full_purchase' || p.type === 'full_payment';
        if (!isFull) return false;
      } else if (historyTypeFilter === 'emi') {
        const isEmi = p.type === 'emi_installment' || p.type === 'emi_down_payment' || p.type === 'token_amount';
        if (!isEmi) return false;
      } else if (historyTypeFilter === 'rent') {
        const isRent = p.type === 'rent_deposit' || p.type === 'rent_installment';
        if (!isRent) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = p.id?.toLowerCase().includes(q);
        const matchReceipt = p.receiptNumber?.toLowerCase().includes(q);
        const matchTitle = p.propertyTitle?.toLowerCase().includes(q);
        const matchMethod = p.method?.toLowerCase().includes(q);
        if (!matchId && !matchReceipt && !matchTitle && !matchMethod) return false;
      }
      return true;
    });
  }, [payments, historyTypeFilter, searchQuery]);

  const handlePaymentSuccess = (payment, updatedSchedule) => {
    setStoreVersion((v) => v + 1);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 font-medium">
            Paid
          </span>
        );
      case 'due_today':
        return (
          <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-500/30 font-medium animate-pulse">
            Due Today
          </span>
        );
      case 'overdue':
        return (
          <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-900 border border-rose-500/30 font-medium">
            Overdue
          </span>
        );
      case 'failed':
        return (
          <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-800 border border-rose-500/20 font-medium">
            Failed
          </span>
        );
      default:
        return (
          <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sand/60 text-charcoal/70 border border-charcoal/15 font-medium">
            Upcoming
          </span>
        );
    }
  };

  const formatHistoryCategory = (p) => {
    if (p.type === 'full_purchase' || p.type === 'full_payment') return 'Full Purchase';
    if (p.type === 'emi_down_payment') return 'EMI Down Payment';
    if (p.type === 'emi_installment') return `EMI Installment #${p.installmentNumber || ''}`;
    if (p.type === 'rent_deposit') return 'Rental Security Deposit';
    if (p.type === 'rent_installment') return `Monthly Rent #${p.installmentNumber || ''}`;
    if (p.type === 'token_amount') return 'Token Advance';
    return String(p.type || 'Payment').replace('_', ' ');
  };

  return (
    <DashboardLayout role="user">
      <div className="space-y-6">
        {/* Contextual Back Navigation */}
        <div>
          <DashboardBackButton fallbackTo="/dashboard/overview" label="Back to Overview" />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Financial Activity
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Transactions & Schedules
            </h1>
          </div>

          {/* Primary View Switcher Pills */}
          <div className="inline-flex p-1 rounded-full bg-sand/60 border border-charcoal/10 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('schedules');
                setSearchParams({ tab: 'schedules' });
              }}
              className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'schedules'
                  ? 'bg-deep-purple text-white shadow-xs font-medium'
                  : 'text-charcoal/70 hover:text-charcoal'
              }`}
            >
              Upcoming Schedules ({groupedEmiSchedules.length + groupedRentSchedules.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                setSearchParams({ tab: 'history' });
              }}
              className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-deep-purple text-white shadow-xs font-medium'
                  : 'text-charcoal/70 hover:text-charcoal'
              }`}
            >
              Payment History ({payments.length})
            </button>
          </div>
        </div>

        {/* Demo Simulation Disclaimer */}
        <div className="p-4 rounded-2xl bg-sand/35 border border-charcoal/10 flex items-start gap-3 text-xs font-sans text-dark-gray/80">
          <AlertCircle className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="text-charcoal font-medium block">
              Simulated Escrow & Financial Ledger
            </strong>
            <p className="leading-relaxed">
              All payment schedules, down payments, rental deposits, and monthly installments are simulated within the Porch Light demo environment. No real banking accounts are debited.
            </p>
          </div>
        </div>

        {error && !loading && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-charcoal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="font-sans text-xs text-amber-900">{error}</span>
            <button
              type="button"
              onClick={fetchData}
              className="px-3.5 py-1.5 rounded-full bg-deep-purple text-porcelain hover:bg-deep-purple/90 font-mono text-[11px] uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <DashboardSkeleton type="table" />
        ) : activeTab === 'schedules' ? (
          /* =======================================================
             TAB 1: UPCOMING SCHEDULES (EMI & RENT)
             ======================================================= */
          <div className="space-y-8">
            {/* Section 1: Upcoming EMI Installments (Grouped by Property) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-charcoal/10">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-deep-purple" />
                  <h3 className="font-serif text-xl sm:text-2xl text-charcoal font-medium">
                    Upcoming EMI Installments
                  </h3>
                </div>
                <span className="font-mono text-xs text-dark-gray/60">
                  {groupedEmiSchedules.length} {groupedEmiSchedules.length === 1 ? 'property plan' : 'property plans'}
                </span>
              </div>

              {groupedEmiSchedules.length === 0 ? (
                <div className="p-6 rounded-2xl bg-sand/20 border border-charcoal/10 text-center font-mono text-xs text-dark-gray/60">
                  No active EMI installment financing plans on your account.
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedEmiSchedules.map(({ schedule, nextInstallment, remainingMonths }) => {
                    const isPayable = nextInstallment.status !== 'paid';

                    return (
                      <div
                        key={schedule.customId}
                        className="p-4 sm:p-5 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-sand/40"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-16 h-14 rounded-xl overflow-hidden bg-sand/60 border border-charcoal/10 shrink-0">
                            <SmartImage
                              src={schedule.propertySnapshot?.image}
                              alt={schedule.propertyTitle}
                              aspect="video"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-serif text-base text-charcoal font-medium leading-snug">
                              {schedule.propertyTitle}
                            </div>
                            <div className="font-mono text-xs text-dark-gray/60 mt-0.5">
                              Next: Installment #{nextInstallment.installmentNumber} of {schedule.totalInstallments}
                              {' • '}
                              {schedule.propertySnapshot?.city}
                            </div>
                            <div className="font-mono text-[11px] text-dark-gray/50 mt-1 flex flex-wrap items-center gap-x-2">
                              <span>Remaining Balance: ₹{formatINR(schedule.remainingBalance)}</span>
                              <span>•</span>
                              <span>{remainingMonths} months remaining</span>
                              {schedule.autopayEnabled && (
                                <>
                                  <span>•</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Autopay Active
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-charcoal/10">
                          <div className="text-left sm:text-right">
                            <div className="font-mono text-xs text-dark-gray/50 uppercase block text-[10px]">
                              Next Due: {formatDueDate(nextInstallment.dueDate)}
                            </div>
                            <div className="font-serif text-xl sm:text-2xl text-charcoal font-medium">
                              <RupeeSymbol />{formatINR(nextInstallment.amount)}
                            </div>
                            <div className="mt-1">{getStatusBadge(nextInstallment.status)}</div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setActiveObligationSchedule(schedule)}
                              className="px-3.5 py-2 rounded-full bg-sand/70 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer"
                            >
                              View Plan
                            </button>

                            {isPayable && (
                              <button
                                type="button"
                                onClick={() =>
                                  setActivePaymentTarget({ schedule, installment: nextInstallment })
                                }
                                className="px-4 py-2 rounded-full bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                              >
                                Pay Now
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Upcoming Monthly Rent Payments (Grouped by Leased Property) */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between pb-2 border-b border-charcoal/10">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-deep-purple" />
                  <h3 className="font-serif text-xl sm:text-2xl text-charcoal font-medium">
                    Upcoming Rent Payments
                  </h3>
                </div>
                <span className="font-mono text-xs text-dark-gray/60">
                  {groupedRentSchedules.length} {groupedRentSchedules.length === 1 ? 'leased property' : 'leased properties'}
                </span>
              </div>

              {groupedRentSchedules.length === 0 ? (
                <div className="p-6 rounded-2xl bg-sand/20 border border-charcoal/10 text-center font-mono text-xs text-dark-gray/60">
                  No active residential lease obligations scheduled.
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedRentSchedules.map(({ schedule, nextInstallment, remainingMonths }) => {
                    const isPayable = nextInstallment.status !== 'paid';

                    return (
                      <div
                        key={schedule.customId}
                        className="p-4 sm:p-5 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-sand/40"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="w-16 h-14 rounded-xl overflow-hidden bg-sand/60 border border-charcoal/10 shrink-0">
                            <SmartImage
                              src={schedule.propertySnapshot?.image}
                              alt={schedule.propertyTitle}
                              aspect="video"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-serif text-base text-charcoal font-medium leading-snug">
                              {schedule.propertyTitle}
                            </div>
                            <div className="font-mono text-xs text-dark-gray/60 mt-0.5">
                              Next: Month #{nextInstallment.installmentNumber} of {schedule.totalInstallments}
                              {' • '}
                              {schedule.propertySnapshot?.city}
                            </div>
                            <div className="font-mono text-[11px] text-dark-gray/50 mt-1 flex flex-wrap items-center gap-x-2">
                              <span>Lease ends: {formatDueDate(schedule.endDate)}</span>
                              <span>•</span>
                              <span>{remainingMonths} months remaining</span>
                              {schedule.autopayEnabled && (
                                <>
                                  <span>•</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Autopay Active
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-charcoal/10">
                          <div className="text-left sm:text-right">
                            <div className="font-mono text-xs text-dark-gray/50 uppercase block text-[10px]">
                              Next Due: {formatDueDate(nextInstallment.dueDate)}
                            </div>
                            <div className="font-serif text-xl sm:text-2xl text-charcoal font-medium">
                              <RupeeSymbol />{formatINR(nextInstallment.amount)}
                            </div>
                            <div className="mt-1">{getStatusBadge(nextInstallment.status)}</div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setActiveObligationSchedule(schedule)}
                              className="px-3.5 py-2 rounded-full bg-sand/70 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer"
                            >
                              View Lease
                            </button>

                            {isPayable && (
                              <button
                                type="button"
                                onClick={() =>
                                  setActivePaymentTarget({ schedule, installment: nextInstallment })
                                }
                                className="px-4 py-2 rounded-full bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                              >
                                Pay Now
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* =======================================================
             TAB 2: PAYMENT HISTORY & RECEIPTS
             ======================================================= */
          <div className="space-y-5">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-sand/30 border border-charcoal/10">
              {/* Type Filter Pills */}
              <div className="inline-flex flex-wrap p-1 rounded-full bg-sand/60 border border-charcoal/10 self-start sm:self-auto">
                {[
                  { id: 'all', label: 'All History' },
                  { id: 'full', label: 'Full Purchases' },
                  { id: 'emi', label: 'EMI Payments' },
                  { id: 'rent', label: 'Rent Payments' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setHistoryTypeFilter(f.id)}
                    className={`px-3 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      historyTypeFilter === f.id
                        ? 'bg-deep-purple text-white shadow-xs font-medium'
                        : 'text-charcoal/70 hover:text-charcoal'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-dark-gray/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ID, property, or method..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-porcelain border border-charcoal/15 font-sans text-xs text-charcoal placeholder:text-dark-gray/50 focus:outline-hidden focus:border-deep-purple"
                />
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <DashboardEmptyState
                title={payments.length === 0 ? 'No payment records yet.' : 'No matching payment records found.'}
                description={
                  payments.length === 0
                    ? 'When you complete an acquisition, place a move-in deposit, or pay monthly installments, your simulated transaction receipts will appear here.'
                    : 'Try clearing your search query or switching to another category.'
                }
                actionLabel={payments.length === 0 ? 'Browse Residences' : 'Reset Filters'}
                actionLink={payments.length === 0 ? '/buy' : undefined}
                onAction={
                  payments.length > 0
                    ? () => {
                        setHistoryTypeFilter('all');
                        setSearchQuery('');
                      }
                    : undefined
                }
                icon={Receipt}
              />
            ) : (
              <div className="space-y-4">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-charcoal/15 bg-sand/35 shadow-xs">
                  <table className="w-full text-left font-sans text-sm min-w-[750px] border-collapse">
                    <thead>
                      <tr className="border-b border-charcoal/10 bg-sand/40 font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                        <th className="p-4 font-normal">Transaction ID</th>
                        <th className="p-4 font-normal">Property</th>
                        <th className="p-4 font-normal">Category</th>
                        <th className="p-4 font-normal">Amount</th>
                        <th className="p-4 font-normal">Date & Method</th>
                        <th className="p-4 font-normal">Status</th>
                        <th className="p-4 font-normal">Agent Rating</th>
                        <th className="p-4 text-right font-normal">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal/5 text-charcoal">
                      {filteredPayments.map((p) => {
                        const rating = getRatingForTransaction(p.id);
                        const canRate = p.status === 'completed';

                        return (
                          <tr key={p.id} id={`tx-${p.id}`} className="hover:bg-sand/20 transition-colors">
                            <td className="p-4 font-mono text-xs text-deep-purple font-medium">
                              {p.id}
                              <div className="text-[10px] text-dark-gray/50">{p.receiptNumber}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-serif text-base text-charcoal font-normal">
                                {p.propertyTitle}
                              </div>
                              <div className="font-mono text-xs text-dark-gray/60">
                                {p.propertySnapshot?.locality}, {p.propertySnapshot?.city}
                              </div>
                            </td>
                            <td className="p-4 font-mono text-xs capitalize text-dark-gray/70">
                              {formatHistoryCategory(p)}
                            </td>
                            <td className="p-4 font-mono text-sm font-medium text-charcoal">
                              ₹{p.amount?.toLocaleString('en-IN')}
                            </td>
                            <td className="p-4 font-mono text-xs text-dark-gray/60">
                              {formatTransactionDate(p)}
                              <div className="text-[10px] text-dark-gray/50">{p.method}</div>
                            </td>
                            <td className="p-4">{getStatusBadge(p.status)}</td>
                            <td className="p-4">
                              {canRate ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const resolvedAgentName =
                                      p.agentName || AGENT_NAMES[p.agentId] || 'Representing Agent';
                                    setActiveRatingTarget({
                                      transaction: p,
                                      property: { id: p.propertyId, title: p.propertyTitle },
                                      agent: { id: p.agentId, name: resolvedAgentName, company: 'Porch Light' },
                                      existingRating: rating,
                                    });
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs transition-colors cursor-pointer ${
                                    rating
                                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/30'
                                      : 'bg-deep-purple/10 hover:bg-deep-purple/20 text-deep-purple border border-deep-purple/25 uppercase font-medium'
                                  }`}
                                  title={
                                    rating
                                      ? 'Update your star rating for this completed transaction'
                                      : 'Rate representing agent for this completed transaction'
                                  }
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${
                                      rating ? 'text-amber-500 fill-amber-500' : 'text-deep-purple'
                                    }`}
                                  />
                                  <span>{rating ? `★ ${rating.rating} (Edit)` : 'Rate'}</span>
                                </button>
                              ) : (
                                <span className="font-mono text-[10px] text-dark-gray/40">Ineligible</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                type="button"
                                onClick={() => generatePaymentReceiptPDF(p)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer"
                                title="Download official demo payment receipt"
                              >
                                <Download className="w-3.5 h-3.5 text-deep-purple" />
                                <span>PDF</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Card View */}
                <div className="block md:hidden space-y-3">
                  {filteredPayments.map((p) => {
                    const rating = getRatingForTransaction(p.id);
                    const canRate = p.status === 'completed';

                    return (
                      <div
                        key={p.id}
                        className="p-4 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2 pb-2 border-b border-charcoal/10">
                          <div>
                            <span className="font-mono text-xs font-semibold text-deep-purple">{p.id}</span>
                            <div className="font-mono text-[10px] text-dark-gray/50">{p.receiptNumber}</div>
                          </div>
                          <div>{getStatusBadge(p.status)}</div>
                        </div>

                        <div>
                          <h4 className="font-serif text-base text-charcoal font-normal">{p.propertyTitle}</h4>
                          <div className="font-mono text-xs text-dark-gray/60 mt-0.5">
                            {p.propertySnapshot?.locality}, {p.propertySnapshot?.city}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
                          <div>
                            <span className="text-dark-gray/50 block text-[10px] uppercase">Category</span>
                            <span className="text-charcoal">{formatHistoryCategory(p)}</span>
                          </div>
                          <div>
                            <span className="text-dark-gray/50 block text-[10px] uppercase">Amount</span>
                            <span className="text-charcoal font-medium">₹{p.amount?.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-dark-gray/50 block text-[10px] uppercase">Date</span>
                            <span className="text-dark-gray/70">{formatTransactionDate(p)}</span>
                          </div>
                          <div>
                            <span className="text-dark-gray/50 block text-[10px] uppercase">Method</span>
                            <span className="text-dark-gray/70">{p.method}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-charcoal/10">
                          {canRate ? (
                            <button
                              type="button"
                              onClick={() => {
                                const resolvedAgentName =
                                  p.agentName || AGENT_NAMES[p.agentId] || 'Representing Agent';
                                setActiveRatingTarget({
                                  transaction: p,
                                  property: { id: p.propertyId, title: p.propertyTitle },
                                  agent: { id: p.agentId, name: resolvedAgentName, company: 'Porch Light' },
                                  existingRating: rating,
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-xs border border-charcoal/15 bg-sand/60 text-charcoal"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  rating ? 'text-amber-500 fill-amber-500' : 'text-deep-purple'
                                }`}
                              />
                              <span>{rating ? `★ ${rating.rating}` : 'Rate Agent'}</span>
                            </button>
                          ) : (
                            <div />
                          )}

                          <button
                            type="button"
                            onClick={() => generatePaymentReceiptPDF(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal"
                          >
                            <Download className="w-3.5 h-3.5 text-deep-purple" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* In-App Installment Payment Modal */}
        {activePaymentTarget && (
          <InstallmentPaymentModal
            isOpen={Boolean(activePaymentTarget)}
            onClose={() => setActivePaymentTarget(null)}
            schedule={activePaymentTarget.schedule}
            installment={activePaymentTarget.installment}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {/* Agent Rating Modal */}
        {activeRatingTarget && (
          <AgentRatingModal
            isOpen={Boolean(activeRatingTarget)}
            onClose={() => setActiveRatingTarget(null)}
            transaction={activeRatingTarget.transaction}
            property={activeRatingTarget.property}
            agent={activeRatingTarget.agent}
            existingRating={activeRatingTarget.existingRating}
            onRatingSaved={() => {
              setStoreVersion((v) => v + 1);
            }}
          />
        )}
        {/* Property Obligation Modal (Grouped Summary) */}
        {activeObligationSchedule && (
          <PropertyObligationModal
            isOpen={Boolean(activeObligationSchedule)}
            onClose={() => setActiveObligationSchedule(null)}
            schedule={activeObligationSchedule}
            role="user"
            onPayInstallment={(sched, inst) => {
              setActivePaymentTarget({ schedule: sched, installment: inst });
            }}
            onScheduleUpdate={(updatedSched) => {
              setActiveObligationSchedule(updatedSched);
              setStoreVersion((v) => v + 1);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

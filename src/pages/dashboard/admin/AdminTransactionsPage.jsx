import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { getPayments, getPaymentSchedules } from '@/services/payments';
import { PropertyObligationModal } from '@/components/payment/PropertyObligationModal';
import { formatINR, RupeeSymbol } from '@/lib/formatINR';
import { formatPaymentDate, formatDueDate } from '@/lib/formatDate';
import { Receipt, AlertCircle, TrendingUp, CheckCircle2, Clock, ShieldCheck, Building2 } from 'lucide-react';

function formatTransactionDate(p) {
  return formatPaymentDate(p, { includeTime: true });
}

function formatTransactionCategory(p) {
  const type = p?.type;
  if (type === 'full_purchase' || type === 'full_payment') return 'Full Payment';
  if (
    type === 'emi_installment' ||
    type === 'emi_down_payment' ||
    type === 'emi' ||
    p?.financingDetails?.planType === 'emi_down_payment' ||
    p?.financingDetails?.planType === 'loan_plan' ||
    (p?.financingDetails?.monthlyEmi > 0 && type !== 'rent_deposit' && type !== 'promotion_fee')
  ) {
    return p?.type === 'emi_down_payment' ? 'EMI Down Payment' : 'EMI Installment';
  }
  if (type === 'rent_installment') return 'Rent Payment';
  if (type === 'rent_deposit') return 'Rental Deposit';
  if (type === 'promotion_fee') return 'Promotion Fee';
  return type ? String(type).replace('_', ' ') : 'General Payment';
}

export function AdminTransactionsPage() {
  const [payments, setPayments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'obligations'
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    let isMounted = true;
    Promise.all([getPayments(), getPaymentSchedules()])
      .then(([payRes, schedRes]) => {
        if (isMounted) {
          setPayments(payRes.data || []);
          setSchedules(schedRes.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Grouped active property obligations (one entry per property plan)
  const groupedObligations = useMemo(() => {
    return schedules
      .filter((s) => s.status === 'active')
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

  const scheduledObligationsTotal = useMemo(() => {
    return groupedObligations.reduce((acc, o) => {
      return acc + (o.nextInstallment?.amount || o.schedule.recurringAmount || 0);
    }, 0);
  }, [groupedObligations]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (filterType === 'full') {
        return (
          p.type === 'full_purchase' ||
          p.type === 'full_payment' ||
          (p.financingDetails?.planType === 'full_purchase' && p.type !== 'rent_deposit' && p.type !== 'promotion_fee')
        );
      }
      if (filterType === 'emi') {
        return (
          p.type === 'emi_installment' ||
          p.type === 'emi_down_payment' ||
          p.type === 'emi' ||
          p.financingDetails?.planType === 'emi_down_payment' ||
          p.financingDetails?.planType === 'loan_plan' ||
          (p.financingDetails?.monthlyEmi > 0 && p.type !== 'rent_deposit' && p.type !== 'promotion_fee')
        );
      }
      if (filterType === 'rent') {
        return p.type === 'rent_installment' || p.type === 'rent_deposit';
      }
      if (filterType === 'promo') return p.type === 'promotion_fee';
      return true;
    });
  }, [payments, filterType]);

  // Dynamic statistics synchronized with filtered records
  const totalVolume = filtered.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalCount = filtered.length;

  const completedTransactions = filtered.filter(
    (p) => p.status === 'completed' || p.status === 'success' || !p.status
  );
  const completedAmount = completedTransactions.reduce((acc, p) => acc + (p.amount || 0), 0);
  const completedCount = completedTransactions.length;

  const pendingFailedTransactions = filtered.filter(
    (p) => p.status === 'pending' || p.status === 'failed'
  );
  const pendingFailedAmount = pendingFailedTransactions.reduce((acc, p) => acc + (p.amount || 0), 0);
  const pendingFailedCount = pendingFailedTransactions.length;

  const fullPurchases = payments.filter(
    (p) =>
      p.type === 'full_purchase' ||
      p.type === 'full_payment' ||
      (p.financingDetails?.planType === 'full_purchase' && p.type !== 'rent_deposit' && p.type !== 'promotion_fee')
  );
  const fullAmount = fullPurchases.reduce((acc, p) => acc + (p.amount || 0), 0);

  const emiInstallments = payments.filter(
    (p) =>
      p.type === 'emi_installment' ||
      p.type === 'emi_down_payment' ||
      p.type === 'emi' ||
      p.financingDetails?.planType === 'emi_down_payment' ||
      p.financingDetails?.planType === 'loan_plan' ||
      (p.financingDetails?.monthlyEmi > 0 && p.type !== 'rent_deposit' && p.type !== 'promotion_fee')
  );
  const emiAmount = emiInstallments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const rentalTransactions = payments.filter((p) => p.type === 'rent_deposit' || p.type === 'rent_installment');
  const rentAmount = rentalTransactions.reduce((acc, p) => acc + (p.amount || 0), 0);

  const promotionFees = payments.filter((p) => p.type === 'promotion_fee');
  const promoAmount = promotionFees.reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Financial Audit
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Transactions & Revenue
            </h1>
          </div>

          <span className="font-mono text-xs text-dark-gray/60 bg-sand/60 px-3 py-1.5 rounded-full border border-charcoal/10 self-start sm:self-auto">
            {payments.length} Audited {payments.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {/* Platform Financial Summary (Cards matching exact Porch Light typography) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-sand/35 border border-charcoal/10 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-dark-gray/60 mb-2">
              <span className="font-mono text-[11px] uppercase tracking-wider">Recorded Volume</span>
              <TrendingUp className="w-4 h-4 text-deep-purple" />
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl text-charcoal font-medium leading-none mb-1">
                <RupeeSymbol />{formatINR(totalVolume)}
              </div>
              <div className="font-mono text-xs text-dark-gray/60">
                {totalCount} {totalCount === 1 ? 'transaction' : 'transactions'}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-sand/35 border border-charcoal/10 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-dark-gray/60 mb-2">
              <span className="font-mono text-[11px] uppercase tracking-wider">Successfully Collected</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl text-charcoal font-medium leading-none mb-1">
                <RupeeSymbol />{formatINR(completedAmount)}
              </div>
              <div className="font-mono text-xs text-dark-gray/60">
                {completedCount} settled payments
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-sand/35 border border-charcoal/10 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-dark-gray/60 mb-2">
              <span className="font-mono text-[11px] uppercase tracking-wider">Pending / Processing</span>
              <Clock className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl text-charcoal font-medium leading-none mb-1">
                <RupeeSymbol />{formatINR(pendingFailedAmount)}
              </div>
              <div className="font-mono text-xs text-dark-gray/60">
                {pendingFailedCount} unresolved {pendingFailedCount === 1 ? 'record' : 'records'}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-sand/35 border border-charcoal/10 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-dark-gray/60 mb-2">
              <span className="font-mono text-[11px] uppercase tracking-wider">Scheduled Obligations</span>
              <Building2 className="w-4 h-4 text-deep-purple" />
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl text-charcoal font-medium leading-none mb-1">
                <RupeeSymbol />{formatINR(scheduledObligationsTotal)}
              </div>
              <div className="font-mono text-xs text-dark-gray/60">
                {groupedObligations.length} active {groupedObligations.length === 1 ? 'property plan' : 'property plans'}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-sand/35 border border-charcoal/10 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-dark-gray/60 mb-2">
              <span className="font-mono text-[11px] uppercase tracking-wider">Promotion Revenue</span>
              <ShieldCheck className="w-4 h-4 text-deep-purple" />
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl text-charcoal font-medium leading-none mb-1">
                <RupeeSymbol />{formatINR(promoAmount)}
              </div>
              <div className="font-mono text-xs text-dark-gray/60">
                {promotionFees.length} platform fee {promotionFees.length === 1 ? 'receipt' : 'receipts'}
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-sand/20 border border-charcoal/10">
          <div className="space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60">
              Full Payments
            </div>
            <div className="font-serif text-lg text-charcoal font-medium">
              <RupeeSymbol />{formatINR(fullAmount)}
            </div>
            <div className="font-mono text-[11px] text-dark-gray/50">
              {fullPurchases.length} settled
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60">
              EMI Installments
            </div>
            <div className="font-serif text-lg text-charcoal font-medium">
              <RupeeSymbol />{formatINR(emiAmount)}
            </div>
            <div className="font-mono text-[11px] text-dark-gray/50">
              {emiInstallments.length} collected
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60">
              Rent & Deposits
            </div>
            <div className="font-serif text-lg text-charcoal font-medium">
              <RupeeSymbol />{formatINR(rentAmount)}
            </div>
            <div className="font-mono text-[11px] text-dark-gray/50">
              {rentalTransactions.length} recorded
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60">
              Promotion Fees
            </div>
            <div className="font-serif text-lg text-charcoal font-medium">
              <RupeeSymbol />{formatINR(promoAmount)}
            </div>
            <div className="font-mono text-[11px] text-dark-gray/50">
              {promotionFees.length} total
            </div>
          </div>
        </div>

        {/* Escrow & Brokerage Payout Disclaimer */}
        <div className="p-4 sm:p-5 rounded-2xl bg-sand/30 border border-charcoal/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-deep-purple shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs font-sans text-dark-gray/80">
              <div className="text-charcoal font-medium text-sm">
                Escrow & Brokerage Settlement Notice
              </div>
              <p className="leading-relaxed">
                Brokerage payouts and partner commissions are handled externally. Gross transaction values represent client payments recorded through Porch Light escrow, while platform revenue is limited to administrative fees (such as verified promotions). All transactions are simulated for demonstration.
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-dark-gray/70 bg-sand/60 px-3 py-1.5 rounded-full border border-charcoal/15 shrink-0 self-start sm:self-auto shadow-xs">
            {filtered.length} Filtered / {payments.length} Platform Total
          </span>
        </div>

        {/* Tab Switcher: Ledger vs Grouped Obligations */}
        <div className="flex border-b border-charcoal/10 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`pb-3 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeTab === 'ledger'
                ? 'border-deep-purple text-deep-purple font-medium'
                : 'border-transparent text-charcoal/60 hover:text-charcoal'
            }`}
          >
            Transaction Ledger ({filtered.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('obligations')}
            className={`pb-3 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeTab === 'obligations'
                ? 'border-deep-purple text-deep-purple font-medium'
                : 'border-transparent text-charcoal/60 hover:text-charcoal'
            }`}
          >
            Property Obligations ({groupedObligations.length})
          </button>
        </div>

        {activeTab === 'obligations' ? (
          /* Grouped Property Obligations View */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-sand/30 border border-charcoal/10 flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
              <div className="text-xs text-charcoal/80 leading-relaxed">
                Platform-wide active payment plans summarized by property. Repeated future installments are consolidated into one canonical summary per active plan with the next actionable payment date, remaining tenure, and balance. Individual settled installments remain preserved in the audit ledger.
              </div>
            </div>

            {loading ? (
              <DashboardSkeleton type="table" />
            ) : groupedObligations.length === 0 ? (
              <DashboardEmptyState
                title="No active property obligations."
                description="Active residential leases and buyer EMI plans will appear summarized here by property."
                icon={Building2}
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-charcoal/15 bg-sand/35 shadow-xs">
                <table className="w-full text-left font-sans text-sm min-w-[750px] border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal/10 bg-sand/40 font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                      <th className="p-4">Property</th>
                      <th className="p-4">Plan Type</th>
                      <th className="p-4">Next Due Date</th>
                      <th className="p-4">Next Amount</th>
                      <th className="p-4">Duration / Remaining</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal/5 text-charcoal">
                    {groupedObligations.map(({ schedule: s, nextInstallment: nextInst, remainingMonths }) => {
                      const isEmi = s.type === 'emi';
                      const isOverdue = nextInst.status === 'overdue' || (nextInst.status === 'pending' && new Date(nextInst.dueDate) < new Date());
                      const isDueToday = !isOverdue && new Date(nextInst.dueDate).toDateString() === new Date().toDateString();

                      return (
                        <tr key={s._id || s.id} className="hover:bg-sand/15 transition-colors">
                          <td className="p-4">
                            <div className="font-serif text-base text-charcoal font-medium">
                              {s.propertyTitle || 'Property Obligation'}
                            </div>
                            <div className="font-mono text-xs text-dark-gray/60">
                              {s.propertySnapshot?.locality ? `${s.propertySnapshot.locality}, ` : ''}{s.propertySnapshot?.city || ''}
                            </div>
                            {s.propertySnapshot?.reraRegistrationNumber && (
                              <div className="font-mono text-[10px] text-dark-gray/50">
                                RERA: {s.propertySnapshot.reraRegistrationNumber}
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            <span
                              className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-medium ${
                                isEmi
                                  ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/20'
                                  : 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                              }`}
                            >
                              {isEmi ? 'Monthly EMI Plan' : 'Active Lease'}
                            </span>
                            <div className="font-mono text-[10px] text-dark-gray/50 mt-1">
                              {s.frequency || 'Monthly'}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-mono text-xs text-charcoal">
                              {formatDueDate(nextInst)}
                            </div>
                            <div className="font-mono text-[10px] text-dark-gray/50">
                              Installment #{nextInst.installmentNumber}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-mono text-sm font-medium text-charcoal">
                              <RupeeSymbol />{formatINR(nextInst.amount || s.recurringAmount)}
                            </div>
                            <div className="font-mono text-[10px] text-dark-gray/50">
                              {isEmi ? 'Monthly Installment' : 'Monthly Rent'}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-mono text-xs text-charcoal">
                              {isEmi ? `${remainingMonths} months left` : `${s.totalInstallments || 12} mo lease`}
                            </div>
                            {isEmi && s.remainingBalance > 0 && (
                              <div className="font-mono text-[10px] text-dark-gray/50">
                                Balance: <RupeeSymbol />{formatINR(s.remainingBalance)}
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            <span
                              className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-medium ${
                                isOverdue
                                  ? 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                                  : isDueToday
                                  ? 'bg-amber-500/10 text-amber-800 border-amber-500/20'
                                  : 'bg-deep-purple/10 text-deep-purple border-deep-purple/20'
                              }`}
                            >
                              {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : 'Upcoming'}
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedSchedule(s)}
                              className="px-3 py-1.5 rounded-lg bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Ledger Tab */
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="inline-flex flex-wrap p-1 rounded-full bg-sand/60 border border-charcoal/10">
              {[
                { id: 'all', label: `All Transactions (${payments.length})` },
                { id: 'full', label: `Full Payments (${fullPurchases.length})` },
                { id: 'emi', label: `EMI Installments (${emiInstallments.length})` },
                { id: 'rent', label: `Rent & Deposits (${rentalTransactions.length})` },
                { id: 'promo', label: `Promotion Fees (${promotionFees.length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    filterType === f.id
                      ? 'bg-deep-purple text-white shadow-xs font-medium'
                      : 'text-charcoal/70 hover:text-charcoal'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loading ? (
              <DashboardSkeleton type="table" />
            ) : filtered.length === 0 ? (
              <DashboardEmptyState
                title="No transactions match this filter."
                description="Transaction records are automatically logged when full purchases, EMI financing, rental deposits, or promotion fees are simulated."
                icon={Receipt}
              />
            ) : (
              <>
                {/* Desktop / Tablet Table View */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-charcoal/15 bg-sand/35 shadow-xs">
                  <table className="w-full text-left font-sans text-sm min-w-[750px] border-collapse">
                    <thead>
                      <tr className="border-b border-charcoal/10 bg-sand/40 font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                        <th className="p-4">Transaction ID</th>
                        <th className="p-4">Property</th>
                        <th className="p-4">Payer / User</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Date</th>
                        <th className="p-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal/5 text-charcoal">
                      {filtered.map((p) => (
                        <tr key={p.id} id={`tx-${p.id}`} className="hover:bg-sand/15 transition-colors">
                          <td className="p-4 font-mono text-xs text-deep-purple font-medium">
                            {p.id}
                            <div className="text-[10px] text-dark-gray/50">{p.receiptNumber}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-serif text-base text-charcoal font-medium">
                              {p.propertyTitle || 'Platform Service'}
                            </div>
                            {p.propertySnapshot?.locality && (
                              <div className="font-mono text-xs text-dark-gray/50">
                                {p.propertySnapshot.locality}, {p.propertySnapshot.city}
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-sans text-xs text-charcoal font-medium">
                            {p.userName || 'Verified Account'}
                          </td>
                          <td className="p-4 font-mono text-xs capitalize text-dark-gray/70">
                            {formatTransactionCategory(p)}
                          </td>
                          <td className="p-4 font-mono text-sm font-medium text-charcoal">
                            <RupeeSymbol />{formatINR(p.amount)}
                          </td>
                          <td className="p-4 font-mono text-xs text-dark-gray/60">
                            {formatTransactionDate(p)}
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/25 font-medium whitespace-nowrap">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Card View */}
                <div className="block md:hidden space-y-3">
                  {filtered.map((p) => (
                    <div
                      key={p.id}
                      id={`tx-mob-${p.id}`}
                      className="p-4 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-charcoal/10">
                        <div>
                          <span className="font-mono text-xs font-semibold text-deep-purple">
                            {p.id}
                          </span>
                          {p.receiptNumber && (
                            <div className="font-mono text-[10px] text-dark-gray/50">{p.receiptNumber}</div>
                          )}
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/25 font-medium whitespace-nowrap">
                          {p.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-serif text-base text-charcoal font-medium leading-snug">
                          {p.propertyTitle || 'Platform Service'}
                        </h4>
                        {p.propertySnapshot?.locality && (
                          <div className="font-mono text-xs text-dark-gray/60 mt-0.5">
                            {p.propertySnapshot.locality}, {p.propertySnapshot.city}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
                        <div>
                          <span className="text-dark-gray/50 block text-[10px] uppercase">Category</span>
                          <span className="capitalize text-charcoal">{formatTransactionCategory(p)}</span>
                        </div>
                        <div>
                          <span className="text-dark-gray/50 block text-[10px] uppercase">Amount</span>
                          <span className="font-semibold text-charcoal"><RupeeSymbol />{formatINR(p.amount)}</span>
                        </div>
                        <div>
                          <span className="text-dark-gray/50 block text-[10px] uppercase">Payer / User</span>
                          <span className="text-charcoal truncate block">{p.userName || 'Verified Account'}</span>
                        </div>
                        <div>
                          <span className="text-dark-gray/50 block text-[10px] uppercase">Date</span>
                          <span className="text-dark-gray/70">{formatTransactionDate(p)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Property Obligation Modal (Admin Escrow Inspection View) */}
        {selectedSchedule && (
          <PropertyObligationModal
            schedule={selectedSchedule}
            role="admin"
            onClose={() => setSelectedSchedule(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

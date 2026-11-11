import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { getPayments, getPaymentSchedules } from '@/services/payments';
import { generatePaymentReceiptPDF } from '@/services/documents';
import { PropertyObligationModal } from '@/components/payment/PropertyObligationModal';
import { formatINR, RupeeSymbol } from '@/lib/formatINR';
import { formatPaymentDate, formatDueDate, getPaymentDateTimestamp } from '@/lib/formatDate';
import {
  Receipt,
  Download,
  AlertCircle,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export function AgentTransactionsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'obligations'
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'full_purchase' | 'emi' | 'rent' | 'promotion_fee'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

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
  }, [user?.id]);

  // Counts for pills
  const fullCount = useMemo(
    () => payments.filter((p) => p.type === 'full_purchase' || p.type === 'full_payment').length,
    [payments]
  );
  const emiCount = useMemo(
    () =>
      payments.filter(
        (p) =>
          p.type === 'emi_installment' ||
          p.type === 'emi_down_payment' ||
          p.type === 'emi' ||
          (p.financingDetails?.monthlyEmi > 0 && p.type !== 'rent_deposit' && p.type !== 'promotion_fee')
      ).length,
    [payments]
  );
  const rentCount = useMemo(
    () => payments.filter((p) => p.type === 'rent_installment' || p.type === 'rent_deposit').length,
    [payments]
  );
  const promoCount = useMemo(
    () => payments.filter((p) => p.type === 'promotion_fee').length,
    [payments]
  );

  // Grouped active property schedules (one entry per property plan)
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

  // Filtered and Sorted records
  const filteredAndSorted = useMemo(() => {
    let result = payments.filter((p) => {
      // Type filter
      if (typeFilter === 'full_purchase') {
        if (p.type !== 'full_purchase' && p.type !== 'full_payment') return false;
      } else if (typeFilter === 'emi') {
        const isEmi =
          p.type === 'emi_installment' ||
          p.type === 'emi_down_payment' ||
          p.type === 'emi' ||
          (p.financingDetails?.monthlyEmi > 0 && p.type !== 'rent_deposit' && p.type !== 'promotion_fee');
        if (!isEmi) return false;
      } else if (typeFilter === 'rent') {
        if (p.type !== 'rent_installment' && p.type !== 'rent_deposit') return false;
      } else if (typeFilter === 'promotion_fee') {
        if (p.type !== 'promotion_fee') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = (p.id || '').toLowerCase().includes(q);
        const matchReceipt = (p.receiptNumber || '').toLowerCase().includes(q);
        const matchProp = (p.propertyTitle || '').toLowerCase().includes(q);
        const matchUser = (p.userName || '').toLowerCase().includes(q);
        const matchLoc = (p.propertySnapshot?.locality || '').toLowerCase().includes(q);
        const matchCity = (p.propertySnapshot?.city || '').toLowerCase().includes(q);
        if (!matchId && !matchReceipt && !matchProp && !matchUser && !matchLoc && !matchCity) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return getPaymentDateTimestamp(b) - getPaymentDateTimestamp(a);
      }
      if (sortBy === 'date_asc') {
        return getPaymentDateTimestamp(a) - getPaymentDateTimestamp(b);
      }
      if (sortBy === 'amount_desc') {
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      }
      if (sortBy === 'amount_asc') {
        return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      }
      if (sortBy === 'status') {
        return (a.status || '').localeCompare(b.status || '');
      }
      return 0;
    });

    return result;
  }, [payments, typeFilter, searchQuery, sortBy]);

  const hasActiveFilters = typeFilter !== 'all' || Boolean(searchQuery.trim()) || sortBy !== 'date_desc';

  const handleClearFilters = () => {
    setTypeFilter('all');
    setSearchQuery('');
    setSortBy('date_desc');
  };

  return (
    <DashboardLayout role="agent">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Portfolio Ledger
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Transactions & Activity
            </h1>
          </div>
          <span className="font-mono text-xs text-dark-gray/60 bg-sand/60 px-3 py-1.5 rounded-full border border-charcoal/10 self-start sm:self-auto">
            {payments.length} Portfolio {payments.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {/* Clear Non-Commission / Demo Notice */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-amber-950 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-amber-900">
              Demo Sandbox Notice: Accounting & Escrow Classification
            </p>
            <p className="text-charcoal/80 leading-relaxed">
              The records below distinguish between <strong>Client Reservation Escrow</strong> (purchase tokens & rental move-in deposits) and <strong>Agent Marketing Expenses</strong> (promotion fees). None of these amounts represent Agent income or commission payouts, which are handled directly through external broker agreements.
            </p>
          </div>
        </div>

        {/* Tab Switcher: Ledger vs Grouped Property Obligations */}
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
            Transaction Ledger ({payments.length})
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
                Active payment obligations for listings you represent. Each property is summarized with its recurring commitment, next upcoming payment, and remaining duration. Select <strong>View</strong> to inspect schedule and client escrow details.
              </div>
            </div>

            {loading ? (
              <DashboardSkeleton type="table" />
            ) : groupedObligations.length === 0 ? (
              <DashboardEmptyState
                title="No active property obligations."
                description="When clients initiate active EMI financing plans or lease agreements on your listings, summarized property obligations will appear here."
                icon={Building2}
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-charcoal/15 bg-sand/35 shadow-xs">
                <table className="w-full text-left font-sans text-sm min-w-[700px] border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal/10 bg-sand/40 font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                      <th className="p-4">Property</th>
                      <th className="p-4">Obligation Type</th>
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
          /* Transaction Ledger View */
          <>
            {/* Search & Filter Bar */}
            <div className="p-4 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Type Filter Pills */}
                <div className="inline-flex p-1 rounded-xl bg-sand/60 border border-charcoal/10 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      typeFilter === 'all'
                        ? 'bg-deep-purple text-white shadow-xs font-medium'
                        : 'text-charcoal/70 hover:text-charcoal'
                    }`}
                  >
                    All ({payments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('full_purchase')}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      typeFilter === 'full_purchase'
                        ? 'bg-deep-purple text-white shadow-xs font-medium'
                        : 'text-charcoal/70 hover:text-charcoal'
                    }`}
                  >
                    Full Purchases ({fullCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('emi')}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      typeFilter === 'emi'
                        ? 'bg-deep-purple text-white shadow-xs font-medium'
                        : 'text-charcoal/70 hover:text-charcoal'
                    }`}
                  >
                    EMI Installments ({emiCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('rent')}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      typeFilter === 'rent'
                        ? 'bg-deep-purple text-white shadow-xs font-medium'
                        : 'text-charcoal/70 hover:text-charcoal'
                    }`}
                  >
                    Rent Payments ({rentCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilter('promotion_fee')}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      typeFilter === 'promotion_fee'
                        ? 'bg-deep-purple text-white shadow-xs font-medium'
                        : 'text-charcoal/70 hover:text-charcoal'
                    }`}
                  >
                    Promotion Fees ({promoCount})
                  </button>
                </div>

                {/* Search Input & Reset */}
                <div className="flex items-center gap-2">
                  <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 text-dark-gray/40 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search ID, title, or client..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-porcelain border border-charcoal/15 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                    />
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="px-3 py-1.5 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer shrink-0"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {/* Secondary Row: Sorting & Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-charcoal/10 text-xs">
                <div className="font-mono text-dark-gray/60">
                  Showing {filteredAndSorted.length} of {payments.length} transactions
                </div>

                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3.5 h-3.5 text-deep-purple" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60">
                    Sort:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-porcelain border border-charcoal/15 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                  >
                    <option value="date_desc">Date: Newest First</option>
                    <option value="date_asc">Date: Oldest First</option>
                    <option value="amount_desc">Amount: High to Low</option>
                    <option value="amount_asc">Amount: Low to High</option>
                    <option value="status">Status</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Table / Empty States */}
            {loading ? (
              <DashboardSkeleton type="table" />
            ) : payments.length === 0 ? (
              <DashboardEmptyState
                title="No transaction records found."
                description="When buyers or tenants complete simulated bookings on your listings, the transaction logs will appear here."
                icon={Receipt}
              />
            ) : filteredAndSorted.length === 0 ? (
              <DashboardEmptyState
                title="No matching transactions found."
                description={`No records match your active query "${searchQuery}" or selected category filter.`}
                actionLabel="Reset Search & Filters"
                onAction={handleClearFilters}
                icon={Search}
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-charcoal/15 bg-sand/35 shadow-xs">
                <table className="w-full text-left font-sans text-sm min-w-[700px] border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal/10 bg-sand/40 font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                      <th className="p-4">Transaction ID</th>
                      <th className="p-4">Classification</th>
                      <th className="p-4">Listing / Context</th>
                      <th className="p-4">Client / Payer</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal/5 text-charcoal">
                    {filteredAndSorted.map((p) => {
                      const isPromo = p.type === 'promotion_fee';
                      const isFull = p.type === 'full_purchase' || p.type === 'full_payment';
                      const isEmi =
                        p.type === 'emi_installment' ||
                        p.type === 'emi_down_payment' ||
                        p.type === 'emi' ||
                        (p.financingDetails?.monthlyEmi > 0 && !isPromo);
                      const isRent = p.type === 'rent_installment' || p.type === 'rent_deposit';

                      return (
                        <tr key={p.id} id={`tx-${p.id}`} className="hover:bg-sand/15 transition-colors">
                          <td className="p-4">
                            <div className="font-mono text-xs text-deep-purple font-medium">{p.id}</div>
                            {p.receiptNumber && (
                              <div className="font-mono text-[10px] text-dark-gray/50">
                                {p.receiptNumber}
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            {isPromo ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-900 border border-amber-500/25 flex items-center gap-1 w-fit">
                                <Sparkles className="w-3 h-3 text-amber-700" />
                                Marketing Fee
                              </span>
                            ) : isFull ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/25 w-fit block font-medium">
                                Full Purchase
                              </span>
                            ) : isEmi ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/25 w-fit block font-medium">
                                {p.type === 'emi_down_payment' ? 'EMI Down Payment' : 'EMI Installment'}
                              </span>
                            ) : isRent ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sand/60 text-charcoal/80 border border-charcoal/20 w-fit block font-medium">
                                {p.type === 'rent_deposit' ? 'Rental Deposit' : 'Rent Payment'}
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sand/60 text-charcoal/80 border border-charcoal/20 w-fit block font-medium">
                                {p.type || 'Transaction'}
                              </span>
                            )}
                          </td>

                          <td className="p-4">
                            <div className="font-serif text-base text-charcoal font-medium">
                              {p.propertyTitle || 'Listing Service'}
                            </div>
                            {p.propertySnapshot?.locality && (
                              <div className="font-mono text-xs text-dark-gray/50">
                                {p.propertySnapshot.locality}, {p.propertySnapshot.city}
                              </div>
                            )}
                          </td>

                          <td className="p-4 font-sans text-xs text-charcoal font-medium">
                            {isPromo ? 'Agent Self (Marketing)' : p.userName || 'Verified Client'}
                          </td>

                          <td className="p-4">
                            <div className="font-mono text-sm font-medium text-charcoal">
                              <RupeeSymbol />{formatINR(p.amount)}
                            </div>
                            <div className="font-mono text-[10px] text-dark-gray/50">
                              {isPromo ? 'Expense' : 'Client Escrow'}
                            </div>
                          </td>

                          <td className="p-4 font-mono text-xs text-dark-gray/60">
                            {formatPaymentDate(p)}
                          </td>

                          <td className="p-4">
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/25 font-medium">
                              {p.status}
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => generatePaymentReceiptPDF(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer"
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
            )}
          </>
        )}

        {/* Porch Light Themed Property Obligation Modal */}
        {selectedSchedule && (
          <PropertyObligationModal
            schedule={selectedSchedule}
            role="agent"
            onClose={() => setSelectedSchedule(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

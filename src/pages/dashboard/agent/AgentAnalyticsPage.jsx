import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { getAgentAnalytics } from '@/services/analytics';
import { useAuth } from '@/features/auth/AuthContext';
import { formatINR } from '@/lib/formatINR';
import { SmartImage } from '@/components/media/SmartImage';
import { PropertyObligationModal } from '@/components/payment/PropertyObligationModal';
import {
  Eye,
  MessageSquare,
  Key,
  Home,
  Star,
  CreditCard,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  Calendar,
  Sparkles,
} from 'lucide-react';

const PERIOD_OPTIONS = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
];

function formatObligationDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(isoStr).slice(0, 10);
  }
}

export function AgentAnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState(null);
  const [selectedObligation, setSelectedObligation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Table filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'sale' | 'rent'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'pending' | 'closed'
  const [sortBy, setSortBy] = useState('views'); // 'views' | 'inquiries' | 'visits' | 'price_desc' | 'price_asc'

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAgentAnalytics({ period });
      setData(res);
    } catch (err) {
      console.error('Failed to load agent analytics:', err);
      setError(err.message || 'Could not load sales and traffic analytics. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  // Filtered & sorted properties
  const filteredProperties = useMemo(() => {
    if (!data?.properties) return [];

    let list = [...data.properties];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          p.locality?.toLowerCase().includes(q)
      );
    }

    if (filterType !== 'all') {
      list = list.filter((p) => p.listingType === filterType);
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        list = list.filter((p) => p.status === 'approved' && !p.isSold && !p.isLeased);
      } else if (filterStatus === 'pending') {
        list = list.filter((p) => p.status === 'pending');
      } else if (filterStatus === 'closed') {
        list = list.filter((p) => p.isSold || p.isLeased || p.status === 'sold' || p.status === 'rented');
      }
    }

    list.sort((a, b) => {
      if (sortBy === 'views') return b.views - a.views;
      if (sortBy === 'inquiries') return b.inquiries - a.inquiries;
      if (sortBy === 'visits') return b.visits - a.visits;
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      return 0;
    });

    return list;
  }, [data?.properties, searchQuery, filterType, filterStatus, sortBy]);

  const hasActiveFilters = searchQuery.trim() !== '' || filterType !== 'all' || filterStatus !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterStatus('all');
    setSortBy('views');
  };

  // Pending agent state
  if (data?.isVerified === false) {
    return (
      <DashboardLayout role="agent">
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4 border border-sand-200">
            <ShieldAlert className="w-7 h-7 text-charcoal/70" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-charcoal mb-3">Verification Pending</h2>
          <p className="font-sans text-xs sm:text-sm text-dark-gray/70 leading-relaxed mb-6">
            {data.message ||
              'Your agent account is currently pending administrative review. Sales and traffic telemetry will activate once your agency credentials and RERA license are approved.'}
          </p>
          <Link
            to="/agent/overview"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors"
          >
            Return to Overview
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="agent">
      <div className="space-y-8">
        {/* 1. Page Heading, Eyebrow, Period Selector, & Insight */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs uppercase tracking-widest text-deep-purple">
                Portfolio
              </span>
              {data?.isDemoData && (
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/70 text-charcoal/60 border border-charcoal/10">
                  Demo data
                </span>
              )}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-charcoal font-normal tracking-tight">
              Sales and traffic analytics
            </h1>
            <p className="font-sans text-xs sm:text-sm text-dark-gray/70 mt-2 max-w-2xl leading-relaxed">
              {data?.insight || 'Activity is steady this period.'}
            </p>
          </div>

          {/* Compact Period Switcher */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <div className="inline-flex p-1 rounded-full bg-sand/60 border border-charcoal/10">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    period === p.id
                      ? 'bg-deep-purple text-white shadow-xs font-medium'
                      : 'text-charcoal/70 hover:text-charcoal'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Notification State with Retry */}
        {error && !loading && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-charcoal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-900 shrink-0" />
              <span className="font-sans text-xs text-amber-900">{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchAnalytics}
              className="px-3.5 py-1.5 rounded-full bg-deep-purple text-porcelain hover:bg-deep-purple/90 font-mono text-[11px] uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : (
          <>
            {/* 2. Four Summary Figures (Clean Row on Desktop, 2x2 on Mobile) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Figure 1: Unique Views */}
              <div className="p-5 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider">
                      Unique Views
                    </span>
                    <Eye className="w-4 h-4 text-deep-purple/70" />
                  </div>
                  <div className="font-serif text-3xl sm:text-4xl text-charcoal font-normal">
                    {data?.summary?.views?.current ?? 0}
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-charcoal/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-dark-gray/60 text-[11px] truncate">
                    {data?.summary?.views?.context || 'In selected window'}
                  </span>
                  {data?.summary?.views?.hasComparison && data?.summary?.views?.delta !== 0 ? (
                    <span
                      className={`inline-flex items-center text-[11px] ${
                        data.summary.views.delta > 0 ? 'text-emerald-700' : 'text-charcoal/60'
                      }`}
                    >
                      {data.summary.views.delta > 0 ? '+' : ''}
                      {data.summary.views.delta} vs prev
                    </span>
                  ) : (
                    <span className="text-dark-gray/40 text-[10px]">No prior change</span>
                  )}
                </div>
              </div>

              {/* Figure 2: Inquiries Received */}
              <div className="p-5 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider">
                      Inquiries
                    </span>
                    <MessageSquare className="w-4 h-4 text-deep-purple/70" />
                  </div>
                  <div className="font-serif text-3xl sm:text-4xl text-charcoal font-normal">
                    {data?.summary?.inquiries?.current ?? 0}
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-charcoal/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-dark-gray/60 text-[11px] truncate">
                    {data?.summary?.inquiries?.context || 'Client messages'}
                  </span>
                  {data?.summary?.inquiries?.hasComparison && data?.summary?.inquiries?.delta !== 0 ? (
                    <span
                      className={`inline-flex items-center text-[11px] ${
                        data.summary.inquiries.delta > 0 ? 'text-emerald-700' : 'text-charcoal/60'
                      }`}
                    >
                      {data.summary.inquiries.delta > 0 ? '+' : ''}
                      {data.summary.inquiries.delta} vs prev
                    </span>
                  ) : (
                    <span className="text-dark-gray/40 text-[10px]">No prior change</span>
                  )}
                </div>
              </div>

              {/* Figure 3: Properties Rented */}
              <div className="p-5 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider">
                      Leased in Period
                    </span>
                    <Key className="w-4 h-4 text-deep-purple/70" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-3xl sm:text-4xl text-charcoal font-normal">
                      {data?.summary?.rented?.current ?? 0}
                    </span>
                    {typeof data?.summary?.rented?.lifetime === 'number' && (
                      <span className="font-mono text-xs text-dark-gray/60">
                        ({data.summary.rented.lifetime} lifetime)
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-charcoal/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-dark-gray/60 text-[11px] truncate">
                    {data?.summary?.rented?.context || 'Active lease portfolio'}
                  </span>
                  {data?.summary?.rented?.hasComparison && data?.summary?.rented?.delta !== 0 ? (
                    <span
                      className={`inline-flex items-center text-[11px] ${
                        data.summary.rented.delta > 0 ? 'text-emerald-700' : 'text-charcoal/60'
                      }`}
                    >
                      {data.summary.rented.delta > 0 ? '+' : ''}
                      {data.summary.rented.delta} vs prev
                    </span>
                  ) : (
                    <span className="text-dark-gray/40 text-[10px]">Steady rate</span>
                  )}
                </div>
              </div>

              {/* Figure 4: Properties Sold */}
              <div className="p-5 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider">
                      Sold in Period
                    </span>
                    <Home className="w-4 h-4 text-deep-purple/70" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-3xl sm:text-4xl text-charcoal font-normal">
                      {data?.summary?.sold?.current ?? 0}
                    </span>
                    {typeof data?.summary?.sold?.lifetime === 'number' && (
                      <span className="font-mono text-xs text-dark-gray/60">
                        ({data.summary.sold.lifetime} lifetime)
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-charcoal/10 flex items-center justify-between text-xs font-mono">
                  <span className="text-dark-gray/60 text-[11px] truncate">
                    {data?.summary?.sold?.context || 'Completed acquisitions'}
                  </span>
                  {data?.summary?.sold?.hasComparison && data?.summary?.sold?.delta !== 0 ? (
                    <span
                      className={`inline-flex items-center text-[11px] ${
                        data.summary.sold.delta > 0 ? 'text-emerald-700' : 'text-charcoal/60'
                      }`}
                    >
                      {data.summary.sold.delta > 0 ? '+' : ''}
                      {data.summary.sold.delta} vs prev
                    </span>
                  ) : (
                    <span className="text-dark-gray/40 text-[10px]">Steady rate</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Full-Width Rating Analytics Section */}
            <div className="p-6 rounded-2xl bg-sand/25 border border-charcoal/10 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-charcoal/10">
                <div>
                  <span className="font-mono text-xs uppercase tracking-wider text-deep-purple">
                    Reputation Analytics
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl text-charcoal font-normal">
                    Verified client star ratings
                  </h3>
                </div>
                <span className="font-mono text-xs text-dark-gray/60">
                  {data?.ratings?.totalRatings || 0} verified client {data?.ratings?.totalRatings === 1 ? 'rating' : 'ratings'}
                </span>
              </div>

              {data?.ratings?.totalRatings > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Rating Average Box (4 cols) */}
                  <div className="md:col-span-4 p-5 rounded-xl bg-porcelain border border-charcoal/10 text-center space-y-2">
                    <div className="font-serif text-5xl text-deep-purple font-normal">
                      {data.ratings.averageRating ? Number(data.ratings.averageRating).toFixed(1) : '—'}
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= Math.round(data.ratings.averageRating || 0)
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-charcoal/20'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="font-mono text-xs text-dark-gray/60">
                      Based on completed acquisitions & leases
                    </p>
                  </div>

                  {/* 5-Star Distribution Bar Visualizer (8 cols) */}
                  <div className="md:col-span-8 space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = data.ratings.distribution?.[stars] || 0;
                      const total = data.ratings.totalRatings || 1;
                      const pct = Math.round((count / total) * 100);

                      return (
                        <div key={stars} className="flex items-center gap-3 font-mono text-xs text-charcoal/80">
                          <span className="w-10 shrink-0">{stars} ★</span>
                          <div className="flex-1 h-2 rounded-full bg-sand/80 overflow-hidden">
                            <div
                              className="h-full bg-deep-purple rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-dark-gray/60 text-[11px]">{count} ({pct}%)</span>
                        </div>
                      );
                    })}

                    <div className="pt-2 text-xs font-sans text-dark-gray/70">
                      <span className="text-charcoal">Rating Insight:</span>{' '}
                      {data.ratings.ratingTrendNote}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-porcelain/60 border border-charcoal/10 text-center space-y-2">
                  <Star className="w-8 h-8 text-dark-gray/30 mx-auto" />
                  <div className="font-serif text-base text-charcoal font-normal">No ratings recorded yet</div>
                  <p className="font-sans text-xs text-dark-gray/60 max-w-sm mx-auto leading-relaxed">
                    Verified ratings appear here automatically when clients complete acquisitions or lease agreements for your residences.
                  </p>
                </div>
              )}
            </div>

            {/* 4. Money & Upcoming Obligations */}
            <div className="p-6 rounded-2xl bg-sand/25 border border-charcoal/10 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-charcoal/10">
                <div>
                  <span className="font-mono text-xs uppercase tracking-wider text-deep-purple">
                    Recorded Ledger
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl text-charcoal font-normal">
                    Payments recorded for listings
                  </h3>
                </div>
                <Link
                  to="/agent/transactions"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sand/70 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors self-start sm:self-auto shrink-0 shadow-xs"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>View All Transactions</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Ledger Totals Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Payments Recorded */}
                <div className="p-4 rounded-xl bg-porcelain border border-charcoal/10 space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60 block">
                    Total Volume Recorded
                  </span>
                  <div className="font-serif text-2xl sm:text-3xl text-charcoal font-normal">
                    ₹{formatINR(data?.financials?.totalPaymentsRecorded || 0)}
                  </div>
                  <span className="font-mono text-[11px] text-dark-gray/50 block">
                    Escrow deposits & acquisitions
                  </span>
                </div>

                {/* Rent Payments Recorded */}
                <div className="p-4 rounded-xl bg-porcelain border border-charcoal/10 space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60 block">
                    Rent Received
                  </span>
                  <div className="font-serif text-2xl sm:text-3xl text-charcoal font-normal">
                    ₹{formatINR(data?.financials?.rentReceived || 0)}
                  </div>
                  <span className="font-mono text-[11px] text-dark-gray/50 block">
                    Rental leases recorded
                  </span>
                </div>

                {/* Sale Payments Recorded */}
                <div className="p-4 rounded-xl bg-porcelain border border-charcoal/10 space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60 block">
                    Sale Payments Recorded
                  </span>
                  <div className="font-serif text-2xl sm:text-3xl text-charcoal font-normal">
                    ₹{formatINR(data?.financials?.salePaymentsReceived || 0)}
                  </div>
                  <span className="font-mono text-[11px] text-dark-gray/50 block">
                    Full purchases & token settlements
                  </span>
                </div>

                {/* Upcoming Scheduled Obligations */}
                <div className="p-4 rounded-xl bg-porcelain border border-charcoal/10 space-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60 block">
                    Scheduled Obligations
                  </span>
                  <div className="font-serif text-2xl sm:text-3xl text-charcoal font-normal">
                    ₹{formatINR(data?.financials?.upcomingRentMonthly || data?.financials?.upcomingEmiMonthly || 0)}
                  </div>
                  <span className="font-mono text-[11px] text-dark-gray/50 block">
                    {data?.financials?.upcomingRentMonthly > 0
                      ? 'Active monthly lease obligations'
                      : data?.financials?.upcomingEmiMonthly > 0
                      ? 'Active buyer EMI financing'
                      : 'No recurring obligations'}
                  </span>
                </div>
              </div>

              {/* Scheduled Obligations Breakdown (Grouped by Property) */}
              <div className="pt-2 border-t border-charcoal/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-charcoal/70">
                    Upcoming Rent & EMI Obligations (Grouped by Property)
                  </span>
                  <span className="font-mono text-[11px] text-dark-gray/50">
                    {data?.financials?.scheduledObligations?.length || 0} active {data?.financials?.scheduledObligations?.length === 1 ? 'property plan' : 'property plans'}
                  </span>
                </div>

                {data?.financials?.scheduledObligations && data.financials.scheduledObligations.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-charcoal/10 bg-porcelain">
                    <table className="w-full text-left font-sans text-xs">
                      <thead className="bg-sand/40 border-b border-charcoal/10 font-mono text-[10px] uppercase tracking-wider text-dark-gray/60">
                        <tr>
                          <th className="py-2.5 px-3">Property</th>
                          <th className="py-2.5 px-3">Obligation Type</th>
                          <th className="py-2.5 px-3">Next Due Date</th>
                          <th className="py-2.5 px-3 text-right">Next Due Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal/5">
                        {data.financials.scheduledObligations.map((item) => {
                          const isOverdue = item.status === 'overdue';
                          const isDueToday = item.status === 'due_today';
                          return (
                            <tr key={item.id} className="hover:bg-sand/20 transition-colors">
                              <td className="py-2.5 px-3">
                                <Link
                                  to={`/properties/${item.propertyId}`}
                                  className="text-charcoal hover:text-deep-purple hover:underline truncate max-w-[200px] block font-medium"
                                >
                                  {item.propertyTitle || 'Residence'}
                                </Link>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-dark-gray/70">
                                {item.type === 'rent' ? 'Residential Lease' : 'EMI Financing'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-charcoal/80 whitespace-nowrap">
                                {formatObligationDate(item.dueDate)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-serif text-sm text-charcoal whitespace-nowrap">
                                ₹{formatINR(item.amount)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`inline-block font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    isOverdue
                                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                                      : isDueToday
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-sand/60 text-charcoal border-charcoal/15'
                                  }`}
                                >
                                  {isOverdue ? 'Overdue' : isDueToday ? 'Due Today' : 'Upcoming'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/agent/properties/${item.propertyId || item.schedule?.propertyId}?tab=obligations`)}
                                  className="px-2.5 py-1 rounded-md bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-[10px] uppercase tracking-wider text-deep-purple transition-colors cursor-pointer"
                                  title="View property obligations on management page"
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
                ) : (
                  <div className="p-4 rounded-xl bg-porcelain border border-charcoal/10 text-center font-sans text-xs text-dark-gray/60">
                    No active scheduled rent or EMI obligations found for your portfolio.
                  </div>
                )}
              </div>

              {/* Commission & Payout Disclosure Card */}
              <div className="p-4 rounded-xl bg-sand/40 border border-charcoal/10 flex items-start gap-3 text-xs font-sans text-dark-gray/70">
                <AlertCircle className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <span className="text-charcoal font-medium">Important Payout Notice:</span>{' '}
                  {data?.financials?.disclaimer ||
                    'Client transaction amounts are logged in Porch Light escrow records. Agent brokerage commissions and payouts are settled externally and are not logged as platform revenue.'}
                </p>
              </div>
            </div>

            {/* 5. Property Performance Table */}
            <div className="p-6 rounded-2xl bg-sand/25 border border-charcoal/10 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-charcoal/10">
                <div>
                  <span className="font-mono text-xs uppercase tracking-wider text-deep-purple">
                    Listing Audit
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl text-charcoal font-normal">
                    Property performance
                  </h3>
                </div>
                <span className="font-mono text-xs text-dark-gray/60">
                  Showing {filteredProperties.length} of {data?.properties?.length || 0} residences
                </span>
              </div>

              {/* Filter & Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-dark-gray/50 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title, locality..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-porcelain border border-charcoal/15 font-sans text-xs text-charcoal placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple/40"
                  />
                </div>

                {/* Filter Type */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-porcelain border border-charcoal/15 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple/40 cursor-pointer"
                >
                  <option value="all">All Typologies (Buy & Rent)</option>
                  <option value="sale">Buy Only</option>
                  <option value="rent">Rent Only</option>
                </select>

                {/* Filter Status */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-porcelain border border-charcoal/15 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple/40 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active & Available</option>
                  <option value="pending">Pending Moderation</option>
                  <option value="closed">Sold / Rented</option>
                </select>

                {/* Sort Order */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-porcelain border border-charcoal/15 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple/40 cursor-pointer"
                >
                  <option value="views">Sort by Views (Highest)</option>
                  <option value="inquiries">Sort by Inquiries (Highest)</option>
                  <option value="visits">Sort by Visits (Highest)</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="price_asc">Price: Low to High</option>
                </select>
              </div>

              {hasActiveFilters && (
                <div className="flex items-center justify-between text-xs font-mono pt-1 text-dark-gray/60">
                  <span>Filtered view active</span>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-deep-purple hover:underline cursor-pointer"
                  >
                    Clear all filters
                  </button>
                </div>
              )}

              {/* Table Component */}
              {filteredProperties.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="font-serif text-lg text-charcoal font-normal">No properties match your filter criteria.</p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-4 py-2 rounded-full bg-deep-purple text-white font-mono text-xs uppercase tracking-wider"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop / Tablet Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-charcoal/15 bg-sand/35">
                    <table className="w-full text-left font-sans text-sm min-w-[700px] border-collapse">
                      <thead>
                        <tr className="border-b border-charcoal/10 bg-sand/40 font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                          <th className="p-3.5 font-normal">Property & City</th>
                          <th className="p-3.5 text-center font-normal">Period Views</th>
                          <th className="p-3.5 text-center font-normal">Inquiries</th>
                          <th className="p-3.5 text-center font-normal">Visits</th>
                          <th className="p-3.5 text-center font-normal">Status</th>
                          <th className="p-3.5 text-right font-normal">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal/5 text-charcoal">
                        {filteredProperties.map((p) => (
                          <tr
                            key={p.id}
                            onClick={() => navigate(`/agent/properties/${p.id}`)}
                            className="hover:bg-sand/20 transition-colors cursor-pointer"
                          >
                            <td className="p-3.5 flex items-center gap-3">
                              <div className="w-12 h-10 rounded-lg overflow-hidden bg-sand/60 border border-charcoal/10 shrink-0">
                                <SmartImage
                                  src={p.image}
                                  alt={p.title}
                                  aspect="video"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-serif text-base text-charcoal font-normal truncate max-w-[280px]">
                                  {p.title}
                                </div>
                                <div className="font-mono text-xs text-dark-gray/50 truncate">
                                  {p.locality ? `${p.locality}, ` : ''}{p.city} • ₹{formatINR(p.price)}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-center font-mono text-sm text-charcoal">
                              {p.views}
                            </td>
                            <td className="p-3.5 text-center font-mono text-sm text-charcoal">
                              {p.inquiries}
                            </td>
                            <td className="p-3.5 text-center font-mono text-sm text-charcoal">
                              {p.visits}
                            </td>
                            <td className="p-3.5 text-center">
                              <span
                                className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                                  p.isSold || p.status === 'sold'
                                    ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/20'
                                    : p.isLeased || p.status === 'rented'
                                    ? 'bg-blue-500/10 text-blue-800 border-blue-500/20'
                                    : p.status === 'pending'
                                    ? 'bg-amber-500/10 text-amber-800 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                                }`}
                              >
                                {p.isSold || p.status === 'sold'
                                  ? 'Sold'
                                  : p.isLeased || p.status === 'rented'
                                  ? 'Leased'
                                  : p.status === 'pending'
                                  ? 'Pending'
                                  : 'Available'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/agent/properties/${p.id}`);
                                }}
                                className="px-2.5 py-1 rounded-md bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-[10px] uppercase tracking-wider text-deep-purple transition-colors cursor-pointer"
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Card View */}
                  <div className="block md:hidden space-y-3">
                    {filteredProperties.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/agent/properties/${p.id}`)}
                        className="p-4 rounded-xl bg-porcelain border border-charcoal/15 shadow-xs space-y-3 cursor-pointer hover:border-deep-purple/40 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-sand/60 border border-charcoal/10 shrink-0">
                            <SmartImage
                              src={p.image}
                              alt={p.title}
                              aspect="video"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-serif text-base text-charcoal font-normal leading-tight truncate">
                              {p.title}
                            </h4>
                            <div className="font-mono text-xs text-dark-gray/50 mt-0.5 truncate">
                              {p.city} • ₹{formatINR(p.price)}
                            </div>
                          </div>
                          <span
                            className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                              p.isSold || p.status === 'sold'
                                ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/20'
                                : p.isLeased || p.status === 'rented'
                                ? 'bg-blue-500/10 text-blue-800 border-blue-500/20'
                                : p.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-800 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20'
                            }`}
                          >
                            {p.isSold || p.status === 'sold'
                              ? 'Sold'
                              : p.isLeased || p.status === 'rented'
                              ? 'Leased'
                              : p.status === 'pending'
                              ? 'Pending'
                              : 'Available'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-charcoal/10 text-center font-mono text-xs">
                          <div>
                            <span className="text-[10px] text-dark-gray/50 uppercase block">Views</span>
                            <span className="text-charcoal">{p.views}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-dark-gray/50 uppercase block">Inquiries</span>
                            <span className="text-charcoal">{p.inquiries}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-dark-gray/50 uppercase block">Visits</span>
                            <span className="text-charcoal">{p.visits}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
        {/* Property Obligation Modal */}
        {selectedObligation && (
          <PropertyObligationModal
            isOpen={Boolean(selectedObligation)}
            onClose={() => setSelectedObligation(null)}
            schedule={selectedObligation}
            role="agent"
          />
        )}
      </div>
    </DashboardLayout>
  );
}

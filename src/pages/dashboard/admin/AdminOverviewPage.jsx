import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { getAdminDashboardStats } from '@/services/dashboard';
import { formatINR } from '@/lib/formatINR';
import {
  Building2,
  CheckSquare,
  Users,
  ShieldCheck,
  Sparkles,
  Receipt,
  LifeBuoy,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Star,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    getAdminDashboardStats()
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Platform Control & Governance
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Platform Overview
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-dark-gray/60 bg-sand/60 px-3.5 py-1.5 rounded-full border border-charcoal/10 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Current Platform Snapshot</span>
            </span>
          </div>
        </div>

        {/* Demo Simulation & Legal Boundary Banner */}
        <div className="p-4 rounded-2xl bg-sand/30 border border-charcoal/10 flex items-start gap-3 text-xs font-sans text-dark-gray/80">
          <AlertCircle className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-charcoal">
              Platform Demo Analytics Notice — Non-Real Financial Telemetry
            </p>
            <p className="leading-relaxed">
              All financial figures, token payments, and promotion fees are simulated within Porch Light's mock store. Registered account counts represent Users and Agents only (Admin profiles are strictly excluded from user totals). Property availability distinguishes live listings from total records.
            </p>
          </div>
        </div>

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : (
          <>
            {/* 1. Urgent Action Queue (Moderation, Verification, Support) */}
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 mb-3 flex items-center justify-between">
                <span>Items Requiring Attention</span>
                <span className="text-[11px] text-dark-gray/50">Real-time Platform Queues</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  to="/admin/approvals"
                  className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                    <span className="font-mono text-xs uppercase tracking-wider">Pending Listings</span>
                    <Clock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                    {stats?.pendingApprovals || 0}
                  </div>
                  <div className="font-sans text-xs text-dark-gray/60 mt-1">
                    Awaiting moderation review
                  </div>
                </Link>

                <Link
                  to="/admin/users"
                  className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                    <span className="font-mono text-xs uppercase tracking-wider">Agent Reviews</span>
                    <ShieldCheck className="w-4 h-4 text-deep-purple group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                    {stats?.pendingAgentVerifications || 0}
                  </div>
                  <div className="font-sans text-xs text-dark-gray/60 mt-1">
                    Pending RERA verification
                  </div>
                </Link>

                <Link
                  to="/admin/promotions"
                  className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                    <span className="font-mono text-xs uppercase tracking-wider">Promotions</span>
                    <Sparkles className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                    {stats?.pendingPromotions || 0}
                  </div>
                  <div className="font-sans text-xs text-dark-gray/60 mt-1">
                    Showcase & badge requests
                  </div>
                </Link>

                <Link
                  to="/admin/complaints"
                  className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                    <span className="font-mono text-xs uppercase tracking-wider">Open Tickets</span>
                    <LifeBuoy className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                    {stats?.openComplaints || 0}
                  </div>
                  <div className="font-sans text-xs text-dark-gray/60 mt-1">
                    Unresolved concierge issues
                  </div>
                </Link>
              </div>
            </div>

            {/* 2. Core Platform Ledger & Discovery Indicators (Accurate Distinction) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Available Now vs Total Properties */}
              <div className="p-5 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 mb-1">
                    Available Now
                  </div>
                  <div className="font-serif text-3xl text-charcoal font-medium">
                    {stats?.availableProperties || 0} <span className="text-xl text-dark-gray/50 font-sans">/ {stats?.totalProperties || 0}</span>
                  </div>
                </div>
                <div className="font-sans text-xs text-dark-gray/70 mt-3 pt-2 border-t border-charcoal/10">
                  <span className="text-deep-purple font-medium">Live on search & maps</span>. Total includes {stats?.pendingApprovals || 0} pending, {stats?.soldPropertiesCount || 0} sold, and {stats?.leasedPropertiesCount || 0} leased.
                </div>
              </div>

              {/* Registered Accounts (User & Agent ONLY, Admin Excluded) */}
              <div className="p-5 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 mb-1">
                    Registered Accounts
                  </div>
                  <div className="font-serif text-3xl text-charcoal font-medium">
                    {stats?.registeredAccounts || 0} <span className="text-xl text-dark-gray/50 font-sans">Accounts</span>
                  </div>
                </div>
                <div className="font-sans text-xs text-dark-gray/70 mt-3 pt-2 border-t border-charcoal/10">
                  {stats?.userAccountsCount || 0} Users • {stats?.agentAccountsCount || 0} Agents <span className="text-dark-gray/40">(Admins excluded)</span>
                </div>
              </div>

              {/* Simulated Volume Breakdown */}
              <div className="p-5 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 mb-1">
                    Simulated Volume
                  </div>
                  <div className="font-serif text-3xl text-deep-purple font-medium">
                    ₹{formatINR(stats?.totalVolume || 0)}
                  </div>
                </div>
                <div className="font-sans text-xs text-dark-gray/70 mt-3 pt-2 border-t border-charcoal/10">
                  ₹{formatINR(stats?.fullPurchaseVolume || stats?.tokenVolume || 0)} Full/EMI • ₹{formatINR(stats?.rentVolume || 0)} Rent • ₹{formatINR(stats?.promoVolume || 0)} Platform Fees
                </div>
              </div>

              {/* Featured Showcase Capacity & Agent Reputation */}
              <div className="p-5 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 mb-1">
                    Featured Capacity
                  </div>
                  <div className="font-serif text-3xl text-charcoal font-medium">
                    {stats?.activeFeaturedCount || 0} <span className="text-xl text-dark-gray/50 font-sans">/ 4 Slots</span>
                  </div>
                </div>
                <div className="font-sans text-xs text-dark-gray/70 mt-3 pt-2 border-t border-charcoal/10 flex items-center justify-between">
                  <span>{stats?.waitlistFeaturedCount || 0} in waitlist queue</span>
                  <span className="font-mono font-medium text-charcoal flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{stats?.platformAvgRating || 'N/A'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Operational Navigation Ledger */}
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 mb-3">
                Administrative Workspaces
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  to="/admin/approvals"
                  className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <CheckSquare className="w-5 h-5 text-deep-purple mb-2" />
                    <h4 className="font-serif text-lg text-charcoal font-medium">
                      Property Management & Review
                    </h4>
                    <p className="font-sans text-xs text-dark-gray/60 mt-1">
                      Search, inspect, approve, decline, or archive Buy and Rent property listings with compliance details.
                    </p>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-deep-purple font-medium mt-4 flex items-center gap-1">
                    <span>Manage Properties</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>

                <Link
                  to="/admin/users"
                  className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <Users className="w-5 h-5 text-deep-purple mb-2" />
                    <h4 className="font-serif text-lg text-charcoal font-medium">
                      Users & Agent Verification
                    </h4>
                    <p className="font-sans text-xs text-dark-gray/60 mt-1">
                      Inspect agent RERA credentials, approve verification status, review accounts, and manage deletion obligations.
                    </p>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-deep-purple font-medium mt-4 flex items-center gap-1">
                    <span>Manage Accounts</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>

                <Link
                  to="/admin/featured"
                  className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <Sparkles className="w-5 h-5 text-deep-purple mb-2" />
                    <h4 className="font-serif text-lg text-charcoal font-medium">
                      Featured Homes (Home 4-Slot)
                    </h4>
                    <p className="font-sans text-xs text-dark-gray/60 mt-1">
                      Curate the 4 homepage showcase slots, manage priority waitlist queue, and configure placement windows.
                    </p>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-deep-purple font-medium mt-4 flex items-center gap-1">
                    <span>Manage Showcase</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>

                <Link
                  to="/admin/promotions"
                  className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <Star className="w-5 h-5 text-deep-purple mb-2" />
                    <h4 className="font-serif text-lg text-charcoal font-medium">
                      Premium Promotions
                    </h4>
                    <p className="font-sans text-xs text-dark-gray/60 mt-1">
                      Review one-time paid Premium badge requests and grant permanent 360° virtual tour access.
                    </p>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-deep-purple font-medium mt-4 flex items-center gap-1">
                    <span>Review Premium</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>

                <Link
                  to="/admin/complaints"
                  className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <LifeBuoy className="w-5 h-5 text-deep-purple mb-2" />
                    <h4 className="font-serif text-lg text-charcoal font-medium">
                      Support Requests
                    </h4>
                    <p className="font-sans text-xs text-dark-gray/60 mt-1">
                      Review user and agent inquiries, respond to tickets, and track concierge resolution status.
                    </p>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-deep-purple font-medium mt-4 flex items-center gap-1">
                    <span>Open Support Desk</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>

                <Link
                  to="/admin/settings"
                  className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <TrendingUp className="w-5 h-5 text-deep-purple mb-2" />
                    <h4 className="font-serif text-lg text-charcoal font-medium">
                      Platform Parameters & Profile
                    </h4>
                    <p className="font-sans text-xs text-dark-gray/60 mt-1">
                      Configure one-time Premium fee, default Featured duration, moderation parameters, and admin security.
                    </p>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-wider text-deep-purple font-medium mt-4 flex items-center gap-1">
                    <span>Platform Settings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

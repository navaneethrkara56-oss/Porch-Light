import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { getAgentDashboardStats } from '@/services/dashboard';
import {
  Building2,
  Clock,
  Calendar,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

export function AgentOverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = () => {
    setLoading(true);
    setError(null);
    getAgentDashboardStats()
      .then((data) => {
        setStats(data);
      })
      .catch((err) => {
        console.error('Failed to load agent overview metrics:', err);
        setError(err.message || 'Failed to load agent dashboard metrics.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!authLoading) {
      fetchStats();
    }
  }, [authLoading]);

  const isVerified = Boolean(user?.isVerified);

  return (
    <DashboardLayout role="agent">
      <div className="space-y-6">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              {user?.agency || 'Realty Partner'} • {user?.city || 'India'}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium tracking-tight">
              Agent Sanctuary Desk — {user?.name || 'Agent'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/agent/new-listing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Property</span>
            </Link>
          </div>
        </div>

        {/* Verification Alert Banner if Pending */}
        {!isVerified && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-charcoal flex items-start gap-3.5 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-serif text-lg font-medium text-amber-950">
                Account Pending Verification
              </h4>
              <p className="font-sans text-xs text-dark-gray/80 leading-relaxed">
                Your submitted brokerage credentials and RERA license are currently under review by
                Porch Light Administrators. You may draft listings, but they will be reviewed and
                published to the public showcase only after admin verification.
              </p>
              <div className="pt-1">
                <Link
                  to="/agent/profile"
                  className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-amber-900 font-semibold hover:underline"
                >
                  <span>Review RERA Documents</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-charcoal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="font-sans text-xs text-amber-900">{error}</span>
            <button
              type="button"
              onClick={fetchStats}
              className="px-3.5 py-1.5 rounded-full bg-deep-purple text-porcelain hover:bg-deep-purple/90 font-mono text-[11px] uppercase tracking-wider transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : (
          <>
            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/agent/listings"
                className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all shadow-xs group"
              >
                <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                  <span className="font-mono text-xs uppercase tracking-wider">Active Listings</span>
                  <Building2 className="w-4 h-4 text-deep-purple group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                  {stats?.activeListingsCount || 0}
                </div>
                <div className="font-sans text-xs text-dark-gray/60 mt-1">
                  Live on public showcase
                </div>
              </Link>

              <Link
                to="/agent/listings"
                className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all shadow-xs group"
              >
                <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                  <span className="font-mono text-xs uppercase tracking-wider">Awaiting Review</span>
                  <Clock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                  {stats?.pendingListingsCount || 0}
                </div>
                <div className="font-sans text-xs text-dark-gray/60 mt-1">
                  In admin moderation queue
                </div>
              </Link>

              <Link
                to="/agent/visits"
                className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all shadow-xs group"
              >
                <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                  <span className="font-mono text-xs uppercase tracking-wider">Visit Requests</span>
                  <Calendar className="w-4 h-4 text-deep-purple group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                  {stats?.upcomingVisitsCount || 0}
                </div>
                <div className="font-sans text-xs text-dark-gray/60 mt-1">
                  Walkthroughs scheduled
                </div>
              </Link>

              <Link
                to="/agent/inquiries"
                className="p-5 rounded-2xl bg-porcelain border border-charcoal/10 hover:border-deep-purple/30 transition-all shadow-xs group"
              >
                <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                  <span className="font-mono text-xs uppercase tracking-wider">Inquiries</span>
                  <MessageSquare className="w-4 h-4 text-deep-purple group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                  {stats?.unreadInquiriesCount || 0}
                </div>
                <div className="font-sans text-xs text-dark-gray/60 mt-1">
                  Client discussions open
                </div>
              </Link>
            </div>

            {/* Action Needed Queue */}
            <div className="rounded-2xl bg-porcelain border border-charcoal/10 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-charcoal/10">
                <h2 className="font-serif text-xl sm:text-2xl text-deep-purple font-medium">
                  Action Needed Queue
                </h2>
                <span className="font-mono text-xs uppercase tracking-wider text-dark-gray/50">
                  Pending Client Requests
                </span>
              </div>

              {stats?.actionItems?.length > 0 ? (
                <div className="divide-y divide-charcoal/5">
                  {stats.actionItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.link}
                      className="py-3.5 flex items-center justify-between hover:bg-sand/30 -mx-3 px-3 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sand/60 flex items-center justify-center text-deep-purple shrink-0">
                          {item.type === 'visit_request' ? (
                            <Calendar className="w-4 h-4" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-sans text-sm font-medium text-charcoal group-hover:text-deep-purple">
                            {item.title}
                          </div>
                          <div className="font-sans text-xs text-dark-gray/60">{item.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-dark-gray/50">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-dark-gray/30 group-hover:text-deep-purple group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-dark-gray/50 font-sans text-sm">
                  All client requests and visits are up to date.
                </div>
              )}
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/agent/new-listing"
                className="p-5 rounded-2xl bg-sand/30 border border-charcoal/10 hover:border-deep-purple/30 transition-all flex flex-col justify-between group shadow-xs"
              >
                <div>
                  <PlusCircle className="w-5 h-5 text-deep-purple mb-2" />
                  <h4 className="font-serif text-lg text-charcoal font-medium">Add Property</h4>
                  <p className="font-sans text-xs text-dark-gray/60 mt-1">
                    Upload architectural residences with photo limits and RERA license tagging.
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-wider text-deep-purple font-medium mt-4 flex items-center gap-1">
                  <span>Create Listing</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>

              <Link
                to="/agent/promotions"
                className="p-5 rounded-2xl bg-sand/30 border border-charcoal/10 hover:border-deep-purple/30 transition-all flex flex-col justify-between group shadow-xs"
              >
                <div>
                  <Sparkles className="w-5 h-5 text-deep-purple mb-2" />
                  <h4 className="font-serif text-lg text-charcoal font-medium">Premium Promotion</h4>
                  <p className="font-sans text-xs text-dark-gray/60 mt-1">
                    Spotlight your exclusive listings on the Home top-properties showcase carousel.
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-wider text-deep-purple font-medium mt-4 flex items-center gap-1">
                  <span>Request Promotion</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>

              <Link
                to="/agent/analytics"
                className="p-5 rounded-2xl bg-sand/30 border border-charcoal/10 hover:border-deep-purple/30 transition-all flex flex-col justify-between group shadow-xs"
              >
                <div>
                  <ShieldCheck className="w-5 h-5 text-deep-purple mb-2" />
                  <h4 className="font-serif text-lg text-charcoal font-medium">Portfolio Performance</h4>
                  <p className="font-sans text-xs text-dark-gray/60 mt-1">
                    Inspect verified client views, inquiry volume, and visit walkthrough conversion.
                  </p>
                </div>
                <span className="font-mono text-xs uppercase tracking-wider text-deep-purple font-medium mt-4 flex items-center gap-1">
                  <span>View Analytics</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

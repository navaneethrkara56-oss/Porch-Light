import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { getUserDashboardStats } from '@/services/dashboard';

function formatEventDate(dateStr) {
  if (!dateStr) return 'Date unavailable';
  const parts = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (parts) {
    const d = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return String(dateStr);
}
import {
  Heart,
  Calendar,
  MessageSquare,
  Building2,
  ArrowRight,
  Clock,
  CheckCircle2,
  Compass,
  Receipt,
  MapPin,
  ChevronRight,
} from 'lucide-react';

export function UserOverviewPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = () => {
    setLoading(true);
    setError(null);
    getUserDashboardStats()
      .then((data) => {
        setStats(data);
      })
      .catch((err) => {
        console.error('Failed to load user overview metrics:', err);
        setError(err.message || 'Failed to load dashboard metrics.');
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

  return (
    <DashboardLayout role="user">
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Sanctuary Member • {user?.city || 'India'}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'Member'}
            </h1>
          </div>
          <div>
            <Link
              to="/buy"
              className="px-5 py-2.5 rounded-full bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors shadow-xs"
            >
              Explore Residences
            </Link>
          </div>
        </div>

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
            {/* 4 Summary Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/dashboard/saved"
                className="p-5 rounded-2xl bg-sand/40 border border-charcoal/15 hover:border-deep-purple/30 hover:bg-sand/60 transition-all shadow-xs group"
              >
                <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                  <span className="font-mono text-xs uppercase tracking-wider">Saved Homes</span>
                  <Heart className="w-4 h-4 text-deep-purple group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                  {stats?.savedCount || 0}
                </div>
                <div className="font-sans text-xs text-dark-gray/60 mt-1">
                  Properties in wishlist
                </div>
              </Link>

              <Link
                to="/dashboard/visits"
                className="p-5 rounded-2xl bg-sand/40 border border-charcoal/15 hover:border-deep-purple/30 hover:bg-sand/60 transition-all shadow-xs group"
              >
                <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                  <span className="font-mono text-xs uppercase tracking-wider">Visits</span>
                  <Calendar className="w-4 h-4 text-deep-purple group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                  {stats?.upcomingVisitsCount || 0}
                </div>
                <div className="font-sans text-xs text-dark-gray/60 mt-1">
                  Upcoming walkthroughs
                </div>
              </Link>

              <Link
                to="/dashboard/chat"
                className="p-5 rounded-2xl bg-sand/40 border border-charcoal/15 hover:border-deep-purple/30 hover:bg-sand/60 transition-all shadow-xs group"
              >
                <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                  <span className="font-mono text-xs uppercase tracking-wider">Inquiries</span>
                  <MessageSquare className="w-4 h-4 text-deep-purple group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                  {stats?.activeInquiriesCount || 0}
                </div>
                <div className="font-sans text-xs text-dark-gray/60 mt-1">
                  Active agent discussions
                </div>
              </Link>

              <Link
                to="/dashboard/properties"
                className="p-5 rounded-2xl bg-sand/40 border border-charcoal/15 hover:border-deep-purple/30 hover:bg-sand/60 transition-all shadow-xs group"
              >
                <div className="flex items-center justify-between text-dark-gray/60 mb-2">
                  <span className="font-mono text-xs uppercase tracking-wider">My Properties</span>
                  <Building2 className="w-4 h-4 text-deep-purple group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-serif text-3xl sm:text-4xl text-charcoal font-medium">
                  {stats?.propertiesCount || 0}
                </div>
                <div className="font-sans text-xs text-dark-gray/60 mt-1">
                  {stats?.boughtCount || 0} Bought • {stats?.rentedCount || 0} Rented
                </div>
              </Link>
            </div>

            {/* Next Up Activity Block */}
            <div className="rounded-2xl bg-sand/30 border border-charcoal/15 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs uppercase tracking-widest text-deep-purple font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Next Up On Your Calendar
                </span>
                <Link
                  to="/dashboard/visits"
                  className="font-mono text-xs uppercase tracking-wider text-dark-gray/70 hover:text-deep-purple flex items-center gap-1"
                >
                  <span>View All Bookings</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {stats?.nextVisit ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-porcelain border border-charcoal/20 shadow-xs">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/25 font-medium">
                      Confirmed Visit
                    </span>
                    <h3 className="font-serif text-xl text-charcoal font-medium">
                      {stats.nextVisit.propertyTitle || stats.nextVisit.property?.title}
                    </h3>
                    <p className="font-sans text-xs text-dark-gray/70 flex items-center flex-wrap gap-1.5 pt-0.5">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-dark-gray/60 font-semibold">Date:</span>
                      <span className="font-medium text-charcoal">
                        {stats.nextVisit.date ? formatEventDate(stats.nextVisit.date) : 'Date unavailable'}
                      </span>
                      {stats.nextVisit.timeSlot ? (
                        <span className="text-dark-gray/60">({stats.nextVisit.timeSlot})</span>
                      ) : (
                        <span className="text-dark-gray/40 italic">(Time unavailable)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const visitPropId = stats.nextVisit?.propertyId || stats.nextVisit?.property?.id || stats.nextVisit?.property?._id || stats.nextVisit?.propertyCustomId;
                      return visitPropId ? (
                        <Link
                          to={`/property/${visitPropId}`}
                          className="px-4 py-2 rounded-full bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal"
                        >
                          Listing Details
                        </Link>
                      ) : (
                        <Link
                          to="/dashboard/visits"
                          className="px-4 py-2 rounded-full bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal"
                        >
                          View Details
                        </Link>
                      );
                    })()}
                    <Link
                      to="/dashboard/visits"
                      className="px-4 py-2 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider"
                    >
                      Manage Visit
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-dark-gray/60 font-sans text-sm">
                  No upcoming confirmed visits scheduled.{' '}
                  <Link to="/buy" className="text-deep-purple underline hover:text-deep-purple/80">
                    Browse residences to schedule a private viewing.
                  </Link>
                </div>
              )}
            </div>

            {/* Recent User Activity Feed */}
            <div className="rounded-2xl bg-porcelain border border-charcoal/10 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-charcoal/10">
                <h2 className="font-serif text-xl sm:text-2xl text-deep-purple font-medium">
                  Recent Activity
                </h2>
                <span className="font-mono text-xs uppercase tracking-wider text-dark-gray/50">
                  Personal Ledger
                </span>
              </div>

              {stats?.recentActivity?.length > 0 ? (
                <div className="divide-y divide-charcoal/5">
                  {stats.recentActivity.map((item) => (
                    <Link
                      key={item.id}
                      to={item.link}
                      className="py-3.5 flex items-center justify-between hover:bg-sand/30 -mx-3 px-3 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sand/60 flex items-center justify-center text-deep-purple shrink-0">
                          {item.type === 'payment' ? (
                            <Receipt className="w-4 h-4" />
                          ) : (
                            <Calendar className="w-4 h-4" />
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
                          {formatEventDate(item.date)}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-dark-gray/30 group-hover:text-deep-purple group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-dark-gray/50 font-sans text-sm">
                  No recorded activity yet.
                </div>
              )}
            </div>

            {/* Helpful Shortcuts Row */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/buy"
                className="px-4 py-2.5 rounded-full bg-sand/40 hover:bg-sand/70 border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal flex items-center gap-2 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-deep-purple" />
                <span>Browse Residences for Sale</span>
              </Link>
              <Link
                to="/rent"
                className="px-4 py-2.5 rounded-full bg-sand/40 hover:bg-sand/70 border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal flex items-center gap-2 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-deep-purple" />
                <span>Explore Long-Term Rentals</span>
              </Link>
              <Link
                to="/dashboard/compare"
                className="px-4 py-2.5 rounded-full bg-sand/40 hover:bg-sand/70 border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal flex items-center gap-2 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5 text-deep-purple" />
                <span>Compare Saved Residences</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

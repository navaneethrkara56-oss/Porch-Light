import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import {
  getProperties,
  markPropertySoldOrRented,
  deleteProperty,
  getPropertyEditEligibility,
} from '@/services/properties';
import { getPayments, confirmRentalHandover, respondLeaseCancellation } from '@/services/payments';
import { formatINR, formatArea } from '@/lib/formatINR';
import {
  Building2,
  PlusCircle,
  Sparkles,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Trash2,
  ShieldCheck,
  Check,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  Edit,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

function getLockedStatusLabel(code) {
  switch (code) {
    case 'COMPLETED_SALE':
      return 'Sold';
    case 'ACTIVE_LEASE':
      return 'Leased';
    case 'PENDING_HANDOVER':
      return 'Handover';
    case 'ACTIVE_TRANSACTION':
      return 'In Escrow';
    default:
      return 'Locked';
  }
}

export function AgentListingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'approved' | 'pending' | 'sold_rented' | 'rejected'
  const [listingTypeFilter, setListingTypeFilter] = useState('all'); // 'all' | 'sale' | 'rent'
  const [cityFilter, setCityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'price_asc' | 'price_desc' | 'area_desc'

  const loadProperties = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [propsRes, paymentsRes] = await Promise.all([
        getProperties({ agentId: user.id, status: 'all', limit: 100 }),
        getPayments(),
      ]);
      const list = propsRes.data || propsRes.allMatching || [];
      const isAgentProp = (p) => p.agentId === user.id || p.agentId === user.customId || p.agentId === user._id;
      setProperties(list.filter(isAgentProp));
      setPayments(paymentsRes.data || paymentsRes || []);
    } catch (err) {
      console.error('Failed to load agent listings:', err);
      setError(err.message || 'Failed to load agent listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadProperties();
    }
  }, [user?.id, authLoading]);

  const distinctCities = useMemo(() => {
    return Array.from(new Set(properties.map((p) => p.city).filter(Boolean)));
  }, [properties]);

  const distinctTypes = useMemo(() => {
    return Array.from(new Set(properties.map((p) => p.type).filter(Boolean)));
  }, [properties]);

  const handleMarkSold = async (id) => {
    const propHasTx = payments.some(
      (pay) => pay.propertyId === id && (pay.status === 'completed' || pay.status === 'succeeded' || pay.status === 'active')
    );

    if (!propHasTx) {
      alert('Cannot mark listing as Sold: No recorded reservation token or sales payment was found for this property. Only listings with executed platform transactions or Admin verification can transition to Sold.');
      return;
    }

    if (window.confirm('Mark this listing as Sold? It will be preserved in transaction history and removed from active showcase.')) {
      try {
        await markPropertySoldOrRented(id, 'sold');
        toast.success('Listing marked as Sold');
      } catch (err) {
        alert(err.message || 'Failed to update status');
      }
    }
  };

  const handleMarkRented = async (id) => {
    const propHasTx = payments.some(
      (pay) => pay.propertyId === id && (pay.status === 'completed' || pay.status === 'succeeded' || pay.status === 'active')
    );

    if (!propHasTx) {
      alert('Cannot mark listing as Rented: No recorded security deposit or lease reservation was found for this property. Only listings with executed platform lease transactions can transition to Rented.');
      return;
    }

    if (window.confirm('Mark this listing as Rented? It will be preserved in lease history and removed from active showcase.')) {
      try {
        await markPropertySoldOrRented(id, 'rented');
        toast.success('Listing marked as Rented');
      } catch (err) {
        alert(err.message || 'Failed to update status');
      }
    }
  };

  const handleConfirmHandover = async (id) => {
    if (window.confirm('Confirm handover complete and re-list this rental residence for new prospective tenants?')) {
      try {
        await confirmRentalHandover(id);
        toast.success('Handover confirmed. Property re-listed.');
      } catch (err) {
        alert(err.message || 'Failed to confirm handover');
      }
    }
  };

  const handleRespondCancellation = async (propertyId, agree) => {
    const actionText = agree ? 'agree to end the lease early' : 'decline early termination';
    if (window.confirm(`Are you sure you want to ${actionText}?`)) {
      try {
        await respondLeaseCancellation({ propertyId, agree });
        toast.success(agree ? 'Lease termination accepted.' : 'Lease cancellation declined.');
      } catch (err) {
        alert(err.message || 'Failed to process cancellation response');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this listing? (Historical transactions cannot be deleted).')) {
      try {
        await deleteProperty(id);
        toast.success('Listing deleted');
      } catch (err) {
        alert(err.message || 'Failed to delete listing');
      }
    }
  };

  // Filtered & Sorted Listings
  const filteredAndSorted = useMemo(() => {
    let result = properties.filter((p) => {
      // Status filter
      if (statusFilter === 'approved' && p.status !== 'approved') return false;
      if (statusFilter === 'pending' && p.status !== 'pending') return false;
      if (statusFilter === 'sold_rented' && p.status !== 'sold' && p.status !== 'rented') return false;
      if (statusFilter === 'rejected' && p.status !== 'rejected') return false;

      // Buy / Rent filter
      if (listingTypeFilter !== 'all' && p.listingType !== listingTypeFilter) return false;

      // City filter
      if (cityFilter !== 'all' && p.city !== cityFilter) return false;

      // Property Type filter
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchLoc = (p.locality || '').toLowerCase().includes(q);
        const matchCity = (p.city || '').toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchCity) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'area_desc') return (b.builtUpArea || b.carpetArea || 0) - (a.builtUpArea || a.carpetArea || 0);
      // 'newest' default
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return result;
  }, [
    properties,
    statusFilter,
    listingTypeFilter,
    cityFilter,
    typeFilter,
    searchQuery,
    sortBy,
  ]);

  const hasActiveFilters =
    statusFilter !== 'all' ||
    listingTypeFilter !== 'all' ||
    cityFilter !== 'all' ||
    typeFilter !== 'all' ||
    Boolean(searchQuery.trim());

  const handleClearFilters = () => {
    setStatusFilter('all');
    setListingTypeFilter('all');
    setCityFilter('all');
    setTypeFilter('all');
    setSearchQuery('');
    setSortBy('newest');
  };

  return (
    <DashboardLayout role="agent">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Portfolio Management
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              My Listings
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/agent/new-listing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Property</span>
            </Link>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-sand/60 border border-charcoal/10 overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'approved', label: 'Approved' },
                { id: 'pending', label: 'Pending' },
                { id: 'sold_rented', label: 'Sold / Rented' },
                { id: 'rejected', label: 'Rejected' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-deep-purple text-white shadow-xs font-medium'
                      : 'text-charcoal/70 hover:text-charcoal'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input and Clear */}
            <div className="flex items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-dark-gray/40 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search residence or locality..."
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

          {/* Secondary Filter & Sort Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-charcoal/10">
            {/* Buy / Rent */}
            <div>
              <label className="block font-mono text-[10px] uppercase text-dark-gray/60 mb-1">
                Listing Type
              </label>
              <select
                value={listingTypeFilter}
                onChange={(e) => setListingTypeFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-porcelain border border-charcoal/15 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block font-mono text-[10px] uppercase text-dark-gray/60 mb-1">
                City
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-porcelain border border-charcoal/15 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
              >
                <option value="all">All Cities</option>
                {distinctCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label className="block font-mono text-[10px] uppercase text-dark-gray/60 mb-1">
                Property Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-porcelain border border-charcoal/15 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer capitalize"
              >
                <option value="all">All Architecture</option>
                {distinctTypes.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block font-mono text-[10px] uppercase text-dark-gray/60 mb-1">
                Sort Order
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-porcelain border border-charcoal/15 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="area_desc">Area: Largest</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : error ? (
          <div className="p-8 rounded-2xl bg-sand/30 border border-charcoal/15 text-center space-y-4 my-4">
            <AlertTriangle className="w-8 h-8 text-amber-700 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-serif text-lg text-charcoal">Unable to load residences</h3>
              <p className="font-sans text-xs text-dark-gray/70 max-w-md mx-auto">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadProperties}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-deep-purple text-porcelain hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <DashboardEmptyState
            title="No listings found."
            description={
              statusFilter === 'all' && !searchQuery
                ? "You haven't listed any residences yet. Add your first property to submit for admin review."
                : `No listings currently match the active filters.`
            }
            actionLabel="Add a New Listing"
            actionLink="/agent/new-listing"
            icon={Building2}
          />
        ) : (
          <div className="space-y-4">
            {filteredAndSorted.map((prop) => {
              const image =
                prop.coverImage ||
                prop.images?.[0] ||
                'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';

              const isSold = Boolean(
                prop.isSold ||
                prop.status === 'sold' ||
                prop.availabilityStatus === 'sold' ||
                payments.some((pay) => pay.propertyId === prop.id && (pay.type === 'full_purchase' || pay.type === 'emi_down_payment' || pay.type === 'emi') && pay.status === 'completed')
              );

              const isLeased = Boolean(
                prop.isLeased ||
                prop.status === 'rented' ||
                prop.rentalStatus === 'leased'
              );

              const isArchived = Boolean(prop.isArchived || prop.status === 'archived');
              const isAvailable = !isSold && !isLeased && !isArchived && prop.status === 'approved';
              const isClosed = isSold || isLeased;

              const displayStatus = isArchived
                ? 'Archived'
                : isSold
                ? 'Sold'
                : isLeased
                ? 'Leased'
                : prop.rentalStatus === 'pending_handover'
                ? 'Handover'
                : prop.status;

              const statusBadge =
                isArchived
                  ? 'bg-sand/80 text-charcoal/90 border-charcoal/25 font-medium'
                  : isSold
                  ? 'bg-charcoal/10 text-charcoal border-charcoal/25 font-medium'
                  : isLeased
                  ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25 font-medium'
                  : prop.status === 'approved'
                  ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/25 font-medium'
                  : prop.status === 'pending'
                  ? 'bg-sand/60 text-charcoal/80 border-charcoal/20 font-medium'
                  : 'bg-rose-50 text-rose-800 border-rose-200 font-medium';

              return (
                <div
                  key={prop.id}
                  id={`property-${prop.id}`}
                  className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 hover:border-deep-purple/30 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={image}
                      alt={prop.title}
                      className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl bg-sand shrink-0 border border-charcoal/10"
                    />
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full border capitalize ${statusBadge}`}
                        >
                          {displayStatus}
                        </span>
                        <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-sand/60 text-charcoal border border-charcoal/15 font-medium">
                          {prop.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                        </span>
                        {prop.featured && (
                          <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-deep-purple text-white flex items-center gap-1 shadow-xs font-medium">
                            <Sparkles className="w-3.5 h-3.5" />
                            Featured
                          </span>
                        )}
                        <span className="font-mono text-xs text-charcoal/60">
                          ID: {prop.id}
                        </span>
                      </div>

                      <h3 className="font-serif text-xl sm:text-2xl text-charcoal font-medium">
                        {prop.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-sm text-charcoal/80">
                        <span className="flex items-center gap-1 font-medium text-charcoal">
                          <MapPin className="w-3.5 h-3.5 text-deep-purple" />
                          {prop.locality}, {prop.city}
                        </span>
                        <span className="text-charcoal/40">•</span>
                        <span className="font-serif text-base font-medium text-charcoal">
                          {formatINR(prop.price, { withSymbol: true, rent: prop.listingType === 'rent' })}
                        </span>
                        {prop.bedrooms && (
                          <>
                            <span className="text-charcoal/40">•</span>
                            <span className="font-medium text-charcoal">{prop.bedrooms} BHK</span>
                          </>
                        )}
                        {prop.builtUpArea && (
                          <>
                            <span className="text-charcoal/40">•</span>
                            <span className="font-mono text-xs text-charcoal/70">{formatArea(prop.builtUpArea)}</span>
                          </>
                        )}
                      </div>

                      {prop.rejectionReason && (
                        <div className="font-sans text-xs text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                          Rejection Reason: {prop.rejectionReason}
                        </div>
                      )}

                      {/* Status alerts for active lease lifecycle */}
                      {prop.leaseCancellationPending && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-950 font-mono text-xs mt-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Tenant Early Exit Requested • Select Manage to review</span>
                        </div>
                      )}

                      {prop.rentalStatus === 'pending_handover' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand/80 border border-charcoal/20 text-charcoal font-mono text-xs mt-1 font-medium">
                          <RotateCcw className="w-3.5 h-3.5 text-deep-purple shrink-0" />
                          <span>Pending Handover Inspection • Select Manage to confirm</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Controls - Exactly Two Buttons: Preview & Manage */}
                  <div className="w-full sm:w-[260px] md:w-[220px] shrink-0 pt-3 md:pt-0 flex sm:flex-col items-stretch gap-2.5">
                    <Link
                      to={`/property/${prop.id}`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors min-h-[44px] text-center"
                    >
                      <span>Preview</span>
                      <ExternalLink className="w-3.5 h-3.5 text-dark-gray/60" />
                    </Link>
                    <Link
                      to={`/agent/properties/${prop.id}`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs font-medium min-h-[44px] text-center"
                    >
                      <span>Manage</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

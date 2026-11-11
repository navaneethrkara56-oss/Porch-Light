import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';
import {
  approvePropertyListing,
  rejectPropertyListing,
  archivePropertyListing,
  getUsers,
} from '@/services/admin';
import { getProperties, deleteProperty } from '@/services/properties';
import { getPayments } from '@/services/payments';
import { formatINR, formatArea } from '@/lib/formatINR';
import { isPremium } from '@/lib/isPremium';
import {
  getFloorFieldConfig,
  getPropertyFieldApplicability,
  formatFacingDirection,
  formatPropertyType,
} from '@/constants/propertyTypes';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Building2,
  ShieldCheck,
  ExternalLink,
  Search,
  SlidersHorizontal,
  X,
  AlertTriangle,
  Archive,
  Trash2,
  Sparkles,
  Star,
  User,
  ArrowUpDown,
  Compass,
} from 'lucide-react';
import toast from 'react-hot-toast';

function PropertyStatusPill({ property }) {
  const isSold = property.status === 'sold' || property.isSold || property.availabilityStatus === 'sold';
  const isLeased = property.status === 'rented' || property.isLeased || property.rentalStatus === 'leased';
  const isPending = property.status === 'pending';
  const isArchived = property.status === 'archived';
  const isRejected = property.status === 'rejected';
  const isAvailable = property.status === 'approved' && !isSold && !isLeased;

  let label = 'Draft';
  let accessibleTitle = 'Draft Property Record';
  let badgeClasses = 'bg-sand/60 text-charcoal/70 border-charcoal/20';

  if (isAvailable) {
    label = 'Available';
    accessibleTitle = 'Live · Available for Public Search and Maps';
    badgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (isPending) {
    label = 'Pending Review';
    accessibleTitle = 'Awaiting Administrator Moderation Review';
    badgeClasses = 'bg-amber-500/10 text-amber-900 border-amber-500/30';
  } else if (isSold) {
    label = 'Sold';
    accessibleTitle = 'Sale Transaction Completed';
    badgeClasses = 'bg-deep-purple/10 text-deep-purple border-deep-purple/25';
  } else if (isLeased) {
    label = 'Leased';
    accessibleTitle = 'Active Lease Agreement in Effect';
    badgeClasses = 'bg-sand/80 text-charcoal border-charcoal/20';
  } else if (isArchived) {
    label = 'Archived';
    accessibleTitle = `Archived Listing${property.archivedReason ? `: ${property.archivedReason}` : ''}`;
    badgeClasses = 'bg-sand/50 text-dark-gray/70 border-charcoal/15';
  } else if (isRejected) {
    label = 'Declined';
    accessibleTitle = `Submission Declined${property.rejectionReason ? `: ${property.rejectionReason}` : ''}`;
    badgeClasses = 'bg-rose-50 text-rose-800 border-rose-200';
  }

  return (
    <span
      title={accessibleTitle}
      aria-label={accessibleTitle}
      className={`whitespace-nowrap inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-medium ${badgeClasses}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

export function AdminApprovalsPage() {
  const [properties, setProperties] = useState([]);
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusTab, setStatusTab] = useState('pending'); // 'pending' | 'approved' | 'completed' | 'rejected' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'sale' | 'rent'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'price_asc' | 'price_desc'

  // Explicit selection state: NO implicit default selection
  const [selectedPropId, setSelectedPropId] = useState(null);

  // Responsive header offset and focus tracking
  const headerOffset = useHeaderOffset();
  const lastActiveElementRef = useRef(null);
  const modalCloseButtonRef = useRef(null);
  const modalContentRef = useRef(null);

  // Moderation Dialogs
  const [rejectingProp, setRejectingProp] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [archivingProp, setArchivingProp] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [deletingProp, setDeletingProp] = useState(null);

  const loadData = async () => {
    try {
      const [propsRes, paymentsRes, usersRes] = await Promise.all([
        getProperties({ status: 'all', includeSold: 'true', includeLeased: 'true', pageSize: 100, limit: 100 }),
        getPayments(),
        getUsers(),
      ]);
      setProperties(propsRes.data || propsRes.allMatching || []);
      setPayments(paymentsRes.data || paymentsRes || []);
      setUsers(usersRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard Escape-to-close & focus management
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (rejectingProp) setRejectingProp(null);
        else if (archivingProp) setArchivingProp(null);
        else if (deletingProp) setDeletingProp(null);
        else if (selectedPropId) {
          setSelectedPropId(null);
          lastActiveElementRef.current?.focus?.();
        }
      }
    };

    if (selectedPropId || rejectingProp || archivingProp || deletingProp) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPropId, rejectingProp, archivingProp, deletingProp]);

  // Focus modal close button when modal opens
  useEffect(() => {
    if (selectedPropId) {
      lastActiveElementRef.current = document.activeElement;
      requestAnimationFrame(() => {
        modalCloseButtonRef.current?.focus?.();
      });
    }
  }, [selectedPropId]);

  const handleCloseModal = () => {
    setSelectedPropId(null);
    lastActiveElementRef.current?.focus?.();
  };

  // Handlers
  const handleApprove = async (id) => {
    try {
      await approvePropertyListing(id);
      toast.success('Listing approved and published to public catalog');
      loadData();
    } catch (err) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectingProp) return;

    if (!rejectReason.trim()) {
      alert('Please provide a specific reason for rejection.');
      return;
    }

    try {
      await rejectPropertyListing(rejectingProp.id, rejectReason.trim());
      toast.success('Listing rejected and feedback dispatched to agent');
      setRejectingProp(null);
      setRejectReason('');
      loadData();
    } catch (err) {
      alert(err.message || 'Rejection failed');
    }
  };

  const handleArchive = async (e) => {
    e.preventDefault();
    if (!archivingProp) return;

    try {
      await archivePropertyListing(archivingProp.id, archiveReason.trim() || 'Administrative archival');
      toast.success('Listing archived. Historical transaction records preserved.');
      setArchivingProp(null);
      setArchiveReason('');
      loadData();
    } catch (err) {
      alert(err.message || 'Archival failed');
    }
  };

  const handleDelete = async () => {
    if (!deletingProp) return;

    try {
      await deleteProperty(deletingProp.id);
      toast.success('Listing permanently removed.');
      if (selectedPropId === deletingProp.id) {
        setSelectedPropId(null);
      }
      setDeletingProp(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Deletion blocked to protect transaction history');
      setDeletingProp(null);
    }
  };

  // Counts for tabs
  const pendingCount = useMemo(
    () => properties.filter((p) => p.status === 'pending').length,
    [properties]
  );
  const availableCount = useMemo(
    () =>
      properties.filter(
        (p) =>
          p.status === 'approved' &&
          !p.isSold &&
          p.status !== 'sold' &&
          !p.isLeased &&
          p.status !== 'rented' &&
          p.rentalStatus !== 'pending_handover'
      ).length,
    [properties]
  );
  const completedCount = useMemo(
    () =>
      properties.filter(
        (p) => p.isSold || p.status === 'sold' || p.isLeased || p.status === 'rented'
      ).length,
    [properties]
  );
  const rejectedArchivedCount = useMemo(
    () =>
      properties.filter((p) => p.status === 'rejected' || p.status === 'archived').length,
    [properties]
  );

  // Filtered & Sorted Properties
  const filteredProperties = useMemo(() => {
    return properties
      .filter((p) => {
        // Status filter
        if (statusTab === 'pending' && p.status !== 'pending') return false;
        if (statusTab === 'approved') {
          const isAvailable =
            p.status === 'approved' &&
            !p.isSold &&
            p.status !== 'sold' &&
            !p.isLeased &&
            p.status !== 'rented';
          if (!isAvailable) return false;
        }
        if (statusTab === 'completed') {
          const isCompleted =
            p.isSold || p.status === 'sold' || p.isLeased || p.status === 'rented';
          if (!isCompleted) return false;
        }
        if (statusTab === 'rejected') {
          if (p.status !== 'rejected' && p.status !== 'archived') return false;
        }

        // Transaction type filter
        if (typeFilter !== 'all' && p.listingType !== typeFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = p.title?.toLowerCase().includes(q);
          const matchLocality = p.locality?.toLowerCase().includes(q);
          const matchCity = p.city?.toLowerCase().includes(q);
          const matchRera = p.reraId?.toLowerCase().includes(q);
          const matchId = p.id?.toLowerCase().includes(q);
          const agent = users.find((u) => u.id === p.agentId);
          const matchAgent = agent?.name?.toLowerCase().includes(q) || agent?.agency?.toLowerCase().includes(q);

          if (!matchTitle && !matchLocality && !matchCity && !matchRera && !matchId && !matchAgent) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
        if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [properties, statusTab, typeFilter, searchQuery, sortBy, users]);

  // Selected Property Object
  const selectedProp = useMemo(() => {
    if (!selectedPropId) return null;
    return properties.find((p) => p.id === selectedPropId) || null;
  }, [properties, selectedPropId]);

  const selectedAgent = useMemo(() => {
    if (!selectedProp?.agentId) return null;
    return users.find((u) => u.id === selectedProp.agentId) || null;
  }, [users, selectedProp]);

  // Can this property be hard-deleted?
  const hasPayments = useMemo(() => {
    if (!selectedProp) return false;
    return payments.some((pay) => pay.propertyId === selectedProp.id);
  }, [payments, selectedProp]);

  const canHardDelete =
    selectedProp &&
    !hasPayments &&
    selectedProp.status !== 'sold' &&
    selectedProp.status !== 'rented';

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Architectural Governance & Inventory
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Property Review & Catalog Management
            </h1>
          </div>
          <span className="font-mono text-xs text-dark-gray/60 bg-sand/60 px-3 py-1.5 rounded-full border border-charcoal/10 self-start sm:self-auto">
            {availableCount} Available / {properties.length} Total Registered
          </span>
        </div>

        {/* Status Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-sand/40 border border-charcoal/10">
          {[
            { id: 'pending', label: 'Pending Review', count: pendingCount },
            { id: 'approved', label: 'Available Now', count: availableCount },
            { id: 'completed', label: 'Sold / Leased', count: completedCount },
            { id: 'rejected', label: 'Rejected / Archived', count: rejectedArchivedCount },
            { id: 'all', label: 'All Registered', count: properties.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusTab(tab.id);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                statusTab === tab.id
                  ? 'bg-deep-purple text-white shadow-xs font-medium'
                  : 'text-charcoal/70 hover:text-charcoal hover:bg-sand/60'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  statusTab === tab.id ? 'bg-white/20 text-white' : 'bg-charcoal/10 text-charcoal'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-porcelain border border-charcoal/10 shadow-xs">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-dark-gray/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, locality, city, RERA ID, or agent..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-sand/30 border border-charcoal/10 text-xs text-charcoal placeholder:text-dark-gray/40 focus:outline-hidden focus:border-deep-purple"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-sand/30 border border-charcoal/10 font-mono text-xs text-charcoal focus:outline-hidden focus:border-deep-purple"
            >
              <option value="all">All Types (Sale & Rent)</option>
              <option value="sale">Buy / Sale Only</option>
              <option value="rent">Rent Only</option>
            </select>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-sand/30 border border-charcoal/10 font-mono text-xs text-charcoal focus:outline-hidden focus:border-deep-purple"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Property Roster: Desktop Table + Mobile Card Reflow */}
        {loading ? (
          <DashboardSkeleton type="table" />
        ) : filteredProperties.length === 0 ? (
          <DashboardEmptyState
            title="No properties match your filter."
            description="Adjust your search criteria or switch status tabs to view other registered properties."
            icon={CheckSquare}
          />
        ) : (
          <div className="space-y-4">
            {/* 1. Desktop & Tablet Table (Hidden on Mobile) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-charcoal/10 bg-porcelain shadow-xs">
              <table className="w-full text-left font-sans text-sm min-w-[850px] border-collapse">
                <thead>
                  <tr className="border-b border-charcoal/10 bg-sand/30 font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                    <th className="p-4">Property & Typology</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Valuation Terms</th>
                    <th className="p-4">Representing Agent</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/5 text-charcoal">
                  {filteredProperties.map((p) => {
                    const isPending = p.status === 'pending';
                    const isPrem = isPremium(p);
                    const isFeat = Boolean(p.featured);
                    const agent = users.find((u) => u.id === p.agentId);

                    return (
                      <tr
                        key={p.id}
                        id={`property-${p.id}`}
                        onClick={() => setSelectedPropId(p.id)}
                        className="hover:bg-sand/15 transition-colors cursor-pointer group"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-11 rounded-lg overflow-hidden bg-sand shrink-0 border border-charcoal/10">
                              <img
                                src={p.coverImage || p.images?.[0]}
                                alt={p.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                            <div>
                              <div className="font-serif text-base text-charcoal font-medium line-clamp-1 flex items-center gap-1.5">
                                <span>{p.title}</span>
                                {isPrem && (
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" title="Premium Listing" />
                                )}
                                {isFeat && (
                                  <Sparkles className="w-3.5 h-3.5 text-deep-purple shrink-0" title="Home Featured" />
                                )}
                              </div>
                              <div className="font-mono text-xs text-dark-gray/60 flex items-center gap-2 mt-0.5">
                                <span className="uppercase text-[10px] font-semibold tracking-wider text-deep-purple">
                                  {p.listingType === 'sale' ? 'Sale' : 'Rent'}
                                </span>
                                <span>•</span>
                                <span>{formatPropertyType(p.type)}</span>
                                {p.reraId && (
                                  <>
                                    <span>•</span>
                                    <span className="text-[10px] text-emerald-800">{p.reraId}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-sans text-sm text-charcoal font-medium">{p.locality}</div>
                          <div className="font-mono text-xs text-dark-gray/60">{p.city}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-mono text-sm font-medium text-charcoal">
                            ₹{p.listingType === 'rent' ? `${p.price?.toLocaleString('en-IN')}/mo` : formatINR(p.price)}
                          </div>
                          {p.listingType === 'rent' && p.deposit != null && (
                            <div className="font-mono text-[10px] text-dark-gray/50">
                              Deposit: ₹{formatINR(p.deposit)}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-sans text-xs text-charcoal font-medium">
                            {agent?.name || 'Priya Nambiar'}
                          </div>
                          <div className="font-mono text-[11px] text-dark-gray/60">
                            {agent?.agency || 'Malabar Heritage Realty'}
                          </div>
                        </td>
                        <td className="p-4">
                          <PropertyStatusPill property={p} />
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPropId(p.id)}
                              className="px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>

                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApprove(p.id)}
                                  className="px-3 py-1.5 rounded-lg bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shadow-xs cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingProp(p);
                                    setRejectReason('');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-mono text-xs uppercase tracking-wider cursor-pointer"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Mobile Responsive Stacked Cards (Reflow for narrow widths) */}
            <div className="block md:hidden space-y-3">
              {filteredProperties.map((p) => {
                const isPending = p.status === 'pending';
                const isPrem = isPremium(p);
                const isFeat = Boolean(p.featured);
                const agent = users.find((u) => u.id === p.agentId);

                return (
                  <div
                    key={p.id}
                    id={`property-mobile-${p.id}`}
                    onClick={() => setSelectedPropId(p.id)}
                    className="p-4 rounded-2xl bg-porcelain border border-charcoal/15 shadow-xs space-y-3 hover:border-deep-purple/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-14 rounded-xl overflow-hidden bg-sand shrink-0 border border-charcoal/10">
                        <img
                          src={p.coverImage || p.images?.[0]}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-deep-purple font-semibold">
                            {p.listingType === 'sale' ? 'Sale' : 'Rent'} • {formatPropertyType(p.type)}
                          </span>
                          <PropertyStatusPill property={p} />
                        </div>
                        <h4 className="font-serif text-base text-charcoal font-medium line-clamp-1 flex items-center gap-1">
                          <span>{p.title}</span>
                          {isPrem && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                          {isFeat && <Sparkles className="w-3.5 h-3.5 text-deep-purple shrink-0" />}
                        </h4>
                        <div className="font-mono text-xs text-dark-gray/60">
                          {p.locality}, {p.city}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-charcoal/10 text-xs">
                      <div>
                        <div className="font-mono text-sm font-semibold text-charcoal">
                          ₹{p.listingType === 'rent' ? `${p.price?.toLocaleString('en-IN')}/mo` : formatINR(p.price)}
                        </div>
                        <div className="font-sans text-[11px] text-dark-gray/60">
                          Agent: {agent?.name || 'Agent'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedPropId(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal"
                        >
                          Inspect
                        </button>
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(p.id)}
                              className="px-3 py-1.5 rounded-lg bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingProp(p);
                                setRejectReason('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-mono text-xs uppercase tracking-wider"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Property Inspection Modal (Opens on Selection) */}
        {selectedProp && (
          <div
            className="fixed left-0 right-0 bottom-0 z-40 flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 bg-charcoal/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
            style={{ top: `${headerOffset}px` }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="property-modal-title"
            onClick={handleCloseModal}
          >
            <div
              ref={modalContentRef}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[calc(100dvh-${headerOffset}px-1rem)] sm:max-h-[calc(100dvh-${headerOffset}px-2.5rem)] overflow-y-auto rounded-2xl sm:rounded-3xl bg-porcelain border border-charcoal/15 p-4 sm:p-6 md:p-8 shadow-2xl space-y-6 text-charcoal my-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-charcoal/10 pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/60">
                      Property Moderation Dossier
                    </span>
                    <span className="font-mono text-[11px] text-deep-purple font-medium">ID: {selectedProp.id}</span>
                    <PropertyStatusPill property={selectedProp} />
                    {isPremium(selectedProp) && (
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-900 border border-amber-500/30 flex items-center gap-1 font-medium">
                        <Star className="w-3 h-3 text-amber-600 fill-amber-600" />
                        Premium
                      </span>
                    )}
                    {selectedProp.featured && (
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/20 flex items-center gap-1 font-medium">
                        <Sparkles className="w-3 h-3" />
                        Featured
                      </span>
                    )}
                  </div>
                  <h3 id="property-modal-title" className="font-serif text-2xl sm:text-3xl text-deep-purple font-medium">
                    {selectedProp.title}
                  </h3>
                  <div className="font-mono text-xs text-dark-gray/60 flex flex-wrap items-center gap-2">
                    <span>{selectedProp.locality}, {selectedProp.city}</span>
                    <span>•</span>
                    <span className="uppercase font-semibold text-charcoal">
                      {selectedProp.listingType === 'sale' ? 'For Sale' : 'For Rent'}
                    </span>
                    <span>•</span>
                    <span>{formatPropertyType(selectedProp.type)}</span>
                  </div>
                </div>
                <button
                  ref={modalCloseButtonRef}
                  type="button"
                  onClick={handleCloseModal}
                  aria-label="Close property dossier"
                  className="p-2 rounded-xl text-charcoal/60 hover:text-charcoal hover:bg-sand/60 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Gallery Overview */}
              <div className="space-y-2">
                <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                  Architectural Gallery ({selectedProp.images?.length || 1} Photos)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(selectedProp.images || [selectedProp.coverImage]).slice(0, 4).map((img, idx) => (
                    <div key={idx} className="relative h-28 rounded-xl overflow-hidden bg-sand border border-charcoal/10">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-black/70 text-white font-medium">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Valuation & Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-sand/35 border border-charcoal/10 font-mono text-xs">
                <div>
                  <span className="text-dark-gray/60 block">Valuation / Asking Price</span>
                  <div className="font-serif text-2xl text-deep-purple font-medium mt-0.5">
                    ₹{selectedProp.listingType === 'rent' ? `${selectedProp.price?.toLocaleString('en-IN')}/mo` : formatINR(selectedProp.price)}
                  </div>
                </div>
                {selectedProp.listingType === 'rent' ? (
                  <>
                    <div>
                      <span className="text-dark-gray/60 block">Security Deposit</span>
                      <strong className="text-charcoal text-base mt-0.5 block">
                        ₹{selectedProp.deposit ? formatINR(selectedProp.deposit) : 'N/A'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-dark-gray/60 block">Monthly Maintenance</span>
                      <strong className="text-charcoal text-base mt-0.5 block">
                        ₹{selectedProp.maintenance ? formatINR(selectedProp.maintenance) : '0'}
                      </strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-dark-gray/60 block">Legal Ownership</span>
                      <strong className="text-charcoal text-sm mt-0.5 block capitalize">
                        {selectedProp.ownership || 'Freehold'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-dark-gray/60 block">Possession Status</span>
                      <strong className="text-charcoal text-sm mt-0.5 block capitalize">
                        {selectedProp.possessionStatus || 'Ready to Move'}
                      </strong>
                    </div>
                  </>
                )}
              </div>

              {/* Architectural Description */}
              <div className="space-y-1">
                <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                  Architectural Narrative
                </div>
                <p className="font-sans text-xs sm:text-sm text-dark-gray/80 leading-relaxed p-4 rounded-2xl bg-sand/20 border border-charcoal/10">
                  {selectedProp.description || 'No description provided.'}
                </p>
              </div>

              {/* Specifications & Floor Configuration */}
              <div className="space-y-2">
                <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                  Physical Specifications & Floor Logic
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-sand/35 border border-charcoal/10 font-mono text-xs">
                  <div>
                    <span className="text-dark-gray/60 block">Bedrooms / Rooms</span>
                    <strong className="text-charcoal">{selectedProp.bedrooms || 'N/A'} BHK</strong>
                  </div>
                  <div>
                    <span className="text-dark-gray/60 block">Bathrooms</span>
                    <strong className="text-charcoal">{selectedProp.bathrooms || 'N/A'} Baths</strong>
                  </div>
                  <div>
                    <span className="text-dark-gray/60 block">Built-up / Carpet Area</span>
                    <strong className="text-charcoal">
                      {formatArea(selectedProp.builtUpArea || selectedProp.carpetArea)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-dark-gray/60 block">Facing Direction</span>
                    <strong className="text-charcoal">
                      {formatFacingDirection(selectedProp.facing)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-dark-gray/60 block">Floor Details</span>
                    <strong className="text-charcoal">
                      {selectedProp.floor != null
                        ? `Floor ${selectedProp.floor} of ${selectedProp.totalFloors || 'N/A'}`
                        : `${selectedProp.totalFloors || '1'} Total Stories`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-dark-gray/60 block">Furnishing Status</span>
                    <strong className="text-charcoal">{selectedProp.furnishing || 'Standard'}</strong>
                  </div>
                  <div>
                    <span className="text-dark-gray/60 block">Water Supply</span>
                    <strong className="text-charcoal">{selectedProp.waterSupply || 'Corporation'}</strong>
                  </div>
                  <div>
                    <span className="text-dark-gray/60 block">RERA Registration</span>
                    <strong className="text-emerald-800">{selectedProp.reraId || 'Verified'}</strong>
                  </div>
                </div>
              </div>

              {/* Representing Agent Details */}
              <div className="p-4 rounded-2xl bg-sand/25 border border-charcoal/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-deep-purple/10 flex items-center justify-center font-serif text-lg text-deep-purple">
                    {selectedAgent?.name ? selectedAgent.name[0] : 'A'}
                  </div>
                  <div>
                    <div className="font-serif text-base text-charcoal font-medium flex items-center gap-1.5">
                      <span>{selectedAgent?.name || 'Priya Nambiar'}</span>
                      {selectedAgent?.isVerified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-deep-purple" title="Verified Agent" />
                      )}
                    </div>
                    <div className="font-mono text-xs text-dark-gray/60">
                      {selectedAgent?.agency || 'Malabar Heritage Realty'} • {selectedAgent?.email || 'agent@demo.com'}
                    </div>
                  </div>
                </div>
                <div className="font-mono text-xs text-dark-gray/70">
                  Phone: {selectedAgent?.phone || '+91 98470 12345'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-charcoal/10">
                <div className="flex items-center gap-2">
                  <a
                    href={`/property/${selectedProp.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal"
                  >
                    <span>Public Preview</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Archival / Deletion Controls */}
                  {selectedProp.status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => {
                        setArchivingProp(selectedProp);
                        setArchiveReason('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal cursor-pointer"
                      title="Archive listing to safely preserve historical transaction receipts"
                    >
                      <Archive className="w-3.5 h-3.5 text-dark-gray/70" />
                      <span>Archive</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!canHardDelete) {
                        alert(
                          'Protected Listing: Cannot delete a listing that has completed transaction receipts, active tenant leases, or sold records. Please use the Archive action instead.'
                        );
                        return;
                      }
                      setDeletingProp(selectedProp);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-xs uppercase tracking-wider transition-colors ${
                      canHardDelete
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 cursor-pointer'
                        : 'bg-sand/30 text-dark-gray/40 border border-charcoal/10 cursor-not-allowed'
                    }`}
                    title={
                      canHardDelete
                        ? 'Permanently remove listing'
                        : 'Protected: Cannot delete listing with transaction history'
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedProp.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingProp(selectedProp);
                          setRejectReason('');
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-mono text-xs uppercase tracking-wider font-medium cursor-pointer"
                      >
                        Decline Listing
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(selectedProp.id)}
                        className="px-5 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shadow-xs font-medium cursor-pointer"
                      >
                        Approve & Publish
                      </button>
                    </>
                  )}

                  {selectedProp.status === 'rejected' && (
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedProp.id)}
                      className="px-4 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shadow-xs cursor-pointer"
                    >
                      Re-Approve & Publish
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {rejectingProp && (
          <div
            className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs"
            style={{ top: `${headerOffset}px` }}
          >
            <div className="w-full max-w-md rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2 text-rose-800">
                  <XCircle className="w-5 h-5 text-rose-700" />
                  <h3 className="font-serif text-xl font-medium">Decline Listing Submission</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectingProp(null)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReject} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Architectural or Compliance Reason (Mandatory)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Specify architectural quality critique, missing RERA registration, or inaccurate specifications..."
                    className="w-full p-3 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-hidden focus:border-deep-purple resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingProp(null)}
                    className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider shadow-xs"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Archival Confirmation Modal */}
        {archivingProp && (
          <div
            className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs"
            style={{ top: `${headerOffset}px` }}
          >
            <div className="w-full max-w-md rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-deep-purple" />
                  <h3 className="font-serif text-xl text-deep-purple font-medium">Archive Listing</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setArchivingProp(null)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-sand/40 border border-charcoal/10 text-xs font-sans text-dark-gray/80 space-y-1">
                <p className="font-semibold text-charcoal">Preserves Historical Records</p>
                <p>
                  Archiving removes "{archivingProp.title}" from public browse and maps while permanently preserving all past transaction receipts, deposit records, and user acquisition history.
                </p>
              </div>

              <form onSubmit={handleArchive} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Archival Note / Reason
                  </label>
                  <input
                    type="text"
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    placeholder="e.g. Delisted upon owner request, seasonal pause..."
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setArchivingProp(null)}
                    className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shadow-xs"
                  >
                    Confirm Archival
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Hard Delete Confirmation Modal */}
        {deletingProp && (
          <div
            className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs"
            style={{ top: `${headerOffset}px` }}
          >
            <div className="w-full max-w-md rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2 text-rose-800">
                  <Trash2 className="w-5 h-5 text-rose-700" />
                  <h3 className="font-serif text-xl font-medium">Delete Listing</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingProp(null)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="font-sans text-xs text-charcoal/80 leading-relaxed">
                Are you sure you want to permanently delete "{deletingProp.title}"? This property has zero financial transactions or active leases attached. This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingProp(null)}
                  className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider shadow-xs font-medium"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

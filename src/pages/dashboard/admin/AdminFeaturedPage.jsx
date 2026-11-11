import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';
import { getProperties, updateFeaturedProperties } from '@/services/properties';
import {
  getPromotions,
  updatePromotionStatus,
  syncFeaturedPlacements,
  updateFeaturedWindow,
  removeFeaturedPlacement,
} from '@/services/promotions';
import { formatINR } from '@/lib/formatINR';
import {
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Save,
  AlertCircle,
  Eye,
  Clock,
  ListOrdered,
  XCircle,
  Building2,
  Calendar,
  ArrowRight,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminFeaturedPage() {
  const headerOffset = useHeaderOffset();
  const [properties, setProperties] = useState([]);
  const [featuredRequests, setFeaturedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modal states
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Duration adjustment modal
  const [adjustingProp, setAdjustingProp] = useState(null);
  const [adjustDays, setAdjustDays] = useState(14);
  const [customDate, setCustomDate] = useState('');

  const loadData = async () => {
    try {
      syncFeaturedPlacements();
      const [propsRes, allPromos] = await Promise.all([
        getProperties({ status: 'approved', limit: 100 }),
        getPromotions(),
      ]);
      const all = propsRes.data || propsRes.allMatching || [];
      const approved = all.filter((p) => p.status === 'approved' && !p.isSold && !p.isLeased);
      setProperties(approved);
      setFeaturedRequests((allPromos || []).filter((p) => p.type === 'featured_placement'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleFeatured = (id) => {
    setProperties((prev) => {
      const currentActiveCount = prev.filter((p) => p.featured && p.id !== id).length;
      const target = prev.find((p) => p.id === id);

      if (!target?.featured && currentActiveCount >= 4) {
        toast.error('Showcase capacity is strictly 4 slots. Unpin an active slot first or approve via waitlist queue.');
        return prev;
      }

      return prev.map((p) => {
        if (p.id === id) {
          const willBeFeatured = !p.featured;
          return {
            ...p,
            featured: willBeFeatured,
            featuredUntil: willBeFeatured
              ? new Date(Date.now() + 14 * 86400000).toISOString()
              : null,
          };
        }
        return p;
      });
    });
  };

  const handleSetOrder = (id, newOrder) => {
    const num = parseInt(newOrder, 10) || 99;
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, featuredOrder: num } : p))
    );
  };

  const handleSaveChanges = async () => {
    const selectedCount = properties.filter((p) => p.featured).length;
    if (selectedCount !== 4) {
      toast.error(`Please select exactly 4 residences before publishing (${selectedCount} selected, ${Math.max(0, 4 - selectedCount)} needed).`);
      return;
    }

    setSaving(true);
    try {
      const payload = properties.map((p) => ({
        id: p.id,
        featured: Boolean(p.featured),
        featuredOrder: p.featuredOrder ?? 99,
      }));
      await updateFeaturedProperties(payload);
      setSavedSuccess(true);
      toast.success('Front-page featured slots and ordering updated.');
      window.dispatchEvent(new CustomEvent('porch:featured-updated', { detail: { count: selectedCount } }));
      setTimeout(() => setSavedSuccess(false), 3000);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update featured properties');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFromSlot = async (id, title) => {
    if (!window.confirm(`Remove "${title}" from the front-page showcase? If properties exist in the waitlist queue, the top residence will automatically advance.`)) {
      return;
    }
    try {
      await removeFeaturedPlacement(id);
      toast.success(`Removed "${title}" from showcase. Queue updated.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to remove placement');
    }
  };

  const handleApproveRequest = async (id) => {
    try {
      await updatePromotionStatus(id, { status: 'approved' });
      toast.success('Featured request approved.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Approval failed');
    }
  };

  const handleRejectRequest = async (e) => {
    e.preventDefault();
    if (!rejectingId) return;
    if (!rejectReason.trim()) {
      toast.error('Please specify feedback or a rejection reason for the agent.');
      return;
    }

    try {
      await updatePromotionStatus(rejectingId, {
        status: 'rejected',
        adminNotes: rejectReason.trim(),
      });
      toast.success('Featured request declined.');
      setRejectingId(null);
      setRejectReason('');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Rejection failed');
    }
  };

  const handleSaveWindowAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustingProp) return;

    try {
      if (customDate) {
        await updateFeaturedWindow(adjustingProp.id, { endDate: customDate });
      } else {
        await updateFeaturedWindow(adjustingProp.id, { durationDays: adjustDays });
      }
      toast.success(`Featured window updated for "${adjustingProp.title}".`);
      setAdjustingProp(null);
      setCustomDate('');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to adjust window');
    }
  };

  // Currently featured properties sorted by order
  const featuredList = properties
    .filter((p) => p.featured)
    .sort((a, b) => (a.featuredOrder || 99) - (b.featuredOrder || 99));

  // Pending featured placement requests
  const pendingRequests = featuredRequests.filter((r) => r.status === 'pending_review');

  // Waitlisted requests
  const waitlistRequests = featuredRequests
    .filter((r) => r.status === 'waitlist')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const selectedCount = properties.filter((p) => p.featured).length;
  const eligibleCount = properties.length;
  const neededCount = Math.max(0, 4 - selectedCount);
  const canPublish = selectedCount === 4;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Homepage Showcase Curation
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Featured Homes (4-Slot Showcase)
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`font-mono text-xs px-3.5 py-1.5 rounded-full border transition-all ${
              canPublish
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {canPublish
                ? '✓ 4 of 4 slots selected (Ready to Publish)'
                : `4 residences required. Selected: ${selectedCount} of 4 (${neededCount} more needed)`}
            </span>

            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors"
            >
              <Eye className="w-4 h-4 text-deep-purple" />
              <span>Preview Live Showcase</span>
            </Link>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={saving || !canPublish}
              title={!canPublish ? `Select exactly 4 residences to publish (${selectedCount}/4 selected)` : 'Publish ordering to live homepage'}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Publish Ordering'}</span>
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-xl bg-sand/40 border border-deep-purple/30 text-charcoal text-xs font-mono uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-deep-purple" />
            <span>Featured showcase slots updated and published to the Home page carousel.</span>
          </div>
        )}

        {eligibleCount < 4 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs font-sans text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice: Fewer than 4 eligible properties exist on the platform ({eligibleCount} found)</p>
              <p className="mt-1">
                To be eligible for editorial featured placement, a property must have status <strong>Approved</strong> and must not be marked as <strong>Sold</strong> or <strong>Leased</strong>. Currently only {eligibleCount} properties satisfy these criteria platform-wide. Approve more submitted listings in Property Review to unlock all 4 showcase slots.
              </p>
            </div>
          </div>
        )}

        {/* Curation Guidance */}
        <div className="p-4 rounded-xl bg-sand/30 border border-charcoal/10 text-xs font-sans text-dark-gray/80 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
          <p>
            <strong>Editorial Curation vs. Premium:</strong> Front-page featured placement is an unpaid editorial showcase strictly limited to <strong>4 residences</strong> in "Top Residences Worth the Visit". Approved requests beyond the 4 slots enter the <strong>Priority Waitlist Queue</strong> and automatically rotate into active slots as windows expire. (Distinct from <em>Premium Listing Status</em>, which is permanent, paid, and unlocks 360° virtual tours).
          </p>
        </div>

        {loading ? (
          <DashboardSkeleton type="table" />
        ) : (
          <div className="space-y-6">
            {/* Section 1: Active 4 Showcase Slots */}
            <div className="p-6 rounded-2xl bg-porcelain border border-charcoal/10 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="font-serif text-xl text-deep-purple font-medium">
                    Active Showcase Slots ({featuredList.length} of 4 Occupied)
                  </h3>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className={`px-2.5 py-0.5 rounded-full border ${
                    featuredList.length === 4
                      ? 'bg-amber-50 text-amber-900 border-amber-200'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  }`}>
                    {featuredList.length === 4 ? 'Showcase Full (Waitlist Active)' : `${4 - featuredList.length} Vacant Slot${4 - featuredList.length === 1 ? '' : 's'}`}
                  </span>
                </div>
              </div>

              {featuredList.length === 0 ? (
                <div className="py-8 text-center text-dark-gray/50 font-sans text-sm">
                  No residences are currently pinned to the Home showcase. Pin approved properties below or approve pending submissions.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {featuredList.slice(0, 4).map((prop, idx) => {
                    const daysRemaining = prop.featuredUntil
                      ? Math.max(0, Math.ceil((new Date(prop.featuredUntil) - new Date()) / 86400000))
                      : null;

                    return (
                      <div
                        key={prop.id}
                        className="p-3.5 rounded-xl bg-sand/30 border border-charcoal/15 flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="relative h-32 rounded-lg overflow-hidden bg-sand">
                            <img
                              src={prop.coverImage || prop.images?.[0]}
                              alt={prop.title}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-2 left-2 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-deep-purple text-white shadow-xs">
                              Slot #{idx + 1}
                            </span>
                            {prop.isPremiumAdminFlag && (
                              <span className="absolute top-2 right-2 font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-charcoal font-semibold shadow-xs">
                                ★ Premium
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-serif text-base font-medium text-charcoal line-clamp-1">
                              {prop.title}
                            </h4>
                            <div className="font-mono text-xs text-dark-gray/60">
                              {prop.locality}, {prop.city}
                            </div>
                            <div className="font-mono text-xs text-deep-purple font-medium mt-0.5">
                              ₹{prop.listingType === 'rent' ? `${prop.price?.toLocaleString('en-IN')}/mo` : formatINR(prop.price)}
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-sand/50 border border-charcoal/10 font-mono text-[11px] text-dark-gray/70 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-deep-purple" />
                                <span>Window:</span>
                              </span>
                              <span className="font-semibold text-charcoal">
                                {daysRemaining != null ? `${daysRemaining} days left` : 'Active'}
                              </span>
                            </div>
                            {prop.featuredUntil && (
                              <div className="text-[10px] text-dark-gray/50">
                                Until: {new Date(prop.featuredUntil).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1 border-t border-charcoal/10">
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingProp(prop);
                                setAdjustDays(daysRemaining || 14);
                                setCustomDate(prop.featuredUntil ? prop.featuredUntil.slice(0, 10) : '');
                              }}
                              className="py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-[10px] uppercase tracking-wider text-charcoal transition-colors cursor-pointer"
                            >
                              Adjust Window
                            </button>
                            <Link
                              to={`/property/${prop.id}`}
                              target="_blank"
                              className="py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-[10px] uppercase tracking-wider text-charcoal transition-colors text-center inline-flex items-center justify-center gap-1"
                            >
                              <span>Preview</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveFromSlot(prop.id, prop.title)}
                            className="w-full py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Remove from Slot
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Waitlist Priority Queue */}
            {waitlistRequests.length > 0 && (
              <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-amber-700" />
                    <h3 className="font-serif text-xl text-amber-950 font-medium">
                      Showcase Priority Waitlist ({waitlistRequests.length} in Queue)
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-amber-900 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                    Auto-promotes when an active slot opens
                  </span>
                </div>

                <div className="divide-y divide-amber-500/15">
                  {waitlistRequests.map((req, idx) => (
                    <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-950">
                          Queue #{idx + 1}
                        </span>
                        <div>
                          <div className="font-serif text-base text-charcoal font-medium">
                            {req.propertyTitle}
                          </div>
                          <div className="font-mono text-xs text-dark-gray/60">
                            Agent: {req.agentName} • Approved Queue Entry ({new Date(req.createdAt).toLocaleDateString()})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/property/${req.propertyId}`}
                          target="_blank"
                          className="px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: Pending Featured Requests from Agents */}
            {pendingRequests.length > 0 && (
              <div className="p-6 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-charcoal/10">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-deep-purple" />
                    <h3 className="font-serif text-xl text-deep-purple font-medium">
                      Pending Featured Placement Requests ({pendingRequests.length})
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-dark-gray/50">
                    Agent Editorial Submissions
                  </span>
                </div>

                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl bg-porcelain border border-charcoal/10 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 text-charcoal/80 border border-charcoal/15">
                            Awaiting Curation Review
                          </span>
                          <span className="font-mono text-xs text-dark-gray/50">ID: {req.id}</span>
                        </div>
                        <h4 className="font-serif text-lg text-charcoal font-medium">
                          {req.propertyTitle}
                        </h4>
                        <div className="font-mono text-xs text-dark-gray/60">
                          Agent: {req.agentName} • Submitted: {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(req.id)}
                          className="px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                        >
                          {featuredList.length < 4 ? 'Approve & Activate' : 'Approve & Queue to Waitlist'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(req.id);
                            setRejectReason('');
                          }}
                          className="px-4 py-2 rounded-xl bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                        <Link
                          to={`/property/${req.propertyId}`}
                          target="_blank"
                          className="p-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 text-charcoal"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: All Approved Properties Curation Table */}
            <div className="overflow-x-auto rounded-2xl border border-charcoal/10 bg-porcelain shadow-xs">
              <div className="p-4 bg-sand/20 border-b border-charcoal/10 flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-lg text-charcoal font-medium">All Approved Residences</h4>
                  <p className="font-mono text-xs text-dark-gray/60">
                    Toggle pins (strictly capped at 4 total) or manually assign sequence ordering (1–99).
                  </p>
                </div>
              </div>

              <table className="w-full text-left font-sans text-sm min-w-[700px] border-collapse">
                <thead>
                  <tr className="border-b border-charcoal/10 bg-sand/30 font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                    <th className="p-4">Pin (Max 4)</th>
                    <th className="p-4">Order (1-99)</th>
                    <th className="p-4">Property</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Premium Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/5 text-charcoal">
                  {properties.map((prop) => (
                    <tr
                      key={prop.id}
                      className={`hover:bg-sand/15 transition-colors ${
                        prop.featured ? 'bg-sand/20' : ''
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={Boolean(prop.featured)}
                          onChange={() => handleToggleFeatured(prop.id)}
                          className="w-4 h-4 rounded text-deep-purple cursor-pointer accent-deep-purple"
                        />
                      </td>
                      <td className="p-4 font-mono text-xs">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={prop.featuredOrder ?? 99}
                          onChange={(e) => handleSetOrder(prop.id, e.target.value)}
                          className="w-16 px-2 py-1.5 rounded-lg bg-sand/30 border border-charcoal/20 font-mono text-xs text-center focus:outline-none focus:border-deep-purple"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-serif text-base text-charcoal font-medium">
                          {prop.title}
                        </div>
                        <div className="font-mono text-xs text-dark-gray/50">{prop.type}</div>
                      </td>
                      <td className="p-4 font-mono text-xs text-dark-gray/70">
                        {prop.locality}, {prop.city}
                      </td>
                      <td className="p-4 font-mono text-xs text-deep-purple font-medium">
                        ₹
                        {prop.listingType === 'rent'
                          ? `${prop.price?.toLocaleString('en-IN')}/mo`
                          : formatINR(prop.price)}
                      </td>
                      <td className="p-4">
                        {prop.isPremiumAdminFlag ? (
                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/20 font-medium">
                            ★ Permanent Premium
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 text-dark-gray/70">
                            Standard
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Adjust Duration / Expiration Window */}
        {adjustingProp && (
          <div
            className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs"
            style={{ top: `${headerOffset}px` }}
          >
            <div className="bg-porcelain border border-charcoal/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10 font-serif text-xl text-deep-purple font-medium">
                <span>Adjust Featured Placement Window</span>
                <button
                  type="button"
                  onClick={() => setAdjustingProp(null)}
                  className="p-1 text-dark-gray/60 hover:text-charcoal"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveWindowAdjustment} className="space-y-4">
                <div>
                  <div className="font-serif text-base font-medium text-charcoal">{adjustingProp.title}</div>
                  <div className="font-mono text-xs text-dark-gray/60">{adjustingProp.locality}, {adjustingProp.city}</div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal mb-1">
                      Placement Duration (Days from Now)
                    </label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {[7, 14, 21, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setAdjustDays(d);
                            setCustomDate('');
                          }}
                          className={`py-1.5 rounded-lg font-mono text-xs border transition-colors cursor-pointer ${
                            adjustDays === d && !customDate
                              ? 'bg-deep-purple text-white border-deep-purple'
                              : 'bg-sand/40 hover:bg-sand/70 text-charcoal border-charcoal/20'
                          }`}
                        >
                          {d} Days
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={adjustDays}
                      onChange={(e) => {
                        setAdjustDays(Number(e.target.value));
                        setCustomDate('');
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-sand/35 border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal mb-1">
                      Or Specific End Date
                    </label>
                    <input
                      type="date"
                      value={customDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-sand/35 border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustingProp(null)}
                    className="px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider text-charcoal/70 hover:text-charcoal cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs cursor-pointer"
                  >
                    Save Window
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Decline Request Reason */}
        {rejectingId && (
          <div
            className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs"
            style={{ top: `${headerOffset}px` }}
          >
            <div className="bg-porcelain border border-charcoal/15 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10 font-serif text-xl text-deep-purple font-medium">
                <span>Decline Showcase Request</span>
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="p-1 text-dark-gray/60 hover:text-charcoal"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRejectRequest} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal mb-1">
                    Feedback / Reason for Agent (Mandatory)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Photography lighting did not meet editorial guidelines..."
                    className="w-full p-2.5 rounded-xl bg-sand/35 border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingId(null)}
                    className="px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider text-charcoal/70 hover:text-charcoal cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-mono text-xs uppercase tracking-wider shadow-xs cursor-pointer"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
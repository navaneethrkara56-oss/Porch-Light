import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import {
  getPromotionConfig,
  getPromotions,
  requestPremiumStatus,
  requestFeaturedPlacement,
} from '@/services/promotions';
import { getProperties } from '@/services/properties';
import { formatINR } from '@/lib/formatINR';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Building2,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Award,
  Layers,
  ArrowRight,
  ListOrdered,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AgentPromotionsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedPropId = searchParams.get('propertyId');

  const [promotions, setPromotions] = useState([]);
  const [config, setConfig] = useState(null);
  const [properties, setProperties] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'premium' | 'featured'

  // Modal State
  const [modalType, setModalType] = useState(null); // 'premium' | 'featured' | null
  const [selectedPropId, setSelectedPropId] = useState(preselectedPropId || '');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [promoList, cfg, propsRes] = await Promise.all([
        getPromotions(),
        getPromotionConfig(),
        getProperties({ status: 'approved', limit: 100 }),
      ]);
      setPromotions(promoList || []);
      setConfig(cfg);

      const all = propsRes.data || propsRes.allMatching || [];
      setAllProperties(all);
      const myProps = all.filter(
        (p) => (p.agentId === user?.id || p.agentId === user?.customId) && p.status === 'approved'
      );
      setProperties(myProps);

      if ((!selectedPropId || !myProps.some((p) => p.id === selectedPropId)) && myProps.length > 0) {
        setSelectedPropId(myProps[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  useEffect(() => {
    if (preselectedPropId) {
      setSelectedPropId(preselectedPropId);
    }
  }, [preselectedPropId]);

  const isPremiumConfigured = Boolean(
    config && config.active && (config.premiumFee || config.fee) > 0
  );
  const premiumFee = config?.premiumFee || config?.fee || 15000;

  // Active Home Featured count across whole system
  const activeFeaturedCount = useMemo(() => {
    return allProperties.filter((p) => p.featured && p.status === 'approved' && !p.isSold && !p.isLeased).length;
  }, [allProperties]);

  const selectedProperty = properties.find((p) => p.id === selectedPropId);
  const isSelectedAlreadyPremium = Boolean(
    selectedProperty?.isPremium || selectedProperty?.isPremiumAdminFlag
  );
  const hasPendingPremiumRequest = promotions.some(
    (p) => p.propertyId === selectedPropId && p.type === 'premium_badge' && p.status === 'pending_review'
  );

  // Handle Premium Badge Request Submission
  const handleSubmitPremium = async (e) => {
    e.preventDefault();
    if (!selectedPropId) return;

    if (isSelectedAlreadyPremium) {
      toast.error('This residence already possesses permanent verified Premium status.');
      return;
    }

    if (hasPendingPremiumRequest) {
      toast.error('A Premium upgrade request for this residence is already pending review.');
      return;
    }

    if (!isPremiumConfigured) {
      toast.error('Premium requests are unavailable until configured by platform administrators.');
      return;
    }

    setSubmitting(true);
    try {
      await requestPremiumStatus({ propertyId: selectedPropId });
      toast.success('Premium status request submitted with simulated payment.');
      setModalType(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to submit Premium request');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Home Featured Placement Submission
  const handleSubmitFeatured = async (e) => {
    e.preventDefault();
    if (!selectedPropId) return;

    setSubmitting(true);
    try {
      await requestFeaturedPlacement({ propertyId: selectedPropId });
      toast.success('Featured showcase request submitted for Admin review.');
      setModalType(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to submit Featured request');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter list by tab
  const filteredPromotions = useMemo(() => {
    if (activeTab === 'premium') {
      return promotions.filter((p) => p.type === 'premium_badge');
    }
    if (activeTab === 'featured') {
      return promotions.filter((p) => p.type === 'featured_placement');
    }
    return promotions;
  }, [promotions, activeTab]);

  return (
    <DashboardLayout role="agent">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Visibility & Curation
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Premium & Featured Services
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              disabled={!isPremiumConfigured}
              onClick={() => {
                setModalType('premium');
                if (preselectedPropId) setSelectedPropId(preselectedPropId);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>Request Premium Badge</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalType('featured');
                if (preselectedPropId) setSelectedPropId(preselectedPropId);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 border border-amber-500/30 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Request Home Featured</span>
            </button>
          </div>
        </div>

        {/* Informational Cards: Explaining Distinct Workflows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card A: Premium Listing Badge */}
          <div className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/20 font-medium flex items-center gap-1">
                <Award className="w-3 h-3" />
                Service A
              </span>
              <span className="font-mono text-xs text-charcoal font-semibold">
                Simulated Fee: ₹{premiumFee.toLocaleString('en-IN')}
              </span>
            </div>
            <h3 className="font-serif text-xl text-charcoal font-medium">
              Premium Listing Status
            </h3>
            <p className="font-sans text-xs text-charcoal/80 leading-relaxed">
              Premium is a verified badge rendered across all search lists, map previews, and Property View. It highlights architectural quality and enables 360° virtual tours. It <em>does not</em> automatically place listings in the front-page carousel.
            </p>
            {!isPremiumConfigured && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-sans">
                Unavailable until platform administrator configures active fees in Admin Settings.
              </div>
            )}
          </div>

          {/* Card B: Home Featured Showcase */}
          <div className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-900 border border-amber-500/20 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-700" />
                Service B
              </span>
              <span className="font-mono text-xs text-charcoal font-semibold">
                {activeFeaturedCount}/4 Slots Active
              </span>
            </div>
            <h3 className="font-serif text-xl text-charcoal font-medium">
              Home Featured Placement
            </h3>
            <p className="font-sans text-xs text-charcoal/80 leading-relaxed">
              Featured placement showcases a residence in 1 of exactly 4 slots on the Home page top carousel. Admin curates placements for 14-day windows. If all 4 slots are occupied, approved listings wait in an active priority queue.
            </p>
            <div className="font-mono text-[11px] text-dark-gray/60 flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-deep-purple" />
              <span>
                {activeFeaturedCount >= 4
                  ? 'All 4 front-page slots occupied — new approvals enter priority waitlist.'
                  : `${4 - activeFeaturedCount} vacant slot(s) currently open for immediate curation.`}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Filters for Request List */}
        <div className="flex items-center gap-2 border-b border-charcoal/10 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-deep-purple text-white shadow-xs font-medium'
                : 'text-charcoal/70 hover:text-charcoal'
            }`}
          >
            All Requests ({promotions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('premium')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'premium'
                ? 'bg-deep-purple text-white shadow-xs font-medium'
                : 'text-charcoal/70 hover:text-charcoal'
            }`}
          >
            Premium Badges ({promotions.filter((p) => p.type === 'premium_badge').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('featured')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'featured'
                ? 'bg-deep-purple text-white shadow-xs font-medium'
                : 'text-charcoal/70 hover:text-charcoal'
            }`}
          >
            Home Featured ({promotions.filter((p) => p.type === 'featured_placement').length})
          </button>
        </div>

        {/* Promotions List */}
        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : filteredPromotions.length === 0 ? (
          <DashboardEmptyState
            title="No service requests found."
            description={
              activeTab === 'all'
                ? "You haven't requested Premium status or Home featured placement for any of your properties yet."
                : `No requests currently match the "${activeTab}" filter.`
            }
            actionLabel="Request Premium Badge"
            onAction={() => setModalType('premium')}
            icon={Sparkles}
          />
        ) : (
          <div className="space-y-4">
            {filteredPromotions.map((promo) => {
              const isPremiumReq = promo.type === 'premium_badge';
              const isWaitlist = promo.status === 'waitlist';
              const isApproved = promo.status === 'approved';
              const isPending = promo.status === 'pending_review';
              const isRejected = promo.status === 'rejected';

              const statusBadge = isApproved
                ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25 font-medium'
                : isWaitlist
                ? 'bg-amber-500/10 text-amber-950 border-amber-500/30 font-medium'
                : isPending
                ? 'bg-sand/60 text-charcoal/80 border-charcoal/20'
                : 'bg-rose-50 text-rose-800 border-rose-200';

              return (
                <div
                  key={promo.id}
                  className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 hover:border-deep-purple/30 transition-all shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusBadge}`}
                      >
                        {isWaitlist
                          ? `Waitlist Queue: #${promo.queuePosition || 1}`
                          : isApproved
                          ? isPremiumReq
                            ? 'Premium Badge Active'
                            : 'Active Front-Page Feature'
                          : isPending
                          ? 'Pending Admin Review'
                          : 'Declined'}
                      </span>

                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 text-charcoal/80 border border-charcoal/10">
                        {isPremiumReq ? 'Premium Badge Service' : 'Home Featured Service'}
                      </span>

                      <span className="font-mono text-xs text-dark-gray/50">ID: {promo.id}</span>
                    </div>

                    <h3 className="font-serif text-2xl text-charcoal font-medium">
                      {promo.propertyTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-dark-gray/70">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-deep-purple" />
                        Requested: {new Date(promo.createdAt).toLocaleDateString()}
                      </span>

                      {isPremiumReq && isApproved && (
                        <span className="flex items-center gap-1 text-deep-purple font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-deep-purple" />
                          Permanent Status • 360° Tour Unlocked
                        </span>
                      )}

                      {!isPremiumReq && promo.placementEndDate && isApproved && (
                        <span className="flex items-center gap-1 text-deep-purple font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Placement active through:{' '}
                          {new Date(promo.placementEndDate).toLocaleDateString()}
                        </span>
                      )}

                      {isPremiumReq && promo.feeAmount > 0 && (
                        <span>Simulated Demo Fee: ₹{promo.feeAmount.toLocaleString('en-IN')}</span>
                      )}
                    </div>

                    {isWaitlist && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-sans text-amber-950 space-y-1">
                        <div className="font-mono font-semibold uppercase text-[10px] tracking-wider text-amber-900 flex items-center gap-1">
                          <ListOrdered className="w-3.5 h-3.5 text-amber-800" />
                          <span>Queue Position #{promo.queuePosition || 1}</span>
                        </div>
                        <p>
                          Your property was approved for front-page showcase. Because all 4 Home slots are actively filled, this listing will automatically rotate into active rotation as soon as a current placement window concludes.
                        </p>
                      </div>
                    )}

                    {promo.adminNotes && (
                      <div className="p-3 rounded-xl bg-sand/60 border border-charcoal/15 text-xs font-sans text-charcoal">
                        <strong>Admin Note:</strong> {promo.adminNotes}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 self-start md:self-center">
                    <Link
                      to={`/property/${promo.propertyId}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors"
                    >
                      <span>View Listing</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Request Premium Status */}
        {modalType === 'premium' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="bg-porcelain border border-charcoal/15 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2 font-serif text-2xl text-deep-purple font-medium">
                  <Award className="w-6 h-6 text-deep-purple" />
                  <span>Request Premium Status</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="p-1 rounded-lg text-dark-gray/60 hover:text-charcoal cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitPremium} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal mb-1.5">
                    Select Residence You Manage
                  </label>
                  <select
                    value={selectedPropId}
                    onChange={(e) => setSelectedPropId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-sand/35 border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.locality}, {p.city}) {p.isPremiumAdminFlag ? '★ [Already Premium]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-sand/40 border border-charcoal/10 space-y-2 text-xs font-sans">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-dark-gray/70">One-Time Configured Fee:</span>
                    <span className="font-semibold text-charcoal text-sm">
                      ₹{premiumFee.toLocaleString('en-IN')} (Simulated)
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-dark-gray/70">Status Validity:</span>
                    <span className="text-deep-purple font-medium">Permanent (No Expiry)</span>
                  </div>
                  <p className="text-dark-gray/80 pt-1 text-[11px] leading-relaxed border-t border-charcoal/10">
                    {config?.terms ||
                      'Applies a permanent verified Premium Architectural Badge across all search results, map previews, and property views, and unlocks the 360° virtual tour capability.'}
                  </p>
                </div>

                {isSelectedAlreadyPremium && (
                  <div className="p-3 rounded-xl bg-deep-purple/10 border border-deep-purple/20 text-xs font-sans text-deep-purple flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
                    <p>
                      <strong>Already Verified Premium:</strong> This residence already holds permanent Premium status with 360° virtual tour access. Duplicate requests are not permitted.
                    </p>
                  </div>
                )}

                {hasPendingPremiumRequest && !isSelectedAlreadyPremium && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-amber-950 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                    <p>
                      <strong>Request Pending Review:</strong> An upgrade request for this residence is already awaiting platform administrative review.
                    </p>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-sand/50 border border-charcoal/15 text-xs font-sans text-charcoal/80 flex items-start gap-2.5">
                  <CreditCard className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
                  <p>
                    <strong>Simulated Demo Payment:</strong> No real money will be charged. This logs a simulated transaction and submits the listing for administrative badge verification.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider text-charcoal/70 hover:text-charcoal cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedPropId || isSelectedAlreadyPremium || hasPendingPremiumRequest}
                    className="px-5 py-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Processing Demo Payment...' : 'Confirm & Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Request Home Featured Placement */}
        {modalType === 'featured' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="bg-porcelain border border-charcoal/15 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2 font-serif text-2xl text-deep-purple font-medium">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                  <span>Request Front-Page Feature</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="p-1 rounded-lg text-dark-gray/60 hover:text-charcoal cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitFeatured} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal mb-1.5">
                    Select Residence You Manage
                  </label>
                  <select
                    value={selectedPropId}
                    onChange={(e) => setSelectedPropId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-sand/35 border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.locality}, {p.city}) {p.featured ? '★ [Currently Featured]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-sand/40 border border-charcoal/10 space-y-2 text-xs font-sans">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-dark-gray/70">Showcase Capacity:</span>
                    <span className="font-semibold text-charcoal">4 Front-Page Slots</span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-dark-gray/70">Current Occupancy:</span>
                    <span className="text-deep-purple font-medium">
                      {activeFeaturedCount} of 4 Active Slots
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-dark-gray/70">Showcase Window:</span>
                    <span className="text-charcoal">14 Days per Placement</span>
                  </div>
                  <p className="text-dark-gray/80 pt-1 text-[11px] leading-relaxed border-t border-charcoal/10">
                    If all 4 slots are occupied upon Admin approval, your property will be placed in the priority waitlist and will automatically rotate into the front-page carousel as soon as an active placement expires.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                  <button
                    type="button"
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider text-charcoal/70 hover:text-charcoal cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedPropId}
                    className="px-5 py-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Submitting Request...' : 'Submit Showcase Request'}
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

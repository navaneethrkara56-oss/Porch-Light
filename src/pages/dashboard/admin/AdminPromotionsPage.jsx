import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';
import { getPromotions, updatePromotionStatus } from '@/services/promotions';
import { formatINR } from '@/lib/formatINR';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
  CreditCard,
  Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminPromotionsPage() {
  const headerOffset = useHeaderOffset();
  const lastActiveElementRef = useRef(null);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_review'); // 'pending_review' | 'approved' | 'rejected' | 'all'
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && rejectingId) {
        setRejectingId(null);
        lastActiveElementRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rejectingId]);

  const loadData = async () => {
    try {
      const data = await getPromotions();
      // Premium promotions only
      setPromotions(data.filter((p) => p.type === 'premium_badge'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id) => {
    try {
      await updatePromotionStatus(id, { status: 'approved' });
      toast.success('Premium status granted. Verified badge and 360° tour unlocked permanently.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Approval failed');
    }
  };

  const handleReject = async (e) => {
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
      toast.success('Premium request declined.');
      setRejectingId(null);
      setRejectReason('');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Rejection failed');
    }
  };

  const filtered = promotions.filter((p) => {
    if (filter === 'pending_review') return p.status === 'pending_review';
    if (filter === 'approved') return p.status === 'approved';
    if (filter === 'rejected') return p.status === 'rejected';
    return true;
  });

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Paid Upgrades & Architectural Verification
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Premium Listing Requests
            </h1>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex p-1 rounded-full bg-sand/60 border border-charcoal/10">
            {['pending_review', 'approved', 'rejected', 'all'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  filter === f
                    ? 'bg-deep-purple text-white shadow-xs font-medium'
                    : 'text-charcoal/70 hover:text-charcoal'
                }`}
              >
                {f === 'pending_review' ? 'Pending Review' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Workflow Rule Alert */}
        <div className="p-4 rounded-xl bg-sand/30 border border-charcoal/10 text-xs font-sans text-dark-gray/80 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
          <p>
            <strong>Permanent Status Guarantee:</strong> Premium listing promotion is a <strong>one-time paid upgrade</strong>. Once approved by administration, the residence permanently retains the verified Premium badge across search, maps, and property view, and unlocks the 360° virtual tour. There is no expiry window. (To curate the 4 unpaid Home front-page slots, visit <Link to="/admin/featured" className="text-deep-purple underline font-medium">Featured Showcase</Link>).
          </p>
        </div>

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : filtered.length === 0 ? (
          <DashboardEmptyState
            title="No Premium promotion requests in this queue."
            description={`No requests currently match the "${filter.replace('_', ' ')}" status filter.`}
            icon={Award}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((promo) => {
              const statusBadge =
                promo.status === 'approved'
                  ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25 font-medium'
                  : promo.status === 'pending_review'
                  ? 'bg-sand/60 text-charcoal/80 border-charcoal/20'
                  : 'bg-rose-50 text-rose-800 border-rose-200';

              return (
                <div
                  key={promo.id}
                  className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-deep-purple/30 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border capitalize ${statusBadge}`}
                      >
                        {promo.status === 'pending_review'
                          ? 'Awaiting Verification'
                          : promo.status === 'approved'
                          ? 'Permanent Premium Active'
                          : 'Declined'}
                      </span>
                      <span className="font-mono text-xs text-dark-gray/50">
                        Ref: {promo.paymentReference || promo.id}
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl text-charcoal font-medium">
                      {promo.propertyTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-dark-gray/70">
                      <span>Agent: {promo.agentName}</span>
                      <span>•</span>
                      <span>One-Time Fee: ₹{promo.feeAmount?.toLocaleString('en-IN')} (Simulated)</span>
                      <span>•</span>
                      <span className="text-deep-purple font-semibold">Validity: Permanent (No Expiry)</span>
                      <span>•</span>
                      <span>Submitted: {new Date(promo.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-sans text-dark-gray/70 pt-1">
                      <Camera className="w-3.5 h-3.5 text-deep-purple" />
                      <span>Unlocks 360° Virtual Tour viewer and verified gold star badge</span>
                    </div>

                    {promo.status === 'rejected' && (
                      <div className="font-sans text-xs text-rose-800 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 mt-2">
                        <strong>Rejection Reason:</strong> {promo.adminNotes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                    {promo.status === 'pending_review' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(promo.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve Premium</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            lastActiveElementRef.current = e.currentTarget;
                            setRejectingId(promo.id);
                            setRejectReason('');
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    <Link
                      to={`/property/${promo.propertyId}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal"
                    >
                      <span>Property</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reject Modal */}
        {rejectingId && (
          <div
            className="fixed left-0 right-0 bottom-0 z-40 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs overflow-y-auto"
            style={{ top: `${headerOffset}px` }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setRejectingId(null);
                lastActiveElementRef.current?.focus();
              }
            }}
          >
            <div
              className="relative w-full max-w-md bg-porcelain rounded-2xl border border-charcoal/15 shadow-2xl p-6 my-auto max-h-[calc(100dvh-${headerOffset}px-2rem)] overflow-y-auto space-y-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reject-premium-modal-title"
            >
              <h3 id="reject-premium-modal-title" className="font-serif text-xl text-deep-purple font-medium">
                Reject Premium Request
              </h3>
              <p className="font-sans text-xs text-dark-gray/70">
                Please provide feedback for the agent. (The property will remain non-Premium and the reason will be sent to the agent's notification center).
              </p>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Architectural photos do not meet high-resolution criteria..."
                className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 leading-relaxed"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(null);
                    lastActiveElementRef.current?.focus();
                  }}
                  className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand font-mono text-xs uppercase tracking-wider text-charcoal cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-4 py-2 rounded-xl bg-rose-700 text-white hover:bg-rose-800 font-mono text-xs uppercase tracking-wider cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
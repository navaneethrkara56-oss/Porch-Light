import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardBackButton } from '@/components/dashboard/DashboardBackButton';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { getPayments, requestLeaseCancellation, respondLeaseCancellation } from '@/services/payments';
import { getProperties } from '@/services/properties';
import { generatePaymentReceiptPDF } from '@/services/documents';
import { getRatingForTransaction } from '@/services/ratings';
import { AgentRatingModal } from '@/components/rating/AgentRatingModal';
import { formatPaymentDate } from '@/lib/formatDate';
import {
  Building2,
  Receipt,
  Download,
  Calendar,
  MapPin,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  Star,
} from 'lucide-react';

export function UserPropertiesPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('buy'); // 'buy' | 'rent'
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Early cancellation modal state
  const [selectedLeasePayment, setSelectedLeasePayment] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelTargetDate, setCancelTargetDate] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState(null);
  const [activeRatingTarget, setActiveRatingTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [payRes, propsRes] = await Promise.all([
        getPayments(),
        getProperties({ limit: 100 }),
      ]);
      setPayments(payRes.data || []);
      setProperties(propsRes.data || propsRes.allMatching || []);
    } catch (err) {
      console.error('Failed to load acquired/leased residences:', err);
      setError(err.message || 'Failed to load residence portfolio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);

  const handleRequestEarlyCancellation = async (e) => {
    e.preventDefault();
    if (!selectedLeasePayment) return;
    setSubmittingCancel(true);
    setCancelFeedback(null);
    try {
      await requestLeaseCancellation({
        paymentId: selectedLeasePayment.id,
        propertyId: selectedLeasePayment.propertyId,
        reason: cancelReason,
        requestedDate: cancelTargetDate,
      });
      setCancelFeedback({
        type: 'success',
        message: 'Early cancellation request submitted. The managing agent has been notified and must agree before the lease can be closed.',
      });
      setTimeout(() => {
        setSelectedLeasePayment(null);
        setCancelReason('');
        setCancelTargetDate('');
        setCancelFeedback(null);
      }, 2000);
    } catch (err) {
      setCancelFeedback({ type: 'error', message: err.message || 'Failed to submit request.' });
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleRespondToCancellation = async (paymentId, propertyId, agree) => {
    try {
      await respondLeaseCancellation({ paymentId, propertyId, agree });
    } catch (err) {
      alert(err.message || 'Error processing response');
    }
  };

  // Filter payments by type: token_amount = Acquisitions (Buy), rent_deposit = Leases (Rent)
  const buyPayments = payments.filter((p) => p.type === 'token_amount');
  const rentPayments = payments.filter((p) => p.type === 'rent_deposit');

  const activePayments = activeTab === 'buy' ? buyPayments : rentPayments;

  return (
    <DashboardLayout role="user">
      <div className="space-y-6">
        {/* Contextual Back Button */}
        <div>
          <DashboardBackButton fallbackTo="/dashboard/overview" label="Back to Overview" />
        </div>

        {/* Header & Segmented Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Personal Portfolio
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              My Properties
            </h1>
          </div>

          {/* Segmented Control */}
          <div className="inline-flex p-1 rounded-full bg-sand/60 border border-charcoal/10 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('buy')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'buy'
                  ? 'bg-deep-purple text-white shadow-xs font-medium'
                  : 'text-charcoal/70 hover:text-charcoal'
              }`}
            >
              Acquisitions ({buyPayments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rent')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'rent'
                  ? 'bg-deep-purple text-white shadow-xs font-medium'
                  : 'text-charcoal/70 hover:text-charcoal'
              }`}
            >
              Active Leases ({rentPayments.length})
            </button>
          </div>
        </div>

        {/* Non-Lender Disclaimer Notice */}
        <div className="p-4 rounded-xl bg-sand/30 border border-charcoal/10 flex items-start gap-3 text-xs font-sans text-dark-gray/80">
          <AlertCircle className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
          <p>
            <strong className="font-semibold text-charcoal">Simulated Transaction Records:</strong> All
            booking tokens, advance deposits, and purchase receipts displayed here are generated
            via Porch Light's simulated demo payment sandbox. Porch Light does not collect monthly EMI
            loan installments or act as a financial lender.
          </p>
        </div>

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : activePayments.length === 0 ? (
          <DashboardEmptyState
            title={
              activeTab === 'buy'
                ? 'No purchased residences yet.'
                : 'No active rental leases found.'
            }
            description={
              activeTab === 'buy'
                ? 'When you complete a simulated token advance for a home, it will be cataloged here with its legal receipt and verification records.'
                : 'When you place a rental deposit on a curated apartment or villa, your lease agreement and payment records will appear here.'
            }
            actionLabel={activeTab === 'buy' ? 'Browse Residences for Sale' : 'Explore Rental Homes'}
            actionLink={activeTab === 'buy' ? '/buy' : '/rent'}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activePayments.map((payment) => {
              const prop = properties.find((p) => p.id === payment.propertyId);
              const snapshot = payment.propertySnapshot || {};
              const title = snapshot.title || prop?.title || payment.propertyTitle;
              const locality = snapshot.locality || prop?.locality || 'Bengaluru';
              const city = snapshot.city || prop?.city || '';
              const image =
                prop?.coverImage ||
                prop?.images?.[0] ||
                'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';

              const isLease = payment.type === 'rent_deposit';
              const leaseCancellationReq = payment.cancellationRequest;
              const leaseEnded = payment.leaseStatus === 'ended';

              return (
                <div
                  key={payment.id}
                  id={`property-${payment.propertyId}`}
                  className="rounded-2xl bg-porcelain border border-charcoal/10 overflow-hidden shadow-xs hover:border-deep-purple/30 transition-all flex flex-col"
                >
                  {/* Property Image Header */}
                  <div className="relative h-48 sm:h-56 overflow-hidden bg-sand">
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      {payment.type === 'token_amount' ? (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sand/95 text-deep-purple border border-deep-purple/30 shadow-xs backdrop-blur-xs font-medium flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-deep-purple" />
                          Verified Purchase
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sand/95 text-charcoal border border-charcoal/30 shadow-xs backdrop-blur-xs font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-deep-purple" />
                          {leaseEnded ? 'Lease Ended' : 'Active Lease'}
                        </span>
                      )}

                      {prop?.reraId && (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sand/95 text-charcoal border border-charcoal/20 shadow-xs backdrop-blur-xs flex items-center gap-1 font-medium">
                          <ShieldCheck className="w-3 h-3 text-deep-purple" />
                          RERA Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 font-mono text-xs text-dark-gray/60 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-deep-purple" />
                        <span>
                          {locality}, {city}
                        </span>
                      </div>
                      <h3 className="font-serif text-2xl text-charcoal font-medium">{title}</h3>
                      <div className="mt-2 text-xs font-mono text-dark-gray/60">
                        Transaction: <span className="text-charcoal font-medium">{payment.id}</span>
                        <br />
                        Date: {formatPaymentDate(payment)} via {payment.method || 'Online'}
                      </div>

                      {/* Rent Details & Duration if Lease */}
                      {isLease && (
                        <div className="mt-3 p-3 rounded-xl bg-sand/40 border border-charcoal/10 font-sans text-xs text-dark-gray/80 space-y-2">
                          <div className="flex justify-between font-mono">
                            <span>Monthly Rent:</span>
                            <span className="font-medium text-charcoal">
                              ₹{snapshot.price ? snapshot.price.toLocaleString('en-IN') : '0'}/mo
                            </span>
                          </div>
                          <div className="flex justify-between font-mono">
                            <span>Lease Window:</span>
                            <span className="text-charcoal font-medium">
                              {(payment.leaseDetails?.startDate || payment.leaseStart) && (payment.leaseDetails?.endDate || payment.leaseEnd)
                                ? `${new Date(payment.leaseDetails?.startDate || payment.leaseStart).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', year: 'numeric' })} – ${new Date(payment.leaseDetails?.endDate || payment.leaseEnd).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', year: 'numeric' })}`
                                : 'Date unavailable'}
                            </span>
                          </div>

                          {/* Cancellation Status Banner */}
                          {leaseCancellationReq && leaseCancellationReq.status === 'pending' && (
                            <div className="p-2.5 rounded-lg bg-sand border border-deep-purple/20 text-xs">
                              <div className="flex items-center gap-1.5 font-mono text-deep-purple font-medium mb-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Early Cancellation Pending Agreement</span>
                              </div>
                              <p className="text-[11px] text-charcoal/80">
                                {leaseCancellationReq.initiatedById === user?.id
                                  ? 'You requested early lease cancellation. Awaiting managing agent mutual approval.'
                                  : 'The managing agent has requested early lease termination. Your agreement is required.'}
                              </p>
                              {leaseCancellationReq.initiatedById !== user?.id && (
                                <div className="mt-2 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleRespondToCancellation(payment.id, payment.propertyId, true)}
                                    className="px-2.5 py-1 rounded bg-deep-purple text-white font-mono text-[10px] uppercase tracking-wider"
                                  >
                                    Agree to End Lease
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRespondToCancellation(payment.id, payment.propertyId, false)}
                                    className="px-2.5 py-1 rounded bg-sand/80 border border-charcoal/15 text-charcoal font-mono text-[10px] uppercase tracking-wider"
                                  >
                                    Decline Request
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {leaseEnded && (
                            <div className="p-2.5 rounded-lg bg-sand/80 border border-charcoal/20 text-xs font-mono text-charcoal">
                              Lease ended early by mutual agreement. Handover pending agent confirmation.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-charcoal/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => generatePaymentReceiptPDF(payment)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer"
                          title="Download official demo payment receipt"
                        >
                          <Download className="w-3.5 h-3.5 text-deep-purple" />
                          <span>Receipt (PDF)</span>
                        </button>

                        {payment.status === 'completed' && (
                          (() => {
                            const AGENT_MAP = {
                              agt_vikram: { id: 'agt_vikram', name: 'Vikramaditya Singhania', agency: 'Singhania & Co. Luxury Real Estate' },
                              agt_meera: { id: 'agt_meera', name: 'Meera Nambiar', agency: 'Malabar Heritage Sanctuaries' },
                              agt_kabir: { id: 'agt_kabir', name: 'Kabir Shroff', agency: 'Shroff & Partners Prime Estates' },
                              agt_pooja: { id: 'agt_pooja', name: 'Pooja Deshmukh', agency: 'Deccan Architecture Properties' },
                            };
                            const targetAgentId = prop?.agentId || payment.agentId;
                            const targetAgent = prop?.agent || AGENT_MAP[targetAgentId] || {
                              id: targetAgentId,
                              name: prop?.agentName || 'Representing Agent',
                              company: 'Porch Light',
                            };
                            const rating = getRatingForTransaction(payment.id);
                            const hasRating = Boolean(rating && rating.rating);

                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveRatingTarget({
                                    transaction: payment,
                                    property: prop || { id: payment.propertyId, title },
                                    agent: targetAgent,
                                    existingRating: rating,
                                  })
                                }
                                aria-label={
                                  hasRating
                                    ? `Your rating: ${rating.rating} stars for ${targetAgent.name}. Click to update.`
                                    : `Rate agent ${targetAgent.name} for this completed transaction`
                                }
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                                  hasRating
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/35 font-medium'
                                    : 'bg-deep-purple/10 hover:bg-deep-purple/20 text-deep-purple border border-deep-purple/25 font-medium'
                                }`}
                                title={
                                  hasRating
                                    ? `Your rating: ${rating.rating} stars for ${targetAgent.name} (Click to update)`
                                    : `Rate agent ${targetAgent.name} for this completed transaction`
                                }
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    hasRating ? 'text-amber-500 fill-amber-500' : 'text-deep-purple'
                                  }`}
                                />
                                <span>{hasRating ? `Your rating: ${rating.rating} star${rating.rating > 1 ? 's' : ''}` : 'Rate agent'}</span>
                              </button>
                            );
                          })()
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isLease && !leaseEnded && (!leaseCancellationReq || leaseCancellationReq.status !== 'pending') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLeasePayment(payment);
                              setCancelReason('');
                              setCancelTargetDate('');
                              setCancelFeedback(null);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-charcoal/20 hover:border-deep-purple/40 bg-sand/40 hover:bg-sand/70 text-charcoal font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                            title="Submit mutual early lease cancellation request"
                          >
                            <Clock className="w-3.5 h-3.5 text-deep-purple" />
                            <span>Request Early Exit</span>
                          </button>
                        )}
                        <Link
                          to="/dashboard/chat"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-dark-gray/70 hover:text-deep-purple font-mono text-xs uppercase tracking-wider"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Contact Agent</span>
                        </Link>
                        {payment.propertyId && (
                          <Link
                            to={`/property/${payment.propertyId}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs"
                          >
                            <span>View Property</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Early Lease Cancellation Request Modal */}
        {selectedLeasePayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-porcelain border border-charcoal/10 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <h3 className="font-serif text-xl text-deep-purple font-medium">
                  Request Early Lease Cancellation
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedLeasePayment(null)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-sand/50 border border-charcoal/10 text-xs text-charcoal/80 space-y-1">
                <p className="font-medium text-charcoal">Demo Simulation Notice</p>
                <p>
                  This request requires mutual agreement from the managing agent before the lease is closed. The property will remain actively leased and unavailable to the public until both parties agree and handover is confirmed.
                </p>
              </div>

              {cancelFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-mono ${
                    cancelFeedback.type === 'success'
                      ? 'bg-deep-purple/10 text-deep-purple border border-deep-purple/20'
                      : 'bg-sand text-charcoal border border-charcoal/30'
                  }`}
                >
                  {cancelFeedback.message}
                </div>
              )}

              <form onSubmit={handleRequestEarlyCancellation} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                    Proposed Move-out / Handover Date
                  </label>
                  <input
                    type="date"
                    required
                    value={cancelTargetDate}
                    onChange={(e) => setCancelTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-sand/40 border border-charcoal/15 font-mono text-xs text-charcoal focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                    Reason for Early Termination
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g., Job relocation, change in housing arrangements..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-sand/40 border border-charcoal/15 font-sans text-xs text-charcoal placeholder:text-charcoal/40 focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                  <button
                    type="button"
                    onClick={() => setSelectedLeasePayment(null)}
                    disabled={submittingCancel}
                    className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCancel}
                    className="px-4 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shadow-xs disabled:opacity-50"
                  >
                    {submittingCancel ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Agent Star Rating Modal */}
        {activeRatingTarget && (
          <AgentRatingModal
            isOpen={Boolean(activeRatingTarget)}
            onClose={() => setActiveRatingTarget(null)}
            transaction={activeRatingTarget.transaction}
            property={activeRatingTarget.property}
            agent={activeRatingTarget.agent}
            existingRating={activeRatingTarget.existingRating}
            onRatingSaved={() => {
              loadData();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import {
  getBookings,
  updateBookingStatus,
  respondBookingReschedule,
} from '@/services/bookings';
import { getProperties } from '@/services/properties';
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  MapPin,
  ExternalLink,
  MessageSquare,
  CalendarClock,
} from 'lucide-react';

export function AgentVisitsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'confirmed' | 'declined'
  const [processingId, setProcessingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, propsRes] = await Promise.all([
        getBookings(),
        getProperties({ limit: 100 }),
      ]);
      setBookings(bookingsRes.data || []);
      setProperties(propsRes.data || propsRes.allMatching || []);
    } catch (err) {
      console.error('Failed to load agent walkthrough visits:', err);
      setError(err.message || 'Failed to load visits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);

  const handleAction = async (id, status) => {
    setProcessingId(id);
    try {
      await updateBookingStatus(id, status);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update visit status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRescheduleAction = async (id, accept) => {
    setProcessingId(id);
    try {
      await respondBookingReschedule({ bookingId: id, accept });
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to respond to reschedule request');
    } finally {
      setProcessingId(null);
    }
  };

  const parseVisitDateTime = (dateStr, timeSlotStr) => {
    if (!dateStr) return null;
    const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    let year, month, day;
    if (dateMatch) {
      year = parseInt(dateMatch[1], 10);
      month = parseInt(dateMatch[2], 10) - 1;
      day = parseInt(dateMatch[3], 10);
    } else {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        year = d.getFullYear();
        month = d.getMonth();
        day = d.getDate();
      } else {
        return null;
      }
    }

    let hour = 0;
    let minute = 0;
    if (timeSlotStr) {
      const match = timeSlotStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (match) {
        hour = parseInt(match[1], 10);
        minute = match[2] ? parseInt(match[2], 10) : 0;
        const meridiem = match[3] ? match[3].toUpperCase() : null;
        if (meridiem === 'PM' && hour < 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;
      }
    }

    return new Date(year, month, day, hour, minute, 0);
  };

  const isVisitEligibleForCompletion = (b) => {
    if (b.status !== 'confirmed') return false;
    const visitDate = parseVisitDateTime(b.date, b.timeSlot);
    if (!visitDate) return false;
    return new Date() >= visitDate;
  };

  const filtered = bookings.filter((b) => {
    if (filter === 'pending') return b.status === 'pending';
    if (filter === 'confirmed') return b.status === 'confirmed';
    if (filter === 'completed') return b.status === 'completed' || b.status === 'visited';
    if (filter === 'declined') return b.status === 'declined';
    return true;
  });

  return (
    <DashboardLayout role="agent">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Client Scheduling
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Visit Requests
            </h1>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex p-1 rounded-full bg-sand/60 border border-charcoal/10 self-start sm:self-auto">
            {['all', 'pending', 'confirmed', 'completed', 'declined'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all capitalize cursor-pointer ${
                  filter === f
                    ? 'bg-deep-purple text-white shadow-xs font-medium'
                    : 'text-charcoal/70 hover:text-charcoal'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : filtered.length === 0 ? (
          <DashboardEmptyState
            title="No visit requests found."
            description={
              filter === 'all'
                ? "You don't have any inbound visit requests from prospective buyers or tenants right now."
                : `No visit requests matching the "${filter}" filter.`
            }
            icon={Calendar}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const prop = properties.find((p) => p.id === b.propertyId);
              const title = prop?.title || b.propertyTitle || 'Residence Walkthrough';

              const isPending = b.status === 'pending';
              const isConfirmed = b.status === 'confirmed';
              const isCompleted = b.status === 'completed' || b.status === 'visited';
              const hasPendingReschedule =
                isConfirmed &&
                b.rescheduleRequest &&
                b.rescheduleRequest.status === 'pending';

              const statusBadge =
                isCompleted
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                  : isConfirmed
                  ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25 font-medium'
                  : isPending
                  ? 'bg-sand/60 text-charcoal/80 border-charcoal/20'
                  : 'bg-rose-50 text-rose-800 border-rose-200';

              return (
                <div
                  key={b.id}
                  id={`visit-${b.id}`}
                  className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4 hover:border-deep-purple/30 transition-all"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border capitalize ${statusBadge}`}
                      >
                        {b.status}
                      </span>
                      {b.scheduleEditedAt && isPending && (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 border border-charcoal/20 text-charcoal/70">
                          Schedule Updated by Client
                        </span>
                      )}
                      <span className="font-mono text-xs text-dark-gray/50">ID: {b.id}</span>
                    </div>

                    <h3 className="font-serif text-2xl text-charcoal font-medium">{title}</h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-dark-gray/70">
                      <span className="flex items-center gap-1.5 text-charcoal font-medium">
                        <User className="w-3.5 h-3.5 text-deep-purple" />
                        {b.userName || 'Prospective Buyer'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-deep-purple" />
                        {b.date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-deep-purple" />
                        {b.timeSlot}
                      </span>
                    </div>

                    {b.notes && (
                      <div className="font-sans text-xs text-dark-gray/70 italic bg-sand/30 px-3 py-1.5 rounded-lg border border-charcoal/5 max-w-xl">
                        Client note: "{b.notes}"
                      </div>
                    )}

                    {/* Pending Reschedule Review Banner for Agent */}
                    {hasPendingReschedule && (
                      <div className="p-4 rounded-xl bg-deep-purple/5 border border-deep-purple/20 space-y-2 max-w-xl">
                        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-deep-purple font-semibold">
                          <CalendarClock className="w-4 h-4 text-deep-purple" />
                          <span>Client Requested Schedule Change</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-sans">
                          <div className="p-2 rounded-lg bg-porcelain border border-charcoal/10">
                            <span className="text-dark-gray/60 block text-[10px] font-mono uppercase tracking-wider">
                              Current Confirmed
                            </span>
                            <span className="text-charcoal font-medium">
                              {b.date} ({b.timeSlot})
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-deep-purple/10 border border-deep-purple/30">
                            <span className="text-deep-purple block text-[10px] font-mono uppercase tracking-wider font-semibold">
                              Proposed Replacement
                            </span>
                            <span className="text-deep-purple font-semibold">
                              {b.rescheduleRequest.proposedDate} ({b.rescheduleRequest.proposedTimeSlot})
                            </span>
                          </div>
                        </div>
                        {b.rescheduleRequest.reason && (
                          <p className="font-sans text-xs text-charcoal/80 italic">
                            Reason: "{b.rescheduleRequest.reason}"
                          </p>
                        )}
                        <p className="font-sans text-[11px] text-dark-gray/60">
                          Declining this request will preserve the original confirmed appointment on {b.date}.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-center">
                    {/* Normal pending visit actions */}
                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={processingId === b.id}
                          onClick={() => handleAction(b.id, 'confirmed')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer min-h-[44px] disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm</span>
                        </button>
                        <button
                          type="button"
                          disabled={processingId === b.id}
                          onClick={() => handleAction(b.id, 'declined')}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Decline</span>
                        </button>
                      </>
                    )}

                    {/* Reschedule request actions on confirmed visit */}
                    {hasPendingReschedule && (
                      <>
                        <button
                          type="button"
                          disabled={processingId === b.id}
                          onClick={() => handleRescheduleAction(b.id, true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer min-h-[44px] disabled:opacity-50"
                          title="Accept the proposed new walkthrough time"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accept New Time</span>
                        </button>
                        <button
                          type="button"
                          disabled={processingId === b.id}
                          onClick={() => handleRescheduleAction(b.id, false)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
                          title="Decline new time and preserve current confirmed appointment"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Decline New Time</span>
                        </button>
                      </>
                    )}

                    {/* Mark Visited action for eligible confirmed visit */}
                    {isConfirmed && !hasPendingReschedule && isVisitEligibleForCompletion(b) && (
                      <button
                        type="button"
                        disabled={processingId === b.id}
                        onClick={() => handleAction(b.id, 'completed')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer min-h-[44px] disabled:opacity-50"
                        title="Mark scheduled walkthrough visit as completed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Visited</span>
                      </button>
                    )}

                    <Link
                      to="/agent/inquiries"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors min-h-[44px]"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-deep-purple" />
                      <span>Message</span>
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

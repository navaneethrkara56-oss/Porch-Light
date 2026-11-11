import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardBackButton } from '@/components/dashboard/DashboardBackButton';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import {
  getBookings,
  cancelBooking,
  editPendingBookingSchedule,
  requestBookingReschedule,
} from '@/services/bookings';
import { getProperties } from '@/services/properties';
import { useAuth } from '@/features/auth/AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  XCircle,
  X,
  Edit3,
  CalendarClock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

const TIME_SLOTS = [
  '10:00 AM - 11:30 AM',
  '11:30 AM - 01:00 PM',
  '02:00 PM - 03:30 PM',
  '04:00 PM - 05:30 PM',
  '05:30 PM - 07:00 PM',
];

export function UserVisitsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'confirmed' | 'pending' | 'past'
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelModalBooking, setConfirmCancelModalBooking] = useState(null);

  // Pending schedule edit modal state
  const [editScheduleModalBooking, setEditScheduleModalBooking] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTimeSlot, setEditTimeSlot] = useState(TIME_SLOTS[0]);
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Confirmed visit reschedule modal state
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState(TIME_SLOTS[0]);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [savingReschedule, setSavingReschedule] = useState(false);

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
      console.error('Failed to load walkthrough visits:', err);
      setError(err.message || 'Failed to load scheduled visits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);

  const handleCancelVisit = async () => {
    if (!confirmCancelModalBooking) return;
    setCancellingId(confirmCancelModalBooking.id);
    try {
      await cancelBooking(confirmCancelModalBooking.id);
      setConfirmCancelModalBooking(null);
    } catch (err) {
      alert(err.message || 'Failed to cancel visit request');
    } finally {
      setCancellingId(null);
    }
  };

  const openEditScheduleModal = (booking) => {
    setEditScheduleModalBooking(booking);
    setEditDate(booking.date || '');
    setEditTimeSlot(booking.timeSlot || TIME_SLOTS[0]);
    setEditNotes(booking.notes || '');
  };

  const handleSaveScheduleEdit = async (e) => {
    e.preventDefault();
    if (!editScheduleModalBooking) return;
    setSavingEdit(true);
    try {
      await editPendingBookingSchedule({
        bookingId: editScheduleModalBooking.id,
        date: editDate,
        timeSlot: editTimeSlot,
        notes: editNotes,
      });
      setEditScheduleModalBooking(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update schedule');
    } finally {
      setSavingEdit(false);
    }
  };

  const openRescheduleModal = (booking) => {
    setRescheduleModalBooking(booking);
    setRescheduleDate(booking.rescheduleRequest?.proposedDate || booking.date || '');
    setRescheduleTimeSlot(booking.rescheduleRequest?.proposedTimeSlot || booking.timeSlot || TIME_SLOTS[0]);
    setRescheduleReason(booking.rescheduleRequest?.reason || '');
  };

  const handleSaveRescheduleRequest = async (e) => {
    e.preventDefault();
    if (!rescheduleModalBooking) return;
    setSavingReschedule(true);
    try {
      await requestBookingReschedule({
        bookingId: rescheduleModalBooking.id,
        proposedDate: rescheduleDate,
        proposedTimeSlot: rescheduleTimeSlot,
        reason: rescheduleReason,
      });
      setRescheduleModalBooking(null);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to submit reschedule request');
    } finally {
      setSavingReschedule(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'confirmed') return b.status === 'confirmed';
    if (activeFilter === 'pending') return b.status === 'pending';
    if (activeFilter === 'past') return b.status === 'declined' || b.status === 'completed' || b.status === 'cancelled';
    return true;
  });

  return (
    <DashboardLayout role="user">
      <div className="space-y-6">
        {/* Contextual Back Button */}
        <div>
          <DashboardBackButton fallbackTo="/dashboard/overview" label="Back to Overview" />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Sanctuary Walkthroughs
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Visits & Bookings
            </h1>
          </div>

          {/* Filter Pills */}
          <div className="inline-flex p-1 rounded-full bg-sand/60 border border-charcoal/10 self-start sm:self-auto">
            {['all', 'confirmed', 'pending', 'past'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all capitalize cursor-pointer ${
                  activeFilter === filter
                    ? 'bg-deep-purple text-white shadow-xs font-medium'
                    : 'text-charcoal/70 hover:text-charcoal'
                }`}
              >
                {filter === 'past' ? 'Past / Cancelled' : filter}
              </button>
            ))}
          </div>
        </div>

        {error && !loading && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-charcoal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="font-sans text-xs text-amber-900">{error}</span>
            <button
              type="button"
              onClick={loadData}
              className="px-3.5 py-1.5 rounded-full bg-deep-purple text-porcelain hover:bg-deep-purple/90 font-mono text-[11px] uppercase tracking-wider transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : filteredBookings.length === 0 ? (
          <DashboardEmptyState
            title="No visits found."
            description={
              activeFilter === 'all'
                ? "You haven't requested any property walkthroughs yet. Find a residence that moves you and request a private visit."
                : `No visits currently match the "${activeFilter}" filter.`
            }
            actionLabel="Browse Residences"
            actionLink="/buy"
            icon={Calendar}
          />
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const prop = properties.find((p) => p.id === booking.propertyId);
              const title = prop?.title || booking.propertyTitle || 'Residence';
              const location = prop ? `${prop.locality}, ${prop.city}` : 'India';

              const isPending = booking.status === 'pending';
              const isConfirmed = booking.status === 'confirmed';
              const isPast = ['declined', 'completed', 'cancelled'].includes(booking.status);
              const hasPendingReschedule =
                isConfirmed &&
                booking.rescheduleRequest &&
                booking.rescheduleRequest.status === 'pending';
              const hasDeclinedReschedule =
                isConfirmed &&
                booking.rescheduleRequest &&
                booking.rescheduleRequest.status === 'declined';

              const statusBadge =
                booking.status === 'completed' || booking.status === 'visited'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-medium'
                  : isConfirmed
                  ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25 font-medium'
                  : isPending
                  ? 'bg-sand/60 text-charcoal/80 border-charcoal/20'
                  : booking.status === 'cancelled'
                  ? 'bg-sand text-charcoal/60 border-charcoal/20 line-through'
                  : 'bg-charcoal/5 text-charcoal/70 border-charcoal/15';

              return (
                <div
                  key={booking.id}
                  id={`visit-${booking.id}`}
                  className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 hover:border-deep-purple/30 transition-all shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border capitalize ${statusBadge}`}
                      >
                        {booking.status}
                      </span>
                      {booking.scheduleEditedAt && isPending && (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 border border-charcoal/20 text-charcoal/70">
                          Schedule Updated
                        </span>
                      )}
                      <span className="font-mono text-xs text-dark-gray/50">
                        ID: {booking.id}
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl text-charcoal font-medium">{title}</h3>

                    {/* Active Appointment Schedule */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-dark-gray/70">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-deep-purple" />
                        {location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-deep-purple" />
                        {booking.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-deep-purple" />
                        {booking.timeSlot}
                      </span>
                    </div>

                    {booking.notes && (
                      <div className="font-sans text-xs text-dark-gray/70 italic bg-sand/30 px-3 py-1.5 rounded-lg border border-charcoal/5 max-w-xl">
                        "{booking.notes}"
                      </div>
                    )}

                    {/* Pending Reschedule Alert Banner on Confirmed Visit */}
                    {hasPendingReschedule && (
                      <div className="p-3.5 rounded-xl bg-deep-purple/5 border border-deep-purple/20 space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-deep-purple font-semibold">
                          <CalendarClock className="w-4 h-4 text-deep-purple" />
                          <span>Reschedule Pending Agent Approval</span>
                        </div>
                        <p className="font-sans text-xs text-charcoal/80">
                          Proposed new walkthrough:{' '}
                          <strong className="text-charcoal font-semibold">
                            {booking.rescheduleRequest.proposedDate} ({booking.rescheduleRequest.proposedTimeSlot})
                          </strong>
                          . Your confirmed visit on {booking.date} at {booking.timeSlot} remains active until the agent approves.
                        </p>
                      </div>
                    )}

                    {/* Declined Reschedule Notice */}
                    {hasDeclinedReschedule && (
                      <div className="p-3 rounded-xl bg-sand/60 border border-charcoal/20 text-xs font-sans text-charcoal/80 space-y-0.5 max-w-xl">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/70 block font-medium">
                          Reschedule Update
                        </span>
                        <span>
                          The agent could not accommodate your requested reschedule to {booking.rescheduleRequest.proposedDate}. Your active confirmed walkthrough on {booking.date} at {booking.timeSlot} is preserved.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Controls - Compact 2-row layout */}
                  <div className="w-full md:w-[320px] lg:w-[340px] shrink-0 pt-2 md:pt-0">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {/* Pending visit schedule edit */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => openEditScheduleModal(booking)}
                          className="col-span-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer min-h-[44px] text-center"
                          title="Edit requested date or time"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-deep-purple shrink-0" />
                          <span className="truncate">Edit Schedule</span>
                        </button>
                      )}

                      {/* Unaccepted visit cancellation */}
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelModalBooking(booking)}
                          className="col-span-1 inline-flex items-center justify-center gap-1 px-2.5 py-2.5 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal/80 hover:text-charcoal transition-colors cursor-pointer min-h-[44px] text-center"
                          title="Cancel this pending visit request"
                        >
                          <X className="w-3.5 h-3.5 text-charcoal/70 shrink-0" />
                          <span className="truncate">Cancel Request</span>
                        </button>
                      )}

                      {/* Confirmed visit reschedule request */}
                      {isConfirmed && (
                        <button
                          type="button"
                          onClick={() => openRescheduleModal(booking)}
                          className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/20 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer min-h-[44px] text-center"
                          title="Propose a new date and time for this confirmed visit"
                        >
                          <CalendarClock className="w-3.5 h-3.5 text-deep-purple shrink-0" />
                          <span className="truncate">{hasPendingReschedule ? 'Modify Reschedule' : 'Request Reschedule'}</span>
                        </button>
                      )}

                      <Link
                        to="/dashboard/chat"
                        className={`${
                          !isPending && !isConfirmed && !booking.propertyId ? 'col-span-2' : 'col-span-1'
                        } inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors min-h-[44px] text-center`}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-deep-purple shrink-0" />
                        <span className="truncate">Message Agent</span>
                      </Link>

                      {booking.propertyId && (
                        <Link
                          to={`/property/${booking.propertyId}`}
                          className="col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs min-h-[44px] text-center"
                        >
                          <span>Property</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Edit Pending Visit Schedule */}
        {editScheduleModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-porcelain border border-charcoal/10 p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-deep-purple" />
                  <h3 className="font-serif text-xl text-deep-purple font-medium">
                    Edit Visit Schedule
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditScheduleModalBooking(null)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="font-sans text-xs text-charcoal/80">
                Update your preferred date and time for{' '}
                <strong className="text-charcoal">{editScheduleModalBooking.propertyTitle}</strong>. The request will remain pending until the agent confirms.
              </p>

              <form onSubmit={handleSaveScheduleEdit} className="space-y-3.5">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                    Preferred Time Slot
                  </label>
                  <select
                    value={editTimeSlot}
                    onChange={(e) => setEditTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple cursor-pointer"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                    Note for Agent (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Any specific requests or requirements..."
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-hidden focus:border-deep-purple resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                  <button
                    type="button"
                    onClick={() => setEditScheduleModalBooking(null)}
                    disabled={savingEdit}
                    className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shadow-xs disabled:opacity-50 cursor-pointer min-h-[44px]"
                  >
                    {savingEdit ? 'Updating...' : 'Save Schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Request Confirmed Visit Reschedule */}
        {rescheduleModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-porcelain border border-charcoal/10 p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-deep-purple" />
                  <h3 className="font-serif text-xl text-deep-purple font-medium">
                    Request Reschedule
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRescheduleModalBooking(null)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-sand/40 border border-charcoal/15 text-xs font-sans text-charcoal/80 space-y-1">
                <p>
                  Current Confirmed Appointment:{' '}
                  <strong className="text-charcoal font-semibold">
                    {rescheduleModalBooking.date} ({rescheduleModalBooking.timeSlot})
                  </strong>
                </p>
                <p className="text-dark-gray/60 text-[11px]">
                  Your current appointment remains active until the agent reviews and approves this proposed new time.
                </p>
              </div>

              <form onSubmit={handleSaveRescheduleRequest} className="space-y-3.5">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                    Proposed New Date
                  </label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                    Proposed New Time Slot
                  </label>
                  <select
                    value={rescheduleTimeSlot}
                    onChange={(e) => setRescheduleTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple cursor-pointer"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                    Reason for Reschedule (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="e.g. Flight delay, scheduling conflict..."
                    className="w-full px-3 py-2 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-hidden focus:border-deep-purple resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                  <button
                    type="button"
                    onClick={() => setRescheduleModalBooking(null)}
                    disabled={savingReschedule}
                    className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingReschedule}
                    className="px-5 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shadow-xs disabled:opacity-50 cursor-pointer min-h-[44px]"
                  >
                    {savingReschedule ? 'Submitting...' : 'Submit Reschedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Visit Cancellation */}
        {confirmCancelModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-porcelain border border-charcoal/10 p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <h3 className="font-serif text-xl text-deep-purple font-medium">
                  Cancel Visit Request
                </h3>
                <button
                  type="button"
                  onClick={() => setConfirmCancelModalBooking(null)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="font-sans text-xs text-charcoal/80">
                Are you sure you want to cancel your pending walkthrough request for{' '}
                <strong className="text-charcoal">
                  {confirmCancelModalBooking.propertyTitle || 'this residence'}
                </strong>{' '}
                on {confirmCancelModalBooking.date} at {confirmCancelModalBooking.timeSlot}?
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                <button
                  type="button"
                  onClick={() => setConfirmCancelModalBooking(null)}
                  disabled={cancellingId === confirmCancelModalBooking.id}
                  className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal cursor-pointer"
                >
                  Keep Request
                </button>
                <button
                  type="button"
                  onClick={handleCancelVisit}
                  disabled={cancellingId === confirmCancelModalBooking.id}
                  className="px-4 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shadow-xs disabled:opacity-50 cursor-pointer min-h-[44px]"
                >
                  {cancellingId === confirmCancelModalBooking.id ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

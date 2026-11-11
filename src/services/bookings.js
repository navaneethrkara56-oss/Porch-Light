/**
 * Bookings Service for Porch Light Frontend
 * Communicates with Porch_server authoritative booking endpoints.
 */

import api from './apiClient';

function emitBookingChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('porch:bookings-updated'));
    window.dispatchEvent(new CustomEvent('porch:counts-updated'));
  }
}

export async function createBooking({ propertyId, date, timeSlot, notes }) {
  const res = await api.post('/bookings', { propertyId, date, timeSlot, notes });
  emitBookingChange();
  return res.data;
}

export async function getBookings(params = {}) {
  const res = await api.get('/bookings', params);
  return {
    data: res.data || [],
    page: res.page || 1,
    pageSize: res.pageSize || (res.data ? res.data.length : 0),
    total: res.total || (res.data ? res.data.length : 0),
  };
}

export async function updateBookingStatus(bookingId, status) {
  const cleanId = typeof bookingId === 'string' ? bookingId.trim() : String(bookingId || '');
  const res = await api.patch(`/bookings/${encodeURIComponent(cleanId)}/status`, { status });
  emitBookingChange();
  return res.data;
}

export async function cancelBooking(bookingId) {
  const cleanId = typeof bookingId === 'string' ? bookingId.trim() : String(bookingId || '');
  const res = await api.patch(`/bookings/${encodeURIComponent(cleanId)}/cancel`);
  emitBookingChange();
  return res.data;
}

export async function editPendingBookingSchedule({ bookingId, date, timeSlot, notes }) {
  const cleanId = typeof bookingId === 'string' ? bookingId.trim() : String(bookingId || '');
  const res = await api.patch(`/bookings/${encodeURIComponent(cleanId)}/schedule`, {
    date,
    timeSlot,
    notes,
  });
  emitBookingChange();
  return res.data;
}

export async function requestBookingReschedule({ bookingId, proposedDate, proposedTimeSlot, reason }) {
  const cleanId = typeof bookingId === 'string' ? bookingId.trim() : String(bookingId || '');
  const res = await api.post(`/bookings/${encodeURIComponent(cleanId)}/reschedule-request`, {
    proposedDate,
    proposedTimeSlot,
    reason,
  });
  emitBookingChange();
  return res.data;
}

export async function respondBookingReschedule({ bookingId, accept }) {
  const cleanId = typeof bookingId === 'string' ? bookingId.trim() : String(bookingId || '');
  const res = await api.post(`/bookings/${encodeURIComponent(cleanId)}/reschedule-response`, {
    accept,
  });
  emitBookingChange();
  return res.data;
}

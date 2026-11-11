/**
 * Canonical Date & Time Formatting Utilities for Porch Light
 * Standardized in the Asia/Kolkata project timezone (IST).
 * Strictly guarantees "Date unavailable" fallback when no trustworthy date exists.
 * Never uses current time or due dates as fallbacks for payment dates.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Extract canonical epoch timestamp for robust client-side sorting
 */
export function getPaymentDateTimestamp(payment) {
  if (!payment) return 0;
  const raw = payment.paidAt || (payment.status === 'completed' ? payment.createdAt : null) || payment.timestamp;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return isNaN(t) ? 0 : t;
}

/**
 * Format a verified payment timestamp.
 * Strictly uses paidAt for confirmed payments (falling back to createdAt only for completed records).
 * Date-only by default; includeTime adds Indian Standard Time hour:minute.
 */
export function formatPaymentDate(payment, options = {}) {
  const { includeTime = false, fallback = 'Date unavailable' } = options;
  if (!payment) return fallback;

  // If a string or Date was passed directly
  let rawDate = null;
  if (typeof payment === 'string' || payment instanceof Date) {
    rawDate = payment;
  } else if (typeof payment === 'object') {
    if (payment.paidAt) {
      rawDate = payment.paidAt;
    } else if (payment.status === 'completed' && payment.createdAt) {
      rawDate = payment.createdAt;
    } else if (payment.status === 'completed' && payment.timestamp) {
      rawDate = payment.timestamp;
    }
  }

  if (!rawDate) return fallback;

  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return fallback;

  const formatOptions = {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    formatOptions.hour12 = true;
    return d.toLocaleString('en-IN', formatOptions);
  }

  return d.toLocaleDateString('en-IN', formatOptions);
}

/**
 * Format a scheduled obligation due date (dueAt or dueDate).
 * Always date-only in Asia/Kolkata timezone.
 */
export function formatDueDate(dateOrInstallment, options = {}) {
  const { fallback = 'Date unavailable' } = options;
  if (!dateOrInstallment) return fallback;

  let raw = null;
  if (typeof dateOrInstallment === 'string' || dateOrInstallment instanceof Date) {
    raw = dateOrInstallment;
  } else if (typeof dateOrInstallment === 'object') {
    raw = dateOrInstallment.dueAt || dateOrInstallment.dueDate;
  }

  if (!raw) return fallback;

  const d = new Date(raw);
  if (isNaN(d.getTime())) return fallback;

  return d.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a visit or booking scheduled date.
 */
export function formatScheduledDate(dateOrBooking, options = {}) {
  const { includeTime = true, fallback = 'Date unavailable' } = options;
  if (!dateOrBooking) return fallback;

  let raw = null;
  if (typeof dateOrBooking === 'string' || dateOrBooking instanceof Date) {
    raw = dateOrBooking;
  } else if (typeof dateOrBooking === 'object') {
    raw = dateOrBooking.scheduledAt || dateOrBooking.date || dateOrBooking.createdAt;
  }

  if (!raw) return fallback;

  const d = new Date(raw);
  if (isNaN(d.getTime())) return fallback;

  const formatOptions = {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    formatOptions.hour12 = true;
    return d.toLocaleString('en-IN', formatOptions);
  }

  return d.toLocaleDateString('en-IN', formatOptions);
}


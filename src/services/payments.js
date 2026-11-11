/**
 * Payments Service for Porch Light Frontend
 * Communicates with Porch_server authoritative payment endpoints.
 */

import api from './apiClient';

let forcePaymentFailure = false;

export function setForcePaymentFailure(val) {
  forcePaymentFailure = val;
}

export function getForcePaymentFailure() {
  return forcePaymentFailure;
}

/**
 * Create a real Stripe Checkout Session for any payment entry point:
 * - full_purchase
 * - emi_down_payment
 * - emi_installment
 * - rent_deposit
 * - rent_installment
 * - promotion_fee
 */
export async function createCheckoutSession({
  propertyId,
  type = 'full_purchase',
  scheduleId = null,
  installmentNumber = null,
  financingDetails = null,
  leaseDetails = null,
  autopayOptIn = false,
}) {
  if (forcePaymentFailure) {
    throw new Error('Payment was declined by demo bank simulator. (Dev force failure enabled)');
  }

  const res = await api.post('/payments/create-checkout-session', {
    propertyId,
    type,
    scheduleId,
    installmentNumber,
    financingDetails,
    leaseDetails,
    autopayOptIn,
  });

  const payload = res?.data || res || {};
  return {
    ...payload,
    sessionId: payload.sessionId,
    sessionUrl: payload.sessionUrl,
    data: payload,
  };
}

/**
 * Poll or verify the status of a Stripe Checkout Session
 */
export async function getSessionStatus(sessionId) {
  const cleanId = typeof sessionId === 'string' ? sessionId.trim() : String(sessionId || '');
  const res = await api.get(`/payments/session-status/${encodeURIComponent(cleanId)}`);
  const payload = res?.data || res || {};
  return {
    ...payload,
    data: payload,
  };
}

/**
 * Cancel a pending Stripe Checkout Session
 */
export async function cancelCheckoutSession(sessionId) {
  if (!sessionId) return null;
  const cleanId = typeof sessionId === 'string' ? sessionId.trim() : String(sessionId || '');
  const res = await api.post(`/payments/cancel-session/${encodeURIComponent(cleanId)}`);
  return res.data;
}

/**
 * Enable or revoke recurring Autopay on a payment schedule
 */
export async function toggleScheduleAutopay(scheduleId, enabled) {
  const cleanId = typeof scheduleId === 'string' ? scheduleId.trim() : String(scheduleId || '');
  const res = await api.patch(`/payments/schedules/${encodeURIComponent(cleanId)}/autopay`, {
    enabled,
  });
  return res.data;
}

/**
 * Forward processMockPayment to Stripe Checkout session creation
 */
export async function processMockPayment({
  propertyId,
  amount,
  type = 'full_purchase',
  financingDetails = null,
  leaseDetails = null,
  autopayOptIn = false,
}) {
  return createCheckoutSession({
    propertyId,
    type,
    financingDetails,
    leaseDetails,
    autopayOptIn,
  });
}

export async function requestLeaseCancellation({ paymentId, propertyId, reason, requestedDate }) {
  const cleanId = typeof paymentId === 'string' ? paymentId.trim() : String(paymentId || '');
  const res = await api.post(`/payments/leases/${encodeURIComponent(cleanId)}/cancellation-request`, {
    propertyId,
    reason,
    requestedDate,
  });
  return res.data;
}

export async function respondLeaseCancellation({ paymentId, propertyId, agree, decisionReason }) {
  const cleanId = typeof paymentId === 'string' ? paymentId.trim() : String(paymentId || '');
  const res = await api.post(`/payments/leases/${encodeURIComponent(cleanId)}/cancellation-response`, {
    propertyId,
    agree,
    decisionReason,
  });
  return res.data;
}

export async function agentTerminateLease({ paymentId, propertyId, effectiveDate, reason }) {
  const cleanId = typeof paymentId === 'string' ? paymentId.trim() : String(propertyId || '');
  const res = await api.post(`/payments/leases/${encodeURIComponent(cleanId)}/agent-terminate`, {
    propertyId,
    effectiveDate,
    reason,
  });
  return res.data;
}

export async function confirmRentalHandover(propertyId) {
  const cleanId = typeof propertyId === 'string' ? propertyId.trim() : String(propertyId || '');
  const res = await api.post(`/payments/properties/${encodeURIComponent(cleanId)}/confirm-handover`);
  return res.data;
}

export async function getPayments(params = {}) {
  const res = await api.get('/payments', params);
  return {
    data: res.data || [],
    page: res.page || 1,
    pageSize: res.pageSize || (res.data ? res.data.length : 0),
    total: res.total || (res.data ? res.data.length : 0),
  };
}

export async function getPaymentSchedules(params = {}) {
  const res = await api.get('/payments/schedules', params);
  return {
    data: res.data || [],
  };
}

export async function getPaymentScheduleById(id) {
  const cleanId = typeof id === 'string' ? id.trim() : String(id || '');
  const res = await api.get(`/payments/schedules/${encodeURIComponent(cleanId)}`);
  return res.data;
}

export async function payScheduleInstallment({ scheduleId, installmentNumber }) {
  return createCheckoutSession({
    scheduleId,
    installmentNumber,
    type: 'emi_installment',
  });
}

/**
 * Promotions Service for Porch Light Frontend
 * Communicates with Porch_server authoritative promotion endpoints.
 */

import api from './apiClient';

export async function getPromotionConfig() {
  const res = await api.get('/promotions/config');
  return res.data;
}

export async function updatePromotionConfig(newConfig) {
  const res = await api.patch('/promotions/config', newConfig);
  return res.data;
}

export async function syncFeaturedPlacements() {
  try {
    const res = await api.post('/promotions/featured-sync');
    return res.data;
  } catch (err) {
    // Non-blocking sync
    return null;
  }
}

export async function getPromotions() {
  const res = await api.get('/promotions');
  const list = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
  // Support callers expecting either an Array directly or an object with .data
  list.data = list;
  list.total = list.length;
  list.page = 1;
  list.pageSize = list.length;
  return list;
}

export async function requestPremiumStatus({ propertyId }) {
  const res = await api.post('/promotions/premium-badge', { propertyId });
  return res.data;
}

export async function requestFeaturedPlacement({ propertyId }) {
  const res = await api.post('/promotions/featured-placement', { propertyId });
  return res.data;
}

export async function requestListingPromotion({ propertyId }) {
  return requestFeaturedPlacement({ propertyId });
}

export async function updatePromotionStatus(promotionId, { status, adminNotes = '', durationDays = 14 }) {
  const cleanId = typeof promotionId === 'string' ? promotionId.trim() : String(promotionId || '');
  const res = await api.patch(`/promotions/${encodeURIComponent(cleanId)}/status`, {
    status,
    adminNotes,
    durationDays,
  });
  return res.data;
}

export async function updateFeaturedWindow(propertyId, { durationDays, endDate }) {
  const cleanId = typeof propertyId === 'string' ? propertyId.trim() : String(propertyId || '');
  const res = await api.patch(`/promotions/properties/${encodeURIComponent(cleanId)}/featured-window`, {
    durationDays,
    endDate,
  });
  return res.data;
}

export async function removeFeaturedPlacement(propertyId) {
  const cleanId = typeof propertyId === 'string' ? propertyId.trim() : String(propertyId || '');
  const res = await api.post(`/promotions/properties/${encodeURIComponent(cleanId)}/unpin-featured`);
  return res.data;
}

/**
 * Properties Service for Porch Light Frontend
 * Communicates with Porch_server authoritative property endpoints.
 */

import api from './apiClient';

let cachedSavedIds = [];
const savedListeners = new Set();

function notifySavedListeners() {
  savedListeners.forEach((fn) => {
    try {
      fn(cachedSavedIds);
    } catch (e) {
      console.error('Saved listener error:', e);
    }
  });
}

export function isPropertySaved(id) {
  if (!id) return false;
  const cleanId = String(id).trim();
  return cachedSavedIds.includes(cleanId);
}

export function subscribeToSavedProperties(callback) {
  callback(cachedSavedIds);
  savedListeners.add(callback);
  return () => savedListeners.delete(callback);
}

export async function getProperties(params = {}) {
  const res = await api.get('/properties', params);
  return {
    data: res.data || [],
    allMatching: res.allMatching || [],
    page: res.page || 1,
    pageSize: res.pageSize || 12,
    total: res.total || 0,
    totalPages: res.totalPages || 1,
  };
}

export async function getPropertyById(id) {
  const cleanId = typeof id === 'string' ? id.trim() : String(id || '');
  const res = await api.get(`/properties/${encodeURIComponent(cleanId)}`);
  return res.data;
}

export async function getHomeStats() {
  try {
    const res = await api.get('/properties/home-stats');
    return res.data || { totalHomes: 30, availableHomes: 25, totalCities: 10, reraPercent: 100 };
  } catch (err) {
    console.warn('Failed to load live home stats:', err);
    return { totalHomes: 30, availableHomes: 25, totalCities: 10, reraPercent: 100 };
  }
}

export async function getSimilarProperties(propertyId, limit = 3) {
  const res = await api.get(`/properties/${encodeURIComponent(propertyId)}/similar`, { limit });
  return res.data || [];
}

export async function createProperty(propertyData) {
  const res = await api.post('/properties', propertyData);
  return res.data;
}

/**
 * Check whether a listing is eligible for modification by an agent.
 * Allows managing narrative, pricing terms, and photography across all listings,
 * including sold and actively leased residences, with clear status explanations.
 */
export function getPropertyEditEligibility(property, paymentsList = null) {
  if (!property) {
    return { canEdit: false, reason: 'Listing not found.', code: 'NOT_FOUND' };
  }

  const isSold = Boolean(
    property.isSold ||
    property.status === 'sold' ||
    property.availabilityStatus === 'sold'
  );

  const isLeased = Boolean(
    property.isLeased ||
    property.rentalStatus === 'leased' ||
    property.status === 'rented' ||
    property.leaseStatus === 'active'
  );

  const isPendingHandover = Boolean(
    property.rentalStatus === 'pending_handover' ||
    property.leaseStatus === 'pending_cancellation'
  );

  const isArchived = Boolean(
    property.isArchived ||
    property.status === 'archived'
  );

  let statusNote = null;
  if (isSold) {
    statusNote = 'This residence is recorded as Sold. Updates to architectural narrative, photography, or terms will update the listing record and buyer documents, but will not return the residence to public search or permit new purchases.';
  } else if (isLeased) {
    statusNote = 'This residence is currently under an Active Tenant Lease. Content and imagery updates will reflect in tenant records, but will not make the residence publicly available for rent until the lease concludes and handover is confirmed.';
  } else if (isPendingHandover) {
    statusNote = 'This residence is undergoing handover inspection. Content updates will take effect immediately, but the property remains unlisted until handover completion is confirmed.';
  } else if (isArchived) {
    statusNote = 'This residence is currently Archived. Updates are preserved in historical audit records.';
  }

  return {
    canEdit: true,
    isSold,
    isLeased,
    isPendingHandover,
    isArchived,
    statusNote,
    code: isSold ? 'SOLD' : isLeased ? 'LEASED' : isPendingHandover ? 'HANDOVER' : isArchived ? 'ARCHIVED' : 'ACTIVE',
  };
}

export async function updateProperty(id, updateData) {
  const cleanId = typeof id === 'string' ? id.trim() : String(id || '');
  const res = await api.patch(`/properties/${encodeURIComponent(cleanId)}`, updateData);
  return res.data;
}

export async function restoreProperty(id) {
  const cleanId = typeof id === 'string' ? id.trim() : String(id || '');
  const res = await api.patch(`/properties/${encodeURIComponent(cleanId)}/restore`);
  return res.data;
}

export async function markPropertySoldOrRented(id, status, externalSale = null) {
  const cleanId = typeof id === 'string' ? id.trim() : String(id || '');
  const res = await api.patch(`/properties/${encodeURIComponent(cleanId)}/status`, {
    status,
    externalSale,
  });
  return res.data;
}

export async function deleteProperty(id) {
  const cleanId = typeof id === 'string' ? id.trim() : String(id || '');
  await api.delete(`/properties/${encodeURIComponent(cleanId)}`);
  return true;
}

export async function toggleSavedProperty(id) {
  const cleanId = typeof id === 'string' ? id.trim() : String(id || '');
  const res = await api.post(`/auth/saved/${encodeURIComponent(cleanId)}`);
  const isNowSaved = Boolean(res.isSaved ?? res.saved ?? res.data?.isSaved ?? res.data?.saved);
  const updatedIds = res.savedPropertyIds || res.data?.savedPropertyIds;
  if (Array.isArray(updatedIds)) {
    cachedSavedIds = updatedIds.map(String);
  } else if (isNowSaved) {
    if (!cachedSavedIds.includes(cleanId)) cachedSavedIds.push(cleanId);
  } else {
    cachedSavedIds = cachedSavedIds.filter((item) => item !== cleanId);
  }
  notifySavedListeners();
  return isNowSaved;
}

export async function getSavedProperties() {
  try {
    const res = await api.get('/auth/saved');
    const list = Array.isArray(res.data)
      ? res.data
      : (Array.isArray(res.properties) ? res.properties : (res.data?.properties || []));
    const rawIds = Array.isArray(res.savedPropertyIds)
      ? res.savedPropertyIds
      : (Array.isArray(res.data?.savedPropertyIds)
          ? res.data.savedPropertyIds
          : list.map((p) => p.id || p.customId));
    cachedSavedIds = rawIds.map(String);
    notifySavedListeners();
    return {
      data: list,
      page: 1,
      pageSize: list.length,
      total: list.length,
    };
  } catch (err) {
    return {
      data: [],
      page: 1,
      pageSize: 0,
      total: 0,
    };
  }
}

export async function updateFeaturedProperties(featuredList) {
  const res = await api.put('/promotions/featured-curation', { items: featuredList });
  return res.data;
}

/**
 * Ratings Service for Porch Light Frontend
 * Communicates with Porch_server authoritative ratings endpoints.
 */

import api from './apiClient';

const agentAggregateCache = new Map();
const userPropertyStatusCache = new Map();
const transactionRatingCache = new Map();
const ratingListeners = new Set();

function notifyRatingListeners() {
  ratingListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Rating listener error:', e);
    }
  });
}

export function subscribeToRatings(callback) {
  ratingListeners.add(callback);
  return () => ratingListeners.delete(callback);
}

export async function fetchAgentRatingAggregate(agentId) {
  if (!agentId) return null;
  try {
    const res = await api.get(`/ratings/agents/${encodeURIComponent(agentId)}/aggregate`);
    const data = res.data || {};
    const formatted = {
      average: data.averageRating ?? null,
      averageRating: data.averageRating ?? null,
      count: data.totalRatings ?? 0,
      totalRatings: data.totalRatings ?? 0,
      formattedAverage: data.averageRating != null ? Number(data.averageRating).toFixed(1) : null,
      distribution: data.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recentRatings: data.recentRatings || [],
    };
    agentAggregateCache.set(agentId, formatted);
    notifyRatingListeners();
    return formatted;
  } catch (err) {
    return {
      average: null,
      averageRating: null,
      count: 0,
      totalRatings: 0,
      formattedAverage: null,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recentRatings: [],
    };
  }
}

export async function fetchMyAgentRatings() {
  try {
    const res = await api.get('/ratings/my-ratings');
    const data = res.data || {};
    const formatted = {
      average: data.averageRating ?? null,
      averageRating: data.averageRating ?? null,
      count: data.totalRatings ?? 0,
      totalRatings: data.totalRatings ?? 0,
      formattedAverage: data.averageRating != null ? Number(data.averageRating).toFixed(1) : null,
      distribution: data.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recentRatings: data.recentRatings || [],
    };
    return formatted;
  } catch (err) {
    return {
      average: null,
      averageRating: null,
      count: 0,
      totalRatings: 0,
      formattedAverage: null,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recentRatings: [],
    };
  }
}

export function getAgentRatingAggregate(agentId) {
  if (!agentId) {
    return {
      average: null,
      averageRating: null,
      count: 0,
      totalRatings: 0,
      formattedAverage: null,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  if (agentAggregateCache.has(agentId)) {
    return agentAggregateCache.get(agentId);
  }

  // Trigger background fetch and return initial default
  fetchAgentRatingAggregate(agentId);

  return {
    average: null,
    averageRating: null,
    count: 0,
    totalRatings: 0,
    formattedAverage: null,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
}

export async function submitAgentRating({ transactionId, propertyId, rating, userId, agentId }) {
  const starVal = Number(rating);
  if (!Number.isInteger(starVal) || starVal < 1 || starVal > 5) {
    throw new Error('Please select a rating between 1 and 5 stars.');
  }

  const res = await api.post('/ratings', {
    transactionId,
    propertyId,
    rating: starVal,
    userId,
    agentId,
  });

  // Clear cache for property and agent specifically
  if (propertyId) {
    for (const key of userPropertyStatusCache.keys()) {
      if (key.startsWith(propertyId)) {
        userPropertyStatusCache.delete(key);
      }
    }
  }
  if (transactionId) transactionRatingCache.set(transactionId, res.data);
  const resolvedAgentId = agentId || res.data?.agentId;
  if (resolvedAgentId) {
    agentAggregateCache.delete(resolvedAgentId);
    fetchAgentRatingAggregate(resolvedAgentId).catch(() => {});
  }

  notifyRatingListeners();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('porch:rating-submitted', {
        detail: { agentId: resolvedAgentId, transactionId },
      })
    );
  }
  return res.data;
}

export async function checkRatingEligibility({ transactionId, propertyId }) {
  const res = await api.get('/ratings/eligibility', { tx: transactionId, propertyId });
  return res.data;
}

export function getRatingForTransaction(transactionId) {
  if (!transactionId) return null;
  if (transactionRatingCache.has(transactionId)) {
    return transactionRatingCache.get(transactionId);
  }

  // Pre-seed cache to avoid redundant in-flight network loops
  transactionRatingCache.set(transactionId, null);

  api.get(`/ratings/transaction/${encodeURIComponent(transactionId)}`)
    .then((res) => {
      transactionRatingCache.set(transactionId, res.data || null);
      if (res.data) {
        notifyRatingListeners();
      }
    })
    .catch(() => {
      transactionRatingCache.set(transactionId, null);
    });

  return null;
}

export function getUserRatingStatusForProperty({ propertyId, userId }) {
  if (!propertyId || !userId) {
    return { canRate: false, transaction: null, existingRating: null, isRated: false };
  }

  const cacheKey = `${propertyId}_${userId}`;
  if (userPropertyStatusCache.has(cacheKey)) {
    return userPropertyStatusCache.get(cacheKey);
  }

  api.get('/ratings/user-status', { propertyId })
    .then((res) => {
      if (res.data) {
        userPropertyStatusCache.set(cacheKey, res.data);
        notifyRatingListeners();
      }
    })
    .catch(() => {});

  return { canRate: false, transaction: null, existingRating: null, isRated: false };
}

export function markTransactionRatingsIneligible(transactionId) {
  if (transactionId) {
    transactionRatingCache.delete(transactionId);
    notifyRatingListeners();
  }
}

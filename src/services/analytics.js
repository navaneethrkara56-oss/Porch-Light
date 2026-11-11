/**
 * Analytics Service for Porch Light Frontend
 * Records deduplicated view/tour events to Porch_server and computes analytics datasets.
 */

import api from './apiClient';
import {
  computeAgentAnalytics,
  generatePerformanceCSV,
} from '@/features/analytics/agentAnalyticsSelectors';

/**
 * Record a unique property view.
 * Deduplicated once per user per property per day on server.
 */
export async function recordPropertyView({ propertyId, userId, userRole }) {
  if (!propertyId || !userId || userRole !== 'user') {
    return { recorded: false, reason: 'unauthorized_or_excluded_role' };
  }

  try {
    const res = await api.post('/analytics/views', { propertyId, userId });
    return { recorded: Boolean(res.recorded) };
  } catch (err) {
    return { recorded: false, error: err.message };
  }
}

/**
 * Record a 360° virtual tour open event.
 * Deduplicated once per user per property per day on server.
 */
export async function recordTourOpen({ propertyId, userId, userRole }) {
  if (!propertyId || !userId || userRole !== 'user') {
    return { recorded: false, reason: 'unauthorized_or_excluded_role' };
  }

  try {
    const res = await api.post('/analytics/tour-opens', { propertyId, userId });
    return { recorded: Boolean(res.recorded) };
  } catch (err) {
    return { recorded: false, error: err.message };
  }
}

/**
 * Retrieve comprehensive agent analytics from Porch_server authoritative endpoints.
 */
export async function getAgentAnalytics({
  agentId,
  period = '30d',
} = {}) {
  const query = {};
  if (period) query.period = period;
  if (agentId) query.agentId = agentId;
  const res = await api.get('/analytics/agent', query);
  return res.data;
}

/**
 * Export filtered performance rows as CSV string
 */
export function exportPerformanceCSV(performanceRows, period = '30d') {
  return generatePerformanceCSV(performanceRows, period);
}

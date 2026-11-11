/**
 * Inquiries Service for Porch Light Frontend
 * Communicates with Porch_server authoritative inquiry endpoints.
 */

import api from './apiClient';

export async function createInquiry({ propertyId, message, preferredTime, phone }) {
  const res = await api.post('/inquiries', {
    propertyId,
    message,
    preferredTime,
    phone,
  });
  return res.data;
}

export async function getInquiries() {
  const res = await api.get('/inquiries');
  return {
    data: res.data || [],
    page: res.page || 1,
    pageSize: res.pageSize || (res.data ? res.data.length : 0),
    total: res.total || (res.data ? res.data.length : 0),
  };
}

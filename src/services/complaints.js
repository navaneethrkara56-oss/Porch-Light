/**
 * Complaints Service for Porch Light Frontend
 * Communicates with Porch_server authoritative complaints/tickets endpoints.
 */

import api from './apiClient';

export async function submitComplaint({ propertyId, subject, description, category = 'General Inquiry' }) {
  const res = await api.post('/complaints', {
    propertyId,
    subject,
    description,
    category,
  });
  return res.data;
}

export async function getComplaints() {
  const res = await api.get('/complaints');
  return res.data || [];
}

export async function replyToComplaint({ complaintId, message, status }) {
  const cleanId = typeof complaintId === 'string' ? complaintId.trim() : String(complaintId || '');
  const res = await api.post(`/complaints/${encodeURIComponent(cleanId)}/reply`, {
    message,
    status,
  });
  return res.data;
}

export async function updateComplaintStatus(id, status, resolutionNote = '') {
  const cleanId = typeof id === 'string' ? id.trim() : String(id || '');
  const res = await api.patch(`/complaints/${encodeURIComponent(cleanId)}/status`, {
    status,
    resolutionNote,
  });
  return res.data;
}

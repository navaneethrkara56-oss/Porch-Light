/**
 * Admin Service for Porch Light Frontend
 * Communicates with Porch_server authoritative administrative endpoints.
 */

import api from './apiClient';

export async function getAdminStats() {
  const res = await api.get('/dashboard/admin/stats');
  return res.data;
}

function emitAdminChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('porch:properties-updated'));
    window.dispatchEvent(new CustomEvent('porch:counts-updated'));
  }
}

export async function approvePropertyListing(propertyId) {
  const cleanId = typeof propertyId === 'string' ? propertyId.trim() : String(propertyId || '');
  const res = await api.post(`/dashboard/properties/${encodeURIComponent(cleanId)}/approve`);
  emitAdminChange();
  return res.data;
}

export async function rejectPropertyListing(propertyId, reason) {
  if (!reason || !reason.trim()) {
    throw new Error('A specific reason is required when declining a listing submission.');
  }
  const cleanId = typeof propertyId === 'string' ? propertyId.trim() : String(propertyId || '');
  const res = await api.post(`/dashboard/properties/${encodeURIComponent(cleanId)}/reject`, { reason });
  emitAdminChange();
  return res.data;
}

export async function archivePropertyListing(propertyId, reason = 'Administrative archival') {
  const cleanId = typeof propertyId === 'string' ? propertyId.trim() : String(propertyId || '');
  const res = await api.post(`/dashboard/properties/${encodeURIComponent(cleanId)}/archive`, { reason });
  emitAdminChange();
  return res.data;
}

export async function verifyAgent(agentId) {
  const cleanId = typeof agentId === 'string' ? agentId.trim() : String(agentId || '');
  const res = await api.post(`/dashboard/agents/${encodeURIComponent(cleanId)}/verify`);
  emitAdminChange();
  return res.data;
}

export async function rejectAgent(agentId, reason) {
  if (!reason || !reason.trim()) {
    throw new Error('A specific reason is required when declining agent verification.');
  }
  const cleanId = typeof agentId === 'string' ? agentId.trim() : String(agentId || '');
  const res = await api.post(`/dashboard/agents/${encodeURIComponent(cleanId)}/reject`, { reason });
  emitAdminChange();
  return res.data;
}

export async function getUsers() {
  const res = await api.get('/dashboard/users');
  return res.data || [];
}

export async function getSystemReports() {
  const res = await api.get('/operational/reports');
  return res.data || [];
}

export async function acknowledgeSystemReport(reportId) {
  const cleanId = typeof reportId === 'string' ? reportId.trim() : String(reportId || '');
  const res = await api.post(`/operational/reports/${encodeURIComponent(cleanId)}/acknowledge`);
  return res.data;
}

export async function resolveSystemReport(reportId) {
  const cleanId = typeof reportId === 'string' ? reportId.trim() : String(reportId || '');
  const res = await api.patch(`/operational/reports/${encodeURIComponent(cleanId)}/resolve`);
  return res.data;
}

export async function getAnnouncements() {
  const res = await api.get('/operational/announcements');
  return res.data || [];
}

export async function createAnnouncement({ title, content, target = 'all', priority = 'info', expiresAt }) {
  const res = await api.post('/operational/announcements', {
    title,
    content,
    target,
    priority,
    expiresAt,
  });
  return res.data;
}

export async function deleteAnnouncement(id) {
  const cleanId = typeof id === 'string' ? id.trim() : String(id || '');
  await api.delete(`/operational/announcements/${encodeURIComponent(cleanId)}`);
  return true;
}

/**
 * Authentication Service for Porch Light Frontend
 * Communicates with Porch_server authoritative authentication endpoints.
 */

import api from './apiClient';
import { ROLES } from '@/lib/permissions';

let cachedUser = null;
const authListeners = new Set();

function notifyAuth(user) {
  authListeners.forEach((fn) => {
    try {
      fn(user);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
}

export function onAuthStateChanged(fn) {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
}

export async function login({ email, password }) {
  const res = await api.post('/auth/login', { email, password });
  cachedUser = res.data.user;
  if (res.data.token) {
    api.setToken(res.data.token);
  }
  notifyAuth(cachedUser);
  return cachedUser;
}

export async function register(userData) {
  const res = await api.post('/auth/register', userData);
  cachedUser = res.data.user;
  if (res.data.token) {
    api.setToken(res.data.token);
  }
  notifyAuth(cachedUser);
  return cachedUser;
}

export async function getGoogleConfig() {
  try {
    const res = await api.get('/auth/google/config');
    return res.data?.clientId || '';
  } catch (err) {
    return '';
  }
}

export async function loginWithGoogle(payload) {
  if (!payload || (!payload.credential && !payload.accessToken)) {
    throw new Error('Google credential or access token is required.');
  }
  const res = await api.post('/auth/google', payload);
  cachedUser = res.data.user;
  if (res.data.token) {
    api.setToken(res.data.token);
  }
  notifyAuth(cachedUser);
  return cachedUser;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (err) {
    // Session cleanup
  } finally {
    cachedUser = null;
    api.clearToken();
    notifyAuth(null);
  }
  return true;
}

export async function getCurrentUser() {
  if (cachedUser) return cachedUser;
  try {
    const res = await api.get('/auth/me');
    cachedUser = res.data.user;
    if (res.data.token) {
      api.setToken(res.data.token);
    }
    notifyAuth(cachedUser);
    return cachedUser;
  } catch (err) {
    // Only invalidate auth session if server explicitly returned 401 or 404
    if (err.status === 401 || err.status === 404) {
      cachedUser = null;
      api.clearToken();
      notifyAuth(null);
    }
    return null;
  }
}

export async function updatePassword({ currentPassword, newPassword }) {
  const res = await api.patch('/auth/password', { currentPassword, newPassword });
  return res;
}

export async function updateUserProfile(data) {
  const res = await api.patch('/auth/profile', data);
  cachedUser = res.data.user;
  notifyAuth(cachedUser);
  return cachedUser;
}

export async function canDeleteAccount() {
  const res = await api.get('/auth/account-deletion-check');
  return res.data;
}

export async function deleteOrDeactivateAccount() {
  const res = await api.delete('/auth/account');
  cachedUser = null;
  api.clearToken();
  notifyAuth(null);
  return res;
}

export async function getAgentDeletionObligations() {
  const res = await api.get('/auth/agent-deletion-obligations');
  return res.data;
}

export async function requestAgentAccountDeletion({ reason = '' }) {
  const res = await api.post('/auth/agent-deletion-request', { reason });
  return res;
}

export async function getAgentDeletionRequests() {
  const res = await api.get('/auth/agent-deletion-requests');
  return res.data;
}

export async function approveAgentAccountDeletion(requestId, adminNotes) {
  const res = await api.post(`/auth/agent-deletion-requests/${requestId}/approve`, { adminNotes });
  return res;
}

export async function rejectAgentAccountDeletion(requestId, adminNotes) {
  const res = await api.post(`/auth/agent-deletion-requests/${requestId}/reject`, { adminNotes });
  return res;
}

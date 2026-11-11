/**
 * Notifications Service for Porch Light Frontend
 * Communicates with Porch_server authoritative notification endpoints.
 * Emits live real-time badge updates across Header, Navigation, and Dashboards.
 */

import api from './apiClient';

const countListeners = new Set();
let cachedUnreadCount = null;
let inFlightFetch = null;

export function subscribeToNotificationCount(callback) {
  countListeners.add(callback);
  if (cachedUnreadCount !== null) {
    try {
      callback(cachedUnreadCount);
    } catch (e) {
      // ignore
    }
  }
  return () => countListeners.delete(callback);
}

export function notifyNotificationCountListeners(count) {
  const nextCount = typeof count === 'number' ? Math.max(0, count) : 0;
  if (cachedUnreadCount === nextCount) {
    return;
  }
  cachedUnreadCount = nextCount;
  countListeners.forEach((cb) => {
    try {
      cb(cachedUnreadCount);
    } catch (e) {
      // ignore
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('porch:notifications-updated', {
        detail: { unreadCount: cachedUnreadCount },
      })
    );
  }
}

export async function getNotifications() {
  if (inFlightFetch) {
    return inFlightFetch;
  }

  inFlightFetch = (async () => {
    try {
      const res = await api.get('/operational/notifications');
      const items = res.data || [];
      const unread = items.filter((n) => !n.read).length;
      notifyNotificationCountListeners(unread);
      return items;
    } catch (err) {
      return [];
    } finally {
      inFlightFetch = null;
    }
  })();

  return inFlightFetch;
}

export async function markNotificationAsRead(id) {
  const cleanId = typeof id === 'string' ? id.trim() : String(id || '');
  const res = await api.patch(`/operational/notifications/${encodeURIComponent(cleanId)}/read`);
  if (cachedUnreadCount !== null && cachedUnreadCount > 0) {
    notifyNotificationCountListeners(cachedUnreadCount - 1);
  } else {
    getNotifications().catch(() => {});
  }
  return res.data;
}

export async function markAllNotificationsAsRead() {
  const res = await api.patch('/operational/notifications/read-all');
  notifyNotificationCountListeners(0);
  return res.data;
}

export async function deleteNotification(id) {
  const cleanId = typeof id === 'string' ? id.trim() : String(id || '');
  await api.delete(`/operational/notifications/${encodeURIComponent(cleanId)}`);
  getNotifications().catch(() => {});
  return true;
}

export async function deleteAllNotifications() {
  await api.delete('/operational/notifications');
  notifyNotificationCountListeners(0);
  return true;
}

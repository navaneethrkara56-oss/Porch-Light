import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { DashboardBackButton } from '@/components/dashboard/DashboardBackButton';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '@/services/notifications';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Calendar,
  MessageSquare,
  Receipt,
  Shield,
  Trash2,
  Search,
  AlertTriangle,
  X,
} from 'lucide-react';

export function UserNotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'visit' | 'chat' | 'payment'
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  const loadNotifs = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadNotifs();

    const handleUpdate = () => {
      if (mounted) loadNotifs();
    };

    window.addEventListener('porch:notifications-updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('porch:notifications-updated', handleUpdate);
    };
  }, []);

  const handleMarkRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationAsRead(id);
    } catch (err) {
      console.warn('Failed to mark read on server:', err);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsAsRead();
    } catch (err) {
      console.warn('Failed to mark all read on server:', err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (err) {
      console.warn('Failed to delete notification on server:', err);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setNotifications([]);
    setShowDeleteAllModal(false);
    try {
      await deleteAllNotifications();
    } catch (err) {
      console.warn('Failed to delete all notifications on server:', err);
    }
  };

  const handleOpenNotification = async (n) => {
    if (!n.read) {
      handleMarkRead(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifs = notifications.filter((n) => {
    if (activeFilter === 'unread' && n.read) return false;
    if (activeFilter === 'visit' && n.type !== 'visit' && n.type !== 'booking') return false;
    if (activeFilter === 'chat' && n.type !== 'chat') return false;
    if (activeFilter === 'payment' && n.type !== 'payment') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg) return false;
    }

    return true;
  });

  return (
    <DashboardLayout role="user">
      <div className="space-y-6">
        {/* Contextual Back Navigation */}
        <div className="flex items-center justify-between">
          <DashboardBackButton fallback="/dashboard/overview" label="Back to Overview" />
          {unreadCount > 0 && (
            <span className="font-mono text-xs uppercase tracking-wider text-deep-purple font-medium bg-deep-purple/10 px-3 py-1 rounded-full border border-deep-purple/20">
              {unreadCount} Unread
            </span>
          )}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Personal Feed
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Notifications
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer shadow-2xs min-h-[38px]"
              >
                <CheckCheck className="w-4 h-4 text-deep-purple" />
                <span>Mark all as read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-2xs min-h-[38px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete all</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex flex-wrap p-1 rounded-2xl bg-sand/60 border border-charcoal/10 gap-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread' },
              { id: 'visit', label: 'Visits' },
              { id: 'chat', label: 'Messages' },
              { id: 'payment', label: 'Payments' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-deep-purple text-white shadow-xs font-medium'
                    : 'text-charcoal/70 hover:text-charcoal'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-dark-gray/40 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-sand/35 border border-charcoal/15 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-dark-gray/40 hover:text-charcoal cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : filteredNotifs.length === 0 ? (
          <DashboardEmptyState
            title={
              activeFilter === 'all'
                ? "You're all caught up."
                : `No notifications match "${activeFilter}".`
            }
            description="Visit updates, message alerts, and verified acquisition receipts will appear in this feed."
            actionLabel="View Dashboard Overview"
            actionLink="/dashboard/overview"
            icon={Bell}
          />
        ) : (
          <div className="divide-y divide-charcoal/10 bg-sand/35 rounded-2xl border border-charcoal/15 shadow-xs overflow-hidden">
            {filteredNotifs.map((n) => {
              const Icon =
                n.type === 'visit'
                  ? Calendar
                  : n.type === 'chat'
                  ? MessageSquare
                  : n.type === 'payment'
                  ? Receipt
                  : Shield;

              return (
                <div
                  key={n.id}
                  onClick={() => handleOpenNotification(n)}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors cursor-pointer group ${
                    n.read ? 'bg-transparent opacity-85 hover:bg-sand/30' : 'bg-sand/60 hover:bg-sand/80'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        n.read ? 'bg-sand/70 text-dark-gray/60' : 'bg-deep-purple text-white shadow-xs'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-sm font-semibold text-charcoal">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span
                            className="w-2 h-2 rounded-full bg-deep-purple shrink-0"
                            title="Unread notification"
                          />
                        )}
                      </div>
                      <p className="font-sans text-xs text-dark-gray/75 leading-relaxed max-w-2xl">
                        {n.message}
                      </p>
                      <div className="font-mono text-[10px] text-dark-gray/50 pt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {n.link && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/10 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors">
                        <span>View</span>
                        <ExternalLink className="w-3 h-3 text-deep-purple" />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, n.id)}
                      className="p-1.5 rounded-lg text-dark-gray/40 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete All Confirmation Modal */}
        {showDeleteAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
            <div className="w-full max-w-md p-6 rounded-2xl bg-porcelain border border-charcoal/20 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="font-serif text-xl font-medium text-charcoal">
                  Delete All Notifications?
                </h3>
              </div>
              <p className="font-sans text-xs text-dark-gray/80 leading-relaxed">
                This will permanently remove all notifications for your account. Notifications belonging to other roles or platform members will not be affected.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteAllModal(false)}
                  className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand font-mono text-xs uppercase tracking-wider text-charcoal border border-charcoal/15 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAll}
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-mono text-xs uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  Confirm Delete All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default UserNotificationsPage;

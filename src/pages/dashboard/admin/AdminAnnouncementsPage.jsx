import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '@/services/admin';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '@/services/notifications';
import {
  Megaphone,
  PlusCircle,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle2,
  Bell,
  CheckCheck,
  Search,
  ExternalLink,
  Shield,
  Calendar,
  AlertTriangle,
  X,
} from 'lucide-react';

export function AdminAnnouncementsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('broadcasts'); // 'broadcasts' | 'notifications'
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [target, setTarget] = useState('all'); // 'all' | 'users' | 'agents'
  const [priority, setPriority] = useState('info'); // 'info' | 'important' | 'urgent'
  const [submitting, setSubmitting] = useState(false);

  // Notification state
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread' | 'approval' | 'support'
  const [notifSearch, setNotifSearch] = useState('');
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  const loadData = async () => {
    try {
      const [annData, notifData] = await Promise.all([
        getAnnouncements(),
        getNotifications(),
      ]);
      setAnnouncements(annData || []);
      setNotifications(notifData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    loadData();

    const handleUpdate = () => {
      if (mounted) loadData();
    };

    window.addEventListener('porch:notifications-updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('porch:notifications-updated', handleUpdate);
    };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSubmitting(true);
    try {
      await createAnnouncement({ title, content, target, priority });
      setTitle('');
      setContent('');
      setShowForm(false);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to dispatch announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (window.confirm('Delete this platform broadcast?')) {
      await deleteAnnouncement(id);
      await loadData();
    }
  };

  const handleMarkNotifRead = async (id) => {
    await markNotificationAsRead(id);
    await loadData();
  };

  const handleMarkAllNotifsRead = async () => {
    await markAllNotificationsAsRead();
    await loadData();
  };

  const handleDeleteNotif = async (e, id) => {
    e.stopPropagation();
    await deleteNotification(id);
    await loadData();
  };

  const handleConfirmDeleteAllNotifs = async () => {
    await deleteAllNotifications();
    setShowDeleteAllModal(false);
    await loadData();
  };

  const handleOpenNotification = async (n) => {
    if (!n.read) {
      await markNotificationAsRead(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifs = notifications.filter((n) => {
    if (notifFilter === 'unread' && n.read) return false;
    if (notifFilter === 'approval' && n.type !== 'approval') return false;
    if (notifFilter === 'support' && n.type !== 'support') return false;

    if (notifSearch.trim()) {
      const q = notifSearch.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg) return false;
    }

    return true;
  });

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header & Main Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Platform Communications
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Broadcasts & Alerts
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Switcher */}
            <div className="inline-flex p-1 rounded-full bg-sand/60 border border-charcoal/10">
              <button
                type="button"
                onClick={() => setActiveTab('broadcasts')}
                className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'broadcasts'
                    ? 'bg-deep-purple text-white shadow-xs font-medium'
                    : 'text-charcoal/70 hover:text-charcoal'
                }`}
              >
                Broadcast Notices ({announcements.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'notifications'
                    ? 'bg-deep-purple text-white shadow-xs font-medium'
                    : 'text-charcoal/70 hover:text-charcoal'
                }`}
              >
                <span>Admin Alerts</span>
                {unreadCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === 'notifications'
                        ? 'bg-porcelain text-deep-purple font-bold'
                        : 'bg-deep-purple text-white'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'broadcasts' ? (
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer min-h-[38px]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{showForm ? 'Cancel' : 'New Broadcast'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllNotifsRead}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal transition-colors cursor-pointer shadow-2xs min-h-[38px]"
                  >
                    <CheckCheck className="w-4 h-4 text-deep-purple" />
                    <span>Mark all read</span>
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
            )}
          </div>
        </div>

        {/* TAB 1: BROADCAST NOTICES */}
        {activeTab === 'broadcasts' && (
          <div className="space-y-6">
            {/* Compose Form */}
            {showForm && (
              <form
                onSubmit={handleCreate}
                className="p-6 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs space-y-4"
              >
                <h3 className="font-serif text-xl text-deep-purple font-medium">
                  Create Platform Announcement
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                      Target Audience
                    </label>
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 cursor-pointer min-h-[44px]"
                    >
                      <option value="all">All Members & Agents</option>
                      <option value="agents">Verified Agents Only</option>
                      <option value="users">Regular Users Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 cursor-pointer min-h-[44px]"
                    >
                      <option value="info">Informational</option>
                      <option value="important">Important Policy</option>
                      <option value="urgent">Urgent Operational</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                    Announcement Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Scheduled Maintenance or Policy Update"
                    className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                    Broadcast Message Body
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Full announcement details dispatched to platform headers..."
                    className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand font-mono text-xs uppercase tracking-wider text-charcoal border border-charcoal/15 cursor-pointer min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-6 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer min-h-[44px]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Broadcasting...' : 'Publish Notice'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Announcements List */}
            {loading ? (
              <DashboardSkeleton type="cards" />
            ) : announcements.length === 0 ? (
              <DashboardEmptyState
                title="No active broadcasts."
                description="Broadcasts sent here appear across relevant user and agent headers."
                icon={Megaphone}
              />
            ) : (
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-3 hover:border-deep-purple/30 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 text-charcoal border border-charcoal/10">
                          Target: {ann.target}
                        </span>
                        <span
                          className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            ann.priority === 'urgent'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : ann.priority === 'important'
                              ? 'bg-sand/60 text-charcoal/80 border-charcoal/20'
                              : 'bg-deep-purple/10 text-deep-purple border-deep-purple/25 font-medium'
                          }`}
                        >
                          Priority: {ann.priority}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-dark-gray/50">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl text-charcoal font-medium">{ann.title}</h3>
                    <p className="font-sans text-sm text-dark-gray/80 leading-relaxed max-w-3xl">
                      {ann.content}
                    </p>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="p-2 text-dark-gray/50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete broadcast"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADMIN SYSTEM NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="inline-flex flex-wrap p-1 rounded-2xl bg-sand/60 border border-charcoal/10 gap-1">
                {[
                  { id: 'all', label: 'All Alerts' },
                  { id: 'unread', label: unreadCount > 0 ? `Unread (${unreadCount})` : 'Unread' },
                  { id: 'approval', label: 'Review' },
                  { id: 'support', label: 'Support' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setNotifFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      notifFilter === tab.id
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
                  value={notifSearch}
                  onChange={(e) => setNotifSearch(e.target.value)}
                  placeholder="Search admin alerts..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-sand/35 border border-charcoal/15 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                />
                {notifSearch && (
                  <button
                    type="button"
                    onClick={() => setNotifSearch('')}
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
                  notifFilter === 'all'
                    ? 'All admin alerts cleared.'
                    : `No alerts match "${notifFilter}".`
                }
                description="New listing reviews, agent verification submissions, and escalated issues will appear here."
                icon={Bell}
              />
            ) : (
              <div className="divide-y divide-charcoal/10 bg-sand/35 rounded-2xl border border-charcoal/15 shadow-xs overflow-hidden">
                {filteredNotifs.map((n) => (
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
                        <Bell className="w-4 h-4" />
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
                          <span>Review</span>
                          <ExternalLink className="w-3 h-3 text-deep-purple" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNotif(e, n.id)}
                        className="p-1.5 rounded-lg text-dark-gray/40 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete alert"
                        aria-label="Delete alert"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete All Confirmation Modal */}
        {showDeleteAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
            <div className="w-full max-w-md p-6 rounded-2xl bg-porcelain border border-charcoal/20 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="font-serif text-xl font-medium text-charcoal">
                  Delete All Admin Alerts?
                </h3>
              </div>
              <p className="font-sans text-xs text-dark-gray/80 leading-relaxed">
                This will permanently delete all notifications for your administrator inbox. Platform broadcast notices and notifications belonging to other accounts will not be affected.
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
                  onClick={handleConfirmDeleteAllNotifs}
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

export default AdminAnnouncementsPage;

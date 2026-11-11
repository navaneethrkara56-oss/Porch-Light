import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import {
  getSystemReports,
  resolveSystemReport,
  acknowledgeSystemReport,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '@/services/admin';
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  Bug,
  Radio,
  Clock,
  Eye,
  Trash2,
  PlusCircle,
  AlertCircle,
  FileCode2,
  Server,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('diagnostics'); // 'diagnostics' | 'maintenance'
  const [statusFilter, setStatusFilter] = useState('unresolved'); // 'unresolved' | 'acknowledged' | 'resolved' | 'all'

  // New Maintenance Notice form state
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeTarget, setNoticeTarget] = useState('all');
  const [noticePriority, setNoticePriority] = useState('warning');
  const [noticeExpiryDays, setNoticeExpiryDays] = useState(3);
  const [publishing, setPublishing] = useState(false);

  const loadData = async () => {
    try {
      const [reps, anns] = await Promise.all([getSystemReports(), getAnnouncements()]);
      setReports(reps);
      setAnnouncements(anns);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeSystemReport(id);
      toast.success('Diagnostic exception acknowledged.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to acknowledge report');
    }
  };

  const handleResolve = async (id) => {
    try {
      await resolveSystemReport(id);
      toast.success('Diagnostic exception marked as resolved.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to resolve report');
    }
  };

  const handlePublishNotice = async (e) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      toast.error('Title and message content are required.');
      return;
    }

    setPublishing(true);
    try {
      const expiresAt = new Date(Date.now() + Number(noticeExpiryDays) * 86400000).toISOString();
      await createAnnouncement({
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
        target: noticeTarget,
        priority: noticePriority,
        expiresAt,
      });
      toast.success('Maintenance broadcast published to dashboards.');
      setShowNoticeForm(false);
      setNoticeTitle('');
      setNoticeContent('');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to publish broadcast');
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteNotice = async (id) => {
    try {
      await deleteAnnouncement(id);
      toast.success('Broadcast notice expired and removed.');
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete notice');
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter === 'unresolved') return !r.resolved && !r.acknowledged;
    if (statusFilter === 'acknowledged') return !r.resolved && r.acknowledged;
    if (statusFilter === 'resolved') return Boolean(r.resolved);
    return true;
  });

  const unresolvedCount = reports.filter((r) => !r.resolved && !r.acknowledged).length;
  const acknowledgedCount = reports.filter((r) => !r.resolved && r.acknowledged).length;
  const resolvedCount = reports.filter((r) => r.resolved).length;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Quality & System Diagnostics
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Reports & System Issues
            </h1>
          </div>

          {/* Tab Selector */}
          <div className="inline-flex p-1 rounded-full bg-sand/60 border border-charcoal/10">
            <button
              type="button"
              onClick={() => setActiveTab('diagnostics')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'diagnostics'
                  ? 'bg-deep-purple text-white shadow-xs font-medium'
                  : 'text-charcoal/70 hover:text-charcoal'
              }`}
            >
              Diagnostic Exceptions ({unresolvedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('maintenance')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'maintenance'
                  ? 'bg-deep-purple text-white shadow-xs font-medium'
                  : 'text-charcoal/70 hover:text-charcoal'
              }`}
            >
              Maintenance Notices ({announcements.length})
            </button>
          </div>
        </div>

        {/* Boundary Notice */}
        <div className="p-4 rounded-xl bg-sand/30 border border-charcoal/10 text-xs font-sans text-dark-gray/80 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
          <p>
            <strong>Recorded Diagnostics Scope:</strong> This console is strictly reserved for client-side component exceptions captured by the application's ErrorBoundary and operational maintenance broadcasts. User complaints, concierge inquiries, and agent support tickets are segregated under <a href="/admin/complaints" className="text-deep-purple underline font-medium">Support Requests</a>.
          </p>
        </div>

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : activeTab === 'diagnostics' ? (
          /* TAB 1: Diagnostic Exceptions */
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-sand/20 border border-charcoal/10">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-dark-gray/60 mr-1">Filter:</span>
                {[
                  { id: 'unresolved', label: `Unresolved (${unresolvedCount})` },
                  { id: 'acknowledged', label: `Acknowledged (${acknowledgedCount})` },
                  { id: 'resolved', label: `Resolved (${resolvedCount})` },
                  { id: 'all', label: `All Reports (${reports.length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      statusFilter === f.id
                        ? 'bg-deep-purple text-white shadow-xs font-medium'
                        : 'bg-sand/60 hover:bg-sand text-charcoal/70'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <span className="font-mono text-xs text-dark-gray/50">
                React ErrorBoundary Diagnostic Capture
              </span>
            </div>

            {filteredReports.length === 0 ? (
              <DashboardEmptyState
                title="No diagnostic reports found"
                description={`No exceptions currently match the "${statusFilter}" status filter.`}
                icon={CheckCircle2}
              />
            ) : (
              <div className="space-y-3">
                {filteredReports.map((rep) => {
                  const isResolved = Boolean(rep.resolved);
                  const isAck = Boolean(rep.acknowledged);

                  return (
                    <div
                      key={rep.id}
                      className="p-5 rounded-2xl bg-porcelain border border-charcoal/15 shadow-xs space-y-3 hover:border-deep-purple/30 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              isResolved
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-medium'
                                : isAck
                                ? 'bg-blue-50 text-blue-900 border-blue-200 font-medium'
                                : 'bg-rose-50 text-rose-900 border-rose-200 font-medium'
                            }`}
                          >
                            {isResolved ? 'Resolved' : isAck ? 'Acknowledged' : 'Needs Review'}
                          </span>

                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 text-dark-gray/70 border border-charcoal/15 flex items-center gap-1">
                            <FileCode2 className="w-2.5 h-2.5" />
                            <span>{rep.source || 'Client Component'}</span>
                          </span>

                          <span className="font-mono text-xs text-dark-gray/40">ID: {rep.id}</span>
                        </div>

                        <span className="font-mono text-xs text-dark-gray/60">
                          {new Date(rep.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-mono text-sm font-semibold text-charcoal">
                          {rep.message || rep.reason || 'Unhandled Exception'}
                        </h3>
                        {rep.stack && (
                          <pre className="p-3 rounded-xl bg-sand/30 border border-charcoal/10 font-mono text-xs text-dark-gray/80 overflow-x-auto whitespace-pre-wrap">
                            {rep.stack}
                          </pre>
                        )}
                      </div>

                      {/* Action buttons */}
                      {!isResolved && (
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-charcoal/10">
                          {!isAck && (
                            <button
                              type="button"
                              onClick={() => handleAcknowledge(rep.id)}
                              className="px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand text-charcoal border border-charcoal/15 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Acknowledge
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleResolve(rep.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Production Monitoring Documentation Note */}
            <div className="p-5 rounded-2xl bg-sand/20 border border-charcoal/10 space-y-2 mt-6">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-charcoal font-semibold">
                <Server className="w-4 h-4 text-deep-purple" />
                <span>Future Backend Telemetry & Observability Integration</span>
              </div>
              <p className="font-sans text-xs text-dark-gray/80 leading-relaxed">
                In this preview deployment, diagnostic records are held in the client memory mock store and captured by the React ErrorBoundary. For production deployment, this interface directly hooks into an application telemetry collector (such as Sentry, Datadog APM, or an OpenTelemetry exporter). Telemetry records adhere to privacy boundaries and capture no sensitive auth credentials.
              </p>
            </div>
          </div>
        ) : (
          /* TAB 2: Maintenance Notices & Platform Broadcasts */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="font-serif text-xl text-deep-purple font-medium">
                  Platform Operational Broadcasts
                </h3>
                <p className="font-mono text-xs text-dark-gray/60">
                  Broadcast scheduled maintenance windows or system updates across user and agent dashboards.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNoticeForm(!showNoticeForm)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{showNoticeForm ? 'Close Form' : 'Publish New Broadcast'}</span>
              </button>
            </div>

            {/* Broadcast Publisher Form */}
            {showNoticeForm && (
              <form
                onSubmit={handlePublishNotice}
                className="p-5 rounded-2xl bg-porcelain border border-charcoal/15 space-y-4 shadow-md"
              >
                <div className="flex items-center justify-between pb-2 border-b border-charcoal/10 font-serif text-lg text-charcoal font-medium">
                  <span>Create Maintenance Notice</span>
                  <span className="font-mono text-xs text-dark-gray/50">Multi-Dashboard Sync</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal mb-1">
                      Notice Headline
                    </label>
                    <input
                      type="text"
                      required
                      value={noticeTitle}
                      onChange={(e) => setNoticeTitle(e.target.value)}
                      placeholder="e.g. Scheduled Infrastructure Maintenance Window"
                      className="w-full px-3 py-2 rounded-xl bg-sand/35 border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal mb-1">
                      Target Audience
                    </label>
                    <select
                      value={noticeTarget}
                      onChange={(e) => setNoticeTarget(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-sand/35 border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                    >
                      <option value="all">All Dashboards (Users & Agents)</option>
                      <option value="user">Users Only (Buyers & Tenants)</option>
                      <option value="agent">Agents Only (Partners)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal mb-1">
                      Priority Level
                    </label>
                    <select
                      value={noticePriority}
                      onChange={(e) => setNoticePriority(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-sand/35 border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                    >
                      <option value="info">Informational (Blue)</option>
                      <option value="warning">Maintenance Notice (Amber)</option>
                      <option value="critical">Critical Outage (Rose)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal mb-1">
                      Auto-Expire Window
                    </label>
                    <select
                      value={noticeExpiryDays}
                      onChange={(e) => setNoticeExpiryDays(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-sand/35 border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple cursor-pointer"
                    >
                      <option value={1}>1 Day</option>
                      <option value={3}>3 Days</option>
                      <option value={7}>7 Days</option>
                      <option value={14}>14 Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal mb-1">
                    Announcement Body
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={noticeContent}
                    onChange={(e) => setNoticeContent(e.target.value)}
                    placeholder="Provide details of the maintenance window, expected downtime, or operational guidance..."
                    className="w-full p-3 rounded-xl bg-sand/35 border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-none focus:border-deep-purple resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNoticeForm(false)}
                    className="px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider text-charcoal/70 hover:text-charcoal cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing}
                    className="px-5 py-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {publishing ? 'Broadcasting...' : 'Publish Broadcast'}
                  </button>
                </div>
              </form>
            )}

            {/* List of active announcements */}
            {announcements.length === 0 ? (
              <DashboardEmptyState
                title="No active maintenance broadcasts"
                description="Published maintenance notices and system announcements will be displayed here and broadcast to dashboards."
                icon={Radio}
              />
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-5 rounded-2xl bg-porcelain border border-charcoal/15 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            ann.priority === 'critical'
                              ? 'bg-rose-50 text-rose-900 border-rose-200'
                              : ann.priority === 'warning'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-blue-50 text-blue-900 border-blue-200'
                          }`}
                        >
                          {ann.priority}
                        </span>

                        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 text-dark-gray/70">
                          Target: {ann.target}
                        </span>

                        <span className="font-mono text-xs text-dark-gray/40">ID: {ann.id}</span>
                      </div>

                      <h4 className="font-serif text-lg text-charcoal font-medium">
                        {ann.title}
                      </h4>

                      <p className="font-sans text-xs text-dark-gray/80 leading-relaxed max-w-3xl">
                        {ann.content}
                      </p>

                      <div className="font-mono text-[11px] text-dark-gray/50 flex items-center gap-3 pt-1">
                        <span>Published: {new Date(ann.createdAt).toLocaleDateString()}</span>
                        {ann.expiresAt && (
                          <span>• Expires: {new Date(ann.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteNotice(ann.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer shrink-0 self-end md:self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Expire Notice</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
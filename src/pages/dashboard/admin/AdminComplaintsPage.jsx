import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { getComplaints, replyToComplaint, updateComplaintStatus } from '@/services/complaints';
import {
  LifeBuoy,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertCircle,
  Building2,
  User,
  Briefcase,
  Send,
  RotateCcw,
  Tag,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'in_progress' | 'resolved'
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'user' | 'agent'
  const [searchQuery, setSearchQuery] = useState('');

  // Expanded thread IDs
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Reply state per ticket: { [complaintId]: text }
  const [replyDrafts, setReplyDrafts] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState(null);

  const loadData = async () => {
    try {
      const data = await getComplaints();
      setComplaints(data);
      // Auto-expand open tickets initially
      if (expandedIds.size === 0) {
        const initialOpenIds = new Set(data.filter((c) => c.status !== 'resolved').map((c) => c.id));
        setExpandedIds(initialOpenIds);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendReply = async (complaintId, nextStatus = null) => {
    const text = replyDrafts[complaintId]?.trim();
    if (!text) {
      toast.error('Please enter a response message.');
      return;
    }

    setSubmittingReplyId(complaintId);
    try {
      await replyToComplaint({
        complaintId,
        message: text,
        status: nextStatus,
      });
      toast.success(nextStatus === 'resolved' ? 'Reply sent & ticket resolved.' : 'Reply sent to submitter.');
      setReplyDrafts((prev) => ({ ...prev, [complaintId]: '' }));
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to send response');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      await updateComplaintStatus(complaintId, newStatus);
      toast.success(`Ticket marked as ${newStatus.replace('_', ' ')}.`);
      await loadData();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const filtered = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (roleFilter !== 'all' && (c.userRole || 'user') !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubject = c.subject?.toLowerCase().includes(q);
      const matchName = c.userName?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      const matchCategory = c.category?.toLowerCase().includes(q);
      if (!matchSubject && !matchName && !matchDesc && !matchCategory) return false;
    }
    return true;
  });

  const openCount = complaints.filter((c) => c.status === 'open').length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Concierge & Resolution Center
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Support Requests & Tickets
            </h1>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
              {openCount} Open
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
              {inProgressCount} In Progress
            </span>
            <span className="px-3 py-1 rounded-full bg-sand/60 text-charcoal/70 border border-charcoal/15">
              {resolvedCount} Resolved
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 rounded-2xl bg-sand/20 border border-charcoal/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-dark-gray/60 mr-1">Status:</span>
            {['all', 'open', 'in_progress', 'resolved'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-deep-purple text-white shadow-xs font-medium'
                    : 'bg-sand/60 hover:bg-sand text-charcoal/70'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}

            <div className="h-4 w-px bg-charcoal/20 mx-1 hidden sm:block" />

            <span className="font-mono text-xs text-dark-gray/60 mr-1">Role:</span>
            {['all', 'user', 'agent'].map((rf) => (
              <button
                key={rf}
                type="button"
                onClick={() => setRoleFilter(rf)}
                className={`px-3 py-1 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  roleFilter === rf
                    ? 'bg-deep-purple text-white shadow-xs font-medium'
                    : 'bg-sand/60 hover:bg-sand text-charcoal/70'
                }`}
              >
                {rf === 'all' ? 'All Roles' : rf === 'agent' ? 'Agents' : 'Users'}
              </button>
            ))}
          </div>

          <div className="w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets, names, topics..."
              className="w-full px-3 py-1.5 rounded-xl bg-porcelain border border-charcoal/20 font-sans text-xs text-charcoal placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple"
            />
          </div>
        </div>

        {/* Boundary Notice */}
        <div className="p-3.5 rounded-xl bg-sand/30 border border-charcoal/10 text-xs font-sans text-dark-gray/80 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-deep-purple shrink-0 mt-0.5" />
          <p>
            <strong>Support Scope:</strong> This queue handles direct member inquiries and partner assistance from verified Users and Agents. Application runtime errors and component exceptions are strictly managed separately under <Link to="/admin/reports" className="text-deep-purple underline font-medium">Reports & System Issues</Link>.
          </p>
        </div>

        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : filtered.length === 0 ? (
          <DashboardEmptyState
            title="No support tickets found"
            description="No tickets currently match the selected filters or search parameters."
            icon={LifeBuoy}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((ticket) => {
              const isResolved = ticket.status === 'resolved';
              const isExpanded = expandedIds.has(ticket.id);
              const isAgent = (ticket.userRole || '').toLowerCase() === 'agent';
              const messages = ticket.messages || [
                {
                  id: 'initial',
                  senderName: ticket.userName,
                  senderRole: ticket.userRole || 'user',
                  message: ticket.description,
                  timestamp: ticket.createdAt,
                },
              ];

              return (
                <div
                  key={ticket.id}
                  id={`ticket-${ticket.id}`}
                  className="rounded-2xl bg-porcelain border border-charcoal/15 shadow-xs overflow-hidden transition-all hover:border-deep-purple/30"
                >
                  {/* Ticket Summary Header Bar */}
                  <div
                    onClick={() => toggleExpand(ticket.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer bg-sand/15 hover:bg-sand/30 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <span
                          className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            ticket.status === 'resolved'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-medium'
                              : ticket.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-900 border-blue-200 font-medium'
                              : 'bg-amber-50 text-amber-900 border-amber-200 font-medium'
                          }`}
                        >
                          {ticket.status.replace('_', ' ')}
                        </span>

                        {/* Submitter Role Badge */}
                        <span
                          className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            isAgent
                              ? 'bg-purple-50 text-purple-900 border-purple-200'
                              : 'bg-sand/60 text-charcoal/80 border-charcoal/20'
                          }`}
                        >
                          {isAgent ? <Briefcase className="w-3 h-3 text-purple-700" /> : <User className="w-3 h-3 text-charcoal/60" />}
                          <span>{isAgent ? 'Partner Agent' : 'Member User'}</span>
                        </span>

                        {/* Category */}
                        {ticket.category && (
                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 text-dark-gray/70 border border-charcoal/15 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" />
                            <span>{ticket.category}</span>
                          </span>
                        )}

                        <span className="font-mono text-xs text-dark-gray/40">ID: {ticket.id}</span>
                      </div>

                      <h3 className="font-serif text-xl sm:text-2xl text-charcoal font-medium">
                        {ticket.subject}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-dark-gray/60">
                        <span>Submitted by: <strong>{ticket.userName}</strong> {ticket.userEmail ? `(${ticket.userEmail})` : ''}</span>
                        <span>•</span>
                        <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{messages.length} message{messages.length === 1 ? '' : 's'} in thread</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      {ticket.propertyId && (
                        <Link
                          to={`/property/${ticket.propertyId}`}
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal inline-flex items-center gap-1"
                        >
                          <span>Property Ref</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}

                      <button
                        type="button"
                        className="p-2 rounded-xl text-dark-gray/60 hover:text-charcoal"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Conversation Thread & Action Area */}
                  {isExpanded && (
                    <div className="p-5 border-t border-charcoal/10 space-y-5 bg-sand/5">
                      {/* Thread Messages */}
                      <div className="space-y-3">
                        <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60 flex items-center gap-1.5 pb-1 border-b border-charcoal/10">
                          <MessageSquare className="w-3.5 h-3.5 text-deep-purple" />
                          <span>Conversation History</span>
                        </div>

                        {messages.map((msg, idx) => {
                          const isAdminSender = msg.senderRole === 'admin';

                          return (
                            <div
                              key={msg.id || idx}
                              className={`p-4 rounded-xl border space-y-1.5 ${
                                isAdminSender
                                  ? 'bg-deep-purple/5 border-deep-purple/20 ml-4 sm:ml-8'
                                  : 'bg-porcelain border-charcoal/10 mr-4 sm:mr-8'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs font-mono">
                                <div className="flex items-center gap-2">
                                  <span className={`font-semibold ${isAdminSender ? 'text-deep-purple' : 'text-charcoal'}`}>
                                    {isAdminSender ? 'Porch Light Concierge (Admin)' : msg.senderName || ticket.userName}
                                  </span>
                                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 text-dark-gray/70">
                                    {isAdminSender ? 'Admin' : (msg.senderRole || ticket.userRole || 'User')}
                                  </span>
                                </div>
                                <span className="text-dark-gray/50 text-[11px]">
                                  {new Date(msg.timestamp).toLocaleString()}
                                </span>
                              </div>

                              <p className="font-sans text-sm text-charcoal/90 leading-relaxed whitespace-pre-wrap">
                                {msg.message}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Resolution note if present */}
                      {ticket.resolutionNote && (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-sans text-emerald-950 space-y-1">
                          <strong className="font-mono uppercase text-[10px] tracking-wider text-emerald-900 block">
                            Final Resolution Note:
                          </strong>
                          <p>{ticket.resolutionNote}</p>
                        </div>
                      )}

                      {/* Admin Reply & Action Composer */}
                      <div className="pt-2 border-t border-charcoal/10 space-y-3">
                        <label className="block font-mono text-xs uppercase tracking-wider text-charcoal">
                          Compose Response to {isAgent ? 'Agent' : 'Member'}
                        </label>

                        <textarea
                          rows={3}
                          value={replyDrafts[ticket.id] || ''}
                          onChange={(e) =>
                            setReplyDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                          }
                          placeholder={`Write a direct resolution or follow-up note to ${ticket.userName}...`}
                          className="w-full p-3 rounded-xl bg-porcelain border border-charcoal/20 font-sans text-sm text-charcoal placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple resize-none"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            {isResolved ? (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(ticket.id, 'open')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand text-charcoal font-mono text-xs uppercase tracking-wider border border-charcoal/15 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reopen Ticket</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(ticket.id, ticket.status === 'in_progress' ? 'open' : 'in_progress')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand text-charcoal font-mono text-xs uppercase tracking-wider border border-charcoal/15 cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>{ticket.status === 'in_progress' ? 'Mark as Open' : 'Mark In Progress'}</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={submittingReplyId === ticket.id || !replyDrafts[ticket.id]?.trim()}
                              onClick={() => handleSendReply(ticket.id, 'in_progress')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand text-charcoal border border-charcoal/20 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Send className="w-3.5 h-3.5 text-deep-purple" />
                              <span>Send Reply</span>
                            </button>

                            <button
                              type="button"
                              disabled={submittingReplyId === ticket.id || !replyDrafts[ticket.id]?.trim()}
                              onClick={() => handleSendReply(ticket.id, 'resolved')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Reply & Resolve</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
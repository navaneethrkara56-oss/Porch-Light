import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { useAuth } from '@/features/auth/AuthContext';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';
import { getUsers, verifyAgent, rejectAgent } from '@/services/admin';
import {
  getAgentDeletionRequests,
  approveAgentAccountDeletion,
  rejectAgentAccountDeletion,
  getAgentDeletionObligations,
} from '@/services/auth';
import { getProperties } from '@/services/properties';
import {
  Users,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Search,
  Clock,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('agents'); // 'agents' | 'users' | 'deletion-requests'
  const [search, setSearch] = useState('');

  // Focused Agent Verification Detail Modal
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Responsive header offset and keyboard/focus tracking
  const headerOffset = useHeaderOffset();
  const lastActiveElementRef = useRef(null);
  const modalCloseButtonRef = useRef(null);
  const modalContentRef = useRef(null);

  // Agent verification rejection modal
  const [rejectingAgentId, setRejectingAgentId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Deletion request review modal
  const [selectedDeletionReq, setSelectedDeletionReq] = useState(null);
  const [deletionActionType, setDeletionActionType] = useState(null); // 'approve' | 'reject'
  const [adminReviewNotes, setAdminReviewNotes] = useState('');
  const [processingDeletion, setProcessingDeletion] = useState(false);

  // Keyboard Escape-to-close & focus management
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (rejectingAgentId) setRejectingAgentId(null);
        else if (selectedDeletionReq) setSelectedDeletionReq(null);
        else if (selectedAgent) {
          setSelectedAgent(null);
          lastActiveElementRef.current?.focus?.();
        }
      }
    };

    if (selectedAgent || rejectingAgentId || selectedDeletionReq) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAgent, rejectingAgentId, selectedDeletionReq]);

  // Focus modal close button when modal opens
  useEffect(() => {
    if (selectedAgent) {
      lastActiveElementRef.current = document.activeElement;
      requestAnimationFrame(() => {
        modalCloseButtonRef.current?.focus?.();
      });
    }
  }, [selectedAgent]);

  const handleCloseAgentModal = () => {
    setSelectedAgent(null);
    lastActiveElementRef.current?.focus?.();
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allUsers, allDeletionReqs, propsRes] = await Promise.all([
        getUsers(),
        getAgentDeletionRequests(),
        getProperties({ limit: 100 }),
      ]);
      const currentProps = propsRes.data || propsRes.allMatching || [];
      setUsers(allUsers || []);
      setProperties(currentProps);
      setDeletionRequests(allDeletionReqs || []);

      if (selectedAgent) {
        const refreshed = (allUsers || []).find((u) => u.id === selectedAgent.id);
        if (refreshed) setSelectedAgent(refreshed);
      }
    } catch (err) {
      console.error('Failed to load admin users directory:', err);
      setError(err.message || 'Failed to load user and agent directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);

  const handleVerify = async (agentId) => {
    try {
      await verifyAgent(agentId);
      toast.success('Agent verified successfully. Listings can now be published.');
      await loadData();
    } catch (err) {
      alert(err.message || 'Verification failed');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectingAgentId) return;

    try {
      await rejectAgent(
        rejectingAgentId,
        rejectReason || 'License documentation did not meet guidelines.'
      );
      toast.success('Agent verification declined with feedback');
      setRejectingAgentId(null);
      setRejectReason('');
      await loadData();
    } catch (err) {
      alert(err.message || 'Rejection failed');
    }
  };

  const handleProcessDeletion = async (e) => {
    e.preventDefault();
    if (!selectedDeletionReq) return;

    setProcessingDeletion(true);
    try {
      if (deletionActionType === 'approve') {
        await approveAgentAccountDeletion(selectedDeletionReq.id, adminReviewNotes);
        toast.success('Agent account deletion approved and records decommissioned.');
      } else {
        await rejectAgentAccountDeletion(selectedDeletionReq.id, adminReviewNotes);
        toast.success('Agent account deletion request declined and feedback sent.');
      }
      setSelectedDeletionReq(null);
      setDeletionActionType(null);
      setAdminReviewNotes('');
      await loadData();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setProcessingDeletion(false);
    }
  };

  const agents = users.filter((u) => u.role === 'agent');
  const regularUsers = users.filter((u) => u.role === 'user');
  const pendingDeletionRequests = deletionRequests.filter((r) => r.status === 'pending');

  const displayedUsers = (activeTab === 'agents' ? agents : regularUsers).filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.agency?.toLowerCase().includes(q) ||
      u.city?.toLowerCase().includes(q)
    );
  });

  const displayedDeletionRequests = deletionRequests.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.agentName?.toLowerCase().includes(q) ||
      r.agency?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Account Management & Governance
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Users & Agents
            </h1>
          </div>

          {/* Segmented Control */}
          <div
            id="deletion-requests-tab"
            className="inline-flex p-1 rounded-full bg-sand/60 border border-charcoal/10 flex-wrap"
          >
            <button
              type="button"
              onClick={() => setActiveTab('agents')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'agents'
                  ? 'bg-deep-purple text-white shadow-xs font-medium'
                  : 'text-charcoal/70 hover:text-charcoal'
              }`}
            >
              Agents ({agents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-deep-purple text-white shadow-xs font-medium'
                  : 'text-charcoal/70 hover:text-charcoal'
              }`}
            >
              Users ({regularUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('deletion-requests')}
              className={`px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'deletion-requests'
                  ? 'bg-deep-purple text-white shadow-xs font-medium'
                  : 'text-charcoal/70 hover:text-charcoal'
              }`}
            >
              <span>Deletion Requests</span>
              {pendingDeletionRequests.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'deletion-requests'
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {pendingDeletionRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-porcelain border border-charcoal/10 shadow-xs max-w-md">
          <Search className="w-4 h-4 text-dark-gray/40 ml-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'deletion-requests'
                ? 'Filter requests by agent, agency, or reason...'
                : `Filter ${activeTab} by name, email, or city...`
            }
            className="w-full bg-transparent text-charcoal placeholder:text-dark-gray/40 font-sans text-sm focus:outline-none"
          />
        </div>

        {error && !loading && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-charcoal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="font-sans text-xs text-amber-900">{error}</span>
            <button
              type="button"
              onClick={loadData}
              className="px-3.5 py-1.5 rounded-full bg-deep-purple text-porcelain hover:bg-deep-purple/90 font-mono text-[11px] uppercase tracking-wider transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <DashboardSkeleton type="table" />
        ) : activeTab === 'deletion-requests' ? (
          /* DELETION REQUESTS VIEW */
          <div className="space-y-4">
            {displayedDeletionRequests.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-charcoal/10 bg-porcelain shadow-xs space-y-1">
                <p className="font-serif text-lg text-deep-purple">No account deletion requests</p>
                <p className="font-sans text-xs text-dark-gray/50">
                  There are currently no submitted agent account deletion requests.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-charcoal/10 bg-porcelain shadow-xs">
                <table className="w-full text-left font-sans text-sm min-w-[750px] border-collapse">
                  <thead>
                    <tr className="border-b border-charcoal/10 bg-sand/30 font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                      <th className="p-4">Agent & Agency</th>
                      <th className="p-4">Stated Closure Reason</th>
                      <th className="p-4">Obligation Status</th>
                      <th className="p-4">Submitted Date</th>
                      <th className="p-4 text-right">Moderation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-charcoal/5 text-charcoal">
                    {displayedDeletionRequests.map((req) => {
                      const obs = getAgentDeletionObligations(req.agentId);
                      const isPending = req.status === 'pending';

                      return (
                        <tr key={req.id} className="hover:bg-sand/15 transition-colors">
                          <td className="p-4">
                            <div className="font-serif text-base text-charcoal font-medium">
                              {req.agentName}
                            </div>
                            <div className="font-mono text-xs text-dark-gray/60">
                              {req.agency} • {req.email}
                            </div>
                          </td>
                          <td className="p-4 max-w-xs">
                            <p className="font-sans text-xs text-dark-gray/80 line-clamp-2">
                              {req.reason || 'No specific reason provided.'}
                            </p>
                          </td>
                          <td className="p-4">
                            {req.status === 'approved' ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sand/60 text-charcoal/70 border border-charcoal/15">
                                Approved & Decommissioned
                              </span>
                            ) : req.status === 'rejected' ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                                Declined
                              </span>
                            ) : obs.eligible ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/20 font-medium">
                                Clear for Approval
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-200 font-medium">
                                  {obs.obligationsCount} Active {obs.obligationsCount === 1 ? 'Obligation' : 'Obligations'}
                                </span>
                                <div className="text-[11px] font-sans text-rose-800/80 leading-tight">
                                  {obs.reasons[0]}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-mono text-xs text-dark-gray/60">
                            {new Date(req.submittedAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={!obs.eligible}
                                  onClick={() => {
                                    setSelectedDeletionReq(req);
                                    setDeletionActionType('approve');
                                    setAdminReviewNotes('');
                                  }}
                                  title={
                                    obs.eligible
                                      ? 'Approve deletion and decommission agent records'
                                      : 'Cannot approve while agent has active obligations'
                                  }
                                  className={`px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider shadow-xs transition-colors ${
                                    obs.eligible
                                      ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                                      : 'bg-charcoal/10 text-dark-gray/40 border border-charcoal/10 cursor-not-allowed'
                                  }`}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDeletionReq(req);
                                    setDeletionActionType('reject');
                                    setAdminReviewNotes('');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-sand/60 hover:bg-sand text-charcoal border border-charcoal/15 font-mono text-xs uppercase tracking-wider cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono text-xs text-dark-gray/50 capitalize">
                                {req.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* DIRECTORY USERS / AGENTS VIEW */
          <div className="space-y-4">
            {/* Desktop Table (Hidden on Mobile) */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-charcoal/10 bg-porcelain shadow-xs">
              <table className="w-full text-left font-sans text-sm min-w-[700px] border-collapse">
                <thead>
                  <tr className="border-b border-charcoal/10 bg-sand/30 font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                    <th className="p-4">Name & Email</th>
                    <th className="p-4">{activeTab === 'agents' ? 'Agency & City' : 'City & Phone'}</th>
                    <th className="p-4">Status / Role</th>
                    <th className="p-4">Registered Date</th>
                    {activeTab === 'agents' && <th className="p-4 text-right">Verification Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/5 text-charcoal">
                  {displayedUsers.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => {
                        if (activeTab === 'agents') setSelectedAgent(u);
                      }}
                      className={`hover:bg-sand/20 transition-colors ${
                        activeTab === 'agents' ? 'cursor-pointer' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="font-serif text-base text-charcoal font-medium flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {activeTab === 'agents' && u.isVerified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-deep-purple" title="RERA Verified Agent" />
                          )}
                        </div>
                        <div className="font-mono text-xs text-dark-gray/60">{u.email}</div>
                      </td>
                      <td className="p-4">
                        {activeTab === 'agents' ? (
                          <>
                            <div className="font-sans text-sm text-charcoal font-medium">
                              {u.agency || 'Independent Agency'}
                            </div>
                            <div className="font-mono text-xs text-dark-gray/60">{u.city}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-sans text-sm text-charcoal font-medium">
                              {u.city || 'India'}
                            </div>
                            <div className="font-mono text-xs text-dark-gray/60">{u.phone || 'N/A'}</div>
                          </>
                        )}
                      </td>
                      <td className="p-4">
                        {activeTab === 'agents' ? (
                          <span
                            className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border whitespace-nowrap font-medium ${
                              u.isDeactivated
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : u.isVerified
                                ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25'
                                : 'bg-sand/60 text-charcoal/80 border-charcoal/20'
                            }`}
                          >
                            {u.isDeactivated
                              ? 'Deactivated'
                              : u.isVerified
                              ? 'Verified Agent'
                              : 'Pending Review'}
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 text-charcoal/80 border border-charcoal/10 whitespace-nowrap">
                            {u.isDeactivated ? 'Deactivated' : 'User Member'}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-xs text-dark-gray/60 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      {activeTab === 'agents' && (
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedAgent(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/15 text-charcoal font-mono text-xs uppercase tracking-wider cursor-pointer"
                              title="Inspect professional verification details"
                            >
                              Details
                            </button>
                            {u.isDeactivated ? (
                              <span className="font-mono text-xs text-dark-gray/40">Closed</span>
                            ) : !u.isVerified ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleVerify(u.id)}
                                  className="px-3 py-1.5 rounded-lg bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shadow-xs cursor-pointer"
                                >
                                  Verify
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingAgentId(u.id);
                                    setRejectReason('');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-mono text-xs uppercase tracking-wider cursor-pointer"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <span className="font-mono text-xs text-deep-purple flex items-center justify-end gap-1 font-medium px-2 py-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-deep-purple" />
                                <span>Approved</span>
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (Visible on Mobile) */}
            <div className="block md:hidden space-y-3">
              {displayedUsers.map((u) => {
                const isAgent = activeTab === 'agents';

                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (isAgent) setSelectedAgent(u);
                    }}
                    className={`p-4 rounded-2xl bg-porcelain border border-charcoal/15 shadow-xs space-y-3 hover:border-deep-purple/30 transition-all ${
                      isAgent ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-serif text-base text-charcoal font-medium flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isAgent && u.isVerified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-deep-purple" title="RERA Verified Agent" />
                          )}
                        </div>
                        <div className="font-mono text-xs text-dark-gray/60">{u.email}</div>
                      </div>

                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border whitespace-nowrap font-medium ${
                          u.isDeactivated
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : isAgent
                            ? u.isVerified
                              ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25'
                              : 'bg-sand/60 text-charcoal/80 border-charcoal/20'
                            : 'bg-sand/60 text-charcoal/80 border-charcoal/10'
                        }`}
                      >
                        {u.isDeactivated
                          ? 'Deactivated'
                          : isAgent
                          ? u.isVerified
                            ? 'Verified Partner'
                            : 'Pending Review'
                          : 'User Member'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-charcoal/10 text-xs">
                      <div>
                        {isAgent ? (
                          <div className="font-mono text-xs text-charcoal">
                            {u.agency || 'Independent Agency'} • {u.city}
                          </div>
                        ) : (
                          <div className="font-mono text-xs text-charcoal">
                            {u.city || 'India'} {u.phone ? `• ${u.phone}` : ''}
                          </div>
                        )}
                        <div className="font-mono text-[10px] text-dark-gray/50">
                          Joined: {new Date(u.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {isAgent && (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedAgent(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-sand/60 hover:bg-sand border border-charcoal/15 text-charcoal font-mono text-xs uppercase tracking-wider"
                          >
                            Details
                          </button>
                          {!u.isDeactivated && !u.isVerified && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleVerify(u.id)}
                                className="px-3 py-1.5 rounded-lg bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingAgentId(u.id);
                                  setRejectReason('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-mono text-xs uppercase tracking-wider"
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Focused Agent Verification Detail Modal */}
        {selectedAgent && (
          <div
            className="fixed left-0 right-0 bottom-0 z-40 flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 bg-charcoal/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
            style={{ top: `${headerOffset}px` }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-modal-title"
            onClick={handleCloseAgentModal}
          >
            <div
              ref={modalContentRef}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[calc(100dvh-${headerOffset}px-1rem)] sm:max-h-[calc(100dvh-${headerOffset}px-2.5rem)] overflow-y-auto rounded-2xl sm:rounded-3xl bg-porcelain border border-charcoal/15 p-4 sm:p-6 md:p-7 shadow-2xl space-y-6 text-charcoal my-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-charcoal/10 pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-charcoal/60">
                      Agent Profile & Verification Roster
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-medium ${
                        selectedAgent.isDeactivated
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : selectedAgent.isVerified
                          ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25'
                          : 'bg-sand/60 text-charcoal/80 border-charcoal/20'
                      }`}
                    >
                      {selectedAgent.isDeactivated
                        ? 'Deactivated'
                        : selectedAgent.isVerified
                        ? 'Verified Partner'
                        : 'Pending RERA Review'}
                    </span>
                  </div>
                  <h3 id="agent-modal-title" className="font-serif text-2xl sm:text-3xl text-deep-purple font-medium">
                    {selectedAgent.name}
                  </h3>
                  <div className="font-mono text-xs text-dark-gray/60">{selectedAgent.email}</div>
                </div>
                <button
                  ref={modalCloseButtonRef}
                  type="button"
                  onClick={handleCloseAgentModal}
                  aria-label="Close agent details"
                  className="p-2 rounded-xl text-charcoal/60 hover:text-charcoal hover:bg-sand/60 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Notice Banner */}
              {!selectedAgent.isVerified && !selectedAgent.isDeactivated && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-charcoal/80 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-900">
                      Pending Verification — Publishing Restricted
                    </p>
                    <p className="leading-relaxed">
                      This agent has registered credentials but cannot publish residential listings or represent active transactions until RERA accreditation is approved by an administrator.
                    </p>
                  </div>
                </div>
              )}

              {selectedAgent.verificationRejectionReason && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-sans text-rose-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                    <span>Prior Verification Feedback:</span>
                  </p>
                  <p className="leading-relaxed pl-5 font-mono text-[11px] text-rose-800">
                    "{selectedAgent.verificationRejectionReason}"
                  </p>
                </div>
              )}

              {/* Professional Credentials & Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-sand/35 border border-charcoal/10 space-y-3">
                  <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                    Brokerage & Office
                  </div>
                  <div className="space-y-1.5 font-sans text-xs">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-deep-purple" />
                      <span className="font-medium text-charcoal">
                        {selectedAgent.agency || 'Independent Luxury Brokerage'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-dark-gray/70">
                      <Phone className="w-3.5 h-3.5 text-deep-purple" />
                      <span>{selectedAgent.phone || 'Phone not provided'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-dark-gray/70">
                      <Mail className="w-3.5 h-3.5 text-deep-purple" />
                      <span>{selectedAgent.email}</span>
                    </div>
                    {selectedAgent.whatsappNumber && (
                      <div className="flex items-center gap-2 text-emerald-800 font-mono text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                        <span>WhatsApp: {selectedAgent.whatsappNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-sand/35 border border-charcoal/10 space-y-3">
                  <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                    Regulatory Accreditation
                  </div>
                  <div className="space-y-1.5 font-sans text-xs">
                    <div>
                      <span className="text-dark-gray/60">RERA Registration ID:</span>
                      <div className="font-mono text-xs font-semibold text-deep-purple mt-0.5">
                        {selectedAgent.reraNumber || 'K-RERA/AG/ERN/0088/2024 (Pending Document Verification)'}
                      </div>
                    </div>
                    <div>
                      <span className="text-dark-gray/60">Jurisdiction & Base:</span>
                      <div className="font-medium text-charcoal mt-0.5">
                        {selectedAgent.city || 'Bengaluru'}, {selectedAgent.state || 'Karnataka'}
                      </div>
                    </div>
                    <div>
                      <span className="text-dark-gray/60">Registration Timestamp:</span>
                      <div className="font-mono text-[11px] text-dark-gray/70 mt-0.5">
                        {new Date(selectedAgent.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Listing & Portfolio Summary */}
              {(() => {
                const agentProps = properties.filter((p) => p.agentId === selectedAgent.id);
                const approvedCount = agentProps.filter((p) => p.status === 'approved' && !p.isSold && !p.isLeased).length;
                const pendingCount = agentProps.filter((p) => p.status === 'pending').length;
                const completedCount = agentProps.filter((p) => p.isSold || p.isLeased).length;

                return (
                  <div className="p-4 rounded-2xl bg-sand/25 border border-charcoal/10 space-y-2">
                    <div className="font-mono text-xs uppercase tracking-wider text-dark-gray/60">
                      Listing Portfolio Summary
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-porcelain border border-charcoal/10 text-center">
                        <div className="font-serif text-2xl text-charcoal font-medium">{approvedCount}</div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60 mt-0.5">
                          Active Live
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-porcelain border border-charcoal/10 text-center">
                        <div className="font-serif text-2xl text-amber-700 font-medium">{pendingCount}</div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60 mt-0.5">
                          In Review
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-porcelain border border-charcoal/10 text-center">
                        <div className="font-serif text-2xl text-deep-purple font-medium">{completedCount}</div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60 mt-0.5">
                          Sold / Leased
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Isolated Security & Privacy Confirmation */}
              <div className="p-3 rounded-xl bg-sand/20 border border-charcoal/10 text-[11px] font-mono text-dark-gray/60 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-deep-purple shrink-0" />
                <span>
                  Security Policy: Passwords, password hashes, and session authentication secrets are strictly isolated and never accessible through administrative views.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-charcoal/10">
                <button
                  type="button"
                  onClick={() => setSelectedAgent(null)}
                  className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {!selectedAgent.isVerified ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingAgentId(selectedAgent.id);
                          setRejectReason('');
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-mono text-xs uppercase tracking-wider font-medium cursor-pointer"
                      >
                        Decline Verification
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleVerify(selectedAgent.id);
                          setSelectedAgent((prev) => (prev ? { ...prev, isVerified: true } : null));
                        }}
                        className="px-5 py-2 rounded-xl bg-deep-purple hover:bg-deep-purple/90 text-white font-mono text-xs uppercase tracking-wider shadow-xs font-medium cursor-pointer"
                      >
                        Verify & Approve Agent
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingAgentId(selectedAgent.id);
                        setRejectReason('');
                      }}
                      className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand text-charcoal border border-charcoal/20 font-mono text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Revoke Verification
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agent Verification Rejection Modal */}
        {rejectingAgentId && (
          <div
            className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs"
            style={{ top: `${headerOffset}px` }}
          >
            <div className="w-full max-w-md rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertTriangle className="w-5 h-5 text-rose-700" />
                  <h3 className="font-serif text-xl font-medium">Decline Agent Verification</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectingAgentId(null)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReject} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Reason for Rejection / Info Request
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide specific feedback on RERA documentation or agency details..."
                    className="w-full p-3 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectingAgentId(null)}
                    className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider shadow-xs"
                  >
                    Confirm Decline
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deletion Request Decision Modal */}
        {selectedDeletionReq && (
          <div
            className="fixed left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs"
            style={{ top: `${headerOffset}px` }}
          >
            <div className="w-full max-w-lg rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2">
                  {deletionActionType === 'approve' ? (
                    <Trash2 className="w-5 h-5 text-rose-700" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-dark-gray/70" />
                  )}
                  <h3 className="font-serif text-xl text-deep-purple font-medium">
                    {deletionActionType === 'approve'
                      ? 'Approve Agent Account Deletion'
                      : 'Decline Account Deletion'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDeletionReq(null);
                    setDeletionActionType(null);
                  }}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 font-sans text-xs text-charcoal/80">
                <div className="p-3.5 rounded-xl bg-sand/40 border border-charcoal/15 space-y-1">
                  <div>
                    <span className="font-semibold text-charcoal">Agent:</span>{' '}
                    {selectedDeletionReq.agentName} ({selectedDeletionReq.agency})
                  </div>
                  <div>
                    <span className="font-semibold text-charcoal">Submitted Reason:</span>{' '}
                    {selectedDeletionReq.reason || 'None provided'}
                  </div>
                </div>

                {deletionActionType === 'approve' ? (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1">
                    <p className="font-semibold text-rose-950">Statutory Cleanup Boundaries:</p>
                    <p>• The agent account will be permanently deactivated.</p>
                    <p>• Active listings and promotions will be archived from public search and maps.</p>
                    <p>
                      • Historical user transactions and receipts will be legally preserved, with private agent credentials sanitized.
                    </p>
                  </div>
                ) : (
                  <p className="text-dark-gray/70">
                    Declining this request will send an explanation notification to the agent while keeping their account active.
                  </p>
                )}

                <form onSubmit={handleProcessDeletion} className="space-y-3 pt-2">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                      {deletionActionType === 'approve' ? 'Admin Closure Notes' : 'Reason for Declining'}
                    </label>
                    <textarea
                      rows={2}
                      value={adminReviewNotes}
                      onChange={(e) => setAdminReviewNotes(e.target.value)}
                      placeholder={
                        deletionActionType === 'approve'
                          ? 'Optional compliance notes...'
                          : 'Explain what obligations or documentation must be resolved before deletion...'
                      }
                      className="w-full p-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-charcoal/10">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDeletionReq(null);
                        setDeletionActionType(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={processingDeletion}
                      className={`px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider text-white shadow-xs cursor-pointer disabled:opacity-50 ${
                        deletionActionType === 'approve'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-deep-purple hover:bg-deep-purple/90'
                      }`}
                    >
                      {processingDeletion
                        ? 'Processing...'
                        : deletionActionType === 'approve'
                        ? 'Confirm Approved Deletion'
                        : 'Confirm Decline'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

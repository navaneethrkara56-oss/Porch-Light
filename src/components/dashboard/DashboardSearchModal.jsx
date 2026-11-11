import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/auth/AuthContext';
import { searchDashboard } from '@/services/dashboard';
import {
  Search,
  X,
  FileText,
  Building2,
  Calendar,
  Receipt,
  MessageSquare,
  ArrowRight,
  Shield,
  Sliders,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export function DashboardSearchModal({ isOpen, onClose }) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchDashboard({
          query,
          role,
          userId: user?.id,
        });
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, role, user?.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = (path, targetId) => {
    onClose();
    navigate(path);
    if (targetId) {
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const focusable = el.querySelector('input, button, [tabindex="0"]') || el;
          focusable?.focus?.();
        }
      }, 150);
    }
  };

  const hasAnyResults =
    results &&
    ((results.actions && results.actions.length > 0) ||
      (results.pages && results.pages.length > 0) ||
      (results.properties && results.properties.length > 0) ||
      (results.visits && results.visits.length > 0) ||
      (results.transactions && results.transactions.length > 0) ||
      (results.messages && results.messages.length > 0));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute top-0 left-0 right-0 min-h-full z-50 flex items-start justify-center pt-8 sm:pt-14 px-4 pb-20 pointer-events-auto">
          {/* Backdrop: non-sticky, scrolls with page flow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-charcoal/45 backdrop-blur-xs min-h-full"
            onClick={onClose}
          />

          {/* Modal Container: non-sticky, scrolls away with page without pinning over content or footer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-2xl bg-porcelain rounded-2xl border border-charcoal/15 shadow-xl overflow-hidden flex flex-col max-h-[85vh] z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="p-4 border-b border-charcoal/10 flex items-center gap-3 bg-sand/35">
              <Search className="w-5 h-5 text-dark-gray/50 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  role === 'admin'
                    ? 'Search platform pages, settings, complaints, properties...'
                    : role === 'agent'
                    ? 'Search pages, settings, listings, visits, transactions...'
                    : 'Search pages, settings, saved homes, visits, receipts...'
                }
                className="w-full bg-transparent text-charcoal placeholder:text-dark-gray/40 font-sans text-base focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-dark-gray/40 hover:text-charcoal transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <span className="hidden sm:inline-block font-mono text-[10px] uppercase tracking-wider text-dark-gray/50 px-2 py-0.5 rounded bg-sand/60 border border-charcoal/10">
                ESC
              </span>
            </div>

            {/* Role Scope Notice */}
            <div className="px-4 py-2 bg-sand/30 border-b border-charcoal/5 flex items-center justify-between text-xs font-mono text-dark-gray/70">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-deep-purple" />
                {role === 'admin'
                  ? 'Administrator Scope • Platform-Wide'
                  : role === 'agent'
                  ? 'Agent Scope • Managed Portfolio'
                  : 'Member Scope • Personal Workspace'}
              </span>
              {loading && <span className="text-deep-purple animate-pulse">Searching...</span>}
            </div>

            {/* Results Body */}
            <div className="overflow-y-auto p-4 space-y-6 flex-1">
              {!query.trim() && (
                <div className="py-8 text-center text-dark-gray/50 space-y-2">
                  <p className="font-serif text-lg text-deep-purple">Search Workspace & Actions</p>
                  <p className="font-sans text-xs max-w-sm mx-auto">
                    Search accessible dashboard pages, profile controls (Password, Photo, Settings), properties, visits, and receipts.
                  </p>
                </div>
              )}

              {query.trim() && !loading && !hasAnyResults && (
                <div className="py-8 text-center text-dark-gray/60">
                  <p className="font-serif text-lg text-deep-purple">No matching items found</p>
                  <p className="font-sans text-xs text-dark-gray/50 mt-1">
                    No matching pages, settings, actions, or records found within your role permissions.
                  </p>
                </div>
              )}

              {/* Settings & Available Actions */}
              {results?.actions?.length > 0 && (
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-dark-gray/50 mb-2 px-2 flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-deep-purple" />
                    Settings & Actions ({results.actions.length})
                  </h4>
                  <div className="space-y-1">
                    {results.actions.map((act) => (
                      <button
                        key={act.title}
                        type="button"
                        onClick={() => handleSelect(act.path, act.targetId)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-sand/60 transition-colors flex items-center justify-between group cursor-pointer ${
                          act.isDestructive ? 'hover:bg-rose-50/60' : ''
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-sans text-sm font-medium text-charcoal group-hover:text-deep-purple">
                              {act.title}
                            </span>
                            <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/70 text-charcoal/70 border border-charcoal/10">
                              {act.category}
                            </span>
                            {act.isDestructive && (
                              <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                Requires Confirmation
                              </span>
                            )}
                          </div>
                          <div className="font-sans text-xs text-dark-gray/60">{act.description}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-dark-gray/30 group-hover:text-deep-purple group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pages Category */}
              {results?.pages?.length > 0 && (
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-dark-gray/50 mb-2 px-2 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-deep-purple" />
                    Dashboard Pages ({results.pages.length})
                  </h4>
                  <div className="space-y-1">
                    {results.pages.map((p) => (
                      <button
                        key={p.path}
                        type="button"
                        onClick={() => handleSelect(p.path)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-sand/60 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="font-sans text-sm font-medium text-charcoal group-hover:text-deep-purple">
                            {p.title}
                          </div>
                          <div className="font-sans text-xs text-dark-gray/60">{p.description}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-dark-gray/30 group-hover:text-deep-purple group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Properties Category */}
              {results?.properties?.length > 0 && (
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-dark-gray/50 mb-2 px-2 flex items-center gap-1.5">
                    <Building2 className="w-3 h-3 text-deep-purple" />
                    Properties ({results.properties.length})
                  </h4>
                  <div className="space-y-1">
                    {results.properties.map((prop) => (
                      <button
                        key={prop.id}
                        type="button"
                        onClick={() =>
                          handleSelect(
                            role === 'agent'
                              ? '/agent/listings'
                              : role === 'admin'
                              ? '/admin/approvals'
                              : `/property/${prop.id}`,
                            role !== 'user' ? `property-${prop.id}` : undefined
                          )
                        }
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-sand/60 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="font-sans text-sm font-medium text-charcoal group-hover:text-deep-purple">
                            {prop.title}
                          </div>
                          <div className="font-mono text-xs text-dark-gray/60">
                            {prop.locality}, {prop.city} • ₹
                            {prop.price ? prop.price.toLocaleString('en-IN') : 'N/A'}{' '}
                            <span className="capitalize text-deep-purple">({prop.status})</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-dark-gray/30 group-hover:text-deep-purple group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Visits Category */}
              {results?.visits?.length > 0 && (
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-dark-gray/50 mb-2 px-2 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-deep-purple" />
                    Visits & Bookings ({results.visits.length})
                  </h4>
                  <div className="space-y-1">
                    {results.visits.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() =>
                          handleSelect(
                            role === 'agent' ? '/agent/visits' : '/dashboard/visits',
                            `visit-${v.id}`
                          )
                        }
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-sand/60 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="font-sans text-sm font-medium text-charcoal group-hover:text-deep-purple">
                            {v.propertyTitle || 'Visit Booking'}
                          </div>
                          <div className="font-mono text-xs text-dark-gray/60">
                            {v.date} ({v.timeSlot}) • Status: {v.status}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-dark-gray/30 group-hover:text-deep-purple group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions Category */}
              {results?.transactions?.length > 0 && (
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-dark-gray/50 mb-2 px-2 flex items-center gap-1.5">
                    <Receipt className="w-3 h-3 text-deep-purple" />
                    Transactions ({results.transactions.length})
                  </h4>
                  <div className="space-y-1">
                    {results.transactions.map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() =>
                          handleSelect(
                            role === 'admin'
                              ? '/admin/transactions'
                              : role === 'agent'
                              ? '/agent/transactions'
                              : '/dashboard/payments',
                            `tx-${tx.id}`
                          )
                        }
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-sand/60 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="font-sans text-sm font-medium text-charcoal group-hover:text-deep-purple">
                            {tx.propertyTitle || 'Transaction'} • ₹{tx.amount?.toLocaleString('en-IN')}
                          </div>
                          <div className="font-mono text-xs text-dark-gray/60">
                            {tx.id} • {tx.type?.replace('_', ' ')} •{' '}
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-dark-gray/30 group-hover:text-deep-purple group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages / Complaints Category */}
              {results?.messages?.length > 0 && (
                <div>
                  <h4 className="font-mono text-[10px] uppercase tracking-widest text-dark-gray/50 mb-2 px-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-deep-purple" />
                    {role === 'admin' ? 'Support Tickets' : 'Conversations'} ({results.messages.length})
                  </h4>
                  <div className="space-y-1">
                    {results.messages.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelect(m.path, m.id ? `msg-${m.id}` : undefined)}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-sand/60 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div>
                          <div className="font-sans text-sm font-medium text-charcoal group-hover:text-deep-purple">
                            {m.title}
                          </div>
                          <div className="font-mono text-xs text-dark-gray/60">{m.subtitle}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-dark-gray/30 group-hover:text-deep-purple group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

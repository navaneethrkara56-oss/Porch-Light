import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardBackButton } from '@/components/dashboard/DashboardBackButton';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { getComplaints, submitComplaint } from '@/services/complaints';
import {
  LifeBuoy,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  MessageSquare,
  X,
} from 'lucide-react';

export function UserHelpPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const data = await getComplaints();
      setComplaints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelForm = () => {
    setSubject('');
    setDescription('');
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      await submitComplaint({ subject, description });
      setSubject('');
      setDescription('');
      setShowForm(false);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="user">
      <div className="space-y-6">
        {/* Contextual Back Navigation */}
        <div>
          <DashboardBackButton fallbackTo="/dashboard/overview" label="Back to Overview" />
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Concierge Desk
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Help & Support
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                handleCancelForm();
              } else {
                setShowForm(true);
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
          >
            {showForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            <span>{showForm ? 'Cancel ticket' : 'New Support Ticket'}</span>
          </button>
        </div>

        {/* New Ticket Drawer / Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-2xl bg-sand/30 border border-charcoal/10 shadow-xs space-y-4"
          >
            <h3 className="font-serif text-xl text-deep-purple font-medium">
              File a Concierge Ticket
            </h3>
            <p className="font-sans text-xs text-dark-gray/70">
              Need assistance with a listing, scheduled visit, or deposit verification? Our Bengaluru & Kochi concierge desks review tickets within 24 hours.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                  Subject / Summary
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Question regarding property boundary documents"
                  className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                  Detailed Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe your inquiry or issue in detail..."
                  className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5 text-charcoal/70" />
                <span>Cancel ticket</span>
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Ticket'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Existing Tickets List */}
        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : complaints.length === 0 ? (
          <DashboardEmptyState
            title="No open support inquiries."
            description="Our concierge team is here to help with visits, agent verifications, and listing inquiries."
            actionLabel="File a Support Ticket"
            onAction={() => setShowForm(true)}
            icon={LifeBuoy}
          />
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      c.status === 'resolved'
                        ? 'bg-deep-purple/10 text-deep-purple border-deep-purple/25 font-medium'
                        : 'bg-sand/60 text-charcoal/80 border-charcoal/20'
                    }`}
                  >
                    Status: {c.status}
                  </span>
                  <span className="font-mono text-xs text-dark-gray/50">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-serif text-xl text-charcoal font-medium">{c.subject}</h3>
                <p className="font-sans text-sm text-dark-gray/80 leading-relaxed">
                  {c.description}
                </p>

                {c.resolutionNote && (
                  <div className="p-3.5 rounded-xl bg-sand/50 border border-charcoal/20 text-xs font-sans text-charcoal mt-2">
                    <strong className="font-mono text-[10px] uppercase tracking-wider text-deep-purple block mb-1">
                      Concierge Resolution Note:
                    </strong>
                    {c.resolutionNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

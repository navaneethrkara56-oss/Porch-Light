import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { getComplaints, submitComplaint } from '@/services/complaints';
import { HelpCircle, PlusCircle, Send, ShieldCheck, Mail, Phone } from 'lucide-react';

export function AgentSupportPage() {
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
      alert(err.message || 'Failed to submit inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout role="agent">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-charcoal/10">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
              Brokerage Concierge
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
              Agent Help & Compliance
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showForm ? 'Cancel' : 'Contact Support'}</span>
          </button>
        </div>

        {/* Contact Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-sand/30 border border-charcoal/10 flex items-center gap-3">
            <Mail className="w-5 h-5 text-deep-purple shrink-0" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60">
                Partner Support Desk
              </div>
              <div className="font-sans text-sm font-medium text-charcoal">
                partners@porchlight.in
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-sand/30 border border-charcoal/10 flex items-center gap-3">
            <Phone className="w-5 h-5 text-deep-purple shrink-0" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60">
                Direct Agent Line
              </div>
              <div className="font-sans text-sm font-medium text-charcoal">
                +91 80 4910 8800 (9 AM - 6 PM IST)
              </div>
            </div>
          </div>
        </div>

        {/* New Ticket Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="p-6 rounded-2xl bg-sand/20 border border-charcoal/10 shadow-xs space-y-4"
          >
            <h3 className="font-serif text-xl text-deep-purple font-medium">
              Submit an Agent Compliance / Technical Request
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Inquiring about RERA documentation verification timing"
                  className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                  Details
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please specify listing IDs or certificate numbers if applicable..."
                  className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand font-mono text-xs uppercase tracking-wider text-charcoal"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Sending...' : 'Send Inquiry'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Existing Inquiries */}
        {loading ? (
          <DashboardSkeleton type="cards" />
        ) : complaints.length === 0 ? (
          <DashboardEmptyState
            title="No open support inquiries."
            description="Our partner concierge team is available to assist with listing compliance, visit scheduling, and 360 tour uploads."
            icon={HelpCircle}
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
                      Support Resolution:
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

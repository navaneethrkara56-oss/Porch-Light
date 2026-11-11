import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProfilePhotoUploader } from '@/components/dashboard/ProfilePhotoUploader';
import { ChangePasswordCard } from '@/components/dashboard/ChangePasswordCard';
import {
  getAgentDeletionObligations,
  getAgentDeletionRequests,
  requestAgentAccountDeletion,
  updateUserProfile,
} from '@/services/auth';
import { CANONICAL_CITIES } from '@/constants/cities';
import { fetchMyAgentRatings, subscribeToRatings } from '@/services/ratings';
import {
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  AlertTriangle,
  Check,
  Save,
  MessageSquare,
  CreditCard,
  Smartphone,
  ExternalLink,
  Shield,
  Trash2,
  Clock,
  X,
  FileCheck,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AgentProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '+91 98470 12345');
  const [whatsappNumber, setWhatsappNumber] = useState(
    user?.whatsappNumber || user?.phone || '+91 98470 12345'
  );
  const [agency, setAgency] = useState(user?.agency || 'Malabar Heritage Realty');
  const [city, setCity] = useState(user?.city || 'Kochi');
  const [reraNumber, setReraNumber] = useState(user?.reraNumber || 'K-RERA/AG/ERN/0088/2024');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [contactPrefs, setContactPrefs] = useState(
    user?.contactPreferences || {
      whatsapp: true,
      inAppChat: true,
      phoneCalls: true,
      emailAlerts: true,
    }
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.phone) setPhone(user.phone);
      if (user.whatsappNumber || user.phone) setWhatsappNumber(user.whatsappNumber || user.phone);
      if (user.agency) setAgency(user.agency);
      if (user.city) setCity(user.city);
      if (user.reraNumber) setReraNumber(user.reraNumber);
      setAvatar(user.avatar || user.profilePhoto || null);
      if (user.contactPreferences) setContactPrefs(user.contactPreferences);
    }
  }, [user]);

  // Agent ratings state
  const [ratingData, setRatingData] = useState({
    average: null,
    formattedAverage: null,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    recentRatings: [],
  });

  useEffect(() => {
    let isMounted = true;
    const loadRatings = async () => {
      try {
        const data = await fetchMyAgentRatings();
        if (isMounted && data) {
          setRatingData(data);
        }
      } catch (e) {
        console.warn('Could not load agent ratings', e);
      }
    };

    loadRatings();
    const unsub = subscribeToRatings(loadRatings);
    const handleRatingSubmitted = () => loadRatings();
    window.addEventListener('porch:rating-submitted', handleRatingSubmitted);
    window.addEventListener('porch:notifications-updated', handleRatingSubmitted);

    return () => {
      isMounted = false;
      unsub();
      window.removeEventListener('porch:rating-submitted', handleRatingSubmitted);
      window.removeEventListener('porch:notifications-updated', handleRatingSubmitted);
    };
  }, [user?.id]);

  // Deletion request state
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingDeletion, setSubmittingDeletion] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [obligations, setObligations] = useState({ eligible: true, reasons: [] });

  const isVerified = Boolean(user?.isVerified);

  const checkObligationsAndRequests = async () => {
    if (!user?.id) return;
    try {
      const [obs, reqs] = await Promise.all([
        getAgentDeletionObligations(user.id),
        getAgentDeletionRequests(),
      ]);
      setObligations(obs || { eligible: true, reasons: [] });
      const req = (reqs || []).find(
        (r) => r.agentId === user.id && r.status === 'pending'
      );
      setPendingRequest(req || null);
    } catch (e) {
      // quiet fallback
    }
  };

  useEffect(() => {
    checkObligationsAndRequests();
  }, [user?.id]);

  const handleAvatarChange = async (newAvatar) => {
    setAvatar(newAvatar);
    try {
      await updateUserProfile({ avatar: newAvatar });
      toast.success('Agent avatar updated');
    } catch (err) {
      console.warn('Avatar update sync failed:', err.message);
    }
  };

  const handleTogglePref = (key) => {
    const currentVal = Boolean(contactPrefs[key]);
    const targetVal = !currentVal;

    // Validate if enabling a channel that requires specific contact info
    if (targetVal) {
      if (key === 'whatsapp' && !whatsappNumber?.trim()) {
        toast.error('Please enter a WhatsApp contact number before enabling the WhatsApp channel.');
        return;
      }
      if (key === 'phoneCalls' && !phone?.trim()) {
        toast.error('Please enter a business phone number before enabling phone calls.');
        return;
      }
    }

    setContactPrefs((prev) => ({ ...prev, [key]: targetVal }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile({
        name,
        phone,
        whatsappNumber,
        agency,
        city,
        reraNumber,
        avatar,
        contactPreferences: contactPrefs,
      });

      setSaved(true);
      toast.success('Agent profile updated across workspace');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err.message || 'Failed to update agent profile');
    }
  };

  const handleRequestDeletion = async (e) => {
    e.preventDefault();
    setSubmittingDeletion(true);
    try {
      await requestAgentAccountDeletion({
        agentId: user?.id,
        reason: deletionReason,
      });
      setShowDeletionModal(false);
      setDeletionReason('');
      toast.success('Account deletion request submitted for Admin review.');
    } catch (err) {
      alert(err.message || 'Failed to submit account deletion request.');
    } finally {
      setSubmittingDeletion(false);
    }
  };

  return (
    <DashboardLayout role="agent">
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="pb-4 border-b border-charcoal/10">
          <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
            Professional Identity & Practice
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
            Agent Profile & Credentials
          </h1>
        </div>

        {saved && (
          <div className="p-4 rounded-xl bg-sand/40 border border-deep-purple/30 text-charcoal text-xs font-mono uppercase tracking-wider flex items-center gap-2">
            <Check className="w-4 h-4 text-deep-purple" />
            <span>Agent profile saved and synchronized successfully.</span>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (col-span-2): Professional Details, Communications, and Password */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Details Form */}
            <form
              id="credentials-section"
              onSubmit={handleSave}
              className="p-6 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <h3 className="font-serif text-xl text-deep-purple font-medium">
                  Representative Details
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60">
                  Shared Profile
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Representative Agent Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Brokerage Agency / Firm Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={agency}
                      onChange={(e) => setAgency(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Professional System Email (Read-only)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || 'agent@demo.com'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-sand/40 border border-charcoal/15 font-sans text-sm text-dark-gray/60 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Business Phone Line
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Direct WhatsApp Contact
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        placeholder="+91 98470 12345"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      State RERA Registration No.
                    </label>
                    <div className="relative">
                      <FileText className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={reraNumber}
                        onChange={(e) => setReraNumber(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-xs text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Primary Operating City
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 cursor-pointer"
                      >
                        {CANONICAL_CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Client Communication Channels */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-xs uppercase tracking-wider text-charcoal/80">
                      Inbound Client Channels
                    </div>
                    <span className="font-mono text-[10px] text-dark-gray/60">
                      Synchronized with public Contact Agent modal
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        key: 'whatsapp',
                        label: 'WhatsApp Direct',
                        desc: 'Opens direct WhatsApp chat with prospective buyers and tenants.',
                        detail: whatsappNumber,
                        reqMsg: 'Requires WhatsApp number',
                      },
                      {
                        key: 'inAppChat',
                        label: 'In-App Messaging',
                        desc: 'Official platform inquiry threads & negotiation records.',
                        detail: 'Active system thread',
                        reqMsg: null,
                      },
                      {
                        key: 'phoneCalls',
                        label: 'Telephone Voice',
                        desc: 'Direct voice calls to your verified business telephone line.',
                        detail: phone,
                        reqMsg: 'Requires business phone',
                      },
                      {
                        key: 'emailAlerts',
                        label: 'Email Inquiries',
                        desc: 'Instant dispatch notifications sent to your registered email.',
                        detail: user?.email,
                        reqMsg: null,
                      },
                    ].map((item) => {
                      const isEnabled = Boolean(contactPrefs[item.key]);
                      const hasDetail = Boolean(item.detail?.trim?.() ?? item.detail);

                      return (
                        <div
                          key={item.key}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                            isEnabled
                              ? 'bg-deep-purple/5 border-deep-purple/30 text-charcoal'
                              : 'bg-sand/20 border-charcoal/15 text-dark-gray/60'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-mono text-xs font-semibold text-charcoal">
                                {item.label}
                              </span>
                              <span
                                className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-medium ${
                                  isEnabled
                                    ? 'bg-deep-purple text-white border-deep-purple'
                                    : 'bg-sand/70 text-charcoal/70 border-charcoal/20'
                                }`}
                              >
                                {isEnabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                            <p className="font-sans text-xs text-dark-gray/70 leading-relaxed">
                              {item.desc}
                            </p>
                            {item.reqMsg && !hasDetail && (
                              <div className="font-mono text-[10px] text-amber-800 mt-1">
                                ⚠ {item.reqMsg}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-charcoal/10">
                            <span className="font-mono text-[11px] text-dark-gray/60 truncate max-w-[180px]">
                              {item.detail || 'Not configured'}
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isEnabled}
                              onClick={() => handleTogglePref(item.key)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                isEnabled ? 'bg-deep-purple' : 'bg-charcoal/20'
                              }`}
                            >
                              <span className="sr-only">Toggle {item.label}</span>
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer min-h-[44px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Agent Profile</span>
                </button>
              </div>
            </form>

            {/* Change Password Card */}
            <ChangePasswordCard />
          </div>

          {/* Right Column (col-span-1): Profile Photo & Admin-Controlled Verification Status */}
          <div className="space-y-6">
            {/* Photo Card */}
            <div
              id="avatar-section"
              className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-4"
            >
              <div className="pb-2 border-b border-charcoal/10">
                <h3 className="font-serif text-lg text-deep-purple font-medium">
                  Professional Headshot
                </h3>
                <p className="font-sans text-xs text-dark-gray/60 mt-0.5">
                  Displayed on your published residences, property walkthrough receipts, and client messaging threads.
                </p>
              </div>

              <ProfilePhotoUploader
                currentAvatar={avatar}
                userName={name}
                onAvatarChange={handleAvatarChange}
              />
            </div>

            {/* Admin-Controlled RERA Verification Status */}
            <div
              className={`p-5 rounded-2xl border shadow-xs space-y-3.5 ${
                isVerified
                  ? 'bg-deep-purple/5 border-deep-purple/20 text-charcoal'
                  : 'bg-sand/40 border-charcoal/15 text-charcoal'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-deep-purple" />
                  <span className="font-mono text-xs uppercase tracking-wider text-charcoal font-semibold">
                    RERA Status
                  </span>
                </div>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border font-semibold ${
                    isVerified
                      ? 'bg-deep-purple text-white border-deep-purple'
                      : 'bg-sand/70 text-charcoal/80 border-charcoal/20'
                  }`}
                >
                  {isVerified ? 'Verified Partner' : 'Audit Pending'}
                </span>
              </div>

              <div className="space-y-1.5 font-sans text-xs leading-relaxed text-dark-gray/80">
                <p>
                  {isVerified
                    ? 'Your brokerage license has been confirmed by Porch Light Administration. You are authorized to publish live residences and request showcase promotions.'
                    : 'Your brokerage credentials are currently awaiting review by administration. Verification is required before submitted residences go live.'}
                </p>
                <div className="pt-2 border-t border-charcoal/10 font-mono text-[11px] text-dark-gray/60 space-y-0.5">
                  <div>Role: Certified Real Estate Partner</div>
                  <div>Authority: Exclusively managed by Admin</div>
                  <div>Account ID: {user?.id}</div>
                </div>
              </div>
            </div>

            {/* Client Star Ratings & Reputation Card */}
            <div className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-4">
              <div className="pb-2 border-b border-charcoal/10 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg text-deep-purple font-medium">
                    Client Star Ratings
                  </h3>
                  <p className="font-sans text-xs text-dark-gray/60 mt-0.5">
                    Recorded exclusively from completed acquisitions and lease deposits.
                  </p>
                </div>
                <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
              </div>

              {ratingData.count > 0 ? (
                <div className="space-y-4">
                  {/* Metric summary */}
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-4xl text-deep-purple font-semibold">
                      {ratingData.formattedAverage || (ratingData.average ? Number(ratingData.average).toFixed(1) : '—')}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= Math.round(Number(ratingData.average) || 0)
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-charcoal/20'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-xs text-dark-gray/60">
                      ({ratingData.count} verified {ratingData.count === 1 ? 'rating' : 'ratings'})
                    </span>
                  </div>

                  {/* 5-Star Distribution Breakdown */}
                  <div className="space-y-1.5 pt-2 border-t border-charcoal/10">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const count = ratingData.distribution?.[stars] || 0;
                      const pct = ratingData.count > 0 ? Math.round((count / ratingData.count) * 100) : 0;
                      return (
                        <div key={stars} className="flex items-center gap-2 font-mono text-[11px] text-charcoal/80">
                          <span className="w-8 shrink-0">{stars} ★</span>
                          <div className="flex-1 h-2 rounded-full bg-sand/80 overflow-hidden">
                            <div
                              className="h-full bg-deep-purple rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right font-medium text-dark-gray/60">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-sand/20 border border-charcoal/10 text-center space-y-2">
                  <Star className="w-6 h-6 text-dark-gray/30 mx-auto" />
                  <div className="font-serif text-sm text-charcoal">No ratings recorded yet</div>
                  <p className="font-sans text-[11px] text-dark-gray/60 max-w-xs mx-auto leading-relaxed">
                    Verified star ratings appear here automatically after clients complete acquisitions or lease transactions for your residences.
                  </p>
                </div>
              )}
            </div>

            {/* Governance Safeguard Note */}
            <div className="p-5 rounded-2xl bg-sand/20 border border-charcoal/10 shadow-xs space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-charcoal/80 font-medium">
                <Shield className="w-4 h-4 text-deep-purple" />
                <span>Governance & Verification</span>
              </div>
              <p className="font-sans text-xs text-dark-gray/70 leading-relaxed">
                Agents cannot self-verify or modify system roles. Updates to state RERA registration numbers are submitted to the platform governance audit queue.
              </p>
            </div>
          </div>
        </div>

        {/* Full-Width Row at Bottom: Danger Zone / Request Account Deletion */}
        <div
          id="danger-zone"
          className="w-full p-6 rounded-2xl bg-rose-50/70 border border-rose-300 shadow-xs space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-rose-100 border border-rose-200 text-rose-800 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-rose-700" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg text-rose-950 font-medium">
                Danger Zone: Agency Account Deletion
              </h3>
              <p className="font-sans text-xs text-rose-900/80 leading-relaxed max-w-3xl">
                Agency accounts cannot be deleted immediately. Submitting an Account Deletion Request routes your request to Porch Light Administrators for legal compliance review. Deletion cannot be approved while you have active obligations such as published listings, active tenant leases, pending visit walkthroughs, unsettled transactions, or unresolved showcase promotion requests.
              </p>
            </div>
          </div>

          {pendingRequest ? (
            <div className="p-4 rounded-xl bg-sand/60 border border-charcoal/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-mono text-charcoal">
                <Clock className="w-4 h-4 text-deep-purple" />
                <span>
                  Account Deletion Request Under Admin Review • Submitted on{' '}
                  {new Date(pendingRequest.submittedAt).toLocaleDateString()}
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-deep-purple/10 text-deep-purple border border-deep-purple/20">
                Status: Pending Moderation
              </span>
            </div>
          ) : (
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-rose-200">
              <div className="font-mono text-[11px] uppercase tracking-wider text-rose-800/80">
                {obligations.eligible ? (
                  <span>No active obligations • Eligible for admin review submission</span>
                ) : (
                  <span>
                    {obligations.obligationsCount} active {obligations.obligationsCount === 1 ? 'obligation' : 'obligations'} must be resolved before approval
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowDeletionModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer min-h-[44px] self-start sm:self-auto"
              >
                <Trash2 className="w-4 h-4" />
                <span>Request Account Deletion</span>
              </button>
            </div>
          )}
        </div>

        {/* Request Deletion Modal */}
        {showDeletionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertTriangle className="w-5 h-5 text-rose-700" />
                  <h3 className="font-serif text-xl font-medium">Request Account Deletion</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeletionModal(false)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Specific Blocking Obligations Notice */}
                {!obligations.eligible ? (
                  <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                    <p className="font-sans text-xs font-medium text-rose-950">
                      Your deletion request cannot be approved by administration until the following active obligations are resolved:
                    </p>
                    <ul className="list-disc list-inside text-xs font-sans text-rose-900/90 space-y-1">
                      {obligations.reasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                    <div className="pt-2 flex items-center gap-2">
                      <Link
                        to="/agent/listings"
                        onClick={() => setShowDeletionModal(false)}
                        className="text-[11px] font-mono text-deep-purple hover:underline"
                      >
                        Manage Listings →
                      </Link>
                      <span className="text-dark-gray/40">•</span>
                      <Link
                        to="/agent/visits"
                        onClick={() => setShowDeletionModal(false)}
                        className="text-[11px] font-mono text-deep-purple hover:underline"
                      >
                        Manage Visits →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-sand/60 border border-deep-purple/20 text-xs font-sans text-charcoal/80 space-y-1">
                    <p className="font-semibold text-deep-purple">Obligations Clear:</p>
                    <p>
                      You have no active listings, leases, pending visits, or unsettled transactions. Your request will be queued for administrator review and final account decommissioning.
                    </p>
                  </div>
                )}

                <form onSubmit={handleRequestDeletion} className="space-y-3">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1">
                      Reason for Account Closure (Required for Admin audit)
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      placeholder="Please provide the business reason for requesting account closure (e.g. firm restructuring, market departure, RERA renewal change)..."
                      className="w-full p-3 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 resize-none"
                    />
                  </div>

                  <p className="font-sans text-[11px] text-dark-gray/60 leading-relaxed">
                    Note: Submitting this request notifies Porch Light Administrators. Upon approved deletion, your active listings and promotions will be archived, while historical user purchase records and receipts will be legally preserved without exposing your private credentials.
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                    <button
                      type="button"
                      onClick={() => setShowDeletionModal(false)}
                      className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingDeletion || !deletionReason.trim()}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {submittingDeletion ? 'Submitting...' : 'Submit Request to Admin'}
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

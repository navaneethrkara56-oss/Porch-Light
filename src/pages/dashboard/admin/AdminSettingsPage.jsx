import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProfilePhotoUploader } from '@/components/dashboard/ProfilePhotoUploader';
import { ChangePasswordCard } from '@/components/dashboard/ChangePasswordCard';
import { getPromotionConfig, updatePromotionConfig } from '@/services/promotions';
import { updateUserProfile } from '@/services/auth';
import {
  Settings,
  Shield,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  FileCheck,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminSettingsPage() {
  const { user } = useAuth();

  // Personal admin profile state
  const [adminName, setAdminName] = useState(user?.name || 'Administrator');
  const [adminPhone, setAdminPhone] = useState(user?.phone || '+91 99999 88888');
  const [adminCity, setAdminCity] = useState(user?.city || 'Bengaluru');
  const [avatar, setAvatar] = useState(user?.avatar || user?.profilePhoto || null);
  const [personalSaved, setPersonalSaved] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.name) setAdminName(user.name);
      if (user.phone) setAdminPhone(user.phone);
      if (user.city) setAdminCity(user.city);
      setAvatar(user.avatar || user.profilePhoto || null);
    }
  }, [user]);

  // Platform configuration state
  const [premiumFee, setPremiumFee] = useState(15000);
  const [featuredDurationDays, setFeaturedDurationDays] = useState(14);
  const [active, setActive] = useState(true);
  const [terms, setTerms] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleAvatarChange = async (newAvatar) => {
    setAvatar(newAvatar);
    try {
      await updateUserProfile({ avatar: newAvatar });
      toast.success('Admin profile photo updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update photo');
    }
  };

  useEffect(() => {
    getPromotionConfig().then((cfg) => {
      if (cfg) {
        setPremiumFee(cfg.premiumFee || cfg.fee || 15000);
        setFeaturedDurationDays(cfg.featuredDurationDays || 14);
        setActive(Boolean(cfg.active));
        setTerms(cfg.terms || '');
      }
    });
  }, []);

  const handlePersonalProfileSave = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile({
        name: adminName,
        phone: adminPhone,
        city: adminCity,
        avatar,
      });
      setPersonalSaved(true);
      toast.success('Admin personal profile synchronized');
      setTimeout(() => setPersonalSaved(false), 3000);
    } catch (err) {
      toast.error(err.message || 'Failed to update personal profile');
    }
  };

  const handleConfigSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSavingConfig(true);

    try {
      await updatePromotionConfig({
        fee: Number(premiumFee),
        premiumFee: Number(premiumFee),
        featuredDurationDays: Number(featuredDurationDays),
        active,
        terms,
      });
      setConfigSaved(true);
      toast.success('Platform configuration saved');
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update system parameters');
      toast.error(err.message || 'Failed to update system parameters');
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="pb-4 border-b border-charcoal/10">
          <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
            Governance & Platform Control
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
            Admin Profile & Platform Settings
          </h1>
        </div>

        {personalSaved && (
          <div className="p-4 rounded-xl bg-sand/40 border border-deep-purple/30 text-charcoal text-xs font-mono uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-deep-purple" />
            <span>Administrator profile details updated and synchronized.</span>
          </div>
        )}

        {configSaved && (
          <div className="p-4 rounded-xl bg-sand/40 border border-deep-purple/30 text-charcoal text-xs font-mono uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-deep-purple" />
            <span>Platform system promotion parameters updated successfully.</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
            {error}
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (col-span-2): Personal Profile + Platform System Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Administrator Personal Profile Details */}
            <form
              id="personal-details"
              onSubmit={handlePersonalProfileSave}
              className="p-6 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <h3 className="font-serif text-xl text-deep-purple font-medium flex items-center gap-2">
                  <User className="w-5 h-5 text-deep-purple" />
                  <span>Personal Profile Details</span>
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60">
                  Shared Profile
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Administrator Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Registered System Email (Read-only)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || 'admin@demo.com'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-sand/40 border border-charcoal/15 font-sans text-sm text-dark-gray/60 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Direct Emergency Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Headquarters Base City
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                      <select
                        value={adminCity}
                        onChange={(e) => setAdminCity(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 cursor-pointer"
                      >
                        <option value="Bengaluru">Bengaluru Headquarters</option>
                        <option value="Mumbai">Mumbai Operations</option>
                        <option value="Kochi">Kochi Hub</option>
                        <option value="Hyderabad">Hyderabad Regional</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer min-h-[44px]"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Admin Details</span>
                </button>
              </div>
            </form>

            {/* Change Password Card */}
            <ChangePasswordCard />

            {/* Section 2: Platform Settings & Parameters */}
            <form
              id="platform-parameters"
              onSubmit={handleConfigSave}
              className="p-6 rounded-2xl bg-porcelain border border-charcoal/15 shadow-xs space-y-5"
            >
              <div className="border-b border-charcoal/10 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl text-deep-purple font-medium flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span>Platform Settings & Moderation Parameters</span>
                  </h3>
                  <p className="font-sans text-xs text-dark-gray/60 mt-0.5">
                    Configure one-time Premium fees, default Featured showcase durations, and moderation parameters.
                  </p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sand/60 border border-charcoal/15 text-dark-gray/70">
                  Global System
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Parameter 1: One-Time Premium Promotion Fee */}
                  <div className="space-y-1">
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      One-Time Premium Promotion Fee (₹ INR)
                    </label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                      <input
                        type="number"
                        min="0"
                        step="500"
                        required
                        value={premiumFee}
                        onChange={(e) => setPremiumFee(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                      />
                    </div>
                    <span className="font-mono text-[11px] text-deep-purple block pt-0.5">
                      Permanent upgrade. No duration setting (Premium does not expire).
                    </span>
                  </div>

                  {/* Parameter 2: Default Featured Placement Duration */}
                  <div className="space-y-1">
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Default Featured Showcase Duration (Days)
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                      <input
                        type="number"
                        min="1"
                        max="90"
                        required
                        value={featuredDurationDays}
                        onChange={(e) => setFeaturedDurationDays(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-mono text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                      />
                    </div>
                    <span className="font-mono text-[11px] text-dark-gray/60 block pt-0.5">
                      Front-page 4-slot showcase window (1 to 90 days, default 14).
                    </span>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 p-3.5 rounded-xl bg-sand/40 border border-charcoal/15 cursor-pointer hover:bg-sand/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="w-4 h-4 rounded text-deep-purple focus:ring-deep-purple/30 accent-deep-purple cursor-pointer"
                    />
                    <div>
                      <div className="font-mono text-xs uppercase tracking-wider text-charcoal font-medium">
                        Accept Inbound Partner Upgrade & Showcase Requests
                      </div>
                      <div className="font-sans text-xs text-dark-gray/60">
                        When enabled, verified partner agents can submit listings for permanent Premium status or 4-slot Home showcase curation.
                      </div>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Architectural Curation Terms & Guidelines
                  </label>
                  <textarea
                    rows={3}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Enter placement standards and architectural review criteria..."
                    className="w-full p-3 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-xs text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer min-h-[44px] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingConfig ? 'Saving...' : 'Save Platform Parameters'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column (col-span-1): Profile Photo, Privileged Role & Governance */}
          <div className="space-y-6">
            {/* Photo Card */}
            <div
              id="avatar-section"
              className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-4"
            >
              <div className="pb-2 border-b border-charcoal/10">
                <h4 className="font-serif text-lg text-deep-purple font-medium">
                  Administrator Avatar
                </h4>
                <p className="font-mono text-xs text-dark-gray/60">
                  Visible in administrative action logs and concierge replies.
                </p>
              </div>

              <ProfilePhotoUploader
                currentAvatar={avatar}
                onAvatarChange={handleAvatarChange}
                role="admin"
              />
            </div>

            {/* Privileged Access Notice */}
            <div className="p-5 rounded-2xl bg-deep-purple/5 border border-deep-purple/20 space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-deep-purple font-semibold">
                <Shield className="w-4 h-4 text-deep-purple" />
                <span>Privileged Role Boundary</span>
              </div>
              <p className="font-sans text-xs text-dark-gray/80 leading-relaxed">
                Administrator accounts possess sovereign oversight across the catalog, agent verifications, financial ledgers, and platform parameters. Role reassignment is immutable and cannot be elevated via self-service signup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
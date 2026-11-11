import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardBackButton } from '@/components/dashboard/DashboardBackButton';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { ProfilePhotoUploader } from '@/components/dashboard/ProfilePhotoUploader';
import { ChangePasswordCard } from '@/components/dashboard/ChangePasswordCard';
import { canDeleteAccount, deleteOrDeactivateAccount, updateUserProfile } from '@/services/auth';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Check,
  Save,
  AlertTriangle,
  X,
  Trash2,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function UserProfilePage() {
  const { user, loading: authLoading, error: authError, refreshUser } = useAuth();
  const navigate = useNavigate();

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [city, setCity] = useState(user?.city || 'Bengaluru');
  const [avatar, setAvatar] = useState(user?.avatar || user?.profilePhoto || null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.phone) setPhone(user.phone);
      if (user.city) setCity(user.city);
      setAvatar(user.avatar || user.profilePhoto || null);
    }
  }, [user]);

  // Account deletion / deactivation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionBlockedState, setDeletionBlockedState] = useState(null); // { reasons: string[] }
  const [deactivating, setDeactivating] = useState(false);

  const handleAvatarChange = async (newAvatar) => {
    setAvatar(newAvatar);
    try {
      await updateUserProfile({ avatar: newAvatar });
    } catch (err) {
      console.warn('Avatar update sync failed:', err.message);
      toast.error('Failed to sync avatar with profile.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile({
        name,
        phone,
        city,
        avatar,
      });
      setSaved(true);
      toast.success('Profile details saved');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initiateDeleteCheck = async () => {
    try {
      const check = await canDeleteAccount(user?.id);
      if (!check?.allowed) {
        setDeletionBlockedState(check);
        setShowDeleteModal(true);
      } else {
        setDeletionBlockedState(null);
        setShowDeleteModal(true);
      }
    } catch (err) {
      toast.error('Failed to check account deletion obligations');
    }
  };

  const handleConfirmDeactivate = async () => {
    setDeactivating(true);
    try {
      await deleteOrDeactivateAccount(user?.id);
      toast.success('Account deactivated and anonymized.');
      navigate('/');
    } catch (err) {
      alert(err.message || 'Failed to deactivate account.');
      setDeactivating(false);
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout role="user">
        <DashboardSkeleton type="profile" />
      </DashboardLayout>
    );
  }

  if (!user && !authLoading) {
    return (
      <DashboardLayout role="user">
        <div className="p-8 rounded-2xl bg-sand/30 border border-charcoal/15 text-center space-y-4 my-8 max-w-lg mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-700 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-serif text-lg text-charcoal">Profile unavailable</h3>
            <p className="font-sans text-xs text-dark-gray/70">
              {authError || 'Could not load your account credentials. Please try refreshing or sign in again.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => refreshUser ? refreshUser() : window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-deep-purple text-porcelain font-mono text-xs uppercase tracking-wider hover:bg-deep-purple/90 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-porcelain border border-charcoal/20 text-charcoal font-mono text-xs uppercase tracking-wider hover:bg-sand/40 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="user">
      <div className="space-y-6 max-w-6xl">
        {/* Contextual Back Navigation */}
        <div>
          <DashboardBackButton fallbackTo="/dashboard/overview" label="Back to Overview" />
        </div>

        {/* Header */}
        <div className="pb-4 border-b border-charcoal/10">
          <div className="font-mono text-xs uppercase tracking-widest text-dark-gray/60 mb-1">
            Account Preferences
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium">
            Profile & Settings
          </h1>
        </div>

        {saved && (
          <div className="p-4 rounded-xl bg-sand/40 border border-deep-purple/30 text-charcoal text-xs font-mono uppercase tracking-wider flex items-center gap-2">
            <Check className="w-4 h-4 text-deep-purple" />
            <span>Profile details updated successfully.</span>
          </div>
        )}

        {/* 2-Column Desktop Grid: Profile & Security on Left, Photo & Identity on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column (col-span-2): Personal Details & Password Change */}
          <div className="lg:col-span-2 space-y-6">
            {/* Form: Profile Information */}
            <form
              id="personal-details"
              onSubmit={handleSave}
              className="p-6 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <h3 className="font-serif text-xl text-deep-purple font-medium">
                  Personal Details
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-dark-gray/60">
                  Shared Profile
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                    Registered Email Address (Read-only)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || 'user@demo.com'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-sand/40 border border-charcoal/15 font-sans text-sm text-dark-gray/60 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-charcoal/80 mb-1.5">
                      Primary Contact Number
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
                      Preferred Base City
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-dark-gray/40 absolute left-3.5 top-3" />
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal focus:outline-hidden focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 cursor-pointer"
                      >
                        <option value="Bengaluru">Bengaluru</option>
                        <option value="Kochi">Kochi</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Hyderabad">Hyderabad</option>
                        <option value="Pune">Pune</option>
                        <option value="Chennai">Chennai</option>
                        <option value="Kozhikode">Kozhikode</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer min-h-[44px] disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Details'}</span>
                </button>
              </div>
            </form>

            {/* Change Password Card */}
            <ChangePasswordCard />
          </div>

          {/* Right Column (col-span-1): Profile Photo, Immutable Role, and Identity Card */}
          <div className="space-y-6">
            {/* Photo Card */}
            <div
              id="avatar-section"
              className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-4"
            >
              <div className="pb-2 border-b border-charcoal/10">
                <h3 className="font-serif text-lg text-deep-purple font-medium">
                  Profile Avatar
                </h3>
                <p className="font-sans text-xs text-dark-gray/60 mt-0.5">
                  Your photo synchronizes automatically with the global header, sidebar, and verified agent conversations.
                </p>
              </div>

              <ProfilePhotoUploader
                currentAvatar={avatar}
                userName={name}
                onAvatarChange={handleAvatarChange}
              />
            </div>

            {/* Immutable Role Display Card */}
            <div className="p-5 rounded-2xl bg-sand/35 border border-charcoal/15 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-deep-purple" />
                  <span className="font-mono text-xs uppercase tracking-wider text-charcoal font-semibold">
                    Account Role
                  </span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-deep-purple text-white shadow-xs font-semibold">
                  User (Member)
                </span>
              </div>
              <p className="font-sans text-xs text-dark-gray/70 leading-relaxed">
                Role permissions are strictly system-assigned and immutable. Members have access to personal walkthrough scheduling, verified acquisitions, and lease tracking.
              </p>
            </div>

            {/* Legal Audit & Privacy Safeguard Note */}
            <div className="p-5 rounded-2xl bg-sand/20 border border-charcoal/10 shadow-xs space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-charcoal/80 font-medium">
                <FileCheck className="w-4 h-4 text-deep-purple" />
                <span>RERA Audit Preservation</span>
              </div>
              <p className="font-sans text-xs text-dark-gray/70 leading-relaxed">
                Platform records comply with statutory real estate governance. Account modifications reflect instantly in concierge inquiries and transaction ledgers.
              </p>
            </div>
          </div>
        </div>

        {/* Full-Width Row at Bottom: Danger Zone / Account Deactivation */}
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
                Danger Zone: Deactivate Member Account
              </h3>
              <p className="font-sans text-xs text-rose-900/80 leading-relaxed max-w-3xl">
                Deactivating your account strips personal identifying data (name, contact details, profile photo) while securely preserving legal transaction receipts and RERA property audit trails. Deactivation is strictly blocked while you have active obligations such as ongoing residential leases, pending payments, or unresolved visit walkthrough appointments.
              </p>
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-rose-200">
            <span className="font-mono text-[11px] uppercase tracking-wider text-rose-800/80">
              Destructive Action • Obligation Check & Confirmation Required
            </span>
            <button
              type="button"
              onClick={initiateDeleteCheck}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer min-h-[44px] self-start sm:self-auto"
            >
              <Trash2 className="w-4 h-4" />
              <span>Deactivate Member Account</span>
            </button>
          </div>
        </div>

        {/* Account Deletion / Deactivation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-porcelain border border-charcoal/15 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10">
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertTriangle className="w-5 h-5 text-rose-700" />
                  <h3 className="font-serif text-xl font-medium">
                    {deletionBlockedState ? 'Account Deactivation Blocked' : 'Confirm Account Deactivation'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1 rounded-lg text-charcoal/60 hover:text-charcoal hover:bg-sand/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {deletionBlockedState ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
                    <p className="font-sans text-xs font-medium text-rose-950">
                      Your account cannot be deactivated at this time due to active legal or transaction obligations:
                    </p>
                    <ul className="list-disc list-inside text-xs font-sans text-rose-900/90 space-y-1">
                      {deletionBlockedState.reasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <p className="font-sans text-xs text-dark-gray/70">
                    Active obligations such as ongoing residential leases, pending transactions, or scheduled visits must be completed or cancelled before your account can be closed. If you need assistance, please submit a concierge support ticket.
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                    <Link
                      to="/dashboard/properties"
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal"
                    >
                      View Properties
                    </Link>
                    <Link
                      to="/dashboard/complaints"
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 rounded-xl bg-deep-purple text-white hover:bg-deep-purple/90 font-mono text-xs uppercase tracking-wider shadow-xs"
                    >
                      Contact Support
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="font-sans text-xs text-charcoal/80 leading-relaxed">
                    Are you sure you want to deactivate your Porch Light account?
                  </p>
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-sans text-rose-950 space-y-1.5">
                    <p className="font-medium text-rose-950">Data Preservation & Privacy Guarantee:</p>
                    <p>
                      • Your personal profile details (full name, phone, avatar) will be anonymized.
                    </p>
                    <p>
                      • Completed purchase receipts and ended lease contracts will remain preserved in historical audit databases as required by RERA transparency guidelines.
                    </p>
                    <p>• You will be immediately logged out upon confirmation.</p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10">
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 rounded-xl bg-sand/60 hover:bg-sand border border-charcoal/15 font-mono text-xs uppercase tracking-wider text-charcoal cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deactivating}
                      onClick={handleConfirmDeactivate}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs uppercase tracking-wider transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

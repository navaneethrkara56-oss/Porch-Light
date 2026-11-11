import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { GoogleLoginButton } from '@/components/ui/GoogleLoginButton';
import { AuthBrandLogo } from '@/components/brand/AuthBrandLogo';
import { getRegisterDraft, setRegisterDraft, clearRegisterDraft } from '@/features/auth/authDrafts';
import {
  User,
  Building2,
  Mail,
  Lock,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();

  const initialDraft = getRegisterDraft();
  const [activeTab, setActiveTab] = useState(initialDraft.activeTab || 'user'); // 'user' | 'agent'
  const [showPassword, setShowPassword] = useState(false);
  const [licenseUploaded, setLicenseUploaded] = useState(initialDraft.licenseUploaded || false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: initialDraft,
  });

  // Automatically preserve entered values and tab state across tab navigation
  useEffect(() => {
    setRegisterDraft({ activeTab, licenseUploaded });
  }, [activeTab, licenseUploaded]);

  useEffect(() => {
    const subscription = watch((values) => {
      setRegisterDraft(values);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const onSubmit = async (data) => {
    try {
      await registerAuth({
        ...data,
        role: activeTab,
        licenseDocument: activeTab === 'agent' && licenseUploaded ? 'rera_license_certificate.pdf' : '',
      });
      clearRegisterDraft();

      if (activeTab === 'agent') {
        toast.success('Agent profile submitted. Account is pending verification.');
        navigate('/agent/overview');
      } else {
        toast.success('Welcome to Porch Light.');
        navigate('/dashboard/overview');
      }
    } catch (err) {
      // error handled in auth context
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-72px)] w-full flex items-center justify-center p-4 sm:p-6 lg:py-5 lg:px-6 overflow-x-hidden">
      {/* Translucent, softly blurred Porch Light form container (slightly more transparent for subtle shader reveal) */}
      <div
        className={`relative z-10 w-full transition-[max-width] duration-300 ${
          activeTab === 'agent' ? 'max-w-4xl' : 'max-w-xl'
        } bg-porcelain/75 backdrop-blur-md border border-dark-gray/20 rounded-3xl shadow-2xl p-5 sm:p-7 space-y-3.5`}
      >
        {/* Compact Header with supplied Porch Light website logo */}
        <div className="flex flex-col items-center text-center">
          <AuthBrandLogo />
          <div className="font-mono text-[10px] uppercase text-heather-purple tracking-widest mb-0.5">
            Membership Registration
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-deep-purple tracking-tight leading-tight">
            Create an Account
          </h1>
          <p className="font-sans text-xs text-dark-gray/70 mt-0.5 max-w-sm">
            Join Porch Light for verified architectural sanctuaries and direct connections.
          </p>
        </div>

        {/* Accessible User vs Agent Tab Switcher */}
        <div
          role="tablist"
          aria-label="Account Type"
          className="flex rounded-2xl bg-white/60 border border-dark-gray/15 p-1 shadow-inner max-w-md mx-auto"
        >
          <button
            type="button"
            role="tab"
            id="tab-user"
            aria-selected={activeTab === 'user'}
            aria-controls="panel-user"
            onClick={() => setActiveTab('user')}
            className={`flex-1 py-1.5 px-3 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
              activeTab === 'user'
                ? 'bg-deep-purple text-white shadow-xs font-semibold'
                : 'text-dark-gray/70 hover:text-dark-gray hover:bg-black/[0.03]'
            }`}
          >
            User
          </button>
          <button
            type="button"
            role="tab"
            id="tab-agent"
            aria-selected={activeTab === 'agent'}
            aria-controls="panel-agent"
            onClick={() => setActiveTab('agent')}
            className={`flex-1 py-1.5 px-3 text-xs font-mono uppercase tracking-wider rounded-xl transition-all ${
              activeTab === 'agent'
                ? 'bg-deep-purple text-white shadow-xs font-semibold'
                : 'text-dark-gray/70 hover:text-dark-gray hover:bg-black/[0.03]'
            }`}
          >
            Agent
          </button>
        </div>

        {/* Registration Form */}
        <form
          id={activeTab === 'user' ? 'panel-user' : 'panel-agent'}
          role="tabpanel"
          aria-labelledby={activeTab === 'user' ? 'tab-user' : 'tab-agent'}
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3.5"
        >
          {activeTab === 'agent' ? (
            /* AGENT REGISTRATION: 2-column balanced grid on large screens */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">
              {/* Left Column: Account & Contact Info */}
              <div className="space-y-3">
                <div className="font-mono text-[11px] uppercase tracking-wider text-deep-purple font-bold flex items-center gap-1.5 pb-0.5 border-b border-dark-gray/10">
                  <User className="w-3.5 h-3.5" />
                  1. Account & Contact
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3 w-4 h-4 text-dark-gray/40 pointer-events-none" />
                      <input
                        type="text"
                        {...register('name', { required: 'Full name is required' })}
                        placeholder="e.g. Diya Menon"
                        autoComplete="name"
                        className="w-full bg-white/80 border border-dark-gray/25 rounded-xl pl-9 pr-3 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                      />
                    </div>
                    {errors.name && (
                      <span className="font-mono text-[10px] text-rose-600 block mt-0.5">
                        {errors.name.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                      Base City
                    </label>
                    <div className="relative flex items-center">
                      <MapPin className="absolute left-3 w-4 h-4 text-dark-gray/40 pointer-events-none" />
                      <input
                        type="text"
                        {...register('city', { required: 'Base city is required' })}
                        placeholder="e.g. Bengaluru, Kochi"
                        autoComplete="address-level2"
                        className="w-full bg-white/80 border border-dark-gray/25 rounded-xl pl-9 pr-3 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                      />
                    </div>
                    {errors.city && (
                      <span className="font-mono text-[10px] text-rose-600 block mt-0.5">
                        {errors.city.message}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-dark-gray/40 pointer-events-none" />
                    <input
                      type="email"
                      {...register('email', {
                        required: 'Email address is required',
                        pattern: {
                          value: /^\S+@\S+$/i,
                          message: 'Enter a valid email address',
                        },
                      })}
                      placeholder="diya@example.com"
                      autoComplete="email"
                      className="w-full bg-white/80 border border-dark-gray/25 rounded-xl pl-9 pr-3 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                    />
                  </div>
                  {errors.email && (
                    <span className="font-mono text-[10px] text-rose-600 block mt-0.5">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                      Password
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3 w-4 h-4 text-dark-gray/40 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 6,
                            message: 'At least 6 characters',
                          },
                        })}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full bg-white/80 border border-dark-gray/25 rounded-xl pl-9 pr-9 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 text-dark-gray/50 hover:text-dark-gray p-1 focus:outline-none focus:text-deep-purple"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <span className="font-mono text-[10px] text-rose-600 block mt-0.5">
                        {errors.password.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                      Phone Number
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="absolute left-3 w-4 h-4 text-dark-gray/40 pointer-events-none" />
                      <input
                        type="tel"
                        {...register('phone')}
                        placeholder="+91 98765 00000"
                        autoComplete="tel"
                        className="w-full bg-white/80 border border-dark-gray/25 rounded-xl pl-9 pr-3 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Navigation Link docked on left side */}
                <div className="pt-2 text-center">
                  <p className="font-mono text-[13px] sm:text-sm text-dark-gray/80 leading-relaxed">
                    Already registered?{' '}
                    <Link
                      to="/login"
                      className="text-deep-purple font-bold underline underline-offset-4 decoration-deep-purple/40 hover:decoration-deep-purple hover:text-charcoal focus:outline-none focus:ring-2 focus:ring-deep-purple/30 rounded px-1.5 py-1 inline-block transition-all"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              </div>

              {/* Right Column: Licensure & Brokerage Information */}
              <div className="space-y-3">
                <div className="font-mono text-[11px] uppercase tracking-wider text-deep-purple font-bold flex items-center gap-1.5 pb-0.5 border-b border-dark-gray/10">
                  <Building2 className="w-3.5 h-3.5" />
                  2. Brokerage & Licensure
                </div>

                <div className="p-3.5 rounded-2xl bg-white/60 border border-dark-gray/15 space-y-2.5">
                  <div>
                    <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                      Agency / Brokerage Name
                    </label>
                    <input
                      type="text"
                      {...register('agency', {
                        required: activeTab === 'agent' ? 'Agency name is required' : false,
                      })}
                      placeholder="e.g. Malabar Living"
                      autoComplete="organization"
                      className="w-full bg-white border border-dark-gray/25 rounded-xl px-3 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                    />
                    {errors.agency && (
                      <span className="font-mono text-[10px] text-rose-600 block mt-0.5">
                        {errors.agency.message}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                      Agent RERA Certificate Number
                    </label>
                    <input
                      type="text"
                      {...register('reraNumber')}
                      placeholder="e.g. AGT/KA/RERA/2024/091"
                      className="w-full bg-white border border-dark-gray/25 rounded-xl px-3 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                    />
                  </div>

                  {/* Mock License Upload Card */}
                  <div>
                    <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                      RERA License Attachment (PDF / JPG)
                    </label>
                    <button
                      type="button"
                      onClick={() => setLicenseUploaded(true)}
                      className="w-full border border-dashed border-dark-gray/30 rounded-xl p-2.5 text-center bg-white/50 hover:bg-white hover:border-deep-purple transition-all focus:outline-none focus:border-deep-purple"
                    >
                      {licenseUploaded ? (
                        <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-mono text-xs">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-semibold">rera_license_certificate.pdf (Attached)</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5 font-mono text-xs text-dark-gray/70">
                          <Upload className="w-3.5 h-3.5 text-deep-purple" />
                          <span>Click to attach license document</span>
                        </div>
                      )}
                    </button>
                    <span className="font-mono text-[10px] text-dark-gray/60 block mt-1 leading-tight">
                      Pending agent accounts can browse immediately, but require verification before publishing listings.
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="dark"
                  className="w-full py-2.5 mt-2 rounded-xl text-xs font-mono uppercase tracking-wider shadow-xs hover:shadow"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Profile...' : 'Register as Agent'}
                </Button>
              </div>
            </div>
          ) : (
            /* USER REGISTRATION: Compact balanced layout */
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3 w-4 h-4 text-dark-gray/40 pointer-events-none" />
                    <input
                      type="text"
                      {...register('name', { required: 'Full name is required' })}
                      placeholder="e.g. Diya Menon"
                      autoComplete="name"
                      className="w-full bg-white/80 border border-dark-gray/25 rounded-xl pl-9 pr-3 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                    />
                  </div>
                  {errors.name && (
                    <span className="font-mono text-[10px] text-rose-600 block mt-0.5">
                      {errors.name.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                    Base City
                  </label>
                  <div className="relative flex items-center">
                    <MapPin className="absolute left-3 w-4 h-4 text-dark-gray/40 pointer-events-none" />
                    <input
                      type="text"
                      {...register('city', { required: 'Base city is required' })}
                      placeholder="e.g. Bengaluru, Kochi"
                      autoComplete="address-level2"
                      className="w-full bg-white/80 border border-dark-gray/25 rounded-xl pl-9 pr-3 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                    />
                  </div>
                  {errors.city && (
                    <span className="font-mono text-[10px] text-rose-600 block mt-0.5">
                      {errors.city.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 w-4 h-4 text-dark-gray/40 pointer-events-none" />
                    <input
                      type="email"
                      {...register('email', {
                        required: 'Email address is required',
                        pattern: {
                          value: /^\S+@\S+$/i,
                          message: 'Enter a valid email address',
                        },
                      })}
                      placeholder="diya@example.com"
                      autoComplete="email"
                      className="w-full bg-white/80 border border-dark-gray/25 rounded-xl pl-9 pr-3 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                    />
                  </div>
                  {errors.email && (
                    <span className="font-mono text-[10px] text-rose-600 block mt-0.5">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                    Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3 w-4 h-4 text-dark-gray/40 pointer-events-none" />
                    <input
                      type="tel"
                      {...register('phone')}
                      placeholder="+91 98765 00000"
                      autoComplete="tel"
                      className="w-full bg-white/80 border border-dark-gray/25 rounded-xl pl-9 pr-3 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-mono text-[11px] uppercase text-dark-gray/80 mb-1 block">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-4 h-4 text-dark-gray/40 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'At least 6 characters',
                      },
                    })}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full bg-white/80 border border-dark-gray/25 rounded-xl pl-9 pr-9 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 text-dark-gray/50 hover:text-dark-gray p-1 focus:outline-none focus:text-deep-purple"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <span className="font-mono text-[10px] text-rose-600 block mt-0.5">
                    {errors.password.message}
                  </span>
                )}
              </div>

              <Button
                type="submit"
                variant="dark"
                className="w-full py-2.5 mt-2 rounded-xl text-xs font-mono uppercase tracking-wider shadow-xs hover:shadow"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating Profile...' : 'Complete Registration'}
              </Button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-dark-gray/15 w-full" />
                <span className="bg-porcelain px-2.5 font-mono text-[9px] uppercase text-dark-gray/50 absolute">
                  or continue with
                </span>
              </div>

              {/* Social Login */}
              <div className="space-y-1.5">
                <GoogleLoginButton onSuccess={() => navigate('/')} />
                <p className="font-mono text-[11px] text-dark-gray/70 text-center tracking-tight">
                  Google sign-in is available for User accounts only.
                </p>
              </div>

              {/* High-visibility Footer Navigation Link */}
              <div className="pt-3 pb-0.5 text-center">
                <p className="font-mono text-[13px] sm:text-sm text-dark-gray/80 leading-relaxed">
                  Already registered?{' '}
                  <Link
                    to="/login"
                    className="text-deep-purple font-bold underline underline-offset-4 decoration-deep-purple/40 hover:decoration-deep-purple hover:text-charcoal focus:outline-none focus:ring-2 focus:ring-deep-purple/30 rounded px-1.5 py-1 inline-block transition-all"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

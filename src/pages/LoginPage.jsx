import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { GoogleLoginButton } from '@/components/ui/GoogleLoginButton';
import { AuthBrandLogo } from '@/components/brand/AuthBrandLogo';
import { getLoginDraft, setLoginDraft, clearLoginDraft } from '@/features/auth/authDrafts';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const initialDraft = getLoginDraft();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: initialDraft,
  });

  // Automatically preserve entered values across tab navigation
  useEffect(() => {
    const subscription = watch((values) => {
      setLoginDraft(values);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const onSubmit = async (data) => {
    try {
      const u = await login(data);
      clearLoginDraft();
      const destination =
        u.role === 'admin'
          ? '/admin/overview'
          : u.role === 'agent'
          ? '/agent/overview'
          : '/dashboard/overview';
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
      navigate(destination, { replace: true });
    } catch (err) {
      // error toast handled in auth context
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-72px)] w-full flex items-center justify-center p-4 sm:p-6 lg:py-5 lg:px-6 overflow-x-hidden">
      {/* Translucent, softly blurred Porch Light form container (slightly more transparent for subtle shader reveal) */}
      <div className="relative z-10 w-full max-w-md bg-porcelain/75 backdrop-blur-md border border-dark-gray/20 rounded-3xl shadow-2xl p-5 sm:p-7 space-y-3.5 transition-colors">
        {/* Compact Header with supplied Porch Light website logo */}
        <div className="flex flex-col items-center text-center">
          <AuthBrandLogo />
          <div className="font-mono text-[10px] uppercase text-heather-purple tracking-widest mb-0.5">
            Quiet Sanctuary
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-deep-purple tracking-tight leading-tight">
            Sign in with email
          </h1>
          <p className="font-sans text-xs text-dark-gray/70 mt-0.5 max-w-xs">
            Access your saved sanctuaries, negotiations, and verified visits.
          </p>
        </div>

        {/* Primary Email / Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
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
                placeholder="user@demo.com"
                autoComplete="email"
                className="w-full bg-porcelain-tint border border-dark-gray/25 rounded-xl pl-9 pr-3 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
              />
            </div>
            {errors.email && (
              <span className="font-mono text-[10px] text-rose-600 block mt-0.5">
                {errors.email.message}
              </span>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-mono text-[11px] uppercase text-dark-gray/80">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="font-mono text-[10px] text-dark-gray/60 hover:text-deep-purple underline focus:outline-none focus:ring-1 focus:ring-deep-purple rounded"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-dark-gray/40 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', { required: 'Password is required' })}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-porcelain-tint border border-dark-gray/25 rounded-xl pl-9 pr-9 py-2 text-sm text-dark-gray placeholder:text-dark-gray/40 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 text-dark-gray/50 hover:text-dark-gray p-1 focus:outline-none focus:text-deep-purple cursor-pointer"
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
            className="w-full py-2.5 mt-1 rounded-xl text-xs font-mono uppercase tracking-wider shadow-xs hover:shadow"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Verifying...' : 'Sign In'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-dark-gray/15 w-full" />
          <span className="bg-porcelain px-2.5 font-mono text-[9px] uppercase text-dark-gray/50 absolute">
            or continue with
          </span>
        </div>

        {/* Exactly one social sign-in: Google */}
        <div className="space-y-1.5">
          <GoogleLoginButton
            onSuccess={() => {
              if (typeof window !== 'undefined') {
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
              }
              navigate('/dashboard/overview', { replace: true });
            }}
          />
          <p className="font-mono text-[11px] text-dark-gray/70 text-center tracking-tight">
            Google sign-in is available for User accounts only.
          </p>
        </div>

        {/* High-visibility Footer Navigation Link */}
        <div className="pt-3 pb-0.5 text-center">
          <p className="font-mono text-[13px] sm:text-sm text-dark-gray/80 leading-relaxed">
            No account yet?{' '}
            <Link
              to="/register"
              className="text-deep-purple font-bold underline underline-offset-4 decoration-deep-purple/40 hover:decoration-deep-purple hover:text-charcoal focus:outline-none focus:ring-2 focus:ring-deep-purple/30 rounded px-1.5 py-1 inline-block transition-all"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

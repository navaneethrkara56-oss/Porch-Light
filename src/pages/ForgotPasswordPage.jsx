import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Arch } from '@/components/shapes';
import { SmartImage } from '@/components/media/SmartImage';
import { Button } from '@/components/ui/Button';
import { CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { email: '' },
  });

  const onSubmit = async () => {
    setSubmitted(true);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Column */}
      <div className="lg:col-span-6 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          <div>
            <div className="font-mono text-xs uppercase text-heather-purple tracking-widest mb-1">
              Account Recovery
            </div>
            <h1 className="font-serif text-4xl text-deep-purple tracking-tight">
              Reset Password
            </h1>
            <p className="font-sans text-xs text-dark-gray/60 mt-1">
              Enter your registered email and we will send you secure access instructions.
            </p>
          </div>

          {submitted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
              <div className="font-serif text-xl text-emerald-900">
                Instructions Dispatched
              </div>
              <p className="font-mono text-xs text-emerald-800/80">
                If an account matches your email address, you will receive a reset link shortly.
              </p>
              <Link to="/login" className="block pt-2">
                <Button variant="dark" size="sm">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="font-mono text-xs uppercase text-dark-gray/70 mb-1.5 block">
                  Email Address
                </label>
                <input
                  type="email"
                  {...register('email', {
                    required: 'Email address is required',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Enter a valid email address',
                    },
                  })}
                  placeholder="e.g. user@demo.com"
                  className="w-full bg-porcelain border border-dark-gray/25 rounded-md px-3.5 py-2.5 text-sm text-dark-gray focus:outline-none focus:border-deep-purple"
                />
                {errors.email && (
                  <span className="font-mono text-[11px] text-rose-600 block mt-1">
                    {errors.email.message}
                  </span>
                )}
              </div>

              <Button
                type="submit"
                variant="dark"
                className="w-full py-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Recovery Instructions'}
              </Button>

              <div className="text-center font-mono text-xs text-dark-gray/60 pt-2">
                Remembered password?{' '}
                <Link to="/login" className="text-deep-purple underline">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right Column: Split Screen Arch Mask */}
      <div className="hidden lg:flex lg:col-span-6 items-center justify-center p-12 bg-porcelain-tint/50 border-l border-dark-gray/10 relative overflow-hidden">
        <Arch className="w-full max-w-md h-[540px] shadow-2xl relative">
          <SmartImage
            src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80"
            alt="Porch Light architecture"
            aspect="auto"
            eager
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-gray/80 via-transparent to-transparent flex flex-col justify-end p-8 text-porcelain">
            <span className="font-serif italic text-2xl text-porcelain mb-1">
              "We will keep the porch light lit."
            </span>
          </div>
        </Arch>
      </div>
    </div>
  );
}

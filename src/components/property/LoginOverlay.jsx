import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { GoogleLoginButton } from '@/components/ui/GoogleLoginButton';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { X, Lock } from 'lucide-react';

export function LoginOverlay({ isOpen, onClose, propertyTitle = 'this property' }) {
  const navigate = useNavigate();
  useBodyScrollLock(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pt-20 pb-6 px-4 sm:px-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-dark-gray/70 backdrop-blur-md transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="relative w-full max-w-md bg-porcelain border border-dark-gray/15 rounded-2xl p-8 sm:p-10 shadow-2xl z-10 text-center"
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-black/5 text-dark-gray/50 hover:text-dark-gray transition-colors"
              aria-label="Close overlay"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-deep-purple/10 text-deep-purple flex items-center justify-center mx-auto mb-4">
              <Lock className="w-5 h-5" />
            </div>

            <div className="font-mono text-[11px] uppercase tracking-widest text-heather-purple mb-1">
              Member Sanctuary
            </div>
            <h3 className="font-serif text-3xl text-deep-purple tracking-tight mb-3">
              Login to view this property
            </h3>
            <p className="font-sans text-sm text-dark-gray/70 leading-relaxed mb-6">
              Full architectural details, RERA documentation, and visit scheduling for <span className="font-semibold text-dark-gray">{propertyTitle}</span> are reserved for signed-in members.
            </p>

            <div className="space-y-3">
              <Button
                variant="dark"
                className="w-full py-3"
                onClick={() => navigate('/login')}
              >
                Sign In to Account
              </Button>

              <GoogleLoginButton onSuccess={onClose} />
            </div>

            <div className="mt-6 pt-5 border-t border-dark-gray/10 font-mono text-xs text-dark-gray/60">
              New to Porch Light?{' '}
              <Link to="/register" className="text-deep-purple underline font-bold">
                Create an account
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

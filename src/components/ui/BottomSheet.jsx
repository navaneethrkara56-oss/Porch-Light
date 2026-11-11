import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-dark-gray/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className={cn(
              'relative w-full max-h-[85dvh] bg-porcelain border-t border-border rounded-t-2xl shadow-2xl p-6 z-10 overflow-y-auto flex flex-col',
              className
            )}
          >
            {/* Grab handle indicator */}
            <div className="w-12 h-1 bg-dark-gray/20 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
              {title && (
                <h3 className="font-serif text-xl tracking-tight text-deep-purple">
                  {title}
                </h3>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-black/5 text-dark-gray/60 ml-auto"
                aria-label="Close sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

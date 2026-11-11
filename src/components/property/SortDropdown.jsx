import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowUpDown, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SortDropdown({
  value = 'featured',
  onChange,
  mode = 'sale',
  className = '',
}) {
  const isRent = mode === 'rent';
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom' });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const options = [
    { id: 'featured', label: isRent ? 'Curated Rentals' : 'Featured & Curated' },
    { id: 'newest', label: 'Newest First' },
    { id: 'price_asc', label: isRent ? 'Rent: Low to High' : 'Price: Low to High' },
    { id: 'price_desc', label: isRent ? 'Rent: High to Low' : 'Price: High to Low' },
    { id: 'area_asc', label: 'Area: Smallest First' },
    { id: 'area_desc', label: 'Area: Largest First' },
  ];

  const currentOption = options.find((o) => o.id === value) || options[0];

  // Calculate dynamic floating position relative to trigger and viewport
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 224; // 14rem = 224px
    const menuHeight = 252; // estimated menu height

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Open upward if tight below (< 260px) and more room above
    const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    let top = openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8;
    // Align right edge of menu with trigger right edge
    let left = rect.right - menuWidth;

    // Viewport boundary guardrails
    if (left < 12) {
      left = 12;
    } else if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }

    setPosition({
      top: Math.round(top),
      left: Math.round(left),
      placement: openUpward ? 'top' : 'bottom',
    });
  }, []);

  // Recalculate on open, window resize, and scroll
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    const currentIndex = options.findIndex((o) => o.id === value);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % options.length;
      onChange(options[nextIndex].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + options.length) % options.length;
      onChange(options[prevIndex].id);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  const menuVariants = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: {
          opacity: 0,
          y: position.placement === 'top' ? 6 : -6,
          scale: 0.98,
        },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: {
          opacity: 0,
          y: position.placement === 'top' ? 6 : -6,
          scale: 0.98,
        },
        transition: { duration: 0.16, ease: 'easeOut' },
      };

  return (
    <div className={cn('relative inline-block text-left shrink-0', className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) updatePosition();
          setIsOpen(!isOpen);
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Sort listings"
        className={cn(
          'h-11 px-4 rounded-full font-mono text-xs border flex items-center gap-2 transition-all duration-200 select-none cursor-pointer',
          isOpen
            ? 'bg-porcelain border-deep-purple ring-1 ring-deep-purple/30 text-deep-purple font-medium shadow-xs'
            : 'bg-porcelain border-dark-gray/20 text-charcoal hover:border-dark-gray/45'
        )}
      >
        <ArrowUpDown className="w-3.5 h-3.5 text-deep-purple shrink-0" />
        <span className="truncate max-w-[130px] sm:max-w-none">{currentOption.label}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-charcoal/50 transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180 text-deep-purple'
          )}
        />
      </button>

      {/* Floating Menu Portal — mounts directly into document.body to prevent any container clipping */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                {...menuVariants}
                ref={menuRef}
                role="listbox"
                tabIndex={-1}
                style={{
                  position: 'fixed',
                  top: `${position.top}px`,
                  left: `${position.left}px`,
                  zIndex: 9999,
                }}
                className="w-56 rounded-2xl bg-porcelain border border-dark-gray/20 shadow-2xl p-1.5 focus:outline-none select-none"
              >
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-charcoal/45 border-b border-dark-gray/10 mb-1">
                  Sort Sanctuaries
                </div>
                {options.map((option) => {
                  const isSelected = option.id === value;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(option.id);
                        setIsOpen(false);
                        triggerRef.current?.focus();
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-deep-purple text-porcelain font-medium'
                          : 'text-charcoal hover:bg-black/5 focus:bg-black/5 focus:outline-none'
                      )}
                    >
                      <span>{option.label}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-electric-lemon shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { PROPERTY_TYPES, formatPropertyType } from '@/constants/propertyTypes';

export function PropertyTypeDropdown({
  value = 'apartment',
  onChange,
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, maxHeight: 320, placement: 'bottom' });
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionsRef = useRef([]);

  const currentOption = PROPERTY_TYPES.find((t) => t.value === value) || PROPERTY_TYPES[0];

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    const spaceBelow = windowHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;

    // Prefer opening downward when >= 200px space available below
    const shouldOpenDownward = spaceBelow >= 200 || spaceBelow >= spaceAbove;

    let computedMaxHeight;
    let computedTop;
    let placement;

    if (shouldOpenDownward) {
      placement = 'bottom';
      computedMaxHeight = Math.min(340, Math.max(160, spaceBelow - margin));
      computedTop = rect.bottom + margin;
    } else {
      placement = 'top';
      computedMaxHeight = Math.min(340, Math.max(160, spaceAbove - margin));
      computedTop = rect.top - computedMaxHeight - margin;
    }

    let left = rect.left;
    let width = rect.width;

    // Viewport guardrails
    if (left < 12) {
      left = 12;
    } else if (left + width > windowWidth - 12) {
      width = Math.min(width, windowWidth - 24);
      left = windowWidth - width - 12;
    }

    setCoords({
      top: Math.round(computedTop),
      left: Math.round(left),
      width: Math.round(width),
      maxHeight: Math.round(computedMaxHeight),
      placement,
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

  // Click outside to close
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
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange?.(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        const idx = PROPERTY_TYPES.findIndex((t) => t.value === value);
        setFocusedIndex(idx >= 0 ? idx : 0);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev < PROPERTY_TYPES.length - 1 ? prev + 1 : 0;
        optionsRef.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : PROPERTY_TYPES.length - 1;
        optionsRef.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < PROPERTY_TYPES.length) {
        handleSelect(PROPERTY_TYPES[focusedIndex].value);
      }
    }
  };

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => !prev);
          const idx = PROPERTY_TYPES.findIndex((t) => t.value === value);
          setFocusedIndex(idx >= 0 ? idx : 0);
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Property Classification"
        className={`w-full px-3.5 py-2.5 rounded-xl bg-porcelain-tint border border-charcoal/20 font-sans text-sm text-charcoal flex items-center justify-between cursor-pointer min-h-[44px] hover:border-charcoal/40 focus:outline-none focus:border-deep-purple transition-all ${
          isOpen ? 'ring-2 ring-deep-purple/20 border-deep-purple' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        <span className="font-medium truncate">{currentOption.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-charcoal/60 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 9999,
            }}
            className="rounded-xl bg-porcelain border border-charcoal/20 shadow-xl overflow-y-auto overscroll-contain py-1 animate-in fade-in zoom-in-95 duration-100"
          >
            {PROPERTY_TYPES.map((t, idx) => {
              const isSelected = t.value === value;
              const isFocused = focusedIndex === idx;

              return (
                <button
                  key={t.value}
                  ref={(el) => (optionsRef.current[idx] = el)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(t.value)}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`w-full px-3.5 py-2.5 text-left text-xs sm:text-sm font-sans flex items-center justify-between gap-2 cursor-pointer transition-colors min-h-[40px] ${
                    isSelected
                      ? 'bg-deep-purple/10 text-deep-purple font-medium'
                      : isFocused
                      ? 'bg-sand/50 text-charcoal'
                      : 'text-charcoal hover:bg-sand/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{t.label}</span>
                    {t.category && (
                      <span className="font-mono text-[10px] uppercase text-dark-gray/50 px-1.5 py-0.5 rounded bg-sand/60 shrink-0">
                        {t.category}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-deep-purple shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

export default PropertyTypeDropdown;


import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, RotateCcw, Check, ShieldCheck, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  SALE_PROPERTY_TYPES,
  RENT_PROPERTY_TYPES,
  formatPropertyType,
} from '@/constants/propertyTypes';
import { CANONICAL_CITIES } from '@/constants/cities';

const CITIES = [
  'All Cities',
  ...CANONICAL_CITIES,
];

const AMENITIES_LIST = [
  { id: 'parking', label: 'Covered Parking' },
  { id: 'security', label: '24/7 Security' },
  { id: 'powerBackup', label: 'Power Backup' },
  { id: 'gated', label: 'Gated Community' },
  { id: 'pool', label: 'Swimming Pool' },
  { id: 'gym', label: 'Fitness Centre' },
  { id: 'garden', label: 'Private Garden' },
  { id: 'clubhouse', label: 'Clubhouse' },
];

function formatPriceLabel(amount, isRent) {
  if (amount == null) return isRent ? 'No Limit' : 'No Limit';
  if (isRent) {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L/mo`;
    }
    return `₹${Math.round(amount / 1000)}k/mo`;
  }
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function PropertyFilterModal({
  isOpen,
  onClose,
  mode = 'sale',
  filters,
  onApply,
  onReset,
  triggerRef,
}) {
  const isRent = mode === 'rent';
  const propertyTypes = isRent ? RENT_PROPERTY_TYPES : SALE_PROPERTY_TYPES;
  const shouldReduceMotion = useReducedMotion();
  const modalBoxRef = useRef(null);

  // Local draft state so user can configure filters before applying
  const [draftFilters, setDraftFilters] = useState(filters);

  // Sync draft state on open
  useEffect(() => {
    if (isOpen) {
      setDraftFilters(filters);

      // Lock background page scroll
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener('keydown', handleKeyDown);
        if (triggerRef?.current) {
          triggerRef.current.focus();
        }
      };
    }
  }, [isOpen, filters, onClose, triggerRef]);

  // Price boundaries
  const minPriceLimit = isRent ? 15000 : 1000000;
  const maxPriceLimit = isRent ? 600000 : 150000000;
  const priceStep = isRent ? 5000 : 2500000;

  const currentMinPrice = draftFilters.minPrice != null ? draftFilters.minPrice : minPriceLimit;
  const currentMaxPrice = draftFilters.maxPrice != null ? draftFilters.maxPrice : maxPriceLimit;

  // Area boundaries (sqft)
  const minAreaLimit = 400;
  const maxAreaLimit = 12000;
  const areaStep = 200;

  const currentMinArea = draftFilters.minArea != null ? draftFilters.minArea : minAreaLimit;
  const currentMaxArea = draftFilters.maxArea != null ? draftFilters.maxArea : maxAreaLimit;

  const handleCitySelect = (c) => {
    setDraftFilters((prev) => ({
      ...prev,
      city: c === 'All Cities' ? '' : c,
    }));
  };

  const handleTypeToggle = (t) => {
    setDraftFilters((prev) => {
      const current = prev.type || [];
      const next = current.includes(t)
        ? current.filter((item) => item !== t)
        : [...current, t];
      return { ...prev, type: next };
    });
  };

  const handleAmenityToggle = (amId) => {
    setDraftFilters((prev) => {
      const current = prev.amenities || [];
      const next = current.includes(amId)
        ? current.filter((item) => item !== amId)
        : [...current, amId];
      return { ...prev, amenities: next };
    });
  };

  const handleApply = () => {
    onApply(draftFilters);
    onClose();
  };

  const handleLocalReset = () => {
    const cleared = {
      ...draftFilters,
      city: '',
      type: [],
      bedrooms: null,
      bathrooms: null,
      minPrice: null,
      maxPrice: null,
      minArea: null,
      maxArea: null,
      furnishing: '',
      amenities: [],
      possessionStatus: '',
      verifiedOnly: false,
    };
    setDraftFilters(cleared);
    onReset();
    onClose();
  };

  // Count active draft filters
  const activeCount = [
    Boolean(draftFilters.city && draftFilters.city !== 'All Cities'),
    Boolean(draftFilters.type && draftFilters.type.length > 0),
    Boolean(draftFilters.bedrooms),
    Boolean(draftFilters.bathrooms),
    Boolean(draftFilters.minPrice && draftFilters.minPrice > minPriceLimit),
    Boolean(draftFilters.maxPrice && draftFilters.maxPrice < maxPriceLimit),
    Boolean(draftFilters.minArea && draftFilters.minArea > minAreaLimit),
    Boolean(draftFilters.maxArea && draftFilters.maxArea < maxAreaLimit),
    Boolean(draftFilters.furnishing),
    Boolean(draftFilters.possessionStatus),
    Boolean(draftFilters.verifiedOnly),
    Boolean(draftFilters.amenities && draftFilters.amenities.length > 0),
  ].filter(Boolean).length;

  const modalVariants = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.97, y: 10 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: 10 },
        transition: { duration: 0.22, ease: 'easeOut' },
      };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-modal-title"
          className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-hidden"
        >
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-dark-gray/70 backdrop-blur-sm z-0"
          />

          {/* Modal Container Box */}
          <motion.div
            {...modalVariants}
            ref={modalBoxRef}
            className="relative z-10 w-full max-w-2xl bg-porcelain border border-dark-gray/20 rounded-t-[28px] sm:rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[86vh]"
          >
            {/* 1. Sticky Header */}
            <div className="px-6 py-4 sm:py-5 border-b border-dark-gray/10 flex items-center justify-between bg-porcelain shrink-0">
              <div>
                <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-heather-purple block mb-0.5">
                  Refine Search & Sanctuary Criteria
                </span>
                <h2
                  id="filter-modal-title"
                  className="font-serif text-2xl sm:text-[26px] text-deep-purple tracking-tight"
                >
                  {isRent ? 'Filter Rental Sanctuaries' : 'Filter Properties for Sale'}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close filters"
                className="p-2 rounded-full hover:bg-black/5 text-dark-gray/60 hover:text-dark-gray transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Scrollable Body Content */}
            <div className="px-6 py-6 overflow-y-auto overscroll-contain space-y-7 flex-1">
              {/* City Selection */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-semibold block">
                    City & Destination
                  </label>
                  {draftFilters.city && (
                    <button
                      type="button"
                      onClick={() => handleCitySelect('All Cities')}
                      className="font-mono text-[11px] text-heather-purple hover:text-deep-purple underline cursor-pointer"
                    >
                      Clear City
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map((c) => {
                    const isSelected =
                      (!draftFilters.city && c === 'All Cities') ||
                      draftFilters.city === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleCitySelect(c)}
                        className={cn(
                          'px-3.5 py-1.5 rounded-full font-mono text-xs border transition-all duration-200 cursor-pointer',
                          isSelected
                            ? 'bg-deep-purple text-porcelain border-deep-purple font-medium shadow-sm'
                            : 'bg-porcelain border-dark-gray/20 text-dark-gray/80 hover:border-dark-gray/45'
                        )}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Property Architecture & Type */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-semibold block">
                    Property Architecture & Type
                  </label>
                  {(draftFilters.type || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftFilters((prev) => ({ ...prev, type: [] }))}
                      className="font-mono text-[11px] text-heather-purple hover:text-deep-purple underline cursor-pointer"
                    >
                      Clear Types
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {propertyTypes.map((t) => {
                    const selected = (draftFilters.type || []).includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTypeToggle(t)}
                        className={cn(
                          'px-3.5 py-1.5 text-xs font-mono rounded-full capitalize border transition-all duration-200 cursor-pointer',
                          selected
                            ? 'bg-deep-purple text-porcelain border-deep-purple font-medium shadow-sm'
                            : 'bg-porcelain border-dark-gray/20 text-dark-gray/80 hover:border-dark-gray/45'
                        )}
                      >
                        {formatPropertyType(t)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Slider (Min and Max) */}
              <div className="bg-sand/40 p-5 rounded-2xl border border-dark-gray/10 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-semibold block">
                    {isRent ? 'Monthly Rent Budget' : 'Acquisition Budget Range'}
                  </label>
                  <span className="font-mono text-xs text-deep-purple font-bold">
                    {formatPriceLabel(draftFilters.minPrice, isRent)} —{' '}
                    {formatPriceLabel(draftFilters.maxPrice, isRent)}
                  </span>
                </div>

                {/* Min Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[11px] text-dark-gray/65">
                    <span>Minimum Price:</span>
                    <span className="font-semibold text-deep-purple">
                      {formatPriceLabel(currentMinPrice, isRent)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={minPriceLimit}
                    max={currentMaxPrice}
                    step={priceStep}
                    value={currentMinPrice}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        minPrice: Number(e.target.value) <= minPriceLimit ? null : Number(e.target.value),
                      }))
                    }
                    className="w-full accent-deep-purple cursor-pointer h-2 bg-dark-gray/15 rounded-lg"
                  />
                </div>

                {/* Max Slider */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between font-mono text-[11px] text-dark-gray/65">
                    <span>Maximum Price:</span>
                    <span className="font-semibold text-deep-purple">
                      {formatPriceLabel(currentMaxPrice, isRent)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={currentMinPrice}
                    max={maxPriceLimit}
                    step={priceStep}
                    value={currentMaxPrice}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        maxPrice: Number(e.target.value) >= maxPriceLimit ? null : Number(e.target.value),
                      }))
                    }
                    className="w-full accent-deep-purple cursor-pointer h-2 bg-dark-gray/15 rounded-lg"
                  />
                </div>
              </div>

              {/* Bedrooms & Bathrooms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Bedrooms */}
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-semibold mb-2.5 block">
                    Bedrooms (BHK)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDraftFilters((prev) => ({ ...prev, bedrooms: null }))}
                      className={cn(
                        'px-3.5 h-10 rounded-full font-mono text-xs border transition-all cursor-pointer',
                        !draftFilters.bedrooms
                          ? 'bg-deep-purple text-porcelain border-deep-purple font-medium shadow-sm'
                          : 'bg-porcelain border-dark-gray/20 text-dark-gray/80 hover:border-dark-gray/45'
                      )}
                    >
                      Any
                    </button>
                    {[1, 2, 3, 4, 5].map((bed) => {
                      const active = draftFilters.bedrooms === bed;
                      return (
                        <button
                          key={bed}
                          type="button"
                          onClick={() =>
                            setDraftFilters((prev) => ({
                              ...prev,
                              bedrooms: active ? null : bed,
                            }))
                          }
                          className={cn(
                            'w-10 h-10 rounded-full font-mono text-xs border flex items-center justify-center transition-all cursor-pointer',
                            active
                              ? 'bg-deep-purple text-porcelain border-deep-purple font-bold shadow-sm'
                              : 'bg-porcelain border-dark-gray/20 text-dark-gray/80 hover:border-dark-gray/45'
                          )}
                        >
                          {bed}+
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bathrooms */}
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-semibold mb-2.5 block">
                    Bathrooms
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDraftFilters((prev) => ({ ...prev, bathrooms: null }))}
                      className={cn(
                        'px-3.5 h-10 rounded-full font-mono text-xs border transition-all cursor-pointer',
                        !draftFilters.bathrooms
                          ? 'bg-deep-purple text-porcelain border-deep-purple font-medium shadow-sm'
                          : 'bg-porcelain border-dark-gray/20 text-dark-gray/80 hover:border-dark-gray/45'
                      )}
                    >
                      Any
                    </button>
                    {[1, 2, 3, 4].map((bath) => {
                      const active = draftFilters.bathrooms === bath;
                      return (
                        <button
                          key={bath}
                          type="button"
                          onClick={() =>
                            setDraftFilters((prev) => ({
                              ...prev,
                              bathrooms: active ? null : bath,
                            }))
                          }
                          className={cn(
                            'w-10 h-10 rounded-full font-mono text-xs border flex items-center justify-center transition-all cursor-pointer',
                            active
                              ? 'bg-deep-purple text-porcelain border-deep-purple font-bold shadow-sm'
                              : 'bg-porcelain border-dark-gray/20 text-dark-gray/80 hover:border-dark-gray/45'
                          )}
                        >
                          {bath}+
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Area Range (sq ft) */}
              <div className="bg-sand/40 p-5 rounded-2xl border border-dark-gray/10 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-semibold block">
                    Carpet / Built-Up Area (sq ft)
                  </label>
                  <span className="font-mono text-xs text-deep-purple font-bold">
                    {draftFilters.minArea ? `${draftFilters.minArea.toLocaleString()} sqft` : 'Any'}{' '}
                    —{' '}
                    {draftFilters.maxArea ? `${draftFilters.maxArea.toLocaleString()} sqft` : 'Any'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-mono text-[11px] text-dark-gray/65">
                    <span>Min Area:</span>
                    <span className="font-semibold text-deep-purple">
                      {draftFilters.minArea ? `${draftFilters.minArea} sq ft` : 'No Min'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={minAreaLimit}
                    max={currentMaxArea}
                    step={areaStep}
                    value={currentMinArea}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        minArea: Number(e.target.value) <= minAreaLimit ? null : Number(e.target.value),
                      }))
                    }
                    className="w-full accent-deep-purple cursor-pointer h-2 bg-dark-gray/15 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between font-mono text-[11px] text-dark-gray/65">
                    <span>Max Area:</span>
                    <span className="font-semibold text-deep-purple">
                      {draftFilters.maxArea ? `${draftFilters.maxArea} sq ft` : 'No Max'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={currentMinArea}
                    max={maxAreaLimit}
                    step={areaStep}
                    value={currentMaxArea}
                    onChange={(e) =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        maxArea: Number(e.target.value) >= maxAreaLimit ? null : Number(e.target.value),
                      }))
                    }
                    className="w-full accent-deep-purple cursor-pointer h-2 bg-dark-gray/15 rounded-lg"
                  />
                </div>
              </div>

              {/* Furnishing Status */}
              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-semibold mb-2.5 block">
                  Furnishing Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {['All', 'Fully Furnished', 'Semi-Furnished', 'Unfurnished'].map((f) => {
                    const active =
                      (!draftFilters.furnishing && f === 'All') ||
                      draftFilters.furnishing === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            furnishing: f === 'All' ? '' : f,
                          }))
                        }
                        className={cn(
                          'px-3.5 py-1.5 rounded-full font-mono text-xs border transition-all cursor-pointer',
                          active
                            ? 'bg-deep-purple text-porcelain border-deep-purple font-medium shadow-sm'
                            : 'bg-porcelain border-dark-gray/20 text-dark-gray/80 hover:border-dark-gray/45'
                        )}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amenities & Features */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-semibold block">
                    Amenities & Sanctuary Features
                  </label>
                  {(draftFilters.amenities || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftFilters((prev) => ({ ...prev, amenities: [] }))}
                      className="font-mono text-[11px] text-heather-purple hover:text-deep-purple underline cursor-pointer"
                    >
                      Clear Amenities
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AMENITIES_LIST.map((am) => {
                    const selected = (draftFilters.amenities || []).includes(am.id);
                    return (
                      <button
                        key={am.id}
                        type="button"
                        onClick={() => handleAmenityToggle(am.id)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left font-mono text-xs transition-all flex items-center justify-between cursor-pointer',
                          selected
                            ? 'bg-deep-purple text-porcelain border-deep-purple font-medium shadow-sm'
                            : 'bg-porcelain border-dark-gray/20 text-dark-gray/80 hover:border-dark-gray/45'
                        )}
                      >
                        <span className="truncate">{am.label}</span>
                        {selected && (
                          <Check className="w-3.5 h-3.5 text-electric-lemon shrink-0 ml-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Possession & RERA Verification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-semibold mb-2 block">
                    Possession Status
                  </label>
                  <div className="flex gap-2">
                    {['All', 'Ready to Move', 'Under Construction'].map((ps) => {
                      const active =
                        (!draftFilters.possessionStatus && ps === 'All') ||
                        draftFilters.possessionStatus === ps;
                      return (
                        <button
                          key={ps}
                          type="button"
                          onClick={() =>
                            setDraftFilters((prev) => ({
                              ...prev,
                              possessionStatus: ps === 'All' ? '' : ps,
                            }))
                          }
                          className={cn(
                            'px-3 py-1.5 rounded-full font-mono text-xs border transition-all cursor-pointer',
                            active
                              ? 'bg-deep-purple text-porcelain border-deep-purple font-medium shadow-sm'
                              : 'bg-porcelain border-dark-gray/20 text-dark-gray/80 hover:border-dark-gray/45'
                          )}
                        >
                          {ps}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-charcoal/70 font-semibold mb-2 block">
                    Legal & RERA Verification
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftFilters((prev) => ({
                        ...prev,
                        verifiedOnly: !prev.verifiedOnly,
                      }))
                    }
                    className={cn(
                      'w-full p-2.5 rounded-xl border font-mono text-xs flex items-center justify-between transition-all cursor-pointer',
                      draftFilters.verifiedOnly
                        ? 'bg-deep-purple text-porcelain border-deep-purple font-medium shadow-sm'
                        : 'bg-porcelain border-dark-gray/20 text-dark-gray/80 hover:border-dark-gray/45'
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className={cn('w-4 h-4', draftFilters.verifiedOnly ? 'text-electric-lemon' : 'text-emerald-700')} />
                      <span>RERA Registered Only</span>
                    </span>
                    {draftFilters.verifiedOnly && (
                      <Check className="w-3.5 h-3.5 text-electric-lemon shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Sticky Footer Actions */}
            <div className="px-6 py-4 border-t border-dark-gray/10 bg-sand/30 flex items-center justify-between gap-4 shrink-0">
              <button
                type="button"
                onClick={handleLocalReset}
                className="flex items-center gap-1.5 font-mono text-xs text-dark-gray/70 hover:text-dark-gray underline transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="dark" size="sm" onClick={handleApply}>
                  Apply Filters {activeCount > 0 ? `(${activeCount})` : ''}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

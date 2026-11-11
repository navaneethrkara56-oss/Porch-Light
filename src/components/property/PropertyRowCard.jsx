import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SmartImage } from '@/components/media/SmartImage';
import { formatINR, formatArea } from '@/lib/formatINR';
import { calculateEMI } from '@/lib/emi';
import { isPremium } from '@/lib/isPremium';
import { useAuth } from '@/features/auth/AuthContext';
import { Bookmark, Columns, ShieldCheck, Sparkles, ArrowRight, BedDouble, Bath, Maximize2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPossessionStatus } from '@/constants/propertyTypes';

/**
 * Unified PropertyRowCard
 * One consistent, repeatable listing row layout used across both Buy and Rent pages.
 * Replaces previous rotating editorial card layouts (A/B/C/D) with a clean, repeatable standard.
 */
export function PropertyRowCard({
  property,
  index = 0,
  isSaved = false,
  isCompared = false,
  isSelected = false,
  onToggleSave,
  onToggleCompare,
  onGuestClick,
  onHover,
}) {
  const navigate = useNavigate();
  const { isAuthenticated, isUser } = useAuth();

  const isRent = property.listingType === 'rent';
  const priceDisplay = formatINR(property.price, { short: true, rent: isRent });
  const emiCalc = !isRent && property.price ? calculateEMI(property.price * 0.8) : null;
  const isPrem = isPremium(property);

  const handleClick = () => {
    if (!isAuthenticated) {
      if (onGuestClick) onGuestClick(property);
    } else {
      navigate(`/property/${property.id}`);
    }
  };

  const handleSave = (e) => {
    e.stopPropagation();
    if (onToggleSave) onToggleSave(property.customId || property.id);
  };

  const handleCompare = (e) => {
    e.stopPropagation();
    if (onToggleCompare) onToggleCompare(property);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.04, 0.25),
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={handleClick}
      onMouseEnter={() => onHover && onHover(property.id)}
      onMouseLeave={() => onHover && onHover(null)}
      className={cn(
        'group relative cursor-pointer bg-porcelain rounded-[20px] border transition-all duration-350 select-none overflow-hidden',
        isSelected
          ? 'border-2 border-deep-purple bg-porcelain-tint shadow-md'
          : 'border border-charcoal/15 hover:border-deep-purple/40 hover:shadow-lg'
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* LEFT: Property Photo with SmartImage */}
        <div className="relative sm:w-[280px] md:w-[320px] shrink-0 bg-charcoal/5">
          <SmartImage
            src={property.coverImage || property.images?.[property.coverImageIndex || 0] || property.images?.[0]}
            alt={property.title}
            aspect="listing"
            className="w-full h-56 sm:h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          />

          {/* Badges on Photo */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
            {/* Property Type Badge */}
            <span className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-[10px] bg-charcoal/80 text-porcelain backdrop-blur-md">
              {property.type}
            </span>

            {/* Premium Indicator */}
            {isPrem && (
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[8px] bg-lemon text-charcoal flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-charcoal" />
                <span>Premium</span>
              </span>
            )}
          </div>
        </div>

        {/* RIGHT: Property Details */}
        <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 space-y-3">
          {/* Top Row: Location & Role Action Buttons */}
          <div className="flex items-center justify-between gap-3">
            <div className="font-mono text-xs uppercase text-heather-purple font-semibold tracking-wider flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-heather-purple/70" />
              <span className="truncate">
                {property.locality ? `${property.locality}, ` : ''}{property.city}
              </span>
            </div>

            {/* Save & Compare Buttons (visible to logged-in users) */}
            {isUser && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCompare}
                  title={isCompared ? 'Remove from compare' : 'Compare property'}
                  className={cn(
                    'p-2 rounded-full border transition-colors text-xs font-mono',
                    isCompared
                      ? 'bg-deep-purple text-porcelain border-deep-purple'
                      : 'border-charcoal/20 text-charcoal/70 hover:text-charcoal hover:bg-black/5'
                  )}
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  title={isSaved ? 'Remove from saved' : 'Save property'}
                  className={cn(
                    'p-2 rounded-full border transition-colors text-xs font-mono',
                    isSaved
                      ? 'bg-lemon text-charcoal border-charcoal/30'
                      : 'border-charcoal/20 text-charcoal/70 hover:text-charcoal hover:bg-black/5'
                  )}
                >
                  <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-charcoal')} />
                </button>
              </div>
            )}
          </div>

          {/* Title & Short Description */}
          <div>
            <h3 className="font-serif text-2xl sm:text-[26px] leading-tight text-charcoal group-hover:text-deep-purple transition-colors line-clamp-1">
              {property.title}
            </h3>
            <p className="font-sans text-sm text-charcoal/70 line-clamp-2 mt-1 leading-relaxed">
              {property.description}
            </p>
          </div>

          {/* Key Specifications Row (Swiss style) */}
          <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs text-charcoal/75">
            {property.bedrooms && (
              <span className="flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5 text-charcoal/50" />
                <span>{property.bedrooms} BHK</span>
              </span>
            )}
            {property.bathrooms && (
              <span className="flex items-center gap-1">
                <Bath className="w-3.5 h-3.5 text-charcoal/50" />
                <span>{property.bathrooms} Baths</span>
              </span>
            )}
            {(property.builtUpArea || property.carpetArea) && (
              <span className="flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5 text-charcoal/50" />
                <span>{formatArea(property.builtUpArea || property.carpetArea)}</span>
              </span>
            )}
            {property.furnishing && (
              <span className="text-charcoal/60 capitalize">
                • {property.furnishing}
              </span>
            )}
            {property.reraId && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 font-semibold ml-auto sm:ml-0">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>RERA Verified</span>
              </span>
            )}
          </div>

          {/* Bottom Price & Terms Bar */}
          <div className="pt-3 border-t border-charcoal/10 flex items-end justify-between gap-3">
            <div>
              {/* Primary Price */}
              <div className="font-serif text-2xl sm:text-[28px] text-deep-purple font-medium tracking-tight leading-none">
                {priceDisplay}
              </div>

              {/* Secondary Details: Sale vs Rent specific */}
              {!isRent && emiCalc && (
                <div className="font-mono text-[11px] text-charcoal/60 mt-1">
                  Est. EMI ₹{emiCalc.monthlyEMI.toLocaleString('en-IN')}/mo • {formatPossessionStatus(property.possessionStatus) || 'Ready to Move'}
                </div>
              )}
              {!isRent && !emiCalc && (
                <div className="font-mono text-[11px] text-charcoal/60 mt-1">
                  {property.ownership || 'Freehold'} • {formatPossessionStatus(property.possessionStatus) || 'Ready to Move'}
                </div>
              )}
              {isRent && (
                <div className="font-mono text-[11px] text-charcoal/60 mt-1">
                  {property.deposit ? `Deposit ${formatINR(property.deposit, { short: true })} • ` : ''}
                  Min lease {property.minLease || '11 mo'}
                </div>
              )}
            </div>

            {/* Subtle View CTA arrow */}
            <div className="font-mono text-xs uppercase tracking-wider text-deep-purple font-semibold flex items-center gap-1 shrink-0 pb-0.5 group-hover:translate-x-1 transition-transform duration-350">
              <span className="hidden sm:inline">View sanctuary</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

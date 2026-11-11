import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SmartImage } from '@/components/media/SmartImage';
import { formatINR, formatArea } from '@/lib/formatINR';
import { isPremium } from '@/lib/isPremium';
import { useAuth } from '@/features/auth/AuthContext';
import { Bookmark, Columns, Sparkles, MapPin, BedDouble, Maximize2, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPossessionStatus } from '@/constants/propertyTypes';

/**
 * PropertyGridCard
 * Compact 3-column card design for Buy and Rent listing tabs.
 * Focused at-a-glance information hierarchy, Swiss-style spec line, and mode-aware pricing.
 */
export function PropertyGridCard({
  property,
  index = 0,
  mode = 'sale',
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

  const isRent = mode === 'rent' || property.listingType === 'rent';
  const priceDisplay = formatINR(property.price, { short: true, rent: isRent });
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.03, 0.24),
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={handleClick}
      onMouseEnter={() => onHover && onHover(property.id)}
      onMouseLeave={() => onHover && onHover(null)}
      className={cn(
        'group relative cursor-pointer bg-porcelain rounded-[20px] transition-all duration-300 select-none overflow-hidden flex flex-col h-full focus:outline-none focus-visible:outline-none',
        isSelected
          ? 'border-2 border-deep-purple bg-sand/25 shadow-md'
          : 'border border-charcoal/15 hover:border-deep-purple/40 hover:shadow-lg hover:-translate-y-0.5'
      )}
    >
      {/* 1. TOP PHOTO WITH SMARTIMAGE */}
      <div className="relative w-full aspect-[3/2] bg-charcoal/5 overflow-hidden shrink-0">
        <SmartImage
          src={property.coverImage || property.images?.[property.coverImageIndex || 0] || property.images?.[0]}
          alt={property.title}
          aspect="listing"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        />

        {/* Top Badges & Actions */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none z-10">
          {/* Property Type Badge */}
          <div className="flex flex-col gap-1.5 items-start">
            <span className="font-mono text-[10px] uppercase font-medium tracking-wider px-2.5 py-1 rounded-[8px] bg-charcoal/85 text-porcelain backdrop-blur-md shadow-xs">
              {property.type}
            </span>
            {isPrem && (
              <span className="font-mono text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[6px] bg-lemon text-charcoal flex items-center gap-1 shadow-sm">
                <Sparkles className="w-2.5 h-2.5 text-charcoal" />
                <span>Premium</span>
              </span>
            )}
          </div>

          {/* Action Buttons: Save & Compare */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {isUser && (
              <>
                <button
                  type="button"
                  onClick={handleCompare}
                  title={isCompared ? 'Remove from compare' : 'Compare property'}
                  aria-label="Compare property"
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-xs',
                    isCompared
                      ? 'bg-deep-purple text-porcelain'
                      : 'bg-porcelain/90 text-charcoal/80 hover:bg-white hover:text-deep-purple'
                  )}
                >
                  <Columns className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  title={isSaved ? 'Remove from saved' : 'Save property'}
                  aria-label="Save property"
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-xs',
                    isSaved
                      ? 'bg-lemon text-charcoal'
                      : 'bg-porcelain/90 text-charcoal/80 hover:bg-white hover:text-deep-purple'
                  )}
                >
                  <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-charcoal')} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom image gradient for contrast */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
      </div>

      {/* 2. CARD CONTENT */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Location line */}
          <div className="font-mono text-xs uppercase text-heather-purple font-semibold tracking-wider flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-heather-purple/80" />
            <span className="truncate">
              {property.locality ? `${property.locality}, ` : ''}{property.city}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif text-lg sm:text-xl text-charcoal font-medium leading-snug group-hover:text-deep-purple transition-colors line-clamp-1 mt-1.5">
            {property.title}
          </h3>

          {/* Price */}
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <span className="font-serif text-2xl text-deep-purple font-semibold tracking-tight">
              {priceDisplay}
            </span>
            <span className="font-mono text-[11px] text-charcoal/50 group-hover:text-deep-purple flex items-center gap-0.5 transition-colors">
              <span>View</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* 3. CONCISE FACTS ROW */}
        <div className="pt-3 mt-3 border-t border-charcoal/10 flex items-center justify-between font-mono text-[11px] text-charcoal/70">
          {/* Fact 1: Bedrooms / BHK */}
          {property.bedrooms ? (
            <span className="flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5 text-charcoal/50 shrink-0" />
              <span>{property.bedrooms} BHK</span>
            </span>
          ) : (
            <span className="capitalize">{property.type}</span>
          )}

          {/* Fact 2: Area or Deposit */}
          {!isRent && (property.builtUpArea || property.carpetArea) ? (
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-charcoal/50 shrink-0" />
              <span>{formatArea(property.builtUpArea || property.carpetArea)}</span>
            </span>
          ) : isRent && property.deposit ? (
            <span>Dep: {formatINR(property.deposit, { short: true })}</span>
          ) : (
            <span>{property.furnishing || 'Unfurnished'}</span>
          )}

          {/* Fact 3: Possession or Lease / Verification */}
          {!isRent ? (
            <span className="truncate max-w-[90px] text-right text-charcoal/60">
              {formatPossessionStatus(property.possessionStatus) || 'Ready'}
            </span>
          ) : (
            <span className="truncate max-w-[90px] text-right text-charcoal/60">
              {property.minLease ? `${property.minLease} lease` : '11 mo lease'}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default PropertyGridCard;

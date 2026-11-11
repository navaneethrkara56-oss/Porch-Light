import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SmartImage } from '@/components/media/SmartImage';
import { formatINR, formatArea } from '@/lib/formatINR';
import { isPremium } from '@/lib/isPremium';
import { useAuth } from '@/features/auth/AuthContext';
import { X, MapPin, BedDouble, Maximize2, Sparkles, Bookmark, Columns, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * MapPropertyPreview
 * Floating, closable compact property card displayed when a pin is selected on the map.
 * Adapted from the shared card design with explicit close action and role permissions.
 */
export function MapPropertyPreview({
  property,
  mode = 'sale',
  isSaved = false,
  isCompared = false,
  onClose,
  onToggleSave,
  onToggleCompare,
  onGuestClick,
}) {
  const navigate = useNavigate();
  const { isAuthenticated, isUser } = useAuth();

  if (!property) return null;

  const isRent = mode === 'rent' || property.listingType === 'rent';
  const priceDisplay = formatINR(property.price, { short: true, rent: isRent });
  const isPrem = isPremium(property);

  const handleOpenProperty = () => {
    if (!isAuthenticated) {
      if (onGuestClick) onGuestClick(property);
    } else {
      if (typeof window !== 'undefined' && window.location.pathname.includes(`/property/${property.id}`)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        navigate(`/property/${property.id}`);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-[350px] max-w-[calc(100%-32px)] z-30 pointer-events-auto bg-porcelain/95 backdrop-blur-md rounded-[20px] border border-charcoal/20 shadow-xl overflow-hidden select-none"
    >
      {/* Top Header Row with Location & Close button */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-charcoal/10">
        <div className="font-mono text-xs uppercase text-heather-purple font-semibold tracking-wider flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-heather-purple/80" />
          <span className="truncate">
            {property.locality ? `${property.locality}, ` : ''}{property.city}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close property preview"
          className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-charcoal/60 hover:text-charcoal hover:bg-black/5 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-3.5 flex gap-3 items-start">
        {/* Photo thumbnail */}
        <div
          onClick={handleOpenProperty}
          className="relative w-24 h-18 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-charcoal/10 shrink-0 cursor-pointer group"
        >
          <SmartImage
            src={property.coverImage || property.images?.[property.coverImageIndex || 0] || property.images?.[0]}
            alt={property.title}
            aspect="listing"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {isPrem && (
            <span className="absolute top-1.5 left-1.5 font-mono text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-[5px] bg-lemon text-charcoal flex items-center gap-0.5 shadow-xs">
              <Sparkles className="w-2 h-2 text-charcoal" />
              <span>Prem</span>
            </span>
          )}
        </div>

        {/* Text details */}
        <div className="flex-1 min-w-0">
          <span className="font-mono text-[10px] uppercase text-charcoal/60">
            {property.type}
          </span>
          <h4
            onClick={handleOpenProperty}
            className="font-serif text-lg leading-tight text-charcoal hover:text-deep-purple transition-colors truncate cursor-pointer mt-0.5"
          >
            {property.title}
          </h4>

          {/* Price */}
          <div className="font-serif text-xl text-deep-purple font-semibold mt-1">
            {priceDisplay}
          </div>

          {/* Concise facts */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-charcoal/70 mt-1 truncate">
            {property.bedrooms && (
              <span className="flex items-center gap-0.5">
                <BedDouble className="w-3 h-3 text-charcoal/50" />
                <span>{property.bedrooms} BHK</span>
              </span>
            )}
            {!isRent && (property.builtUpArea || property.carpetArea) && (
              <span className="flex items-center gap-0.5">
                <Maximize2 className="w-3 h-3 text-charcoal/50" />
                <span>{formatArea(property.builtUpArea || property.carpetArea)}</span>
              </span>
            )}
            {isRent && property.deposit && (
              <span>Dep: {formatINR(property.deposit, { short: true })}</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="px-4 py-2.5 bg-sand/30 border-t border-charcoal/10 flex items-center justify-between gap-3">
        {/* Role action buttons */}
        <div className="flex items-center gap-1.5">
          {isUser && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleCompare) onToggleCompare(property);
                }}
                title={isCompared ? 'Remove from compare' : 'Compare property'}
                className={cn(
                  'p-1.5 rounded-full border text-xs transition-colors',
                  isCompared
                    ? 'bg-deep-purple text-porcelain border-deep-purple'
                    : 'border-charcoal/20 text-charcoal/70 hover:text-charcoal hover:bg-white'
                )}
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleSave) onToggleSave(property.customId || property.id);
                }}
                title={isSaved ? 'Remove from saved' : 'Save property'}
                className={cn(
                  'p-1.5 rounded-full border text-xs transition-colors',
                  isSaved
                    ? 'bg-lemon text-charcoal border-charcoal/30'
                    : 'border-charcoal/20 text-charcoal/70 hover:text-charcoal hover:bg-white'
                )}
              >
                <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-charcoal')} />
              </button>
            </>
          )}
        </div>

        {/* View Sanctuary button */}
        <button
          type="button"
          onClick={handleOpenProperty}
          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-deep-purple text-porcelain font-mono text-xs font-semibold hover:bg-charcoal transition-colors shadow-xs"
        >
          <span>View Sanctuary</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default MapPropertyPreview;

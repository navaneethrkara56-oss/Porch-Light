import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SmartImage } from '@/components/media/SmartImage';
import { Arch, Leaf, Circle } from '@/components/shapes';
import { Tag } from '@/components/ui/Tag';
import { formatINR, formatArea } from '@/lib/formatINR';
import { calculateEMI } from '@/lib/emi';
import { isPremium } from '@/lib/isPremium';
import { useAuth } from '@/features/auth/AuthContext';
import { Bookmark, Columns, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PropertyRow({
  property,
  index = 0,
  isSaved = false,
  isCompared = false,
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
  const coverImg = property.coverImage || property.images?.[property.coverImageIndex || 0] || property.images?.[0];

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

  const layoutType = ['A', 'B', 'C', 'D'][index % 4];

  // Action buttons for authenticated Users
  const ActionButtons = () => {
    if (!isUser) return null;
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCompare}
          title={isCompared ? 'Remove from compare' : 'Compare property'}
          className={cn(
            'p-2 rounded-full border transition-all text-xs font-mono',
            isCompared
              ? 'bg-deep-purple text-white border-deep-purple'
              : 'border-dark-gray/20 text-dark-gray hover:bg-dark-gray/5'
          )}
        >
          <Columns className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleSave}
          title={isSaved ? 'Remove from saved' : 'Save property'}
          className={cn(
            'p-2 rounded-full border transition-all text-xs font-mono',
            isSaved
              ? 'bg-electric-lemon text-dark-gray border-dark-gray/30'
              : 'border-dark-gray/20 text-dark-gray hover:bg-dark-gray/5'
          )}
        >
          <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-dark-gray')} />
        </button>
      </div>
    );
  };

  // LAYOUT A: Tall arch image + big serif price
  if (layoutType === 'A') {
    return (
      <motion.div
        layout
        onClick={handleClick}
        onMouseEnter={() => onHover && onHover(property.id)}
        onMouseLeave={() => onHover && onHover(null)}
        className="group relative cursor-pointer border-b border-dark-gray/15 py-8 transition-colors hover:bg-black/[0.02]"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5">
            <Arch className="h-64 sm:h-72 w-full group-hover:shadow-md transition-shadow">
              <SmartImage
                src={coverImg}
                alt={property.title}
                aspect="auto"
                className="w-full h-full group-hover:scale-105 transition-transform duration-700"
              />
            </Arch>
          </div>
          <div className="md:col-span-7 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag variant="outline">{property.city}</Tag>
                <Tag variant="purple" className="capitalize">{property.type}</Tag>
                {isPrem && (
                  <Tag variant="lemon" className="flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Premium</span>
                  </Tag>
                )}
              </div>
              <ActionButtons />
            </div>

            <div>
              <div className="font-serif text-3xl sm:text-4xl text-deep-purple font-medium tracking-tight mb-1">
                {priceDisplay}
              </div>
              {!isRent && emiCalc && (
                <div className="font-mono text-xs text-dark-gray/60">
                  Est. EMI ₹{emiCalc.monthlyEMI.toLocaleString('en-IN')}/mo
                </div>
              )}
              {isRent && property.deposit && (
                <div className="font-mono text-xs text-dark-gray/60">
                  Deposit: {formatINR(property.deposit, { short: true })} • Min lease: {property.minLease || '11 mo'}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-serif text-2xl text-dark-gray group-hover:text-deep-purple transition-colors mb-2">
                {property.title}
              </h3>
              <p className="font-sans text-sm text-dark-gray/70 line-clamp-2">
                {property.description}
              </p>
            </div>

            <div className="pt-2 border-t border-dark-gray/10 flex flex-wrap items-center gap-4 font-mono text-xs text-dark-gray/70">
              {property.bedrooms && <span>{property.bedrooms} BHK</span>}
              {property.builtUpArea && <span>{formatArea(property.builtUpArea)}</span>}
              {property.reraId && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  RERA Verified
                </span>
              )}
              <span className="ml-auto text-dark-gray/50">{property.locality}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // LAYOUT B: Wide leaf image with title overlapping
  if (layoutType === 'B') {
    return (
      <motion.div
        layout
        onClick={handleClick}
        onMouseEnter={() => onHover && onHover(property.id)}
        onMouseLeave={() => onHover && onHover(null)}
        className="group relative cursor-pointer border-b border-dark-gray/15 py-8 transition-colors hover:bg-black/[0.02]"
      >
        <div className="relative">
          <Leaf className="w-full h-64 sm:h-80 overflow-hidden">
            <SmartImage
              src={coverImg}
              alt={property.title}
              aspect="auto"
              className="w-full h-full group-hover:scale-105 transition-transform duration-700"
            />
          </Leaf>

          {/* Overlapping title card */}
          <div className="relative md:absolute md:-bottom-6 md:left-8 bg-porcelain border border-dark-gray/20 rounded-xl p-6 md:max-w-xl shadow-lg mt-4 md:mt-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag variant="default">{property.city}</Tag>
                <Tag variant="purple" className="capitalize">{property.type}</Tag>
                {isPrem && <Tag variant="lemon">Premium</Tag>}
              </div>
              <ActionButtons />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <h3 className="font-serif text-2xl text-dark-gray group-hover:text-deep-purple transition-colors">
                {property.title}
              </h3>
              <div className="font-serif text-2xl sm:text-3xl text-deep-purple font-bold tracking-tight whitespace-nowrap">
                {priceDisplay}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-dark-gray/70 pt-2 border-t border-dark-gray/10">
              {property.bedrooms && <span>{property.bedrooms} BHK</span>}
              {property.builtUpArea && <span>{formatArea(property.builtUpArea)}</span>}
              <span>{property.locality}</span>
              {!isRent && emiCalc && (
                <span className="sm:ml-auto text-dark-gray/50">
                  EMI ~ ₹{emiCalc.monthlyEMI.toLocaleString('en-IN')}/mo
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="hidden md:block h-8" />
      </motion.div>
    );
  }

  // LAYOUT C: Circular image with spec tags
  if (layoutType === 'C') {
    return (
      <motion.div
        layout
        onClick={handleClick}
        onMouseEnter={() => onHover && onHover(property.id)}
        onMouseLeave={() => onHover && onHover(null)}
        className="group relative cursor-pointer border-b border-dark-gray/15 py-8 transition-colors hover:bg-black/[0.02]"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 flex justify-center">
            <Circle className="w-56 h-56 sm:w-64 sm:h-64 shadow-md group-hover:scale-102 transition-transform duration-500">
              <SmartImage
                src={coverImg}
                alt={property.title}
                aspect="circle"
                className="w-full h-full"
              />
            </Circle>
          </div>
          <div className="md:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag variant="outline">{property.city}</Tag>
                <Tag variant="purple" className="capitalize">{property.type}</Tag>
                {isPrem && <Tag variant="lemon">Premium</Tag>}
              </div>
              <ActionButtons />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <h3 className="font-serif text-3xl text-dark-gray group-hover:text-deep-purple transition-colors">
                {property.title}
              </h3>
              <div className="font-serif text-3xl text-deep-purple font-medium whitespace-nowrap">
                {priceDisplay}
              </div>
            </div>

            <p className="font-sans text-sm text-dark-gray/70 line-clamp-2">
              {property.description}
            </p>

            {/* Swiss spec badges row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-dark-gray/10 font-mono text-xs">
              <div className="p-2 rounded bg-porcelain-tint border border-dark-gray/10">
                <div className="text-[10px] text-dark-gray/50 uppercase">Area</div>
                <div className="font-bold">{formatArea(property.builtUpArea || property.carpetArea)}</div>
              </div>
              <div className="p-2 rounded bg-porcelain-tint border border-dark-gray/10">
                <div className="text-[10px] text-dark-gray/50 uppercase">Beds/Baths</div>
                <div className="font-bold">{property.bedrooms || '—'} / {property.bathrooms || '—'}</div>
              </div>
              <div className="p-2 rounded bg-porcelain-tint border border-dark-gray/10">
                <div className="text-[10px] text-dark-gray/50 uppercase">Status</div>
                <div className="font-bold">{property.possessionStatus || 'Ready'}</div>
              </div>
              <div className="p-2 rounded bg-porcelain-tint border border-dark-gray/10">
                <div className="text-[10px] text-dark-gray/50 uppercase">RERA</div>
                <div className="font-bold text-emerald-800">Verified</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // LAYOUT D: Compact row
  return (
    <motion.div
      layout
      onClick={handleClick}
      onMouseEnter={() => onHover && onHover(property.id)}
      onMouseLeave={() => onHover && onHover(null)}
      className="group relative cursor-pointer border-b border-dark-gray/15 py-6 transition-colors hover:bg-black/[0.02]"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-lg overflow-hidden shrink-0 border border-dark-gray/15">
            <SmartImage
              src={coverImg}
              alt={property.title}
              aspect="auto"
              className="w-full h-full group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase text-heather-purple font-bold">
                {property.city} • {property.type}
              </span>
              {isPrem && <Tag variant="lemon" size="sm">Premium</Tag>}
            </div>
            <h4 className="font-serif text-xl text-dark-gray group-hover:text-deep-purple transition-colors">
              {property.title}
            </h4>
            <div className="font-mono text-xs text-dark-gray/60 flex items-center gap-3">
              {property.bedrooms && <span>{property.bedrooms} BHK</span>}
              {property.builtUpArea && <span>{formatArea(property.builtUpArea)}</span>}
              <span>{property.locality}</span>
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0">
          <div className="font-serif text-2xl text-deep-purple font-bold">
            {priceDisplay}
          </div>
          <ActionButtons />
        </div>
      </div>
    </motion.div>
  );
}

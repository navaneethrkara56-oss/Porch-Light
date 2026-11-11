import React, { useState } from 'react';
import { PropertyMap } from '@/components/map/PropertyMap';
import { SmartImage } from '@/components/media/SmartImage';
import { formatINR, formatArea } from '@/lib/formatINR';
import { List, X, MapPin, BedDouble, Maximize2, Compass, Bookmark, Columns } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * PropertyMapExplorer
 * Full map explorer view for the Map Tab.
 * Combines a large responsive Leaflet view with a desktop scrollable property list
 * and a mobile collapsible drawer, fully synchronized with active filters and sorting.
 */
export function PropertyMapExplorer({
  properties = [],
  selectedId = null,
  hoveredId = null,
  onSelectProperty,
  onHoverProperty,
  mode = 'sale',
  savedIds = [],
  comparedProperties = [],
  onToggleSave,
  onToggleCompare,
  onGuestClick,
}) {
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const isRent = mode === 'rent';

  const selectedProperty = properties.find((p) => p.id === selectedId) || null;

  const handleItemClick = (property) => {
    if (onSelectProperty) onSelectProperty(property);
    setMobileListOpen(false); // Close mobile drawer when an item is selected
  };

  return (
    <div className="relative w-full h-[500px] sm:h-[540px] lg:h-[calc(100dvh-220px)] lg:min-h-[480px] lg:max-h-[660px] rounded-[24px] border border-charcoal/15 bg-porcelain overflow-hidden shadow-sm flex flex-col lg:flex-row">
      {/* 1. DESKTOP SCROLLABLE SIDE LIST (BESIDE THE MAP) */}
      <div className="hidden lg:flex w-80 lg:w-84 shrink-0 flex-col h-full bg-porcelain border-r border-charcoal/10 z-20">
        {/* List Header */}
        <div className="p-4 border-b border-charcoal/10 bg-sand/30 flex items-center justify-between">
          <div>
            <div className="font-mono text-xs uppercase font-semibold text-deep-purple tracking-wider">
              {isRent ? 'Curated Rentals' : 'Sale Sanctuaries'}
            </div>
            <div className="font-mono text-[11px] text-charcoal/60 mt-0.5">
              {properties.length} propert{properties.length === 1 ? 'y' : 'ies'} on map
            </div>
          </div>
          <Compass className="w-4 h-4 text-heather-purple" />
        </div>

        {/* Scrollable Properties List */}
        <div className="flex-1 overflow-y-auto divide-y divide-charcoal/10 p-2 space-y-1">
          {properties.length === 0 ? (
            <div className="p-6 text-center text-charcoal/60 font-mono text-xs">
              No properties match active filters on map.
            </div>
          ) : (
            properties.map((property) => {
              const isSelected = selectedId === property.id;
              const isHovered = hoveredId === property.id;
              const isSaved = savedIds.includes(property.id) || (property.customId && savedIds.includes(property.customId));
              const isCompared = comparedProperties.some((p) => p.id === property.id || (p.customId && p.customId === property.customId));
              const priceDisplay = formatINR(property.price, { short: true, rent: isRent });

              return (
                <div
                  key={`map-item-${property.id}`}
                  onClick={() => handleItemClick(property)}
                  onMouseEnter={() => onHoverProperty && onHoverProperty(property.id)}
                  onMouseLeave={() => onHoverProperty && onHoverProperty(null)}
                  className={cn(
                    'p-3 rounded-xl cursor-pointer transition-all flex gap-3 items-center group',
                    isSelected
                      ? 'bg-deep-purple/10 border border-deep-purple ring-1 ring-deep-purple/20'
                      : isHovered
                      ? 'bg-black/5'
                      : 'hover:bg-sand/30'
                  )}
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-14 rounded-lg overflow-hidden bg-charcoal/10 shrink-0">
                    <SmartImage
                      src={property.coverImage}
                      alt={property.title}
                      aspect="listing"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] uppercase text-heather-purple font-semibold truncate flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 text-heather-purple/70 shrink-0" />
                      <span className="truncate">{property.locality || property.city}</span>
                    </div>
                    <h5 className="font-serif text-sm font-medium text-charcoal truncate mt-0.5">
                      {property.title}
                    </h5>
                    <div className="flex items-center justify-between gap-1 mt-1 font-mono text-xs">
                      <span className="font-bold text-deep-purple">{priceDisplay}</span>
                      {property.bedrooms && (
                        <span className="text-[10px] text-charcoal/60">{property.bedrooms} BHK</span>
                      )}
                    </div>
                  </div>

                  {/* Row Actions: Save & Compare */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleSave) onToggleSave(property.customId || property.id);
                      }}
                      aria-label={isSaved ? 'Remove from saved' : 'Save property'}
                      title={isSaved ? 'Saved' : 'Save'}
                      className={cn(
                        'p-1.5 rounded-full transition-colors',
                        isSaved
                          ? 'text-deep-purple bg-deep-purple/10'
                          : 'text-charcoal/40 hover:text-deep-purple hover:bg-black/5'
                      )}
                    >
                      <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-current')} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleCompare) onToggleCompare(property);
                      }}
                      aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
                      title={isCompared ? 'In compare' : 'Compare'}
                      className={cn(
                        'p-1.5 rounded-full transition-colors',
                        isCompared
                          ? 'text-electric-lemon bg-dark-gray'
                          : 'text-charcoal/40 hover:text-dark-gray hover:bg-black/5'
                      )}
                    >
                      <Columns className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. MAIN LEAFLET MAP CONTAINER */}
      <div className="flex-1 h-full relative">
        <PropertyMap
          properties={properties}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onMarkerClick={(property) => onSelectProperty && onSelectProperty(property)}
          onClosePreview={() => onSelectProperty && onSelectProperty(null)}
          mode={mode}
          savedIds={savedIds}
          comparedProperties={comparedProperties}
          onToggleSave={onToggleSave}
          onToggleCompare={onToggleCompare}
          onGuestClick={onGuestClick}
        />

        {/* Mobile Toggle Button for Side List Drawer */}
        <div className="lg:hidden absolute top-3 left-3 z-[400]">
          <button
            type="button"
            onClick={() => setMobileListOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-porcelain/95 text-charcoal border border-dark-gray/20 font-mono text-xs font-semibold shadow-md backdrop-blur-md hover:bg-deep-purple hover:text-white transition-colors"
          >
            <List className="w-3.5 h-3.5" />
            <span>List ({properties.length})</span>
          </button>
        </div>
      </div>

      {/* 3. MOBILE COLLAPSIBLE DRAWER FOR PROPERTY NAMES */}
      {mobileListOpen && (
        <div className="lg:hidden fixed inset-0 z-[1000] flex flex-col justify-end bg-black/50 backdrop-blur-xs">
          <div className="bg-porcelain rounded-t-[24px] max-h-[75vh] flex flex-col border-t border-charcoal/20 shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-charcoal/10 flex items-center justify-between bg-sand/30">
              <div>
                <span className="font-mono text-xs uppercase font-semibold text-deep-purple">
                  Matching Sanctuaries ({properties.length})
                </span>
                <p className="font-mono text-[11px] text-charcoal/60 mt-0.5">
                  Tap any home to focus its pin on the map
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileListOpen(false)}
                aria-label="Close properties drawer"
                className="p-1.5 rounded-full text-charcoal/70 hover:text-charcoal hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-charcoal/10 p-3 space-y-1">
              {properties.map((property) => {
                const isSelected = selectedId === property.id;
                const isSaved = savedIds.includes(property.id) || (property.customId && savedIds.includes(property.customId));
                const isCompared = comparedProperties.some((p) => p.id === property.id || (p.customId && p.customId === property.customId));
                const priceDisplay = formatINR(property.price, { short: true, rent: isRent });

                return (
                  <div
                    key={`mobile-map-item-${property.id}`}
                    onClick={() => handleItemClick(property)}
                    className={cn(
                      'p-3 rounded-xl cursor-pointer transition-all flex gap-3 items-center',
                      isSelected ? 'bg-deep-purple/15 border border-deep-purple' : 'hover:bg-sand/30'
                    )}
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-charcoal/10 shrink-0">
                      <SmartImage
                        src={property.coverImage}
                        alt={property.title}
                        aspect="listing"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] uppercase text-heather-purple font-semibold truncate">
                        {property.locality || property.city}
                      </div>
                      <h5 className="font-serif text-sm font-medium text-charcoal truncate mt-0.5">
                        {property.title}
                      </h5>
                      <div className="flex items-center justify-between gap-1 mt-1 font-mono text-xs">
                        <span className="font-bold text-deep-purple">{priceDisplay}</span>
                        {property.bedrooms && (
                          <span className="text-[10px] text-charcoal/60">{property.bedrooms} BHK</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleSave) onToggleSave(property.customId || property.id);
                        }}
                        aria-label={isSaved ? 'Remove from saved' : 'Save property'}
                        className={cn(
                          'p-1.5 rounded-full transition-colors',
                          isSaved
                            ? 'text-deep-purple bg-deep-purple/10'
                            : 'text-charcoal/40 hover:text-deep-purple hover:bg-black/5'
                        )}
                      >
                        <Bookmark className={cn('w-3.5 h-3.5', isSaved && 'fill-current')} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleCompare) onToggleCompare(property);
                        }}
                        aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
                        className={cn(
                          'p-1.5 rounded-full transition-colors',
                          isCompared
                            ? 'text-electric-lemon bg-dark-gray'
                            : 'text-charcoal/40 hover:text-dark-gray hover:bg-black/5'
                        )}
                      >
                        <Columns className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyMapExplorer;

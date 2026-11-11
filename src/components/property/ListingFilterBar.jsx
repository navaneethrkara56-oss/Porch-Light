import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin, SlidersHorizontal, X, Navigation, RotateCcw, Loader2 } from 'lucide-react';
import { SortDropdown } from '@/components/property/SortDropdown';
import { PropertyFilterModal } from '@/components/property/PropertyFilterModal';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { CITY_COORDINATES } from '@/constants/cities';

const SEED_CITY_COORDINATES = Object.entries(CITY_COORDINATES).map(([city, data]) => ({
  city,
  lat: data.lat,
  lng: data.lng,
}));

function getClosestCity(lat, lng) {
  let closest = 'Bengaluru';
  let minDistance = Infinity;
  for (const c of SEED_CITY_COORDINATES) {
    const dLat = c.lat - lat;
    const dLng = c.lng - lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < minDistance) {
      minDistance = dist;
      closest = c.city;
    }
  }
  return closest;
}

export function ListingFilterBar({
  mode = 'sale',
  filters,
  onChange,
  onClear,
  sortOption = 'featured',
  onSortChange,
  availableLocalities = [],
  activeTab = 'listings',
}) {
  const isRent = mode === 'rent';
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [isNearMeLoading, setIsNearMeLoading] = useState(false);
  const [isNearMeActive, setIsNearMeActive] = useState(false);
  const [previousCity, setPreviousCity] = useState('');
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debounceTimerRef = useRef(null);
  const isLocatingRef = useRef(false);

  // Keep a ref to the latest filters to avoid stale closures during async geolocation
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const searchContainerRef = useRef(null);
  const filterButtonRef = useRef(null);

  // Filter matching localities for autocomplete only when query has length
  const matchingLocalities = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return [];
    return availableLocalities
      .filter((loc) => loc.toLowerCase().includes(query))
      .slice(0, 6);
  }, [availableLocalities, searchInput]);

  // Sync external search changes (e.g. from Clear all or Near Me)
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setAutocompleteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Sync near-me state if city is cleared manually by user or reset
  useEffect(() => {
    if (!filters.city && isNearMeActive) {
      setIsNearMeActive(false);
    }
  }, [filters.city, isNearMeActive]);

  const scrollToTop = () => {
    // When Map tab is active, do NOT scroll page to top; keep user immersed in map
    if (activeTab === 'map') return;
    if (typeof window !== 'undefined' && window.scrollY > 30) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle Search input with 300ms debounce
  const handleSearchChange = (val) => {
    setSearchInput(val);
    setAutocompleteOpen(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (val !== filtersRef.current.search) {
        onChange({ ...filtersRef.current, search: val });
        scrollToTop();
      }
    }, 300);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setAutocompleteOpen(false);
      if (searchInput !== filtersRef.current.search) {
        onChange({ ...filtersRef.current, search: searchInput });
      }
      scrollToTop();
    }
  };

  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchInput('');
    setAutocompleteOpen(false);
    onChange({ ...filtersRef.current, search: '' });
    scrollToTop();
  };

  // Near Me Toggle: robust first-click handling, generous timeout for permission prompt, and state safety
  const handleToggleNearMe = () => {
    // If already active, toggle off: restore previous city context
    if (isNearMeActive) {
      setIsNearMeActive(false);
      setIsNearMeLoading(false);
      isLocatingRef.current = false;
      const restored = previousCity || '';
      onChange({ ...filtersRef.current, city: restored });
      scrollToTop();
      toast.success(restored ? `Restored ${restored}` : 'Nearby filter turned off');
      return;
    }

    // Prevent duplicate concurrent requests while already pending
    if (isNearMeLoading || isLocatingRef.current) return;

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setPreviousCity(filtersRef.current.city || '');
    setIsNearMeLoading(true);
    isLocatingRef.current = true;

    const onGeoSuccess = (pos) => {
      isLocatingRef.current = false;
      setIsNearMeLoading(false);
      const { latitude, longitude } = pos.coords;
      const closest = getClosestCity(latitude, longitude);
      setIsNearMeActive(true);
      onChange({ ...filtersRef.current, city: closest });
      scrollToTop();
      toast.success(`Sanctuaries nearest to you in ${closest}`);
    };

    const onGeoError = (err) => {
      isLocatingRef.current = false;
      setIsNearMeLoading(false);
      setIsNearMeActive(false);

      if (err.code === 1) {
        toast.error('Location permission was denied. Showing all cities.');
      } else if (err.code === 3) {
        toast.error('Location request timed out. Please try again.');
      } else {
        toast.error('Unable to detect your location. Showing all cities.');
      }
    };

    // 15-second timeout ensures browser first-time permission prompts have ample time to be answered
    navigator.geolocation.getCurrentPosition(
      onGeoSuccess,
      (firstErr) => {
        // If position unavailable on low accuracy, retry once with high accuracy
        if (firstErr.code === 2) {
          navigator.geolocation.getCurrentPosition(
            onGeoSuccess,
            onGeoError,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        } else {
          onGeoError(firstErr);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  };

  // Count active filters
  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.city && filters.city !== 'All Cities') count++;
    if (filters.search) count++;
    if (filters.type && filters.type.length > 0) count += filters.type.length;
    if (filters.bedrooms) count++;
    if (filters.bathrooms) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.minArea) count++;
    if (filters.maxArea) count++;
    if (filters.furnishing) count++;
    if (filters.possessionStatus) count++;
    if (filters.verifiedOnly) count++;
    if (filters.amenities && filters.amenities.length > 0) count += filters.amenities.length;
    return count;
  }, [filters]);

  // Format currency summary for active tags
  const formatTagPrice = (min, max) => {
    if (isRent) {
      const minStr = min ? `₹${(min / 1000).toFixed(0)}k` : '₹15k';
      const maxStr = max ? `₹${(max / 1000).toFixed(0)}k` : 'Max';
      return `${minStr} – ${maxStr}/mo`;
    }
    const minStr = min ? `₹${(min / 10000000).toFixed(1)}Cr` : '₹10L';
    const maxStr = max ? `₹${(max / 10000000).toFixed(1)}Cr` : 'Max';
    return `${minStr} – ${maxStr}`;
  };

  return (
    <div className="w-full space-y-3">
      {/* Primary Unified Control Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        {/* 1. Clear Autocomplete Search Field */}
        <div className="relative flex-1" ref={searchContainerRef}>
          <div className="relative flex items-center h-11">
            <Search className="absolute left-3.5 w-4 h-4 text-charcoal/40 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setAutocompleteOpen(true)}
              placeholder="Search locality, landmark, project, or RERA ID..."
              className="w-full h-11 pl-10 pr-10 rounded-full bg-porcelain border border-dark-gray/20 text-xs font-mono text-charcoal placeholder:text-charcoal/45 focus:outline-none focus:border-deep-purple focus:ring-1 focus:ring-deep-purple transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3.5 p-1 text-charcoal/40 hover:text-charcoal transition-colors cursor-pointer"
                aria-label="Clear search text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Localities Dropdown: only render when there are actual matching items */}
          {autocompleteOpen && matchingLocalities.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-porcelain border border-dark-gray/20 rounded-2xl shadow-xl z-30 max-h-52 overflow-y-auto py-1 font-mono text-xs">
              {matchingLocalities.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                    setSearchInput(loc);
                    onChange({ ...filtersRef.current, search: loc });
                    setAutocompleteOpen(false);
                    scrollToTop();
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-black/5 flex items-center gap-2 text-charcoal transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-deep-purple shrink-0" />
                  <span>{loc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls Group: Near Me Toggle + Sort Dropdown + Filters Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 sm:overflow-visible overflow-x-auto pb-0.5 sm:pb-0">
          {/* 2. Fast Near Me Toggle Button */}
          <button
            type="button"
            onClick={handleToggleNearMe}
            disabled={isNearMeLoading}
            aria-pressed={isNearMeActive}
            className={cn(
              'h-11 px-4 rounded-full font-mono text-xs border flex items-center gap-2 transition-all duration-200 select-none cursor-pointer shrink-0',
              isNearMeLoading && 'opacity-80 cursor-wait',
              isNearMeActive
                ? 'bg-deep-purple text-porcelain border-deep-purple shadow-sm font-medium'
                : 'bg-porcelain border-dark-gray/20 text-charcoal hover:border-dark-gray/45'
            )}
          >
            {isNearMeLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-deep-purple" />
            ) : (
              <Navigation
                className={cn(
                  'w-3.5 h-3.5 transition-transform duration-200',
                  isNearMeActive ? 'text-electric-lemon rotate-45' : 'text-deep-purple'
                )}
              />
            )}
            <span>{isNearMeLoading ? 'Locating...' : 'Near Me'}</span>
            {isNearMeActive && !isNearMeLoading && (
              <span className="w-1.5 h-1.5 rounded-full bg-electric-lemon animate-pulse" />
            )}
          </button>

          {/* 3. Custom Accessible Sort Dropdown */}
          <SortDropdown
            value={sortOption}
            onChange={(newSort) => {
              if (onSortChange) onSortChange(newSort);
              scrollToTop();
            }}
            mode={mode}
          />

          {/* 4. Filters Button (Triggers Portal Modal) */}
          <button
            ref={filterButtonRef}
            type="button"
            onClick={() => setFilterModalOpen(true)}
            aria-label="Open filter modal"
            className={cn(
              'h-11 px-5 rounded-full font-mono text-xs border flex items-center gap-2.5 transition-all duration-200 cursor-pointer shrink-0',
              activeCount > 0
                ? 'bg-deep-purple text-porcelain border-deep-purple shadow-sm font-medium'
                : 'bg-dark-gray text-porcelain border-dark-gray hover:bg-black/90'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-electric-lemon text-dark-gray font-bold text-[10px] flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Selected Filters Chips Row */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs font-mono">
          <span className="text-[11px] uppercase tracking-wider text-charcoal/50 mr-1 shrink-0">
            Active:
          </span>

          {/* Search query chip */}
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sand/60 border border-dark-gray/15 text-dark-gray text-[11px]">
              <Search className="w-3 h-3 text-deep-purple" />
              <span className="truncate max-w-[120px]">"{filters.search}"</span>
              <button
                type="button"
                onClick={handleClearSearch}
                className="hover:text-deep-purple p-0.5 cursor-pointer"
                aria-label="Remove search query"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* City pill */}
          {filters.city && filters.city !== 'All Cities' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sand/60 border border-dark-gray/15 text-dark-gray text-[11px]">
              <MapPin className="w-3 h-3 text-deep-purple" />
              <span>{filters.city}</span>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, city: '' });
                  if (isNearMeActive) setIsNearMeActive(false);
                  scrollToTop();
                }}
                className="hover:text-deep-purple p-0.5 cursor-pointer"
                aria-label={`Remove city ${filters.city}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Property Types */}
          {(filters.type || []).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sand/60 border border-dark-gray/15 text-dark-gray capitalize text-[11px]"
            >
              <span>{t}</span>
              <button
                type="button"
                onClick={() => {
                  onChange({
                    ...filters,
                    type: filters.type.filter((item) => item !== t),
                  });
                  scrollToTop();
                }}
                className="hover:text-deep-purple p-0.5 cursor-pointer"
                aria-label={`Remove type ${t}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Price Range */}
          {(filters.minPrice || filters.maxPrice) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sand/60 border border-dark-gray/15 text-dark-gray text-[11px]">
              <span>{formatTagPrice(filters.minPrice, filters.maxPrice)}</span>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, minPrice: null, maxPrice: null });
                  scrollToTop();
                }}
                className="hover:text-deep-purple p-0.5 cursor-pointer"
                aria-label="Remove price filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Bedrooms */}
          {filters.bedrooms && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sand/60 border border-dark-gray/15 text-dark-gray text-[11px]">
              <span>{filters.bedrooms}+ BHK</span>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, bedrooms: null });
                  scrollToTop();
                }}
                className="hover:text-deep-purple p-0.5 cursor-pointer"
                aria-label="Remove bedroom filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Bathrooms */}
          {filters.bathrooms && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sand/60 border border-dark-gray/15 text-dark-gray text-[11px]">
              <span>{filters.bathrooms}+ Baths</span>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, bathrooms: null });
                  scrollToTop();
                }}
                className="hover:text-deep-purple p-0.5 cursor-pointer"
                aria-label="Remove bathroom filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Area Range */}
          {(filters.minArea || filters.maxArea) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sand/60 border border-dark-gray/15 text-dark-gray text-[11px]">
              <span>
                {filters.minArea ? `${filters.minArea}` : '0'}–
                {filters.maxArea ? `${filters.maxArea}` : 'Max'} sqft
              </span>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, minArea: null, maxArea: null });
                  scrollToTop();
                }}
                className="hover:text-deep-purple p-0.5 cursor-pointer"
                aria-label="Remove area filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Furnishing */}
          {filters.furnishing && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sand/60 border border-dark-gray/15 text-dark-gray text-[11px]">
              <span>{filters.furnishing}</span>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, furnishing: '' });
                  scrollToTop();
                }}
                className="hover:text-deep-purple p-0.5 cursor-pointer"
                aria-label="Remove furnishing filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Amenities */}
          {(filters.amenities || []).map((am) => (
            <span
              key={am}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sand/60 border border-dark-gray/15 text-dark-gray capitalize text-[11px]"
            >
              <span>{am}</span>
              <button
                type="button"
                onClick={() => {
                  onChange({
                    ...filters,
                    amenities: filters.amenities.filter((item) => item !== am),
                  });
                  scrollToTop();
                }}
                className="hover:text-deep-purple p-0.5 cursor-pointer"
                aria-label={`Remove amenity ${am}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Verified */}
          {filters.verifiedOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px]">
              <span>RERA Verified</span>
              <button
                type="button"
                onClick={() => {
                  onChange({ ...filters, verifiedOnly: false });
                  scrollToTop();
                }}
                className="hover:text-emerald-950 p-0.5 cursor-pointer"
                aria-label="Remove RERA verification filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Clear all active filters */}
          <button
            type="button"
            onClick={() => {
              onClear();
              scrollToTop();
            }}
            className="flex items-center gap-1 font-mono text-[11px] text-heather-purple hover:text-deep-purple underline ml-1 px-1.5 py-0.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear all</span>
          </button>
        </div>
      )}

      {/* Portal-Mounted Filter Modal */}
      <PropertyFilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        mode={mode}
        filters={filters}
        onApply={(newFilters) => {
          onChange(newFilters);
          scrollToTop();
        }}
        onReset={() => {
          onClear();
          scrollToTop();
        }}
        triggerRef={filterButtonRef}
      />
    </div>
  );
}

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import * as propertyService from '@/services/properties';
import * as compareService from '@/services/compare';
import { PropertyGridCard } from '@/components/property/PropertyGridCard';
import { ListingFilterBar } from '@/components/property/ListingFilterBar';
import { PropertyMapExplorer } from '@/components/map/PropertyMapExplorer';
import { Pagination } from '@/components/ui/Pagination';
import { LoginOverlay } from '@/components/property/LoginOverlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { PropertyCardSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/AuthContext';
import { LayoutGrid, Map, Columns, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const PAGE_SIZE = 12;

/**
 * PropertyBrowseLayout
 * Fresh Redesign of Buy and Rent Browsing:
 * - Two distinct tabs: Listings (3-column compact grid, 12 per page, pagination) and Map (full Leaflet view with side list).
 * - Restrained, polished horizontal slide transition between tabs.
 * - Free OpenStreetMap tiles with warm porcelain styling and zero API key requirement.
 * - Fully synchronized search, filtering, and sorting across both tabs.
 */
export function PropertyBrowseLayout({
  mode = 'sale',
  categoryTag = 'Acquisitions & Ownership',
  pageTitle = 'Properties for Sale',
  tagline = 'Curated architectural properties, villas, and apartments available for purchase across premier Indian cities.',
  seoTitle = 'Properties for Sale | Porch Light',
  seoDescription = 'Browse verified luxury properties, heritage estates, and penthouses for sale in India.',
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Active view tab: 'listings' | 'map'
  const [activeTab, setActiveTab] = useState('listings');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Loaded items
  const [pageProperties, setPageProperties] = useState([]);
  const [allMatchingProperties, setAllMatchingProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state initialized from query params or mode
  const [filters, setFilters] = useState(() => ({
    listingType: mode,
    city: searchParams.get('city') || '',
    search: searchParams.get('q') || '',
    type: [],
    bedrooms: null,
    bathrooms: null,
    minPrice: null,
    maxPrice: null,
    minArea: null,
    maxArea: null,
    furnishing: '',
    possessionStatus: '',
    verifiedOnly: false,
    amenities: [],
  }));

  const [sortOption, setSortOption] = useState('featured');
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedMapProperty, setSelectedMapProperty] = useState(null);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

  // Comparison & saved state
  const [comparedProperties, setComparedProperties] = useState(() => compareService.getComparedProperties(mode));
  const [savedIds, setSavedIds] = useState([]);
  const [guestOverlayProperty, setGuestOverlayProperty] = useState(null);

  const resultsRef = useRef(null);

  // Sync document title and meta description
  useEffect(() => {
    document.title = seoTitle;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = seoDescription;
  }, [seoTitle, seoDescription]);

  // Listen to header show/hide state to synchronize sticky top offsets
  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement) {
      setIsHeaderHidden(document.documentElement.dataset.headerHidden === 'true');
    }

    const handleHeaderChange = (e) => {
      if (e?.detail && typeof e.detail.hidden === 'boolean') {
        setIsHeaderHidden(e.detail.hidden);
      }
    };

    window.addEventListener('porchlight-header-change', handleHeaderChange);
    return () => window.removeEventListener('porchlight-header-change', handleHeaderChange);
  }, []);

  // Sync route mode and city changes
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      listingType: mode,
      city: searchParams.get('city') || prev.city,
      search: searchParams.get('q') || prev.search,
    }));
    setCurrentPage(1);
    setSelectedMapProperty(null);
  }, [mode, searchParams]);

  // Synchronize comparison selection per mode
  useEffect(() => {
    setComparedProperties(compareService.getComparedProperties(mode));
    const unsubscribeCompare = compareService.subscribeToCompare(mode, (items) => {
      setComparedProperties(items);
    });
    return () => unsubscribeCompare();
  }, [mode]);

  // Load and subscribe to saved properties for active user
  useEffect(() => {
    if (isAuthenticated) {
      propertyService
        .getSavedProperties()
        .then((res) => {
          if (res?.data) {
            const ids = res.data.map((p) => (typeof p === 'object' && p !== null ? (p.id || p.customId) : p));
            setSavedIds(ids.map(String));
          }
        })
        .catch(() => {});

      const unsubscribeSaved = propertyService.subscribeToSavedProperties((newSaved) => {
        const ids = Array.isArray(newSaved)
          ? newSaved.map((p) => (typeof p === 'object' && p !== null ? (p.id || p.customId) : p))
          : [];
        setSavedIds(ids.map(String));
      });
      return () => unsubscribeSaved();
    } else {
      setSavedIds([]);
    }
  }, [isAuthenticated]);

  // Fetch properties via service layer with pagination and sorting
  const fetchProperties = async (targetPage = currentPage) => {
    setLoading(true);
    try {
      const res = await propertyService.getProperties({
        ...filters,
        listingType: mode,
        sortBy: sortOption,
        page: targetPage,
        pageSize: PAGE_SIZE,
      });

      setPageProperties(res.data || []);
      setAllMatchingProperties(res.allMatching || res.data || []);
      setTotalCount(res.total || 0);
      setTotalPages(res.totalPages || 1);

      // If selected property on map is filtered out, clear selection safely
      if (selectedMapProperty) {
        const stillMatches = (res.allMatching || []).some((p) => p.id === selectedMapProperty.id);
        if (!stillMatches) {
          setSelectedMapProperty(null);
        }
      }
    } catch (err) {
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filters, sorting, or target page changes
  useEffect(() => {
    fetchProperties(currentPage);
  }, [filters, sortOption, mode, currentPage]);

  // Autocomplete localities from properties
  const availableLocalities = useMemo(() => {
    const set = new Set();
    allMatchingProperties.forEach((p) => {
      if (p.locality) set.add(p.locality);
      if (p.city) set.add(p.city);
    });
    return Array.from(set);
  }, [allMatchingProperties]);

  const handleToggleSave = async (idOrProp) => {
    const rawId = typeof idOrProp === 'object' && idOrProp !== null ? (idOrProp.customId || idOrProp.id) : idOrProp;
    const target = allMatchingProperties.find((p) => p.id === rawId || p.customId === rawId) || pageProperties.find((p) => p.id === rawId || p.customId === rawId);
    const targetId = target?.customId || target?.id || rawId;

    if (!isAuthenticated) {
      setGuestOverlayProperty(target || { id: targetId, title: 'This Sanctuary' });
      return;
    }
    if (user?.role && user.role !== 'user') {
      toast.error('Only client user accounts can save properties');
      return;
    }
    try {
      const isNowSaved = await propertyService.toggleSavedProperty(targetId);
      const cleanId = String(targetId);
      const altId = target?.id && target.id !== cleanId ? String(target.id) : null;
      setSavedIds((prev) => {
        if (isNowSaved) {
          const next = [...prev, cleanId];
          if (altId) next.push(altId);
          return Array.from(new Set(next));
        } else {
          return prev.filter((item) => item !== cleanId && item !== altId);
        }
      });
      toast.success(isNowSaved ? 'Saved to collection' : 'Removed from collection');
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleToggleCompare = (property) => {
    if (!isAuthenticated) {
      setGuestOverlayProperty(property);
      return;
    }
    const result = compareService.toggleCompare(property, mode);
    if (!result.success) {
      toast.error(result.message);
    } else if (result.action === 'added') {
      toast.success(`Added ${property.title} to compare`);
    } else {
      toast.success(`Removed ${property.title} from compare`);
    }
  };

  // Filters change resets pagination to page 1
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setSelectedMapProperty(null);
  };

  // Sort change resets pagination to page 1
  const handleSortChange = (newSort) => {
    if (newSort === sortOption) return;
    setSortOption(newSort);
    setCurrentPage(1);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      listingType: mode,
      city: '',
      search: '',
      type: [],
      bedrooms: null,
      bathrooms: null,
      minPrice: null,
      maxPrice: null,
      minArea: null,
      maxArea: null,
      furnishing: '',
      possessionStatus: '',
      verifiedOnly: false,
      amenities: [],
    });
    setSortOption('featured');
    setCurrentPage(1);
    setSelectedMapProperty(null);
  };

  // Pagination page change: smooth scroll to top of results accounting for sticky filter toolbar
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    if (resultsRef.current && typeof window !== 'undefined') {
      const rect = resultsRef.current.getBoundingClientRect();
      const stickyBarOffset = isHeaderHidden ? 76 : 148;
      const targetY = Math.max(0, window.scrollY + rect.top - stickyBarOffset);
      window.scrollTo({
        top: targetY,
        behavior: shouldReduceMotion ? 'auto' : 'smooth',
      });
    }
  };

  // Transition variants: listings slides subtly, map fades cleanly to avoid Leaflet coordinate jitter
  const listingsVariants = {
    initial: (direction) => ({
      opacity: 0,
      x: shouldReduceMotion ? 0 : direction > 0 ? 20 : -20,
    }),
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
    },
    exit: (direction) => ({
      opacity: 0,
      x: shouldReduceMotion ? 0 : direction > 0 ? -20 : 20,
      transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  const mapVariants = {
    initial: {
      opacity: 0,
    },
    animate: {
      opacity: 1,
      transition: { duration: 0.25, ease: 'easeOut' },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.15, ease: 'easeIn' },
    },
  };

  // Direction: listings -> map = +1, map -> listings = -1
  const slideDirection = activeTab === 'map' ? 1 : -1;

  // Pagination display calculation
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className="bg-porcelain min-h-screen text-dark-gray pb-24">
      {/* 1. TOP BANNER & INTRO */}
      <div className="border-b border-dark-gray/10 bg-sand/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-deep-purple" />
              <p className="font-mono text-xs uppercase tracking-widest text-heather-purple font-medium">
                {categoryTag}
              </p>
            </div>
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-deep-purple tracking-tight">
                {pageTitle}
              </h1>
              <p className="font-sans text-sm sm:text-base text-dark-gray/70 max-w-2xl mt-1.5 leading-relaxed">
                {tagline}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STICKY SEARCH & FILTER CONTROLS */}
      <div
        style={{
          top: isHeaderHidden ? '0px' : '72px',
        }}
        className="border-b border-dark-gray/10 bg-porcelain/90 backdrop-blur-md sticky z-30 transition-[top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-xs"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <ListingFilterBar
            filters={filters}
            onChange={handleFiltersChange}
            onClear={handleClearFilters}
            sortOption={sortOption}
            onSortChange={handleSortChange}
            mode={mode}
            availableLocalities={availableLocalities}
            activeTab={activeTab}
          />
        </div>
      </div>

      {/* 3. MAIN BROWSING CANVAS */}
      <main ref={resultsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* TABS HEADER BAR: LISTINGS VS MAP CONTROL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-dark-gray/10 mb-6">
          {/* Active Tab Toggle */}
          <div
            role="tablist"
            aria-label="Browse views"
            className="inline-flex p-1 rounded-full bg-sand/60 border border-dark-gray/15 shadow-xs self-start"
          >
            {/* Listings Tab Button */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'listings'}
              onClick={() => setActiveTab('listings')}
              className={cn(
                'relative flex items-center gap-2 px-5 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-all select-none',
                activeTab === 'listings'
                  ? 'bg-deep-purple text-porcelain shadow-sm font-semibold'
                  : 'text-dark-gray/70 hover:text-dark-gray hover:bg-black/5 font-medium'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Listings ({totalCount})</span>
            </button>

            {/* Map Tab Button */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'map'}
              onClick={() => setActiveTab('map')}
              className={cn(
                'relative flex items-center gap-2 px-5 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-all select-none',
                activeTab === 'map'
                  ? 'bg-deep-purple text-porcelain shadow-sm font-semibold'
                  : 'text-dark-gray/70 hover:text-dark-gray hover:bg-black/5 font-medium'
              )}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map Explorer ({allMatchingProperties.length})</span>
            </button>
          </div>

          {/* Result context status */}
          <div className="font-mono text-xs text-dark-gray/60 flex items-center gap-2">
            {activeTab === 'listings' ? (
              <span>
                Showing <strong className="text-dark-gray font-semibold">{startItem}–{endItem}</strong> of{' '}
                <strong className="text-dark-gray font-semibold">{totalCount}</strong> {mode === 'sale' ? 'residences' : 'rentals'}
                {filters.city ? ` in ${filters.city}` : ' in India'}
              </span>
            ) : (
              <span>
                <strong className="text-dark-gray font-semibold">{allMatchingProperties.length}</strong> pins plotted on map
                {filters.city ? ` in ${filters.city}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* 4. HORIZONTAL SLIDE TRANSITION VIEWS */}
        <div className="relative overflow-hidden min-h-[480px]">
          <AnimatePresence mode="wait" custom={slideDirection}>
            {activeTab === 'listings' ? (
              <motion.div
                key="tab-listings"
                custom={slideDirection}
                variants={listingsVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full space-y-8"
              >
                {/* Loading Skeletons */}
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <PropertyCardSkeleton key={`skeleton-${i}`} />
                    ))}
                  </div>
                ) : pageProperties.length === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      title={
                        mode === 'sale'
                          ? 'No properties match your acquisition criteria'
                          : 'No rentals match your lease criteria'
                      }
                      description="Try adjusting your budget range, selected destination cities, or resetting active filters to view all available sanctuaries."
                      actionLabel="Reset all filters"
                      onAction={handleClearFilters}
                    />
                  </div>
                ) : (
                  <>
                    {/* Three-Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {pageProperties.map((property, idx) => (
                        <div key={property.id} className="h-full">
                          <PropertyGridCard
                            property={property}
                            index={idx}
                            mode={mode}
                            isSaved={savedIds.includes(property.id) || savedIds.includes(property.customId)}
                            isCompared={comparedProperties.some((p) => p.id === property.id || p.customId === property.customId)}
                            isSelected={selectedMapProperty?.id === property.id}
                            onToggleSave={handleToggleSave}
                            onToggleCompare={handleToggleCompare}
                            onGuestClick={(p) => setGuestOverlayProperty(p)}
                            onHover={(id) => setHoveredId(id)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Accessible Pagination */}
                    <div className="pt-6 pb-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="tab-map"
                variants={mapVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
              >
                {/* Full Map Explorer View */}
                <PropertyMapExplorer
                  properties={allMatchingProperties}
                  selectedId={selectedMapProperty?.id || null}
                  hoveredId={hoveredId}
                  onSelectProperty={(p) => setSelectedMapProperty(p)}
                  onHoverProperty={(id) => setHoveredId(id)}
                  mode={mode}
                  savedIds={savedIds}
                  comparedProperties={comparedProperties}
                  onToggleSave={handleToggleSave}
                  onToggleCompare={handleToggleCompare}
                  onGuestClick={(p) => setGuestOverlayProperty(p)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Compare Drawer Bar */}
      <AnimatePresence>
        {comparedProperties.length > 0 && (
          <motion.aside
            initial={shouldReduceMotion ? { opacity: 0 } : { y: 60, opacity: 0 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { y: 60, opacity: 0 }}
            aria-label="Comparison dock"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-dark-gray text-porcelain px-5 py-3 rounded-full shadow-2xl border border-white/10 flex items-center gap-3 sm:gap-4 text-xs font-mono max-w-[92vw]"
          >
            <div className="flex items-center gap-2 shrink-0">
              <Columns className="w-4 h-4 text-electric-lemon" />
              <span>Comparing ({comparedProperties.length}/3)</span>
            </div>
            <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />
            <button
              onClick={() => {
                const ids = comparedProperties.map((p) => p.id).join(',');
                navigate(`/compare?type=${mode}&ids=${ids}`);
              }}
              className="bg-electric-lemon text-dark-gray font-bold px-3.5 py-1.5 rounded-full hover:bg-white transition-colors shrink-0"
            >
              Compare Side-by-Side
            </button>
            <button
              onClick={() => {
                compareService.clearCompare(mode);
                toast.success(`Removed all ${mode === 'rent' ? 'rental' : 'sale'} properties from compare`);
              }}
              aria-label="Clear compare list"
              title="Clear all compared properties"
              className="text-white/60 hover:text-white p-1 rounded-full transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Guest Login Overlay Modal */}
      <LoginOverlay
        isOpen={!!guestOverlayProperty}
        onClose={() => setGuestOverlayProperty(null)}
        propertyTitle={guestOverlayProperty?.title}
      />
    </div>
  );
}

export default PropertyBrowseLayout;

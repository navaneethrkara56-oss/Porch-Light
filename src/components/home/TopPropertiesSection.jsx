import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { getProperties } from '@/services/properties';
import { isPremium } from '@/lib/isPremium';
import { formatINR, formatArea } from '@/lib/formatINR';
import { useAuth } from '@/features/auth/AuthContext';
import { useDesktop } from '@/hooks/useDesktop';
import { LoginOverlay } from '@/components/property/LoginOverlay';
import { ArrowUpRight, CheckCircle2, Compass, Bed, Bath, Maximize2, Waves, Sparkles } from 'lucide-react';

/* ── Reveal animation variants (consistent system) ── */
const lineReveal = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};
const monoSlide = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * SECTION 3: TOP PROPERTIES
 * - Normal flow block; square top edges (border-radius 0); exactly 100dvh
 * - display: grid; grid-template-rows: auto minmax(0, 1fr); padding: 88px clamp(20px, 5vw, 72px) 24px; row-gap: 20px;
 * - 2x2 grid of 4 featured properties (2 rows, 2 cards per row)
 * - Collapsed: ONLY city tag, premium tag, property name in serif with text-shadow
 * - Hover (150ms intent / 250ms leave): only hovered card flex-grow 1.9, other 1. Photo scales 1 to 1.05
 * - Expanded panel: right half (inset: 0 0 0 50%, padding 20px), opacity 0 to 1 over 500ms (delay 400ms)
 * - Cheap backdrop: 48px canvas downsampled blurred images crossfading opacity, no CSS blur, 8% numeral
 */
export function TopPropertiesSection() {
  const isDesktop = useDesktop();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  const { isGuest } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [activeId, setActiveId] = useState(null); // id of currently expanded card
  const [activePropertyIndex, setActivePropertyIndex] = useState(0); // for backdrop numeral
  const [backdrops, setBackdrops] = useState({});
  const [loginOverlayOpen, setLoginOverlayOpen] = useState(false);
  const [selectedPropForLogin, setSelectedPropForLogin] = useState(null);

  const enterTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);

  // Load properties and generate 48px low-res blurred dataURLs once on mount and on store updates
  useEffect(() => {
    let isMounted = true;

    const fetchTopProperties = () => {
      getProperties({ status: 'approved', pageSize: 100 })
        .then((res) => {
          if (!isMounted) return;
          const all = (res.data && res.data.length > 0) ? res.data : (res.allMatching || []);
          const now = new Date();

          // Strictly prioritize actively featured properties (Admin curated or approved Premium Promotion)
          const activeFeatured = all
            .filter((p) => {
              if (p.status !== 'approved' || p.isSold || p.isLeased || p.availabilityStatus === 'sold' || p.rentalStatus === 'leased' || p.isArchived) return false;
              if (p.featuredUntil && new Date(p.featuredUntil) < now) return false;
              if (p.promotedUntil && new Date(p.promotedUntil) < now) return false;
              return Boolean(p.featured);
            })
            .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99))
            .slice(0, 4);

          setProperties(activeFeatured);

          // Generate 48px canvas downsampled data URLs for cheap backdrop
          activeFeatured.forEach((prop, idx) => {
          const imgSrc =
            prop.coverImage ||
            (prop.images && prop.images[0]) ||
            '';

          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 48;
              canvas.height = Math.max(24, Math.round(48 * (img.naturalHeight / img.naturalWidth || 0.65)));
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
              if (isMounted) {
                setBackdrops((prev) => ({ ...prev, [prop.id]: dataUrl }));
              }
            } catch (e) {
              if (isMounted) {
                setBackdrops((prev) => ({ ...prev, [prop.id]: imgSrc }));
              }
            }
          };
          img.onerror = () => {
            if (isMounted) {
              setBackdrops((prev) => ({ ...prev, [prop.id]: imgSrc }));
            }
          };
          img.src = imgSrc;
        });
      });
    };

      fetchTopProperties();

      const handleUpdate = () => fetchTopProperties();
      window.addEventListener('porch:featured-updated', handleUpdate);
      window.addEventListener('storage', handleUpdate);
      window.addEventListener('focus', handleUpdate);

      return () => {
        isMounted = false;
        window.removeEventListener('porch:featured-updated', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
        window.removeEventListener('focus', handleUpdate);
        if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
        if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
      };
    }, []);

  const handleMouseEnter = (prop, index) => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    enterTimerRef.current = setTimeout(() => {
      setActiveId(prop.id);
      setActivePropertyIndex(index);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setActiveId(null);
    }, 250);
  };

  const handleCardClick = (prop, index) => {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    if (activeId === prop.id) {
      setActiveId(null);
    } else {
      setActiveId(prop.id);
      setActivePropertyIndex(index);
    }
  };

  const handleViewProperty = (e, prop) => {
    e.stopPropagation();
    if (isGuest) {
      setSelectedPropForLogin(prop);
      setLoginOverlayOpen(true);
    } else {
      navigate(`/property/${prop.id}`);
    }
  };

  // Always construct exactly 4 slots (active properties fill available slots, remainder are themed placeholders)
  const displaySlots = useMemo(() => {
    const slots = [];
    for (let i = 0; i < 4; i++) {
      if (i < properties.length) {
        slots.push({
          isPlaceholder: false,
          id: properties[i].id,
          property: properties[i],
          slotIndex: i,
        });
      } else {
        slots.push({
          isPlaceholder: true,
          id: `unfilled-slot-${i}`,
          slotIndex: i,
          title: `Showcase Slot #${i + 1}`,
          subtitle: 'Awaiting Editorial Selection',
        });
      }
    }
    return slots;
  }, [properties]);

  const row1 = displaySlots.slice(0, 2);
  const row2 = displaySlots.slice(2, 4);

  /* Helper: renders a single property or themed placeholder card */
  const renderCard = (slotItem, index) => {
    if (slotItem.isPlaceholder) {
      const isExpanded = activeId === slotItem.id;
      return (
        <div
          key={slotItem.id}
          onMouseEnter={() => handleMouseEnter({ id: slotItem.id }, index)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleCardClick({ id: slotItem.id }, index)}
          style={{
            flexGrow: isExpanded ? 1.4 : 1,
            flexShrink: 1,
            flexBasis: 0,
            transition: 'flex-grow 1000ms cubic-bezier(0.65, 0, 0.35, 1)',
          }}
          className="relative h-full min-h-0 rounded-[20px] overflow-hidden border border-dashed border-porcelain/20 bg-charcoal/60 backdrop-blur-xs flex flex-col justify-between p-6 select-none group hover:border-porcelain/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-porcelain/60 px-2.5 py-1 rounded-full bg-porcelain/5 border border-porcelain/10">
              Slot {String(index + 1).padStart(2, '0')}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-lemon/80 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>Curated Slot</span>
            </span>
          </div>

          <div className="space-y-2 my-auto text-center py-4">
            <div className="w-10 h-10 rounded-full bg-porcelain/5 border border-porcelain/15 flex items-center justify-center mx-auto text-porcelain/40 group-hover:text-lemon transition-colors">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-[clamp(1.2rem,1.8vw,1.6rem)] text-porcelain/80 font-normal">
              Awaiting Editorial Selection
            </h3>
            <p className="font-mono text-[11px] text-porcelain/50 max-w-[240px] mx-auto leading-relaxed">
              Curated architectural residences rotate into this showcase slot.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-porcelain/10 pt-3 text-[11px] font-mono text-porcelain/40">
            <span>Porch Light Showcase</span>
            <Link to="/buy" className="hover:text-lemon transition-colors flex items-center gap-1">
              <span>Explore all</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      );
    }

    const prop = slotItem.property;
    const isExpanded = activeId === prop.id;
    const imgSrc = prop.coverImage || (prop.images && prop.images[0]) || '';
    const premiumFlag = isPremium(prop);

    return (
      <div
        key={prop.id}
        onMouseEnter={() => handleMouseEnter(prop, index)}
        onMouseLeave={handleMouseLeave}
        onClick={() => handleCardClick(prop, index)}
        style={{
          flexGrow: isExpanded ? 1.9 : 1,
          flexShrink: 1,
          flexBasis: 0,
          transition: 'flex-grow 1000ms cubic-bezier(0.65, 0, 0.35, 1)',
        }}
        className="relative min-w-0 h-full rounded-[20px] overflow-hidden cursor-pointer bg-charcoal/90 border border-porcelain/15 select-none"
      >
        {/* Photo Layer (scales 1 to 1.05 over 1200ms) */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${imgSrc})`,
            filter: 'brightness(0.82)',
            transform: isExpanded ? 'scale(1.05)' : 'scale(1)',
            transition: 'transform 1200ms cubic-bezier(0.65, 0, 0.35, 1)',
          }}
        />

        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-transparent to-black/25 pointer-events-none" />

        {/* COLLAPSED LAYER: Shows ONLY city tag, premium tag, and property name */}
        <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
          {/* Top tags */}
          <div className="flex items-center justify-between w-full">
            <span className="px-2.5 py-1 rounded-full bg-charcoal/90 text-porcelain font-mono text-[11px] uppercase tracking-wider border border-porcelain/20">
              {prop.city}
            </span>

            {premiumFlag && (
              <span className="px-2.5 py-1 rounded-full bg-charcoal/90 text-lemon font-mono text-[11px] uppercase tracking-wider border border-lemon/30 flex items-center gap-1">
                <Compass className="w-3 h-3 text-lemon" />
                <span>Premium</span>
              </span>
            )}
          </div>

          {/* Bottom left property name in serif with text-shadow */}
          <div
            style={{
              opacity: isExpanded ? 0 : 1,
              transition: 'opacity 300ms ease-out',
            }}
            className="truncate max-w-[90%]"
          >
            <h3
              className="font-serif text-[20px] sm:text-[22px] text-porcelain leading-tight truncate"
              style={{ textShadow: '0 1px 18px rgba(20,20,24,0.55)' }}
            >
              {prop.title}
            </h3>
          </div>
        </div>

        {/* EXPANDED DETAILS: Absolutely positioned charcoal panel over right half */}
        <div
          style={{
            inset: '0 0 0 50%',
            padding: '18px 20px',
            opacity: isExpanded ? 1 : 0,
            pointerEvents: isExpanded ? 'auto' : 'none',
            transition: 'opacity 500ms cubic-bezier(0.4, 0, 0.2, 1) 400ms',
          }}
          className="absolute bg-charcoal/95 border-l border-porcelain/15 flex flex-col justify-between overflow-hidden shadow-2xl"
        >
          {/* Top info: Price & Mono line */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-serif text-[clamp(1.4rem,2vw,1.75rem)] text-porcelain font-medium leading-none">
                {formatINR(prop.price, { short: true, rent: prop.listingType === 'rent' })}
              </span>

              {premiumFlag && (
                <span className="font-mono text-[10px] text-lemon border border-lemon/30 px-1.5 py-0.5 rounded-full uppercase">
                  360 tour
                </span>
              )}
            </div>

            <span className="font-mono text-[11px] text-porcelain/70 uppercase tracking-wider truncate">
              {prop.bedrooms ? `${prop.bedrooms} BHK` : prop.type} · {formatArea(prop.builtUpArea || prop.carpetArea)} · {prop.locality}
            </span>

            {/* Two-line description */}
            <p className="font-sans text-[12px] text-porcelain/80 line-clamp-2 leading-relaxed pt-1">
              {prop.description}
            </p>
          </div>

          {/* Middle: 4 Key Facts in one row */}
          <div className="grid grid-cols-4 gap-1 py-1 font-mono text-[10px] text-porcelain/75 border-y border-porcelain/10">
            <div className="flex items-center gap-1 truncate">
              <Bed className="w-3 h-3 text-lemon flex-shrink-0" />
              <span>{prop.bedrooms || 3} Bed</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <Bath className="w-3 h-3 text-lemon flex-shrink-0" />
              <span>{prop.bathrooms || 3} Bath</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <Maximize2 className="w-3 h-3 text-lemon flex-shrink-0" />
              <span>{prop.builtUpArea || 2200} sq ft</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <Waves className="w-3 h-3 text-lemon flex-shrink-0" />
              <span>{prop.pool && prop.pool !== 'none' ? 'Pool' : 'Gated'}</span>
            </div>
          </div>

          {/* Bottom: Agent & View Button */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-porcelain/80 font-mono text-[11px] truncate max-w-[55%]">
              <CheckCircle2 className="w-3.5 h-3.5 text-lemon flex-shrink-0" />
              <span className="truncate">{prop.agentName || 'Verified Agent'}</span>
            </div>

            <button
              type="button"
              onClick={(e) => handleViewProperty(e, prop)}
              className="px-3.5 py-1.5 rounded-[10px] bg-porcelain text-charcoal font-mono text-[11px] uppercase font-bold tracking-wider hover:bg-lemon hover:text-charcoal transition-colors duration-350 cursor-pointer whitespace-nowrap"
            >
              View property
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      ref={sectionRef}
      id="top-properties-section"
      data-header-theme="dark"
      className="relative w-full bg-charcoal text-porcelain select-none overflow-hidden rounded-none"
      style={{
        display: 'grid',
        gridTemplateRows: isDesktop ? 'auto minmax(0, 1fr)' : 'auto auto',
        padding: '88px clamp(20px, 5vw, 72px) 32px',
        rowGap: '20px',
        height: isDesktop ? '100dvh' : 'auto',
        minHeight: isDesktop ? '100dvh' : 'auto',
      }}
    >
      {/* ================= BACKDROP (Cheap Canvas Blur) ================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Stack of 4 canvas-blurred low-res backdrops crossfading opacity */}
        {properties.map((prop, idx) => {
          const bgUrl = backdrops[prop.id];
          const isActive = activePropertyIndex === idx;
          return (
            <div
              key={`bg-${prop.id}`}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: bgUrl ? `url(${bgUrl})` : 'none',
                filter: 'brightness(0.4)',
                opacity: isActive ? 1 : 0,
                transition: 'opacity 900ms ease-in-out',
                transform: 'scale(1.08)',
              }}
            />
          );
        })}

        {/* Static SVG grain texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Huge outlined serif numeral */}
        <div
          aria-hidden="true"
          className="absolute right-[4vw] bottom-[2vh] font-serif text-[clamp(14rem,25vw,26rem)] text-transparent leading-none select-none"
          style={{
            WebkitTextStroke: '2px rgba(241, 236, 227, 0.08)',
            opacity: 0.08,
          }}
        >
          {String(activePropertyIndex + 1).padStart(2, '0')}
        </div>
      </div>

      {/* ================= HEADING ROW (with reveals) ================= */}
      <div className="relative z-10 w-full flex flex-wrap items-baseline justify-between border-b border-porcelain/15 pb-3 gap-[8px_16px]">
        {/* Left: Mono label & serif title */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 min-w-0">
          <motion.span
            variants={monoSlide}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            className="font-mono text-[12px] sm:text-[13px] uppercase tracking-[0.2em] text-porcelain/70 font-semibold"
          >
            Top residences
          </motion.span>
          <div className="overflow-hidden">
            <motion.h2
              variants={lineReveal}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className="font-serif text-[clamp(1.8rem,2.8vw,2.5rem)] leading-none text-porcelain tracking-tight"
            >
              Four homes worth the <span className="italic">visit</span>
            </motion.h2>
          </div>
        </div>

        {/* Right: View all homes link */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          custom={1}
        >
          <Link
            to="/buy"
            className="inline-flex items-center gap-1.5 font-mono text-[12px] sm:text-[13px] uppercase tracking-[0.16em] text-porcelain/80 hover:text-lemon border-b border-porcelain/25 hover:border-lemon pb-0.5 transition-colors duration-350 w-full lg:w-auto text-left"
          >
            <span>View all homes</span>
            <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
          </Link>
        </motion.div>
      </div>

      {/* ================= 4 SHOWCASE SLOTS ================= */}
      {isDesktop ? (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full h-full min-h-0"
          style={{
            display: 'grid',
            gridTemplateRows: '1fr 1fr',
            gap: '16px',
          }}
        >
          {/* ROW 1 */}
          <div className="flex w-full h-full min-h-0 gap-4">
            {row1.map((item, rIdx) => renderCard(item, rIdx))}
          </div>

          {/* ROW 2 */}
          <div className="flex w-full h-full min-h-0 gap-4">
            {row2.map((item, rIdx) => renderCard(item, rIdx + 2))}
          </div>
        </motion.div>
      ) : (
        /* NON-DESKTOP: SINGLE COLUMN OF FOUR CARDS (~38vh each, accordion on tap) */
        <div className="relative z-10 w-full max-w-full flex flex-col gap-4">
          {displaySlots.map((slotItem, idx) => {
            if (slotItem.isPlaceholder) {
              return (
                <div
                  key={slotItem.id}
                  className="w-full rounded-[20px] p-6 bg-charcoal/80 border border-dashed border-porcelain/20 flex flex-col justify-between min-h-[160px] text-center"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-porcelain/60 px-2.5 py-1 rounded-full bg-porcelain/5 border border-porcelain/10">
                      Slot {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-lemon/80 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Curated Slot</span>
                    </span>
                  </div>
                  <h3 className="font-serif text-xl text-porcelain/80">Awaiting Editorial Selection</h3>
                  <p className="font-mono text-xs text-porcelain/50 mt-1">Curated architectural residences rotate here.</p>
                  <div className="mt-4 pt-3 border-t border-porcelain/10">
                    <Link to="/buy" className="text-xs font-mono text-lemon uppercase tracking-wider inline-flex items-center gap-1">
                      <span>Explore all homes</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            }

            const prop = slotItem.property;
            const isExpanded = activeId === prop.id;
            const imgSrc = prop.coverImage || (prop.images && prop.images[0]) || '';
            const premiumFlag = isPremium(prop);

            return (
              <motion.div
                key={prop.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => handleCardClick(prop, idx)}
                className="w-full max-w-full rounded-[20px] overflow-hidden bg-charcoal/90 border border-porcelain/15 flex flex-col cursor-pointer shadow-md relative"
                style={{
                  minHeight: isExpanded ? 'auto' : '38vh',
                }}
              >
                {/* Photo Header */}
                <div
                  className="w-full relative bg-cover bg-center overflow-hidden"
                  style={{
                    height: isExpanded ? '200px' : '38vh',
                    backgroundImage: `url(${imgSrc})`,
                    filter: 'brightness(0.85)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-transparent to-black/25" />
                  
                  {/* Tags */}
                  <div className="absolute top-[12px] left-[12px] right-[12px] flex items-center justify-between gap-2 z-10 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-full bg-charcoal/90 text-porcelain font-mono text-[11px] uppercase tracking-wider border border-porcelain/20 truncate min-w-0">
                      {prop.city}
                    </span>
                    {premiumFlag && (
                      <span className="px-2.5 py-1 rounded-full bg-charcoal/90 text-lemon font-mono text-[11px] uppercase tracking-wider border border-lemon/30 flex items-center gap-1 flex-shrink-0">
                        <Compass className="w-3 h-3 text-lemon flex-shrink-0" />
                        <span>Premium</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom title & tap hint */}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="font-serif text-[22px] text-porcelain leading-tight truncate min-w-0">
                      {prop.title}
                    </h3>
                    {!isExpanded && (
                      <div className="font-mono text-xs text-lemon mt-1">
                        Tap to view details →
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Details Accordion */}
                {isExpanded && (
                  <div className="p-5 bg-charcoal border-t border-porcelain/15 flex flex-col gap-4 animate-in fade-in duration-200">
                    <div className="flex items-baseline justify-between">
                      <div className="font-serif text-[26px] text-porcelain">
                        {formatINR(prop.price, { rent: prop.listingType === 'rent' })}
                      </div>
                      <div className="font-mono text-xs text-porcelain/70 uppercase">
                        {prop.type || 'Residence'} · {prop.city}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-porcelain/85 font-mono text-xs py-2 border-y border-porcelain/15">
                      <div className="flex items-center gap-1.5">
                        <Bed className="w-3.5 h-3.5 text-lemon" />
                        <span>{prop.bedrooms || 3} BHK</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Bath className="w-3.5 h-3.5 text-lemon" />
                        <span>{prop.bathrooms || 3} Baths</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-lemon" />
                        <span>{formatArea(prop.area || 2200)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Waves className="w-3.5 h-3.5 text-lemon" />
                        <span>{prop.furnishing || 'Furnished'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-porcelain/75 font-mono text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-lemon" />
                        <span>{prop.agentName || 'Verified Agent'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleViewProperty(e, prop)}
                        className="px-4 py-2 rounded-[10px] bg-porcelain text-charcoal font-mono text-xs uppercase font-bold tracking-wider hover:bg-lemon transition-colors"
                      >
                        View property
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Guest Login Overlay */}
      {loginOverlayOpen && (
        <LoginOverlay
          isOpen={loginOverlayOpen}
          onClose={() => setLoginOverlayOpen(false)}
          propertyTitle={selectedPropForLogin?.title || 'this property'}
        />
      )}
    </section>
  );
}

export default TopPropertiesSection;

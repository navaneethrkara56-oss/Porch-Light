import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ImageSlot } from '@/components/shared/ImageSlot';
import { useDesktop } from '@/hooks/useDesktop';
import { Compass, Building2, ArrowUpRight } from 'lucide-react';

/* ── Reveal animation variants ── */
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

const BUY_STEPS = [
  { num: '1', label: 'Search', desc: 'Filter by city, type and budget.' },
  { num: '2', label: 'Visit', desc: 'Book a slot and the agent confirms.' },
  { num: '3', label: 'Token', desc: 'Reserve with a simulated token payment.' },
  { num: '4', label: 'Ownership', desc: 'Get your booking confirmation.' },
];

const RENT_STEPS = [
  { num: '1', label: 'Request', desc: 'Send a request for the home.' },
  { num: '2', label: 'Agent accepts', desc: 'The agent reviews and confirms.' },
  { num: '3', label: 'Deposit', desc: 'Pay the deposit and first month (demo).' },
  { num: '4', label: 'Agreement', desc: 'Download your rental agreement.' },
];

/**
 * SECTION 4: BUY OR RENT + PHOTO EXPANSION
 * - Deep purple #5E4F7A background, data-header-theme dark
 * - Sticky scene without pinning: .scene (100dvh + 260dvh) + .scene-inner (sticky top 0, 100dvh)
 * - Contrast: porcelain on deep purple, charcoal/porcelain panels, porcelain map/plan tiles with charcoal line art
 * - Small screens (!isDesktop): height auto, non-sticky, stacked Buy & Rent panels with descriptions always visible, 16:9 photo, no graphics
 */
export function BuyOrRentSection() {
  const isDesktop = useDesktop();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  const [hoveredPanel, setHoveredPanel] = useState(null); // 'buy' | 'rent' | null
  const enterTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);

  const handleMouseEnter = (panel) => {
    if (!isDesktop) return;
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    enterTimerRef.current = setTimeout(() => {
      setHoveredPanel(panel);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (!isDesktop) return;
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setHoveredPanel(null);
    }, 250);
  };

  const handlePanelTap = (panel) => {
    if (!isDesktop) return;
    setHoveredPanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <section
      ref={sectionRef}
      id="buy-or-rent-scene"
      data-header-theme="dark"
      className="scene relative w-full block bg-deep-purple text-porcelain select-none"
      style={{
        borderRadius: 0,
        height: isDesktop ? 'calc(100vh + 260vh)' : 'auto',
        minHeight: isDesktop ? 'calc(100dvh + 260dvh)' : 'auto',
      }}
    >
      {/* Sticky scene-inner on desktop / normal flow on mobile */}
      <div
        className="scene-inner w-full flex flex-col justify-between overflow-hidden"
        style={{
          position: isDesktop ? 'sticky' : 'relative',
          top: 0,
          height: isDesktop ? '100dvh' : 'auto',
          minHeight: isDesktop ? '100dvh' : 'auto',
          paddingTop: 'clamp(72px, 9vh, 96px)',
          paddingBottom: 'clamp(20px, 3vh, 32px)',
          paddingLeft: 'clamp(20px, 5vw, 96px)',
          paddingRight: 'clamp(20px, 5vw, 96px)',
          maxWidth: '1680px',
          margin: '0 auto',
        }}
      >
        {/* ================= TOP BLOCK (Collapses in desktop scrub) ================= */}
        <div
          className="top-block w-full flex flex-col justify-between overflow-hidden flex-shrink-0"
          style={{
            height: isDesktop ? 'calc(100dvh - 96px - 32px - 38vh)' : 'auto',
          }}
        >
          {/* Centered Heading with reveal */}
          <div className="w-full text-center flex flex-col items-center gap-1 pb-3 flex-shrink-0">
            <motion.span
              variants={monoSlide}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className="font-mono text-[clamp(0.8rem,0.85vw,1rem)] uppercase tracking-[0.22em] text-porcelain/75 font-semibold"
            >
              Start here
            </motion.span>
            <div className="overflow-hidden">
              <motion.h2
                variants={lineReveal}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                className="font-serif text-[clamp(2rem,3.4vw,3.6rem)] leading-none text-porcelain tracking-tight font-normal"
              >
                Choose how you want to <span className="italic font-normal">come home</span>
              </motion.h2>
            </div>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              custom={1}
              className="font-sans text-[clamp(0.95rem,1.1vw,1.25rem)] text-porcelain/80 max-w-xl leading-snug pt-0.5"
            >
              Two distinct paths with verified inventory, transparent pricing, and zero broker runaround.
            </motion.p>
          </div>

          {/* Two Panels (Buy & Rent) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex-1 flex flex-col lg:flex-row items-stretch gap-4 min-h-0 pt-1 pb-2"
          >
            {/* BUY PANEL */}
            <div
              onMouseEnter={() => handleMouseEnter('buy')}
              onMouseLeave={handleMouseLeave}
              onClick={() => handlePanelTap('buy')}
              style={{
                flexGrow: isDesktop ? (hoveredPanel === 'buy' ? 1.8 : hoveredPanel === 'rent' ? 0.7 : 1) : 1,
                flexShrink: 1,
                flexBasis: isDesktop ? 0 : 'auto',
                transition: isDesktop ? 'flex-grow 1000ms cubic-bezier(0.65, 0, 0.35, 1)' : 'none',
              }}
              className="relative rounded-[20px] bg-charcoal text-porcelain p-5 sm:p-6 flex flex-col justify-between cursor-pointer overflow-hidden shadow-lg select-none min-w-0"
            >
              {/* Header: Serif Word & Caption */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-serif text-[32px] sm:text-[38px] leading-none text-porcelain font-normal">
                    Buy
                  </h3>
                  <p className="font-sans text-[13px] sm:text-[14px] text-porcelain/75 pt-1 truncate">
                    Homes to stay in for good.
                  </p>
                </div>

                <Link
                  to="/buy"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    opacity: isDesktop ? (hoveredPanel === 'buy' ? 1 : 0) : 1,
                    pointerEvents: isDesktop ? (hoveredPanel === 'buy' ? 'auto' : 'none') : 'auto',
                    transition: 'opacity 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  className="px-3.5 py-1.5 rounded-[10px] bg-porcelain text-charcoal font-mono text-[11px] uppercase font-bold tracking-wider hover:bg-lemon hover:text-charcoal transition-colors duration-350 whitespace-nowrap flex items-center gap-1 shadow-sm flex-shrink-0"
                >
                  <span>Browse homes for sale</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* 4 Numbered Steps with Connecting Line */}
              <div className="pt-3 w-full">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 relative">
                  {/* Connecting Line (desktop) */}
                  <div className="hidden sm:block absolute top-2.5 inset-x-4 h-[1px] bg-porcelain/25 z-0" />

                  {BUY_STEPS.map((step) => (
                    <div key={step.num} className="relative z-10 flex flex-col items-center text-center">
                      <div className="w-5 h-5 rounded-full bg-charcoal border border-porcelain text-porcelain font-mono text-[10px] flex items-center justify-center font-bold">
                        {step.num}
                      </div>
                      <span className="font-mono text-[11px] text-porcelain font-semibold pt-1 truncate w-full">
                        {step.label}
                      </span>
                      {/* Description: always visible on mobile; fades in on desktop hover */}
                      <p
                        style={{
                          opacity: isDesktop ? (hoveredPanel === 'buy' ? 1 : 0) : 1,
                          transition: 'opacity 400ms ease-out 200ms',
                        }}
                        className="font-sans text-[11px] text-porcelain/75 leading-tight pt-0.5 w-full"
                      >
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RENT PANEL (Porcelain background, Charcoal text, border: none) */}
            <div
              onMouseEnter={() => handleMouseEnter('rent')}
              onMouseLeave={handleMouseLeave}
              onClick={() => handlePanelTap('rent')}
              style={{
                flexGrow: isDesktop ? (hoveredPanel === 'rent' ? 1.8 : hoveredPanel === 'buy' ? 0.7 : 1) : 1,
                flexShrink: 1,
                flexBasis: isDesktop ? 0 : 'auto',
                border: 'none',
                transition: isDesktop ? 'flex-grow 1000ms cubic-bezier(0.65, 0, 0.35, 1)' : 'none',
              }}
              className="relative rounded-[20px] bg-porcelain text-charcoal p-5 sm:p-6 flex flex-col justify-between cursor-pointer overflow-hidden shadow-sm select-none min-w-0"
            >
              {/* Header: Serif Word & Caption */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-serif text-[32px] sm:text-[38px] leading-none text-charcoal font-normal">
                    Rent
                  </h3>
                  <p className="font-sans text-[13px] sm:text-[14px] text-charcoal/75 pt-1 truncate">
                    Homes to start from tomorrow.
                  </p>
                </div>

                <Link
                  to="/rent"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    opacity: isDesktop ? (hoveredPanel === 'rent' ? 1 : 0) : 1,
                    pointerEvents: isDesktop ? (hoveredPanel === 'rent' ? 'auto' : 'none') : 'auto',
                    transition: 'opacity 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  className="px-3.5 py-1.5 rounded-[10px] bg-charcoal text-porcelain font-mono text-[11px] uppercase font-bold tracking-wider hover:bg-deep-purple transition-colors duration-350 whitespace-nowrap flex items-center gap-1 shadow-sm flex-shrink-0"
                >
                  <span>Browse rentals</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* 4 Numbered Steps with Connecting Line */}
              <div className="pt-3 w-full">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 relative">
                  {/* Connecting Line (desktop) */}
                  <div className="hidden sm:block absolute top-2.5 inset-x-4 h-[1px] bg-charcoal/20 z-0" />

                  {RENT_STEPS.map((step) => (
                    <div key={step.num} className="relative z-10 flex flex-col items-center text-center">
                      <div className="w-5 h-5 rounded-full bg-porcelain border border-charcoal text-charcoal font-mono text-[10px] flex items-center justify-center font-bold">
                        {step.num}
                      </div>
                      <span className="font-mono text-[11px] text-charcoal font-semibold pt-1 truncate w-full">
                        {step.label}
                      </span>
                      {/* Description: always visible on mobile; fades in on desktop hover */}
                      <p
                        style={{
                          opacity: isDesktop ? (hoveredPanel === 'rent' ? 1 : 0) : 1,
                          transition: 'opacity 400ms ease-out 200ms',
                        }}
                        className="font-sans text-[11px] text-charcoal/75 leading-tight pt-0.5 w-full"
                      >
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ================= PHOTO ROW ================= */}
        <div className="w-full flex-1 flex items-stretch gap-4 min-h-0 mt-4 relative z-10 overflow-hidden">
          {/* ITEM 1: MAP GRAPHIC (Desktop only, flex 1) */}
          <div
            style={{ flex: '1 1 0', minWidth: 0 }}
            className="map-item hidden lg:flex h-full rounded-[20px] bg-porcelain text-charcoal p-3.5 flex-col justify-between overflow-hidden shadow-xs relative"
          >
            <div className="flex items-center justify-between font-mono text-[11px] text-charcoal/70 uppercase">
              <span>Neighbourhood Map</span>
              <Compass className="w-3.5 h-3.5 text-deep-purple" />
            </div>

            <svg
              className="w-full h-[70%] text-charcoal/40 stroke-current"
              viewBox="0 0 160 120"
              fill="none"
              strokeWidth="1.5"
            >
              <path d="M0 45 Q 80 40, 160 55" strokeWidth="2.5" />
              <path d="M40 0 Q 60 70, 75 120" strokeWidth="2.5" />
              <path d="M110 0 Q 120 60, 135 120" strokeWidth="2" />
              <line x1="10" y1="20" x2="60" y2="25" />
              <line x1="85" y1="70" x2="150" y2="75" />
              <line x1="20" y1="90" x2="70" y2="95" />
              <line x1="90" y1="30" x2="140" y2="35" />
              <rect x="80" y="80" width="35" height="25" rx="6" fill="#F1ECE3" strokeWidth="1" />
              <circle cx="65" cy="50" r="5" fill="#E6FF3D" stroke="#26262B" strokeWidth="1.5" />
            </svg>

            <span className="font-mono text-[10px] text-charcoal/60 uppercase truncate">
              Kochi Waterfront Sector
            </span>
          </div>

          {/* ITEM 2: HOME EXTERIOR PHOTO (flex 2.2 by default, expands to 12 on desktop scrub) */}
          <div
            style={{ flex: isDesktop ? '2.2 1 0' : '1 1 0', minWidth: 0 }}
            className="center-photo w-full aspect-[16/9] lg:aspect-auto h-[240px] sm:h-[320px] lg:h-full rounded-[20px] overflow-hidden bg-sand/60 relative shadow-sm"
          >
            <ImageSlot
              slot="paths.exterior"
              alt="Architectural Residence Exterior"
              reveal={true}
              className="w-full h-full"
              imgClassName="w-full h-full object-cover object-center"
            />

            {/* Caption Chip (revealed at 80% to 100% of scrub) */}
            <div
              style={{ opacity: 0, transform: 'translateY(20px)' }}
              className="caption-chip absolute bottom-4 sm:bottom-6 inset-x-4 sm:inset-x-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-[16px] bg-charcoal text-porcelain border border-porcelain/20 shadow-2xl z-20 pointer-events-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-lemon/20 border border-lemon/40 flex items-center justify-center text-lemon flex-shrink-0">
                  <Compass className="w-4 h-4 text-lemon" />
                </div>
                <div>
                  <h4 className="font-serif text-[18px] sm:text-[20px] leading-tight text-porcelain">
                    Step inside before you drive over.
                  </h4>
                  <p className="font-sans text-[13px] text-porcelain/75">
                    Spatial 360-degree virtual walkthroughs across all premium homes.
                  </p>
                </div>
              </div>

              <Link
                to="/buy?premium=true"
                className="px-4 py-2 rounded-[10px] bg-lemon text-charcoal font-mono text-[11px] uppercase font-bold tracking-wider hover:bg-porcelain transition-colors duration-350 whitespace-nowrap"
              >
                Take the 360 tour →
              </Link>
            </div>
          </div>

          {/* ITEM 3: FLOOR PLAN GRAPHIC (Desktop only, flex 1) */}
          <div
            style={{ flex: '1 1 0', minWidth: 0 }}
            className="plan-item hidden lg:flex h-full rounded-[20px] bg-porcelain text-charcoal p-3.5 flex-col justify-between overflow-hidden shadow-xs relative"
          >
            <div className="flex items-center justify-between font-mono text-[11px] text-charcoal/70 uppercase">
              <span>Floor Plan</span>
              <Building2 className="w-3.5 h-3.5 text-deep-purple" />
            </div>

            <svg
              className="w-full h-[70%] text-charcoal/40 stroke-current"
              viewBox="0 0 160 120"
              fill="none"
              strokeWidth="1.5"
            >
              <rect x="15" y="10" width="130" height="100" rx="2" strokeWidth="2" />
              <line x1="15" y1="65" x2="95" y2="65" strokeWidth="1.5" />
              <line x1="95" y1="10" x2="95" y2="110" strokeWidth="1.5" />
              <line x1="95" y1="60" x2="145" y2="60" strokeWidth="1.5" />
              <path d="M45 65 A 15 15 0 0 1 60 50" strokeWidth="1" strokeDasharray="2 2" />
              <path d="M95 35 A 12 12 0 0 1 107 47" strokeWidth="1" strokeDasharray="2 2" />
              <text x="35" y="40" fill="#26262B" fontSize="9" fontFamily="Space Mono" stroke="none">
                LIVING 22'x16'
              </text>
              <text x="105" y="38" fill="#26262B" fontSize="8" fontFamily="Space Mono" stroke="none">
                BED 14'x12'
              </text>
              <text x="105" y="88" fill="#26262B" fontSize="8" fontFamily="Space Mono" stroke="none">
                BED 14'x14'
              </text>
            </svg>

            <span className="font-mono text-[10px] text-charcoal/60 uppercase truncate">
              3 BHK Layout · 2,450 sq ft
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default BuyOrRentSection;

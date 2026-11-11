import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SplitLines } from '@/components/shared/SplitLines';
import { Reveal } from '@/components/shared/Reveal';
import { CountUp } from '@/components/shared/CountUp';
import { ImageSlot } from '@/components/shared/ImageSlot';
import { useDesktop } from '@/hooks/useDesktop';
import { getHomeStats } from '@/services/properties';
import {
  ShieldCheck,
  Compass,
  Calendar,
  Calculator,
  Columns,
  KeyRound,
} from 'lucide-react';

const TOP_FIVE_PHOTOS = [
  { slot: 'intro.carousel1', widthClass: 'w-[140px] sm:w-[160px]', alt: 'Interior courtyard' },
  { slot: 'intro.carousel2', widthClass: 'w-[240px] sm:w-[280px]', alt: 'Modern villa exterior' },
  { slot: 'intro.carousel3', widthClass: 'w-[170px] sm:w-[190px]', alt: 'Sunlit empty room' },
  { slot: 'intro.carousel4', widthClass: 'w-[240px] sm:w-[280px]', alt: 'Contemporary estate exterior' },
  { slot: 'intro.carousel5', widthClass: 'w-[140px] sm:w-[160px]', alt: 'Quiet study interior' },
];

const FEATURE_CHIPS = [
  { label: 'Verified listings', icon: ShieldCheck },
  { label: '360 tours', icon: Compass },
  { label: 'Visit booking', icon: Calendar },
  { label: 'EMI calculator', icon: Calculator },
  { label: 'Compare homes', icon: Columns },
  { label: 'Secure token', icon: KeyRound },
];

const GALLERY_PHOTOS = [
  {
    slot: 'intro.gallery1',
    title: 'Architectural Interiors',
    desc: 'Bespoke layouts tailored for natural daylight',
  },
  {
    slot: 'intro.gallery2',
    title: 'Warm Sanctuaries',
    desc: 'Uncompromising finishes and cross-ventilation',
  },
  {
    slot: 'intro.gallery3',
    title: 'Verdant Balconies',
    desc: 'Private outdoor spaces overlooking green belts',
  },
];

/**
 * TASK A: SECTION 2 — PLATFORM INTRO (Fixed per Section 2 Rules)
 * - Uses StackSection (kind: "static", background: "bg-porcelain", headerTheme: "light", zIndex: 10)
 * - 28px rounded top edge, slides up over Hero with no gap at scroll 0
 * - Fits one screen on desktop (100dvh)
 * - Hover on 3-photo gallery:
 *   - Animate flex over --dur-expand (1.0s) with cubic-bezier(0.65, 0, 0.35, 1)
 *   - Image inside scales 1 to 1.06 over 1.2s
 *   - Hover intent: 120ms enter delay, 200ms leave delay (collapses to default card 0)
 *   - Text inside is absolutely positioned with fixed heights, no reflow
 * - Auto-scrolling rows never pause on hover
 */
export function IntroSection() {
  const isDesktop = useDesktop();
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [stats, setStats] = useState({ totalHomes: 30, totalCities: 10, reraPercent: 100 });
  const enterTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    getHomeStats().then((data) => {
      if (mounted && data) {
        setStats({
          totalHomes: data.totalHomes || 30,
          totalCities: data.totalCities || 10,
          reraPercent: data.reraPercent != null ? data.reraPercent : 100,
        });
      }
    });
    return () => { mounted = false; };
  }, []);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  const handleMouseEnter = (idx) => {
    if (!isDesktop) return;
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    enterTimerRef.current = setTimeout(() => {
      setActiveGalleryIndex(idx);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (!isDesktop) return;
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setActiveGalleryIndex(0); // return smoothly to default wide card
    }, 200);
  };

  const handleTap = (idx) => {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    setActiveGalleryIndex(idx);
  };

  return (
    <section
      id="intro-section"
      data-header-theme="light"
      style={{ zIndex: 10 }}
      className={`relative w-full ${
        isDesktop
          ? 'h-[100dvh] rounded-t-[28px] shadow-[0_-12px_40px_rgba(20,20,24,0.08)]'
          : 'min-h-[100dvh] rounded-none'
      } bg-porcelain text-charcoal overflow-hidden`}
    >
      <div className="w-full h-full flex flex-col justify-between px-[clamp(20px,5vw,72px)] py-8 sm:py-10">
      {/* ================= TOP STRIP ================= */}
      <div className="w-full flex flex-col xl:flex-row items-stretch gap-6 xl:gap-10 pb-6 border-b border-charcoal/10 overflow-hidden">
        {/* LEFT STRIP (55%): 5 photos auto-scrolling left (never pauses) */}
        <div className="w-full xl:w-[55%] overflow-hidden relative pointer-events-none">
          <div
            className="flex w-max animate-scroll-left gap-4 py-1"
            style={{ animationDuration: isDesktop ? '24s' : '70s' }}
          >
            {/* Set 1 */}
            {TOP_FIVE_PHOTOS.map((item, idx) => (
              <div
                key={`p1-${idx}`}
                className={`${item.widthClass} h-[115px] sm:h-[135px] flex-shrink-0 rounded-[20px] overflow-hidden bg-sand/40`}
              >
                <ImageSlot
                  slot={item.slot}
                  alt={item.alt}
                  reveal={false}
                  className="w-full h-full"
                />
              </div>
            ))}
            {/* Duplicated Set for infinite seamless loop */}
            {TOP_FIVE_PHOTOS.map((item, idx) => (
              <div
                key={`p2-${idx}`}
                className={`${item.widthClass} h-[115px] sm:h-[135px] flex-shrink-0 rounded-[20px] overflow-hidden bg-sand/40`}
              >
                <ImageSlot
                  slot={item.slot}
                  alt={item.alt}
                  reveal={false}
                  className="w-full h-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT STRIP (45%): Statement sentence + 6 feature chips moving opposite */}
        <div className="w-full xl:w-[45%] flex flex-col justify-center gap-3 overflow-hidden">
          <Reveal variant="fade-up">
            <p className="font-sans text-[18px] sm:text-[20px] text-charcoal font-medium leading-[1.35]">
              We help you find, visit and secure a home across India with verified
              listings, clear pricing and a process that respects your time.
            </p>
          </Reveal>

          {/* Chips scrolling opposite direction (never pauses) */}
          <div className="w-full overflow-hidden relative py-1 pointer-events-none">
            <div
              className="flex w-max animate-scroll-right gap-2.5"
              style={{ animationDuration: isDesktop ? '28s' : '70s' }}
            >
              {/* Set 1 */}
              {FEATURE_CHIPS.map((chip, idx) => {
                const IconComponent = chip.icon;
                return (
                  <div
                    key={`c1-${idx}`}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sand/50 border border-charcoal/15 font-mono text-[13px] text-charcoal whitespace-nowrap shadow-xs"
                  >
                    <IconComponent className="w-3.5 h-3.5 text-deep-purple stroke-[1.5]" />
                    <span>{chip.label}</span>
                  </div>
                );
              })}
              {/* Duplicated Set */}
              {FEATURE_CHIPS.map((chip, idx) => {
                const IconComponent = chip.icon;
                return (
                  <div
                    key={`c2-${idx}`}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sand/50 border border-charcoal/15 font-mono text-[13px] text-charcoal whitespace-nowrap shadow-xs"
                  >
                    <IconComponent className="w-3.5 h-3.5 text-deep-purple stroke-[1.5]" />
                    <span>{chip.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MAIN BLOCK (Two Columns) ================= */}
      <div className="w-full flex-1 flex flex-col lg:flex-row items-stretch justify-between gap-8 lg:gap-14 pt-6">
        {/* LEFT COLUMN: About, Serif Heading, 18px text, 3 stats */}
        <div className="w-full lg:w-[48%] flex flex-col justify-center gap-5">
          <Reveal variant="mono-label">
            <span className="font-mono text-[13px] uppercase tracking-[0.2em] text-deep-purple font-semibold">
              About Porch Light
            </span>
          </Reveal>

          <SplitLines
            as="h2"
            className="font-serif text-[clamp(2.5rem,4.6vw,4.5rem)] leading-[0.98] text-charcoal tracking-tight"
          >
            {['A calmer way to find', 'a home in India']}
          </SplitLines>

          <Reveal variant="fade-up">
            <p className="font-sans text-[18px] text-charcoal/85 leading-relaxed max-w-xl">
              Real estate in Indian metros is crowded with duplicate listings,
              unresponsive brokers and opaque pricing. Porch Light curates verified
              freehold and leasehold residences, connects you with bonded agents,
              and supports your entire journey from site tour to digital token.
            </p>
          </Reveal>

          {/* Three stats with large serif numerals counting up */}
          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-charcoal/15 max-w-lg">
            <div className="flex flex-col">
              <span className="font-serif text-[38px] sm:text-[46px] leading-[1] text-deep-purple font-normal">
                <CountUp value={stats.totalHomes} suffix="+" />
              </span>
              <span className="font-mono text-[13px] text-charcoal/80 uppercase tracking-wider mt-1">
                Homes listed
              </span>
            </div>

            <div className="flex flex-col border-l border-charcoal/15 pl-4">
              <span className="font-serif text-[38px] sm:text-[46px] leading-[1] text-deep-purple font-normal">
                <CountUp value={stats.totalCities} />
              </span>
              <span className="font-mono text-[13px] text-charcoal/80 uppercase tracking-wider mt-1">
                Cities
              </span>
            </div>

            <div className="flex flex-col border-l border-charcoal/15 pl-4">
              <span className="font-serif text-[38px] sm:text-[46px] leading-[1] text-deep-purple font-normal">
                {stats.reraPercent}%
              </span>
              <span className="font-mono text-[13px] text-charcoal/80 uppercase tracking-wider mt-1">
                RERA-checked
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3 tall photos expanding accordion on hover/tap */}
        <div className="w-full lg:w-[48%] flex flex-col justify-center gap-3">
          <div
            onMouseLeave={handleMouseLeave}
            style={{
              height: isDesktop ? '380px' : '40vw',
              minHeight: isDesktop ? '320px' : '160px',
            }}
            className="w-full flex items-stretch gap-3 sm:gap-4"
          >
            {GALLERY_PHOTOS.map((photo, idx) => {
              const isExpanded = activeGalleryIndex === idx;

              return (
                <div
                  key={photo.slot}
                  onMouseEnter={() => handleMouseEnter(idx)}
                  onClick={() => handleTap(idx)}
                  style={{
                    flex: isExpanded ? '2.8' : '1',
                    transition: 'flex 1.0s cubic-bezier(0.65, 0, 0.35, 1)',
                  }}
                  className="relative rounded-[20px] overflow-hidden cursor-pointer bg-sand/40 select-none"
                >
                  <ImageSlot
                    slot={photo.slot}
                    alt={photo.title}
                    reveal={false}
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover"
                    imgStyle={{
                      transform: isExpanded ? 'scale(1.06)' : 'scale(1)',
                      transition: 'transform 1.2s cubic-bezier(0.65, 0, 0.35, 1)',
                    }}
                  />

                  {/* Caption overlay: fixed height, absolute positioned, never causes reflow */}
                  <div
                    style={{
                      transition:
                        'opacity 350ms cubic-bezier(0.4, 0, 0.2, 1), transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    className={`absolute inset-x-0 bottom-0 h-[88px] p-4 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent text-porcelain flex flex-col justify-end pointer-events-none ${
                      isExpanded
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-2'
                    }`}
                  >
                    <p className="font-serif text-[18px] sm:text-[20px] leading-tight photo-text-shadow truncate">
                      {photo.title}
                    </p>
                    <p className="font-sans text-[13px] text-porcelain/85 photo-text-shadow truncate">
                      {photo.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right-aligned two-line sentence */}
          <div className="w-full text-right pt-1">
            <p className="font-sans text-[15px] sm:text-[16px] text-charcoal/75 leading-snug">
              Clear listings, honest pricing
              <br />
              and agents you can trust.
            </p>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

export default IntroSection;

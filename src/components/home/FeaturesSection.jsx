import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ImageSlot } from '@/components/shared/ImageSlot';
import { useDesktop } from '@/hooks/useDesktop';
import { ArrowUpRight, Compass, ShieldCheck, Calendar, Calculator, Award } from 'lucide-react';

const FEATURES_DATA = [
  {
    num: '01',
    code: '01 / 05',
    tag: '01 / EXPLORATION',
    title: 'Map search and compare',
    desc: 'Price pins, live filters, near me, and compare up to three homes side by side.',
    slot: 'features.1',
    bg: 'bg-sand text-charcoal',
    icon: Compass,
  },
  {
    num: '02',
    code: '02 / 05',
    tag: '02 / IMMERSION',
    title: '360 tours',
    desc: 'Walk through premium homes room by room before scheduling your on-site visit.',
    slot: 'features.2',
    bg: 'bg-[#FAF7F1] text-charcoal',
    icon: Award,
  },
  {
    num: '03',
    code: '03 / 05',
    tag: '03 / SCHEDULING',
    title: 'Visit booking',
    desc: 'Pick a convenient date and time; the verified listing agent confirms within hours.',
    slot: 'features.3',
    bg: 'bg-charcoal text-porcelain',
    icon: Calendar,
  },
  {
    num: '04',
    code: '04 / 05',
    tag: '04 / FINANCIALS',
    title: 'EMI & cost calculator',
    desc: 'Model exact monthly payments, stamp duty, and move-in deposits before you commit.',
    slot: 'features.4',
    bg: 'bg-[#DDD6E6] text-charcoal',
    icon: Calculator,
  },
  {
    num: '05',
    code: '05 / 05',
    tag: '05 / CLOSING',
    title: 'Verified agents & secure token',
    desc: 'RERA-checked agents, simulated digital token payments, and instant downloadable receipts.',
    slot: 'features.5',
    bg: 'bg-porcelain text-charcoal border border-charcoal/20',
    icon: ShieldCheck,
  },
];

/**
 * SECTION 5: FEATURES
 * - Porcelain background #F1ECE3, data-header-theme light
 * - Sticky scene without pinning: .scene (100dvh + 650dvh) + .scene-inner (sticky top 0, 100dvh)
 * - Left column (40%, static): section label, heading, body, CTA, progress indicator
 * - Right column (60%): 70vh container with overflow: clip holding 5 feature-card elements
 * - Small screens (!isDesktop): height auto, non-sticky, left intro first, then 5 cards stacked vertically
 */
export function FeaturesSection() {
  const isDesktop = useDesktop();

  return (
    <section
      id="features-scene"
      data-header-theme="light"
      className="scene relative w-full block bg-porcelain text-charcoal select-none"
      style={{
        borderRadius: 0,
        height: isDesktop ? 'calc(100vh + 650vh)' : 'auto',
        minHeight: isDesktop ? 'calc(100dvh + 650dvh)' : 'auto',
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
        <div className="w-full flex-1 flex flex-col lg:flex-row items-stretch justify-between gap-8 lg:gap-14 min-h-0">
          {/* ================= LEFT COLUMN (40% on Desktop) ================= */}
          <div className="w-full lg:w-[40%] flex flex-col justify-between py-2 flex-shrink-0 self-stretch">
            <div>
              {/* Section label */}
              <span className="font-mono text-[clamp(0.8rem,0.85vw,1rem)] uppercase tracking-[0.22em] text-deep-purple font-semibold block mb-3">
                Features
              </span>

              {/* Heading */}
              <div className="overflow-hidden mb-4">
                <h2 className="font-serif text-[clamp(2.5rem,4vw,4.5rem)] leading-[0.98] text-charcoal tracking-tight font-normal">
                  Everything you need to move with <span className="italic font-normal">confidence</span>
                </h2>
              </div>

              {/* Listing summary */}
              <p className="font-sans text-[clamp(0.95rem,1.1vw,1.25rem)] text-charcoal/80 leading-relaxed max-w-md mt-4">
                Porch Light brings transparency and verified trust to every step of Indian residential real estate.
              </p>

              {/* CTA button */}
              <div className="pt-8 pb-4">
                <Link
                  to="/buy"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[12px] bg-charcoal text-porcelain font-mono text-[14px] uppercase font-bold tracking-wider hover:bg-deep-purple transition-colors duration-350 shadow-md cursor-pointer"
                >
                  <span>Explore all homes</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Desktop progress indicator at bottom */}
            <div className="hidden lg:flex items-center gap-3 pt-8 mt-auto">
              <span className="feature-progress-label font-mono text-[13px] text-charcoal/70 uppercase tracking-widest font-bold">
                01 / 05
              </span>
              <div className="h-[1px] bg-charcoal/25 flex-1" />
              <span className="font-mono text-[11px] text-deep-purple uppercase tracking-wider font-semibold">
                Scroll to explore features
              </span>
            </div>
          </div>

          {/* ================= RIGHT COLUMN (60% on Desktop) ================= */}
          <div className="w-full lg:w-[60%] flex items-center justify-center min-h-0 self-start">
            {isDesktop ? (
              /* DESKTOP: relative container with --stack-step and --stack-count */
              <div
                className="relative w-full overflow-clip shadow-lg"
                style={{
                  height: 'calc(100dvh - 72px - clamp(24px, 4vh, 48px) * 2)',
                  '--stack-step': '14px',
                  '--stack-count': 4,
                  borderRadius: '20px',
                }}
              >
                {FEATURES_DATA.map((feat, idx) => {
                  const Icon = feat.icon;
                  const isSideBySide = idx === 1 || idx === 3;

                  return (
                    <div
                      key={feat.num}
                      className={`feature-card absolute left-0 right-0 w-full rounded-[20px] overflow-hidden flex flex-col justify-between shadow-xl ${feat.bg}`}
                      style={{
                        top: `calc(${idx} * var(--stack-step))`,
                        height: 'calc(100% - var(--stack-count) * var(--stack-step))',
                        padding: 'clamp(16px, 1.6vw, 28px)',
                        transformOrigin: 'top center',
                      }}
                    >
                      {/* Top bar (flex: none) */}
                      <div className="flex items-center justify-between border-b border-current/15 pb-2.5 flex-none mb-1">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-current" />
                          </div>
                          <span className="font-mono text-xs uppercase tracking-[0.2em] font-bold opacity-80 truncate">
                            {feat.tag}
                          </span>
                        </div>
                        <span className="font-mono text-xs uppercase tracking-widest font-bold opacity-60 flex-shrink-0">
                          {feat.code}
                        </span>
                      </div>

                      {/* Content: Side-by-side row for cards 2 & 4, stacked for cards 1, 3, 5 */}
                      {isSideBySide ? (
                        <div className="flex-1 min-h-0 flex flex-row items-stretch gap-4 sm:gap-6 py-1">
                          <div className="flex-[1_1_0%] min-w-0 flex flex-col justify-center">
                            <h3 className="font-serif text-[clamp(1.4rem,2vw,2.4rem)] leading-[1.05] font-normal tracking-tight mb-2 flex-none">
                              {feat.title}
                            </h3>
                            <p className="font-sans text-[clamp(0.82rem,0.95vw,1.1rem)] opacity-85 leading-relaxed line-clamp-2 [@media(max-height:740px)]:line-clamp-1 flex-none">
                              {feat.desc}
                            </p>
                          </div>
                          <div className="flex-[1.1_1_0%] min-h-0 min-w-0 rounded-[16px] overflow-hidden relative">
                            <ImageSlot
                              slot={feat.slot}
                              alt={feat.title}
                              className="w-full h-full rounded-[16px]"
                              imgClassName="w-full h-full object-cover rounded-[16px]"
                              reveal={true}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-none py-1.5 sm:py-2">
                            <h3 className="font-serif text-[clamp(1.4rem,2.1vw,2.5rem)] leading-[1.05] font-normal tracking-tight mb-1.5 flex-none">
                              {feat.title}
                            </h3>
                            <p className="font-sans text-[clamp(0.82rem,0.95vw,1.1rem)] opacity-85 max-w-lg leading-relaxed line-clamp-2 [@media(max-height:740px)]:line-clamp-1 flex-none">
                              {feat.desc}
                            </p>
                          </div>

                          <div className="flex-1 min-h-0 w-full rounded-[16px] overflow-hidden relative">
                            <ImageSlot
                              slot={feat.slot}
                              alt={feat.title}
                              className="w-full h-full rounded-[16px]"
                              imgClassName="w-full h-full object-cover rounded-[16px]"
                              reveal={true}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* NON-DESKTOP: Intro block first, then stacked cards with fade-up reveal */
              <div className="w-full flex flex-col gap-6 pb-6">
                {FEATURES_DATA.map((feat, idx) => {
                  const Icon = feat.icon;
                  return (
                    <motion.div
                      key={feat.num}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                      className={`w-full rounded-[20px] p-6 flex flex-col justify-between shadow-md ${feat.bg}`}
                    >
                      <div className="flex items-center justify-between border-b border-current/15 pb-3 mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-current" />
                          </div>
                          <span className="font-mono text-xs uppercase tracking-wider font-bold opacity-80">
                            {feat.tag}
                          </span>
                        </div>
                        <span className="font-mono text-xs uppercase tracking-widest font-bold opacity-60">
                          {feat.code}
                        </span>
                      </div>

                      <h3 className="font-serif text-2xl sm:text-3xl font-normal leading-snug mb-2">
                        {feat.title}
                      </h3>
                      <p className="font-sans text-sm sm:text-base opacity-85 leading-relaxed mb-4">
                        {feat.desc}
                      </p>

                      <div className="w-full aspect-[16/9] rounded-[16px] overflow-hidden relative">
                        <ImageSlot
                          slot={feat.slot}
                          alt={feat.title}
                          className="w-full h-full rounded-[16px]"
                          imgClassName="w-full h-full object-cover rounded-[16px]"
                          reveal={false}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ImageSlot } from '@/components/shared/ImageSlot';
import { useDesktop } from '@/hooks/useDesktop';

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

const GUIDES_DATA = [
  {
    num: '01',
    slot: 'journal.1',
    title: 'What to check before you pay a rental deposit',
    desc: 'Ask for the agreement first, confirm the amount and the refund terms, and keep every receipt.',
  },
  {
    num: '02',
    slot: 'journal.2',
    title: 'How to read a RERA listing',
    desc: 'Check the registration number, the project status and the carpet area before you visit.',
  },
  {
    num: '03',
    slot: 'journal.3',
    title: "What a 360 tour shows that photos can't",
    desc: 'Room sizes, light and how spaces connect, so you only visit homes that fit.',
  },
];

/**
 * SECTION 7: JOURNAL
 * - Porcelain background #F1ECE3, charcoal text, data-header-theme light
 * - Sticky scene without pinning: .scene (100dvh + 280dvh) + .scene-inner (sticky top 0, 100dvh)
 * - Single row stage (flex 1 1 0, equal heights, flex images)
 * - Non-desktop: stacked cards, natural height, aspect 16/9 images
 */
export function JournalSection() {
  const isDesktop = useDesktop();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <section
      ref={sectionRef}
      id="journal-scene"
      data-header-theme="light"
      className="scene relative w-full block bg-porcelain text-charcoal select-none"
      style={{
        borderRadius: 0,
        height: isDesktop ? 'calc(100vh + 280vh)' : 'auto',
        minHeight: isDesktop ? 'calc(100dvh + 280dvh)' : 'auto',
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
          paddingTop: 'clamp(80px, 11vh, 120px)',
          paddingBottom: 'clamp(16px, 3vh, 32px)',
          paddingLeft: 'clamp(20px, 5vw, 96px)',
          paddingRight: 'clamp(20px, 5vw, 96px)',
          maxWidth: '1680px',
          margin: '0 auto',
        }}
      >
        <div className="w-full flex flex-col h-full justify-between">
          {/* HEADING BLOCK (flex: none) */}
          <div className="flex-none mb-3 sm:mb-4">
            <motion.div
              variants={monoSlide}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className="font-mono text-[clamp(0.8rem,0.85vw,1rem)] uppercase tracking-widest text-charcoal/70 mb-1.5"
            >
              Journal
            </motion.div>
            <div className="overflow-hidden mb-1">
              <motion.h2
                variants={lineReveal}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                className="font-serif text-[clamp(2rem,3.8vw,5rem)] leading-[0.98] text-charcoal tracking-tight font-normal"
              >
                Read before you <span className="italic font-normal">decide</span>
              </motion.h2>
            </div>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              custom={1}
              className="font-sans text-[clamp(0.95rem,1.1vw,1.25rem)] text-charcoal/80 mt-1"
            >
              Short guides for first-time buyers and renters.
            </motion.p>
          </div>

          {isDesktop ? (
            /* DESKTOP: SINGLE ROW STAGE (flex 1 1 0, min-height 0, all 3 cards same top & height) */
            <div
              className="relative w-full flex-1 min-h-0"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 'clamp(16px, 2vw, 32px)',
                alignItems: 'stretch',
                overflow: 'clip',
                overflowClipMargin: '12px',
              }}
            >
              {GUIDES_DATA.map((guide) => {
                return (
                  <div
                    key={guide.num}
                    className="journal-card relative rounded-[20px] select-none cursor-default flex flex-col overflow-hidden w-full h-full"
                    style={{
                      backgroundColor: '#FAF7F1',
                      border: '1px solid rgba(38, 38, 43, 0.10)',
                      padding: 'clamp(16px, 1.4vw, 24px)',
                      willChange: 'transform, opacity',
                    }}
                  >
                    {/* Header text info: flex none */}
                    <div className="flex-none flex flex-col mb-2.5">
                      {/* Top row: Number square + line + guide tag */}
                      <div className="flex items-center justify-between gap-3 mb-2 flex-none">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-[6px] bg-charcoal text-porcelain font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {guide.num}
                          </div>
                          <div className="h-[1px] bg-charcoal/15 flex-1" />
                        </div>
                        <span className="font-mono text-[clamp(0.72rem,0.75vw,0.82rem)] uppercase tracking-wider text-charcoal/60 flex-shrink-0">
                          Guide
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-serif text-[clamp(1.15rem,1.35vw,1.55rem)] font-normal leading-snug text-charcoal mb-1.5 flex-none">
                        {guide.title}
                      </h3>

                      {/* Description */}
                      <p className="font-sans text-[clamp(0.82rem,0.9vw,0.98rem)] text-charcoal/75 leading-relaxed line-clamp-2 [@media(max-height:740px)]:line-clamp-1 flex-none">
                        {guide.desc}
                      </p>
                    </div>

                    {/* Image block: flex: 1 1 0; min-height: 0; width: 100%; object-fit: cover */}
                    <div className="flex-1 min-h-0 w-full rounded-[16px] overflow-hidden relative">
                      <ImageSlot
                        slot={guide.slot}
                        alt={guide.title}
                        className="w-full h-full"
                        imgClassName="object-cover w-full h-full"
                        reveal={true}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* NON-DESKTOP: Stacked cards with fade-up reveal (1 col on phone, 2 cols on tablet) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pb-6">
              {GUIDES_DATA.map((guide, idx) => (
                <motion.div
                  key={guide.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-[20px] select-none cursor-default flex flex-col justify-between"
                  style={{
                    backgroundColor: '#FAF7F1',
                    border: '1px solid rgba(38, 38, 43, 0.10)',
                    padding: '20px',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-[6px] bg-charcoal text-porcelain font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {guide.num}
                        </div>
                        <div className="h-[1px] bg-charcoal/15 flex-1" />
                      </div>
                      <span className="font-mono text-xs uppercase tracking-wider text-charcoal/60">
                        Guide
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl font-normal leading-snug text-charcoal mb-2">
                      {guide.title}
                    </h3>

                    <p className="font-sans text-sm text-charcoal/75 leading-relaxed line-clamp-2 mb-4">
                      {guide.desc}
                    </p>
                  </div>

                  <div className="w-full aspect-[16/9] rounded-[20px] overflow-hidden relative">
                    <ImageSlot
                      slot={guide.slot}
                      alt={guide.title}
                      className="w-full h-full"
                      imgClassName="object-cover w-full h-full"
                      reveal={false}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default JournalSection;

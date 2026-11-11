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
const staggerCard = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const REVIEWS_DATA = [
  {
    name: 'Amit & Deepa Sharma',
    role: 'Buyer, Kochi',
    rating: 5,
    text: 'We spent six months dreading property visits until Porch Light. The courtyard villa we found in Fort Kochi was exactly as described. The verification reports saved us weeks of legal vetting.',
  },
  {
    name: 'Meera Iyer',
    role: 'Renter, Bengaluru',
    rating: 5,
    text: 'Moving from Mumbai to Indiranagar was seamless. The quiet sunlight and natural ventilation shown in the 360 tour matched the real flat completely. Signed without any broker pressure.',
  },
  {
    name: 'Vikramaditya Rathore',
    role: 'Agent, Jaipur',
    rating: 5,
    text: 'Listing our heritage restored havelis here connected us with genuine families who value craftsmanship. The inquiry dashboard is uncluttered, honest, and easy to run.',
  },
  {
    name: 'Nandita & Arvind Rao',
    role: 'Buyer, Hyderabad',
    rating: 5,
    text: 'Finding a home with true natural light and high ceilings in Jubilee Hills felt impossible. The floor plans and room dimensions were 100% accurate. Truly unhurried real estate.',
  },
  {
    name: 'Kabir Sen',
    role: 'Renter, Kolkata',
    rating: 5,
    text: 'Renting in Ballygunge usually means dealing with outdated listings and surprises. Porch Light’s transparent token process made locking in the colonial apartment straightforward and secure.',
  },
  {
    name: 'Sunita & Rajesh Nair',
    role: 'Buyer, Chennai',
    rating: 5,
    text: 'The filter for quiet residential pockets in Besant Nagar actually worked. No noisy highway corners masquerading as prime locations. We closed our terrace home in three weeks.',
  },
  {
    name: 'Alistair & Zara D’Souza',
    role: 'Buyer, Goa',
    rating: 5,
    text: 'Buying an ancestral Portuguese-style cottage in Aldona was our dream. Porch Light verified the title clear back to 1982 before we even flew down for our site walkthrough.',
  },
  {
    name: 'Farah Siddiqui',
    role: 'Agent, Mumbai',
    rating: 5,
    text: 'As an independent agent in Bandra, having verified buyers and transparent schedule requests changed everything. No endless spam calls, just thoughtful visits.',
  },
];

function StarRow({ count = 5, color = '#26262B' }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          className="w-4 h-4 fill-current"
          style={{ color }}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </div>
  );
}

/**
 * SECTION 6: REVIEWS
 * - Deep purple #5E4F7A background, porcelain text, data-header-theme dark
 * - Normal flow block, square top (border-radius 0), no sticky, no overlap
 * - Fluid clamp() sizing, one-screen rule on desktop (>=1280x700)
 * - Three tiles: 4.9/5.0 stat, 92% stat, interior photo (slot reviews.interior)
 *   On phones: single column, photo tile hidden
 *   On tablet: rating and stat side-by-side
 * - Carousel with cards 80vw wide on mobile / clamp(260px, 22vw, 420px) on desktop
 */
export function ReviewsSection() {
  const isDesktop = useDesktop();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  return (
    <section
      ref={sectionRef}
      id="reviews-section"
      data-header-theme="dark"
      className="relative z-10 w-full bg-deep-purple text-porcelain min-h-[100dvh] overflow-hidden"
      style={{
        borderRadius: 0,
        paddingTop: 'clamp(72px, 10vh, 120px)',
        paddingBottom: 'clamp(32px, 6vh, 72px)',
      }}
    >
      <div
        className="w-full mx-auto h-full flex flex-col justify-between"
        style={{
          maxWidth: '1680px',
          paddingLeft: 'clamp(20px, 5vw, 96px)',
          paddingRight: 'clamp(20px, 5vw, 96px)',
        }}
      >
        {/* HEADING BLOCK */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-[clamp(24px,3.5vh,44px)] flex-shrink-0">
          <div>
            <motion.div
              variants={monoSlide}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className="font-mono text-[clamp(0.8rem,0.85vw,1rem)] uppercase tracking-widest text-porcelain/75 mb-2"
            >
              Reviews
            </motion.div>
            <div className="overflow-hidden">
              <motion.h2
                variants={lineReveal}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                className="font-serif text-[clamp(2rem,4.2vw,5.5rem)] leading-[0.98] text-porcelain tracking-tight font-normal"
              >
                Hear from people who <span className="italic font-normal">came home</span>
              </motion.h2>
            </div>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              custom={1}
              className="font-sans text-[clamp(1rem,1.15vw,1.35rem)] text-porcelain/80 mt-2"
            >
              Read how buyers, renters and agents found their place.
            </motion.p>
          </div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            custom={2}
            className="font-mono text-[clamp(0.75rem,0.8vw,0.9rem)] uppercase tracking-wider text-porcelain/60 pb-1"
          >
            Sample reviews
          </motion.div>
        </div>

        {/* TILES ROW:
            - Phone (< 768px): single column, photo tile hidden
            - Tablet (768px to 1024px): rating and stat side by side (2 cols), photo tile hidden
            - Desktop (>= 1024px): 3 tiles side-by-side
        */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-[clamp(24px,3.5vh,44px)] flex-shrink-0"
        >
          {/* Tile 1: Porcelain tile with charcoal text */}
          <motion.div
            variants={staggerCard}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            custom={0}
            className="col-span-1 md:col-span-1 lg:col-span-4 bg-porcelain text-charcoal rounded-[20px] p-[clamp(20px,2vw,36px)] flex flex-col justify-between min-h-[160px] md:min-h-[190px]"
          >
            <div>
              <div className="font-serif text-[clamp(2.5rem,4.5vw,4.8rem)] leading-none font-normal tracking-tight">
                4.9 / 5.0
              </div>
              <div className="mt-3">
                <StarRow count={5} color="#26262B" />
              </div>
            </div>
            <p className="font-sans text-[clamp(0.9rem,1vw,1.1rem)] text-charcoal/80 mt-4 font-medium">
              Across homes in nine cities
            </p>
          </motion.div>

          {/* Tile 2: Darker purple tile */}
          <motion.div
            variants={staggerCard}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            custom={1}
            className="col-span-1 md:col-span-1 lg:col-span-4 text-porcelain rounded-[20px] p-[clamp(20px,2vw,36px)] flex flex-col justify-between min-h-[160px] md:min-h-[190px]"
            style={{ backgroundColor: '#4A3E63' }}
          >
            <div>
              <div className="font-serif text-[clamp(2.5rem,4.5vw,4.8rem)] leading-none font-normal tracking-tight">
                92%
              </div>
              <p className="font-sans text-[clamp(0.95rem,1.1vw,1.2rem)] text-porcelain/90 mt-3 font-normal leading-snug">
                of visits led to a second viewing
              </p>
            </div>
            <div className="font-mono text-[clamp(0.75rem,0.8vw,0.85rem)] uppercase text-porcelain/60 mt-4">
              Sample data
            </div>
          </motion.div>

          {/* Tile 3: Interior photo */}
          <motion.div
            variants={staggerCard}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            custom={2}
            className="hidden lg:block lg:col-span-4 rounded-[20px] overflow-hidden min-h-[190px] relative"
          >
            <ImageSlot
              slot="reviews.interior"
              alt="Porch Light Interior"
              className="w-full h-full"
              imgClassName="brightness-90 object-cover w-full h-full"
              reveal={true}
            />
          </motion.div>
        </div>

        {/* REVIEWS CAROUSEL: Cards 80vw on mobile / clamp(260px, 22vw, 420px) on desktop */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          custom={4}
          className="relative w-full overflow-hidden flex-1 min-h-0 flex items-center"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 4%, black 96%, transparent)',
          }}
        >
          <div
            className="flex gap-4 animate-reviews-scroll w-max"
            style={{
              paddingTop: '8px',
              paddingBottom: '8px',
            }}
          >
            {[...REVIEWS_DATA, ...REVIEWS_DATA].map((rev, idx) => (
              <div
                key={idx}
                className="bg-porcelain text-charcoal rounded-[20px] flex-shrink-0 flex flex-col justify-between shadow-sm"
                style={{
                  width: isDesktop ? 'clamp(260px, 22vw, 420px)' : 'min(80vw, 400px)',
                  padding: 'clamp(16px, 1.6vw, 28px)',
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-serif text-[clamp(1.15rem,1.35vw,1.5rem)] font-normal leading-tight text-charcoal">
                        {rev.name}
                      </h3>
                      <div className="font-mono text-[clamp(0.72rem,0.78vw,0.85rem)] text-charcoal/65 uppercase tracking-wider mt-0.5">
                        {rev.role}
                      </div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <StarRow count={rev.rating} color="#26262B" />
                  </div>
                  <p className="font-sans text-[clamp(0.88rem,0.95vw,1.05rem)] text-charcoal/85 leading-relaxed">
                    "{rev.text}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default ReviewsSection;

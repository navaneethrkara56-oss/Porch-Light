import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ShieldCheck, LayoutDashboard, MessageSquare } from 'lucide-react';
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

const AGENT_PERKS = [
  {
    icon: ShieldCheck,
    title: 'Verified badge',
    text: 'Get a verified badge after review',
  },
  {
    icon: LayoutDashboard,
    title: 'Dedicated dashboard',
    text: 'Your own dashboard for inquiries, income and reviews',
  },
  {
    icon: MessageSquare,
    title: 'Direct communication',
    text: 'Talk to buyers directly in the app',
  },
];

/**
 * SECTION 8: AGENT DESK
 * - Heather #8F7FA8 background, text #1A1A1E (4.8:1 contrast, meets >= 4.5:1)
 * - data-header-theme dark
 * - Normal flow block, square top (border-radius 0), no sticky, no overlap
 * - Two-column grid (text ~52%, photo ~48%)
 * - Dark button variant (inverts on hover) linking to /register?role=agent
 * - 10px lemon square beside label
 * - Photo slot agent.desk with clip-path reveal
 */
export function AgentDeskSection() {
  const isDesktop = useDesktop();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section
      ref={sectionRef}
      id="agent-desk"
      data-header-theme="dark"
      className="relative z-10 w-full min-h-[100dvh] flex items-center overflow-hidden"
      style={{
        backgroundColor: '#8F7FA8',
        color: '#1A1A1E',
        borderRadius: 0,
        paddingTop: 'clamp(72px, 10vh, 120px)',
        paddingBottom: 'clamp(72px, 10vh, 120px)',
      }}
    >
      <div
        className="w-full mx-auto"
        style={{
          maxWidth: '1680px',
          paddingLeft: 'clamp(20px, 5vw, 96px)',
          paddingRight: 'clamp(20px, 5vw, 96px)',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-[clamp(24px,4vw,72px)]">
          {/* LEFT COLUMN: TEXT (~52%) */}
          <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-center">
            {/* Label row with 10px lemon square */}
            <motion.div
              variants={monoSlide}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              className="flex items-center gap-2.5 mb-4"
            >
              <span
                className="w-2.5 h-2.5 rounded-[2px] flex-shrink-0"
                style={{ backgroundColor: '#E6FF3D' }}
                aria-hidden="true"
              />
              <span className="font-mono text-[clamp(0.8rem,0.85vw,1rem)] uppercase tracking-widest text-[#1A1A1E]/80 font-bold">
                For agents
              </span>
            </motion.div>

            {/* Serif Headline */}
            <div className="overflow-hidden mb-6">
              <motion.h2
                variants={lineReveal}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                className="font-serif text-[clamp(2rem,4.2vw,5.5rem)] leading-[0.98] text-[#1A1A1E] tracking-tight font-normal"
              >
                Are you an agent? List where buyers are already{' '}
                <span className="italic font-normal">looking</span>
              </motion.h2>
            </div>

            {/* 3 Perk Lines with Thin Line Icons */}
            <div className="space-y-4 mb-8">
              {AGENT_PERKS.map((perk, i) => {
                const Icon = perk.icon;
                return (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                    custom={i + 1}
                    className="flex items-start gap-3.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#1A1A1E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#1A1A1E]" strokeWidth={1.5} />
                    </div>
                    <span className="font-sans text-[clamp(1rem,1.15vw,1.35rem)] text-[#1A1A1E]/90 leading-snug">
                      {perk.text}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Solid Charcoal Button (Button dark variant: inverts on hover) */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              custom={4.5}
            >
              <Link
                to="/register?role=agent"
                className="inline-flex items-center justify-center px-8 min-h-[52px] rounded-[12px] font-mono text-[15px] font-bold tracking-wider transition-colors duration-350 cursor-pointer shadow-md"
                style={{
                  backgroundColor: '#26262B',
                  color: '#F1ECE3',
                  border: '1px solid #26262B',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1ECE3';
                  e.currentTarget.style.color = '#26262B';
                  e.currentTarget.style.borderColor = '#F1ECE3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#26262B';
                  e.currentTarget.style.color = '#F1ECE3';
                  e.currentTarget.style.borderColor = '#26262B';
                }}
              >
                Apply for agent desk
              </Link>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: LARGE PHOTO (~48% desktop / 50vh mobile) */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            custom={2}
            className="lg:col-span-6 xl:col-span-6 w-full flex justify-center lg:justify-end"
          >
            <div
              className="w-full rounded-[20px] overflow-hidden relative shadow-xl"
              style={{
                height: isDesktop ? 'min(70vh, 720px)' : '50vh',
                maxHeight: '720px',
              }}
            >
              <ImageSlot
                slot="agent.desk"
                alt="Porch Light Agent Desk"
                className="w-full h-full rounded-[20px]"
                imgClassName="w-full h-full object-cover rounded-[20px]"
                reveal={true}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
export default AgentDeskSection;

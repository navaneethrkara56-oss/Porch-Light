import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { CountUp } from '@/components/shared/CountUp';
import { getSlotUrl } from '@/assets/home-images';
import { useDesktop } from '@/hooks/useDesktop';
import { useAuth } from '@/features/auth/AuthContext';
import { getHomeStats } from '@/services/properties';
import toast from 'react-hot-toast';

/**
 * TASK C: HERO (Section 1) — Hero Stage & Single-Line Wordmark Architecture
 *
 * HERO STAGE & WORDMARK TOKENS:
 *   --wordmark-size: 13.6cqw; // whole word spans ~88% of the stage width
 *   --wordmark-top: 39.2cqh;  // letters sit in sky, bottom 12-20% tucked behind roofline
 *
 * Rules:
 * - Stage element covers hero: width = max(100vw, 100dvh * aspectRatio), height = width / aspectRatio
 * - Anchored at bottom center (left: 50%, bottom: 0, transform: translateX(-50%))
 * - container-type: inline-size on stage
 * - Background (z-0), Wordmark (z-10), Cutout (z-20) all use inset 0, w-full, h-full, object-fill
 * - Letters rise from below the bottom edge of the stage (translateY) without overflow clip
 * - Cutout (hero-house.png) covers letters as they rise
 * - Wordmark = "PORCH LIGHT" one word, one line, 0.18em word space, gradient fill, NO lemon square
 */
// Module-level cache so in-app returns to Home are instantaneous with zero asset refetch lag
let cachedResolvedBg = '/hero/hero-bg.jpg';
let cachedAspectRatio = 16 / 9;
let cachedAssetsReady = true;
let cachedLetterStartY = 280;

export function HeroSection({ isTriggered = false }) {
  const isDesktop = useDesktop();
  const navigate = useNavigate();
  const { user, role, isGuest } = useAuth();
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const wordmarkRef = useRef(null);

  const [stats, setStats] = useState({ totalHomes: 30, totalCities: 10, reraPercent: 100 });

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

  const handleListPropertyClick = (e) => {
    e.preventDefault();
    if (isGuest || !user) {
      navigate('/login?redirect=/agent/new-listing');
      return;
    }
    if (role === 'agent') {
      if (user.isVerified === false) {
        toast('Your agent account is pending verification. Please review your account status before listing properties.', {
          icon: 'ℹ️',
        });
        navigate('/agent/overview');
      } else {
        navigate('/agent/new-listing');
      }
      return;
    }
    if (role === 'admin') {
      toast('Admin moderation access: Use approvals dashboard to manage listings.', {
        icon: '🛡️',
      });
      navigate('/admin/approvals');
      return;
    }
    // Regular user
    toast.error('Only verified partner agents can list properties. Please register for an agent account to proceed.');
    navigate('/register?role=agent');
  };

  const [bgSrc, setBgSrc] = useState(cachedResolvedBg);
  const [houseSrc, setHouseSrc] = useState('/hero/hero-house.png');
  const [aspectRatio, setAspectRatio] = useState(cachedAspectRatio);
  const [assetsReady, setAssetsReady] = useState(cachedAssetsReady);
  const [hasStartedIntro, setHasStartedIntro] = useState(() => Boolean(isTriggered));
  const [isAnimating, setIsAnimating] = useState(() => Boolean(isTriggered));
  
  // Stable starting Y offset so Framer Motion initial props are locked on frame 0
  const initialStartY = useRef(cachedLetterStartY).current;

  // Initialize prefersReducedMotion synchronously to prevent post-mount re-renders
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  });

  // Listen for reduced motion preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Compute exact translateY on resize only, eliminating synchronous layout reads on mount
  useEffect(() => {
    const computeDistance = () => {
      if (stageRef.current && wordmarkRef.current) {
        const stageHeight = stageRef.current.offsetHeight || window.innerHeight || 800;
        // Calibrate start offset so letters sit tucked cleanly behind the house cutout roofline
        const dist = Math.round(stageHeight * 0.35);
        cachedLetterStartY = dist;
      }
    };

    window.addEventListener('resize', computeDistance);
    return () => window.removeEventListener('resize', computeDistance);
  }, [aspectRatio]);

  // Promptly trigger letter reveal when activated, releasing willChange once animation settles
  useEffect(() => {
    if (isTriggered) {
      setIsAnimating(true);
      setHasStartedIntro(true);

      // Revert willChange to 'auto' after letter animation finishes (1.6s duration + 0.6s max stagger = 2.2s)
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 2300);

      return () => clearTimeout(timer);
    }
  }, [isTriggered]);

  // Scroll animations: scale 1 -> 0.95, brightness 1 -> 0.7
  const { scrollY } = useScroll();
  const rawProgress = useTransform(scrollY, [0, window.innerHeight || 800], [0, 1]);
  const heroScale = useTransform(rawProgress, [0, 1], [1, 0.95]);
  const heroBrightness = useTransform(rawProgress, [0, 1], [1, 0.7]);
  const heroFilter = useTransform(heroBrightness, (v) => `brightness(${v})`);

  // Letters of "PORCH LIGHT" with non-breaking space
  const letters = [
    { char: 'P', index: 0 },
    { char: 'O', index: 1 },
    { char: 'R', index: 2 },
    { char: 'C', index: 3 },
    { char: 'H', index: 4 },
    { char: ' ', isSpace: true, index: 5 },
    { char: 'L', index: 6 },
    { char: 'I', index: 7 },
    { char: 'G', index: 8 },
    { char: 'H', index: 9 },
    { char: 'T', index: 10 },
  ];

  return (
    <section
      id="hero"
      ref={containerRef}
      data-header-theme="dark"
      className={`${isDesktop ? 'sticky top-0' : 'relative'} w-full h-[100dvh] overflow-hidden select-none bg-charcoal`}
      style={{ zIndex: 1 }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ scale: heroScale, filter: heroFilter }}
      >
        {/* ================= HERO STAGE =================
            Covers hero: width = max(100vw, 100dvh * aspectRatio), height = width / aspectRatio
            Anchored at bottom center. containerType: inline-size
        */}
        <div
          ref={stageRef}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            transform: 'translateX(-50%)',
            aspectRatio: `${aspectRatio}`,
            width: `max(100vw, calc(100dvh * ${aspectRatio}))`,
            height: `calc(max(100vw, calc(100dvh * ${aspectRatio})) / ${aspectRatio})`,
            containerType: 'inline-size',
          }}
          className="overflow-hidden"
        >
          {/* LAYER z-0: Background Photo */}
          <div className="absolute inset-0 z-0 w-full h-full">
            <img
              src={bgSrc}
              alt="Porch Light Architecture"
              className="w-full h-full object-fill brightness-[0.82] saturate-[1.05]"
              loading="eager"
            />
          </div>

          {/* LAYER z-10: Wordmark "PORCH LIGHT"
              Positioned in cqw/cqh of stage. NO overflow-hidden wrappers on letters.
          */}
          <div
            ref={wordmarkRef}
            style={{
              position: 'absolute',
              top: 'var(--wordmark-top, 39.2cqh)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              zIndex: 10,
              pointerEvents: 'none',
            }}
            className="flex justify-center items-start"
          >
            {/* Desktop / Medium layout: ONE line, centered, normal word space 0.18em */}
            <div
              style={{
                fontSize: 'var(--wordmark-size, 13.6cqw)',
              }}
              className="hidden md:flex justify-center items-start font-anton leading-none tracking-tight select-none w-full wordmark-shadow"
            >
              {/* PORCH */}
              <span className="inline-flex items-start">
                {letters.slice(0, 5).map((item) => (
                  <motion.span
                    key={`char-${item.index}`}
                    style={{ willChange: isAnimating ? 'transform' : 'auto' }}
                    className="inline-block wordmark-gradient"
                    initial={
                      prefersReducedMotion || !houseSrc
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: initialStartY }
                    }
                    animate={
                      hasStartedIntro
                        ? { opacity: 1, y: 0 }
                        : prefersReducedMotion || !houseSrc
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: initialStartY }
                    }
                    transition={{
                      duration: prefersReducedMotion ? 0 : 1.6,
                      delay: prefersReducedMotion ? 0 : item.index * 0.06,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {item.char}
                  </motion.span>
                ))}
              </span>

              {/* Word space 0.18em */}
              <span
                key="space"
                style={{ width: '0.18em' }}
                className="inline-block"
              />

              {/* LIGHT (slightly enlarged on large desktop, top-aligned with PORCH) */}
              <span className="inline-flex items-start wordmark-light-desktop">
                {letters.slice(6, 11).map((item) => (
                  <motion.span
                    key={`char-${item.index}`}
                    style={{ willChange: isAnimating ? 'transform' : 'auto' }}
                    className="inline-block wordmark-gradient"
                    initial={
                      prefersReducedMotion || !houseSrc
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: initialStartY }
                    }
                    animate={
                      hasStartedIntro
                        ? { opacity: 1, y: 0 }
                        : prefersReducedMotion || !houseSrc
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: initialStartY }
                    }
                    transition={{
                      duration: prefersReducedMotion ? 0 : 1.6,
                      delay: prefersReducedMotion ? 0 : item.index * 0.06,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {item.char}
                  </motion.span>
                ))}
              </span>
            </div>

            {/* Mobile layout (< 768px): Two centered lines (PORCH over LIGHT), legible and fits above cutout */}
            <div
              style={{
                fontSize: 'clamp(3rem, 20vw, 4.8rem)',
              }}
              className="flex md:hidden flex-col items-center justify-center font-anton leading-[0.86] tracking-tight select-none w-full wordmark-shadow"
            >
              {/* PORCH */}
              <div className="flex justify-center">
                {'PORCH'.split('').map((char, i) => (
                  <motion.span
                    key={`m-p-${i}`}
                    style={{ willChange: isAnimating ? 'transform' : 'auto' }}
                    className="inline-block wordmark-gradient"
                    initial={
                      prefersReducedMotion || !houseSrc
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: initialStartY }
                    }
                    animate={
                      hasStartedIntro
                        ? { opacity: 1, y: 0 }
                        : prefersReducedMotion || !houseSrc
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: initialStartY }
                    }
                    transition={{
                      duration: prefersReducedMotion ? 0 : 1.6,
                      delay: prefersReducedMotion ? 0 : i * 0.06,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </div>

              {/* LIGHT */}
              <div className="flex justify-center mt-[-0.04em]">
                {'LIGHT'.split('').map((char, i) => (
                  <motion.span
                    key={`m-l-${i}`}
                    style={{ willChange: isAnimating ? 'transform' : 'auto' }}
                    className="inline-block wordmark-gradient"
                    initial={
                      prefersReducedMotion || !houseSrc
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: initialStartY }
                    }
                    animate={
                      hasStartedIntro
                        ? { opacity: 1, y: 0 }
                        : prefersReducedMotion || !houseSrc
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: initialStartY }
                    }
                    transition={{
                      duration: prefersReducedMotion ? 0 : 1.6,
                      delay: prefersReducedMotion ? 0 : (5 + i) * 0.06,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </div>
            </div>
          </div>

          {/* LAYER z-20: Cutout Photo (House, trees, foreground - sky removed)
              Masks the rising letters from behind foreground
          */}
          {houseSrc && (
            <div className="absolute inset-0 z-20 w-full h-full pointer-events-none">
              <img
                src={houseSrc}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-fill brightness-[0.82] saturate-[1.05]"
              />
            </div>
          )}
        </div>

        {/* LAYER z-30: Captions anchored to bottom with clamp(14px, 2vw, 26px) */}
        <div
          style={{
            paddingLeft: 'clamp(20px, 5vw, 72px)',
            paddingRight: 'clamp(20px, 5vw, 72px)',
            paddingBottom: 'clamp(14px, 2vw, 26px)',
          }}
          className="absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end pointer-events-none"
        >
          <div className="w-full flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5 lg:gap-8 pointer-events-auto">
            {/* LEFT: Tagline and 18px Manrope subline */}
            <div className="max-w-xl">
              <div className="overflow-hidden">
                <motion.h1
                  className="font-serif italic text-porcelain text-[clamp(2rem,3.8vw,3.5rem)] leading-[1.02] tracking-tight photo-text-shadow"
                  initial={{ y: '105%' }}
                  animate={hasStartedIntro ? { y: '0%' } : { y: '105%' }}
                  transition={{ duration: 0.9, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
                >
                  Leave the light on for home.
                </motion.h1>
              </div>
              <div className="overflow-hidden mt-1.5">
                <motion.p
                  className="font-sans text-porcelain/95 text-[18px] leading-relaxed photo-text-shadow"
                  initial={{ opacity: 0, y: 20 }}
                  animate={hasStartedIntro ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.9, delay: 0.88, ease: [0.22, 1, 0.36, 1] }}
                >
                  Verified homes across India, rented or bought with confidence.
                </motion.p>
              </div>
            </div>

            {/* CENTER: Space Mono 15px stats */}
            <motion.div
              className="flex items-center gap-5 sm:gap-6 py-1.5 border-y lg:border-y-0 lg:border-x border-porcelain/40 px-4 sm:px-6 my-1 lg:my-0 hero-stats-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={hasStartedIntro ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.9, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex flex-col">
                <span className="font-mono text-porcelain text-[17px] sm:text-[19px] font-bold">
                  {hasStartedIntro ? <CountUp value={stats.totalHomes} suffix="+" /> : `${stats.totalHomes}+`}
                </span>
                <span className="font-mono text-[15px] font-medium uppercase tracking-wider text-porcelain">
                  Homes
                </span>
              </div>
              <div className="w-[1px] h-8 bg-porcelain/40" />
              <div className="flex flex-col">
                <span className="font-mono text-porcelain text-[17px] sm:text-[19px] font-bold">
                  {hasStartedIntro ? <CountUp value={stats.totalCities} /> : stats.totalCities}
                </span>
                <span className="font-mono text-[15px] font-medium uppercase tracking-wider text-porcelain">
                  Cities
                </span>
              </div>
              <div className="w-[1px] h-8 bg-porcelain/40" />
              <div className="flex flex-col">
                <span className="font-mono text-porcelain text-[17px] sm:text-[19px] font-bold">
                  {stats.reraPercent}%
                </span>
                <span className="font-mono text-[15px] font-medium uppercase tracking-wider text-porcelain">
                  RERA Verified
                </span>
              </div>
            </motion.div>

            {/* RIGHT: Invertible buttons (Browse: light, List: dark) */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={hasStartedIntro ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.9, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link to="/buy" className="w-full sm:w-auto">
                <Button variant="light" className="w-full sm:w-auto">
                  Browse properties
                </Button>
              </Link>
              <Button
                variant="dark"
                className="w-full sm:w-auto"
                onClick={handleListPropertyClick}
              >
                List your property
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

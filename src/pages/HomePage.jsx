import React, { useState, useLayoutEffect, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Preloader } from '@/components/home/Preloader';
import {
  shouldRunHomePreloader,
  markHomePreloaderRun,
  isHomeIntroActive,
  setHomeIntroActive,
} from '@/lib/preloaderState';
import { HeroSection } from '@/components/home/HeroSection';
import { IntroSection } from '@/components/home/IntroSection';
import { TopPropertiesSection } from '@/components/home/TopPropertiesSection';
import { BuyOrRentSection } from '@/components/home/BuyOrRentSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { ReviewsSection } from '@/components/home/ReviewsSection';
import { JournalSection } from '@/components/home/JournalSection';
import { AgentDeskSection } from '@/components/home/AgentDeskSection';
import { DESKTOP_MEDIA_QUERY } from '@/hooks/useDesktop';
import { EXPERIMENTS } from '@/config/experiments';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ limitCallbacks: true });

/**
 * HomePage
 * - Scroll Engine: Native window scroll ONLY (no custom wheel handler, no Lenis).
 *   Smooth CSS transitions on section 2 sliding over section 1 are handled by the
 *   CSS sticky hero + normal flow, not by script.
 * - Scroll Scenes Without Pinning:
 *   Sections 4, 5, and 7 are CSS sticky scenes (height: 100dvh + DISTANCE, inner: sticky top 0, 100dvh).
 *   Zero pin spacers, zero DOM insertion, preventing overlap and blank gaps.
 * - Single useLayoutEffect orchestrates all GSAP timelines in document order inside gsap.context:
 *   1. Section 4 (#buy-or-rent-scene)
 *   2. Section 5 (#features-scene)
 *   3. Section 7 (#journal-scene)
 * - Desktop Query: (min-width: 1024px) and (min-height: 700px) and (hover: hover) and (pointer: fine)
 *   On non-desktop: scenes are height auto, non-sticky, simple stacked layouts.
 */
export function HomePage() {
  const willRunPreloader = shouldRunHomePreloader();
  const [showPreloader, setShowPreloader] = useState(willRunPreloader);

  const [heroTriggered, setHeroTriggered] = useState(!willRunPreloader);
  const [pageRevealed, setPageRevealed] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return true;
      }
    }
    return !willRunPreloader;
  });

  // Safety fallback: if preloader is not running (skipped, finished, or returning via navbar),
  // immediately unlock scrolling, reveal content, and clear any stale overflow locks
  useEffect(() => {
    if (!showPreloader) {
      if (isHomeIntroActive()) {
        setHomeIntroActive(false);
      }
      setHeroTriggered(true);
      setPageRevealed(true);
      if (typeof document !== 'undefined' && document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
    }
  }, [showPreloader]);

  // Ensure scroll is unlocked and intro state is cleared on page unmount
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
      }
      setHomeIntroActive(false);
    };
  }, []);

  // Smooth, slow desktop scrolling consistently from Hero through Footer
  // Keeps native scrolling for mobile/touch and respects reduced-motion.
  // Seamlessly synchronizes with native scrollbar dragging, clicks, and keyboard.
  useEffect(() => {
    // Only active on desktop screens (>=1024px, hover: hover, pointer: fine) and without reduced motion
    const isDesktop =
      window.innerWidth >= 1024 &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // When site-wide smooth scroll experiment is enabled, PageLayout handles this globally
    if (EXPERIMENTS.SITE_WIDE_SMOOTH_SCROLL || !isDesktop || prefersReducedMotion) return;

    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let animId = null;
    let isProgrammatic = false;

    // Immediately synchronize on ANY external/native scroll (scrollbar drag, click, keyboard)
    const handleNativeScroll = () => {
      if (isProgrammatic) {
        isProgrammatic = false;
        return;
      }
      // Non-programmatic scroll: cancel any active wheel lerp and lock target to actual scrollY
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      currentY = window.scrollY;
      targetY = window.scrollY;
    };

    const updateSmoothScroll = () => {
      const diff = targetY - currentY;
      if (Math.abs(diff) > 0.5) {
        currentY += diff * 0.12; // smooth, unhurried easing
        isProgrammatic = true;
        window.scrollTo(0, currentY);
        animId = requestAnimationFrame(updateSmoothScroll);
      } else {
        currentY = targetY;
        isProgrammatic = true;
        window.scrollTo(0, currentY);
        animId = null;
      }
    };

    const handleWheel = (e) => {
      // 0. If Home intro is active, block wheel events entirely
      if (isHomeIntroActive()) {
        e.preventDefault();
        return;
      }

      // 1. If pointer is resting on the native scrollbar, let native scroll handle it without interference
      if (e.clientX >= document.documentElement.clientWidth) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
        currentY = window.scrollY;
        targetY = window.scrollY;
        return;
      }

      // 2. Prevent discrete jumping, apply smooth slow scroll feel consistently from first section through footer
      e.preventDefault();

      // Damping multiplier (0.58) makes desktop scrolling slow, smooth, and unhurried
      const delta = e.deltaY * 0.58;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      targetY = Math.max(0, Math.min(maxScroll, targetY + delta));

      if (!animId) {
        currentY = window.scrollY;
        animId = requestAnimationFrame(updateSmoothScroll);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('scroll', handleNativeScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleNativeScroll);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }

    const mm = gsap.matchMedia();

    mm.add(DESKTOP_MEDIA_QUERY, () => {
      // 1. SECTION 4: Buy or Rent timeline
      const buyRentScene = document.getElementById('buy-or-rent-scene');
      if (buyRentScene) {
        const topBlock = buyRentScene.querySelector('.top-block');
        const centerPhoto = buyRentScene.querySelector('.center-photo');
        const mapItem = buyRentScene.querySelector('.map-item');
        const planItem = buyRentScene.querySelector('.plan-item');
        const captionChip = buyRentScene.querySelector('.caption-chip');

        const tl4 = gsap.timeline({
          scrollTrigger: {
            trigger: buyRentScene,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.5,
            invalidateOnRefresh: true,
          },
        });

        // 0 to 0.15: hold
        // 0.15 to 0.55: Top block collapses
        if (topBlock) {
          tl4.to(
            topBlock,
            {
              height: 0,
              opacity: 0,
              y: -40,
              duration: 0.4,
              ease: 'none',
            },
            0.15
          );
        }

        // 0.35 to 0.80: Center photo expands to full width, map & plan shrink and fade
        if (centerPhoto) {
          tl4.to(
            centerPhoto,
            {
              flexGrow: 12,
              duration: 0.45,
              ease: 'none',
            },
            0.35
          );
        }

        if (mapItem || planItem) {
          const shrinkItems = [mapItem, planItem].filter(Boolean);
          tl4.to(
            shrinkItems,
            {
              flexGrow: 0,
              opacity: 0,
              duration: 0.45,
              ease: 'none',
            },
            0.35
          );
        }

        // 0.80 to 1.00: Caption chip reveals
        if (captionChip) {
          tl4.fromTo(
            captionChip,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.2, ease: 'none' },
            0.80
          );
        }
      }

      // 2. SECTION 5: Features timeline
      const featuresScene = document.getElementById('features-scene');
      if (featuresScene) {
        const cards = featuresScene.querySelectorAll('.feature-card');
        const progressLabel = featuresScene.querySelector('.feature-progress-label');

        if (cards && cards.length > 0) {
          gsap.set(cards[0], { yPercent: 0, y: 0, scale: 1, opacity: 1 });
          for (let j = 1; j < cards.length; j++) {
            gsap.set(cards[j], { yPercent: 115, opacity: 1 });
          }

          const tl5 = gsap.timeline({
            scrollTrigger: {
              trigger: featuresScene,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1.5,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const t = self.progress * 5.9;
                let idx = 0;
                if (t >= 4.95) idx = 4;
                else if (t >= 3.45) idx = 3;
                else if (t >= 1.95) idx = 2;
                else if (t >= 0.45) idx = 1;
                if (progressLabel) {
                  progressLabel.textContent = `0${idx + 1} / 05`;
                }
              },
            },
          });

          for (let i = 2; i <= cards.length; i++) {
            const startTime = (i - 2) * 1.5;
            const currentCard = cards[i - 1];
            const prevCard = cards[i - 2];

            if (currentCard) {
              tl5.to(
                currentCard,
                {
                  yPercent: 0,
                  duration: 0.9,
                  ease: 'power2.inOut',
                },
                startTime
              );
            }

            if (prevCard) {
              tl5.to(
                prevCard,
                {
                  scale: 0.95,
                  opacity: 0.85,
                  duration: 0.9,
                  ease: 'power2.inOut',
                },
                startTime
              );
            }
          }

          tl5.to({}, { duration: 0.5 }, 5.4);
        }
      }

      // 3. SECTION 7: Journal timeline
      const journalScene = document.getElementById('journal-scene');
      if (journalScene) {
        const journalCards = journalScene.querySelectorAll('.journal-card');
        if (journalCards && journalCards.length >= 3) {
          gsap.set(journalCards, { yPercent: 120, opacity: 0 });

          const tl7 = gsap.timeline({
            scrollTrigger: {
              trigger: journalScene,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1.5,
              invalidateOnRefresh: true,
            },
          });

          // Card 1 enters 0 to 0.8
          tl7.to(
            journalCards[0],
            {
              yPercent: 0,
              opacity: 1,
              ease: 'power2.out',
              duration: 0.8,
            },
            0
          );

          // Card 2 enters 1.2 to 2.0
          tl7.to(
            journalCards[1],
            {
              yPercent: 0,
              opacity: 1,
              ease: 'power2.out',
              duration: 0.8,
            },
            1.2
          );

          // Card 3 enters 2.4 to 3.2
          tl7.to(
            journalCards[2],
            {
              yPercent: 0,
              opacity: 1,
              ease: 'power2.out',
              duration: 0.8,
            },
            2.4
          );

          // Hold of 0.8 before release
          tl7.to({}, { duration: 0.8 }, 3.2);
        }
      }

      ScrollTrigger.sort();
    });

    let refreshTimer;
    const debouncedRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 200);
    };

    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(debouncedRefresh);
    }
    window.addEventListener('load', debouncedRefresh);
    window.addEventListener('resize', debouncedRefresh);

    return () => {
      clearTimeout(refreshTimer);
      window.removeEventListener('load', debouncedRefresh);
      window.removeEventListener('resize', debouncedRefresh);
      mm.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="w-full relative bg-charcoal">
      {/* Preloader: Only runs on initial loads or browser reloads, skipped for in-app navbar navigation */}
      {showPreloader && (
        <Preloader
          onSlideStart={() => {
            setPageRevealed(true);
            setHeroTriggered(true);
          }}
          onComplete={() => {
            setShowPreloader(false);
            markHomePreloaderRun();
            setPageRevealed(true);
            setHeroTriggered(true);
          }}
        />
      )}

      {/* Main page content: hidden during preloader mount to eliminate flash, revealed immediately on slide-start */}
      <div
        style={{
          visibility: pageRevealed ? 'visible' : 'hidden',
          opacity: pageRevealed ? 1 : 0,
        }}
        className="w-full"
      >
        {/* Hero (sticky on desktop) and Section 2 (slides over Hero on desktop) */}
        <div className="relative w-full">
          <HeroSection isTriggered={heroTriggered} />
          <IntroSection />
        </div>

        {/* SECTION 3: Top Residences (normal flow block, square top) */}
        <TopPropertiesSection />

        {/* SECTION 4: Buy or Rent (sticky scene 260dvh, purple theme, square top) */}
        <BuyOrRentSection />

        {/* SECTION 5: Features (sticky scene 650dvh, porcelain, square top) */}
        <FeaturesSection />

        {/* SECTION 6: Reviews (normal flow block, 100dvh, deep purple, square top) */}
        <ReviewsSection />

        {/* SECTION 7: Journal (sticky scene 280dvh, stepped cards, square top) */}
        <JournalSection />

        {/* SECTION 8: Agent Desk (normal flow block, 100dvh, heather, square top) */}
        <AgentDeskSection />
      </div>
    </div>
  );
}

export default HomePage;

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { EXPERIMENTS } from '@/config/experiments';
import { isHomeIntroActive } from '@/lib/preloaderState';

/**
 * useSiteWideSmoothScroll
 *
 * TEMPORARY EXPERIMENT: Site-wide smooth unhurried desktop scrolling.
 * - Applies calm, unhurried desktop wheel scroll across all routes (Home, Buy, Rent, About, etc.)
 * - Replaces intermittent page-local implementation with robust programmatic scroll detection
 * - Detects and respects nested scrollable containers (Filter modal, dropdowns, code boxes)
 * - Detects cursor on native scrollbar to allow direct native interaction
 * - Immediately synchronizes with external scroll actions (scrollbar drag, keyboard, search/filter scroll-to-top)
 * - 100% native scrolling on mobile/touch screens
 * - Respects prefers-reduced-motion
 * - Completely disabled when EXPERIMENTS.SITE_WIDE_SMOOTH_SCROLL is false
 */
export function useSiteWideSmoothScroll() {
  const location = useLocation();

  useEffect(() => {
    // 1. Check feature flag
    if (!EXPERIMENTS.SITE_WIDE_SMOOTH_SCROLL) return;

    if (typeof window === 'undefined') return;

    // 2. Desktop screen and fine pointer only
    const isDesktop =
      window.innerWidth >= 1024 &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // 3. Respect reduced motion
    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isDesktop || prefersReducedMotion) return;

    let currentY = window.scrollY;
    let targetY = window.scrollY;
    let animId = null;
    let lastProgrammaticScrollY = Math.round(window.scrollY);

    // Synchronize immediately on external scroll (scrollbar drag, keyboard, filter/sort scroll-to-top)
    const handleNativeScroll = () => {
      const currentScroll = Math.round(window.scrollY);
      // If scroll position matches what our RAF loop just set (within 2px tolerance), it is our own scroll
      if (Math.abs(currentScroll - lastProgrammaticScrollY) <= 2) {
        return;
      }

      // External scroll detected: cancel any active wheel lerp and lock target to actual scrollY
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      currentY = window.scrollY;
      targetY = window.scrollY;
      lastProgrammaticScrollY = Math.round(window.scrollY);
    };

    const updateSmoothScroll = () => {
      const diff = targetY - currentY;
      if (Math.abs(diff) > 0.5) {
        currentY += diff * 0.14; // Calm, responsive easing without trailing inertia lag
        lastProgrammaticScrollY = Math.round(currentY);
        window.scrollTo(0, currentY);
        animId = requestAnimationFrame(updateSmoothScroll);
      } else {
        currentY = targetY;
        lastProgrammaticScrollY = Math.round(currentY);
        window.scrollTo(0, currentY);
        animId = null;
      }
    };

    // Helper: detect if pointer is over a nested scrollable element that can consume this wheel event
    const isInsideScrollableContainer = (target, deltaY) => {
      let el = target;
      while (el && el !== document.body && el !== document.documentElement) {
        try {
          const style = window.getComputedStyle(el);
          const overflowY = style.overflowY;
          const isScrollable =
            (overflowY === 'auto' || overflowY === 'scroll') &&
            el.scrollHeight > el.clientHeight;

          if (isScrollable) {
            // Check if element can scroll further in the requested direction
            if (deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) {
              return true; // can scroll down
            }
            if (deltaY < 0 && el.scrollTop > 1) {
              return true; // can scroll up
            }
          }
        } catch (err) {
          // Ignore DOM query errors on SVG or detached nodes
        }
        el = el.parentElement;
      }
      return false;
    };

    const handleWheel = (e) => {
      // A. If cursor is resting on the native vertical scrollbar, let native scroll handle it
      if (e.clientX >= document.documentElement.clientWidth) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
        currentY = window.scrollY;
        targetY = window.scrollY;
        lastProgrammaticScrollY = Math.round(window.scrollY);
        return;
      }

      // B. If inside a Leaflet map container, let Leaflet handle wheel zooming naturally
      if (e.target && e.target.closest && e.target.closest('.leaflet-container')) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
        currentY = window.scrollY;
        targetY = window.scrollY;
        lastProgrammaticScrollY = Math.round(window.scrollY);
        return;
      }

      // C. If inside a nested scrollable container (e.g. open filter modal, dropdown), do not hijack
      if (isInsideScrollableContainer(e.target, e.deltaY)) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
        currentY = window.scrollY;
        targetY = window.scrollY;
        lastProgrammaticScrollY = Math.round(window.scrollY);
        return;
      }

      // If Home intro is active, do not allow wheel events to trigger scrolling
      if (isHomeIntroActive()) {
        e.preventDefault();
        return;
      }

      // C. Intercept discrete window wheel steps and smoothly lerp
      e.preventDefault();

      // Damping multiplier: trackpads vs discrete mouse wheels
      const isDiscreteWheel = Math.abs(e.deltaY) >= 60;
      const damping = isDiscreteWheel ? 0.62 : 0.88;
      const delta = e.deltaY * damping;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      targetY = Math.max(0, Math.min(maxScroll, targetY + delta));

      if (!animId) {
        currentY = window.scrollY;
        lastProgrammaticScrollY = Math.round(currentY);
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
  }, [location.pathname]);
}

/**
 * Experimental Feature Flags Configuration
 *
 * 1. SITE_WIDE_SMOOTH_SCROLL:
 *    - true: Consistent, unhurried desktop smooth scrolling applied across all routes (Home, Buy, Rent, etc.)
 *            with nested scroll-container awareness, scrollbar detection, and reduced-motion respect.
 *    - false: Disables custom smooth scrolling, preserving 100% native browser scrolling on all pages.
 */

export const EXPERIMENTS = {
  SITE_WIDE_SMOOTH_SCROLL: true,
};


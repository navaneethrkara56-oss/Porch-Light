import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 *
 * Ensures that whenever the user navigates between routes (including navigating
 * between Buy and Rent, and when returning to either from another route),
 * the target page starts at the top (0, 0) immediately before paint, rather than
 * restoring the previous scroll position.
 *
 * - Disables browser automatic scrollRestoration ('manual')
 * - Executes synchronously before paint via useLayoutEffect
 * - Avoids visual jumps and competing scroll listeners
 * - Preserves normal scrolling while browsing within the active page
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}

export default ScrollToTop;

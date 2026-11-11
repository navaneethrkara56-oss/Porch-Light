import { useState, useEffect } from 'react';

export const DESKTOP_MEDIA_QUERY =
  '(min-width: 1024px) and (min-height: 700px) and (hover: hover) and (pointer: fine)';

/**
 * useDesktop Hook
 * Matches the single desktop standard:
 * - min-width: 1024px
 * - min-height: 700px
 * - hover: hover
 * - pointer: fine
 * Updates on resize / orientation change.
 */
export function useDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const updateMatch = (e) => setIsDesktop(e.matches);

    setIsDesktop(mq.matches);

    if (mq.addEventListener) {
      mq.addEventListener('change', updateMatch);
      return () => mq.removeEventListener('change', updateMatch);
    } else {
      mq.addListener(updateMatch);
      return () => mq.removeListener(updateMatch);
    }
  }, []);

  return isDesktop;
}

export default useDesktop;

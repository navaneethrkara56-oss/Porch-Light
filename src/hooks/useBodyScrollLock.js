import { useEffect } from 'react';

/**
 * Custom hook to lock body scroll when a modal or overlay is open.
 * Restores original body overflow when unmounted or when isLocked becomes false.
 * @param {boolean} isLocked
 */
export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isLocked]);
}


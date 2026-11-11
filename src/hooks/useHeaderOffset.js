import { useState, useEffect } from 'react';

/**
 * Hook to dynamically calculate the actual visible bottom of the global site header.
 * Adapts to desktop, tablet, and mobile views, urgent announcement banners, and header hide/show scroll transitions.
 * Prevents modals and overlays from overlapping or getting hidden beneath the header.
 */
export function useHeaderOffset() {
  const [headerOffset, setHeaderOffset] = useState(() => {
    if (typeof document === 'undefined') return 72;
    if (document.documentElement?.dataset?.headerHidden === 'true') return 0;
    const header = document.querySelector('header');
    if (!header) return 72;
    const rect = header.getBoundingClientRect();
    return Math.max(0, Math.round(rect.bottom));
  });

  useEffect(() => {
    const updateOffset = () => {
      if (document.documentElement?.dataset?.headerHidden === 'true') {
        setHeaderOffset(0);
        return;
      }
      const header = document.querySelector('header');
      if (!header) {
        setHeaderOffset(0);
        return;
      }
      const rect = header.getBoundingClientRect();
      setHeaderOffset(Math.max(0, Math.round(rect.bottom)));
    };

    updateOffset();
    window.addEventListener('resize', updateOffset);
    window.addEventListener('scroll', updateOffset, { passive: true });
    window.addEventListener('porchlight-header-change', updateOffset);

    let observer;
    const header = document.querySelector('header');
    if (header && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateOffset);
      observer.observe(header);
    }

    return () => {
      window.removeEventListener('resize', updateOffset);
      window.removeEventListener('scroll', updateOffset);
      window.removeEventListener('porchlight-header-change', updateOffset);
      if (observer) observer.disconnect();
    };
  }, []);

  return headerOffset;
}


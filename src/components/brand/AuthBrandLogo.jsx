import React, { useState } from 'react';

/**
 * AuthBrandLogo
 *
 * Official website logo slot for Porch Light authentication pages.
 * Loads the user-supplied logo image from `/brand/logo.png`.
 * 
 * Features:
 * - Proportional containment with object-fit: contain (prevents distortion or cropping)
 * - Clear alt text for accessibility
 * - Graceful fallback badge if logo image has not yet been placed in the public slot
 */
export function AuthBrandLogo({ className = '' }) {
  const [loadFailed, setLoadFailed] = useState(false);

  return (
    <div className={`flex items-center justify-center mb-2.5 ${className}`}>
      {!loadFailed ? (
        <img
          src="/brand/logo.png"
          alt="Porch Light"
          onError={() => setLoadFailed(true)}
          className="h-14 sm:h-16 w-auto max-w-[220px] object-contain drop-shadow-xs"
        />
      ) : (
        /* Graceful fallback slot until the user drops the logo file into /brand/logo.png */
        <div
          title="Slot for /brand/logo.png"
          className="h-14 px-4 rounded-xl bg-white/90 border border-dark-gray/15 shadow-xs flex items-center justify-center gap-2 text-deep-purple"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-lemon border border-charcoal/20 shadow-xs animate-pulse" />
          <span className="font-serif italic text-lg font-bold tracking-tight">
            Porch Light
          </span>
        </div>
      )}
    </div>
  );
}

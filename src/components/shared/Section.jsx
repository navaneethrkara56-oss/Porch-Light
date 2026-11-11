import React from 'react';

/**
 * Section
 * Layout component enforcing the design system rules:
 * - Solid background
 * - 28px rounded top edge (rounded-t-[28px]) with NO negative margin or transform pulling it up early
 * - Starts at 100dvh in normal flow
 * - Position: relative (or sticky top 0 when exactly 100dvh), higher z-index than previous section
 * - Exactly 100dvh on desktop (>=1280px and height >=700px)
 * - data-header-theme attribute for adaptive header theme detection
 */
export function Section({
  children,
  id,
  bg = 'bg-porcelain',
  roundedTop = true,
  className = '',
  style = {},
  noOneScreen = false,
  innerClassName = '',
  headerTheme = 'light', // 'light' | 'dark'
  zIndex = 20,
}) {
  return (
    <section
      id={id}
      data-header-theme={headerTheme}
      style={{ zIndex, ...style }}
      className={`relative w-full transition-colors duration-300 ${bg} ${
        roundedTop ? 'rounded-t-[28px] shadow-[0_-12px_40px_rgba(20,20,24,0.08)]' : ''
      } ${
        noOneScreen
          ? 'min-h-[100dvh]'
          : 'min-h-[100dvh] xl:h-[100dvh] xl:max-h-[100dvh] xl:overflow-hidden'
      } ${className}`}
    >
      <div className={`w-full h-full flex flex-col ${innerClassName}`}>
        {children}
      </div>
    </section>
  );
}

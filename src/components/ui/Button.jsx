import React from 'react';

/**
 * Button
 * Adheres strictly to HOME_DESIGN.md:
 * - Two main variants: "light" and "dark" (both solid, opaque, min height 52px)
 *   - "light": bg #F1ECE3, text #26262B, 1px border #F1ECE3. Hover/focus: bg #26262B, text #F1ECE3, border #26262B
 *   - "dark": bg #26262B, text #F1ECE3, 1px border #26262B. Hover/focus: bg #F1ECE3, text #26262B, border #F1ECE3
 * - Smooth transition: duration 350ms, cubic-bezier(0.4, 0, 0.2, 1)
 * - 12px corners, visible focus ring.
 */
export function Button({
  children,
  variant = 'dark', // 'light' | 'dark' | 'solid' | 'outlined'
  theme, // fallback for backwards compatibility
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  as: Component = 'button',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center font-mono text-[15px] tracking-wide uppercase px-7 py-3.5 min-h-[52px] rounded-[12px] transition-[background-color,color,border-color,opacity,transform] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none';

  // Determine effective style
  const isLight =
    variant === 'light' ||
    theme === 'porcelain' ||
    (variant === 'solid' && theme === 'porcelain');

  const colorStyles = isLight
    ? 'bg-[#F1ECE3] text-[#26262B] border border-[#F1ECE3] hover:bg-[#26262B] hover:text-[#F1ECE3] hover:border-[#26262B] focus-visible:bg-[#26262B] focus-visible:text-[#F1ECE3] focus-visible:border-[#26262B] focus-visible:ring-[#F1ECE3]'
    : 'bg-[#26262B] text-[#F1ECE3] border border-[#26262B] hover:bg-[#F1ECE3] hover:text-[#26262B] hover:border-[#F1ECE3] focus-visible:bg-[#F1ECE3] focus-visible:text-[#26262B] focus-visible:border-[#F1ECE3] focus-visible:ring-[#5E4F7A]';

  return (
    <Component
      type={Component === 'button' ? type : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${colorStyles} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

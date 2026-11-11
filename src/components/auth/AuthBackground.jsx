import React from 'react';

/**
 * AuthBackground
 *
 * Quiet Sanctuary background for Porch Light Auth pages (Login, Register, and Account Recovery).
 *
 * Displays the existing architectural background image (/auth/auth-bg.png) directly with
 * a sharp photographic cover treatment.
 * Eliminates WebGL context creation, shader compilation, and canvas frame loops entirely
 * for instant, zero-lag tab transitions.
 */
function AuthBackgroundImpl({
  image = '/auth/auth-bg.png',
  className = '',
}) {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0 ${className}`}
    >
      {/* Existing Architectural Background Photo (Sharp, unblurred, clearly visible without fading overlays) */}
      <img
        src={image}
        alt=""
        className="w-full h-full object-cover"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}

export const AuthBackground = React.memo(AuthBackgroundImpl);
export const AuthBackgroundShader = AuthBackground;
export default AuthBackground;

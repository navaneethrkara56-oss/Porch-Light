import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * AuthLayout
 *
 * Parent layout for authentication routes (/login, /register, /forgot-password).
 * The FlutedGlass WebGL shader is hosted persistently at PageLayout so it never unmounts
 * or recompiles when navigating to/from auth routes.
 */
export function AuthLayout() {
  return (
    <div className="relative w-full">
      <Outlet />
    </div>
  );
}

export default AuthLayout;

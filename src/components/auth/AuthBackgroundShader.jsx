import React from 'react';
import { AuthBackground } from './AuthBackground';

/**
 * AuthBackgroundShader (Legacy re-export)
 *
 * Paper Shader effect removed in favor of direct hardware-accelerated background rendering
 * in AuthBackground.jsx to eliminate WebGL latency and tab switching lag.
 */
export const AuthBackgroundShader = AuthBackground;
export default AuthBackground;

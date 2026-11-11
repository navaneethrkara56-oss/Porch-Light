/**
 * JWT & Cookie Utilities for Porch Light Server
 *
 * Security Architecture:
 * - Tokens are issued as signed JSON Web Tokens (HS256) containing minimal non-sensitive identity claims (id, role, email).
 * - Sent in HttpOnly, SameSite cookies to shield them from malicious script injection (XSS).
 * - In production, cookies are flagged 'secure: true' (strictly transmitted over HTTPS).
 * - Also supports Authorization: Bearer <token> headers for API clients.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/env');

const AUTH_COOKIE_NAME = 'porchlight_token';

/**
 * Generate a signed JWT
 * @param {Object} payload - { id, role, email }
 * @returns {string} token
 */
function signToken(payload) {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured on this server.');
  }

  return jwt.sign(
    {
      id: payload.id,
      role: payload.role,
      email: payload.email,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
    }
  );
}

/**
 * Verify a signed JWT
 * @param {string} token
 * @returns {Object} decoded payload
 */
function verifyToken(token) {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured on this server.');
  }

  return jwt.verify(token, config.jwtSecret);
}

/**
 * Standard cookie configuration for HttpOnly session cookies
 */
function getAuthCookieOptions() {
  return {
    httpOnly: true, // Prevents client-side script access (mitigates XSS)
    secure: config.isProduction, // In production, require HTTPS transmission
    sameSite: config.isProduction ? 'strict' : 'lax', // Protects against cross-site request forgery
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  };
}

/**
 * Clear cookie configuration for logout
 */
function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'strict' : 'lax',
    path: '/',
  };
}

module.exports = {
  AUTH_COOKIE_NAME,
  signToken,
  verifyToken,
  getAuthCookieOptions,
  getClearCookieOptions,
};


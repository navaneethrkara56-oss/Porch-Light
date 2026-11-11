/**
 * Rate Limiting Middleware for Porch Light Server
 * Protects authentication and password-related endpoints against brute force attacks.
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const authRateLimiter = rateLimit({
  windowMs: config.authRateLimitWindowMs, // default: 15 minutes
  max: config.authRateLimitMax, // limit each IP to N requests per windowMs
  standardHeaders: true, // Return standard `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
    },
  },
  skipSuccessfulRequests: false,
});

module.exports = {
  authRateLimiter,
};


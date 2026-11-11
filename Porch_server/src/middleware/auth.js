/**
 * Authentication Middleware for Porch Light Server
 *
 * Checks incoming requests for credentials in:
 * 1. Secure HttpOnly cookie ('porchlight_token')
 * 2. Standard Authorization header ('Bearer <token>')
 *
 * Validates the cryptographic signature and expiration.
 */

const { verifyToken, AUTH_COOKIE_NAME } = require('../utils/tokens');
const logger = require('../utils/logger');

/**
 * Extract token from cookie or Authorization header
 */
function extractToken(req) {
  // Check HttpOnly cookie first
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }

  // Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Optional authentication: attaches user if token is present and valid
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    // Stale or invalid token in optional context does not block request
    req.user = null;
    next();
  }
}

/**
 * Required authentication: rejects unauthenticated requests with 401
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in to access this resource.',
      },
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    logger.warn('Authentication token verification failed', { errorName: err.name });
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Your session has expired or is invalid. Please sign in again.',
      },
    });
  }
}

module.exports = {
  extractToken,
  optionalAuth,
  requireAuth,
};


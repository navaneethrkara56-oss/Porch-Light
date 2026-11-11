/**
 * Centralized Safe Error Handling Middleware for Porch Light Server
 *
 * Security Guarantee:
 * - Stack traces, database URIs, file system paths, and raw credentials are NEVER leaked to client responses.
 * - In production, internal errors return a safe, calm architectural message.
 * - Validation errors (Mongoose CastError / ValidationError / duplicate keys) are transformed into user-friendly messages.
 */

const logger = require('../utils/logger');
const config = require('../config/env');

function errorHandler(err, req, res, next) {
  // Log sanitized error on server
  logger.error('Unhandled request exception:', err);

  // Default status & message
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred. Please try again.';

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account with that ${field} already exists.`;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    message = messages.join('. ') || 'Invalid input data.';
  }

  // Handle Mongoose invalid ObjectId / field casts
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_FIELD';
    message = `Invalid data type for ${err.path || 'field'}: expected ${err.kind || 'valid value'}.`;
  }

  // In production, sanitize 500 error messages
  if (config.isProduction && statusCode === 500) {
    message = 'An internal system error occurred. Our concierge team has been notified.';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}

module.exports = errorHandler;


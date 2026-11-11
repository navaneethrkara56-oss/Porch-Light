/**
 * Environment Configuration & Validation for Porch Light Server
 * Loads from .env, enforces type safety, and provides safe fallbacks.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load .env from Porch_server root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Parse comma-separated allowed origins for CORS
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174';
const allowedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Resolve MongoDB URI: If unconfigured or containing Atlas placeholder <db_password>, use local MongoDB
const rawMongoUri = process.env.MONGODB_URI || '';
const isPlaceholderMongoUri = !rawMongoUri || rawMongoUri.includes('<db_password>') || rawMongoUri.includes('<password>');
const mongoUri = isPlaceholderMongoUri
  ? (process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/porchlight')
  : rawMongoUri;

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  isProduction,
  port: parseInt(process.env.PORT, 10) || 5000,
  allowedOrigins,

  // MongoDB URI & placeholder flag
  mongoUri,
  dbName: process.env.MONGODB_DB_NAME || 'porch_light',
  isPlaceholderMongoUri,

  // Authentication & Session
  jwtSecret: process.env.JWT_SECRET || (isProduction ? '' : 'porchlight_fallback_dev_secret_min_32_chars'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || (isProduction ? '' : 'porchlight_fallback_cookie_secret_dev'),

  // Rate Limiting
  authRateLimitWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 30,

  // Client & Server Base URLs
  clientUrl: process.env.CLIENT_URL || allowedOrigins[1] || allowedOrigins[0] || 'http://localhost:5174',
  serverUrl: process.env.SERVER_URL || `http://localhost:${parseInt(process.env.PORT, 10) || 5000}`,

  // Stripe Payments Configuration (Test Mode)
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    currency: (process.env.STRIPE_CURRENCY || 'inr').toLowerCase(),
  },

  // 3rd-Party Integration Placeholders (Server-Only Secrets)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
});

module.exports = config;


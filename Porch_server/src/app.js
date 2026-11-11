/**
 * Express Application Setup for Porch Light Server
 * Configures security headers, CORS, request parsing, routing, and error boundaries.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFound');

const app = express();

// Trust reverse proxy (enables secure cookies and client IP extraction behind Nginx, Render, etc.)
if (config.isProduction) {
  app.set('trust proxy', 1);
}

// 1. Security HTTP Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // APIs return JSON; CSP configured if serving HTML
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Strict CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server) or matched origins
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true, // Allow cookies to be sent across origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // Preflight cache 24 hours
};
app.use(cors(corsOptions));

// 3. Raw Body Parsing for Stripe Webhooks (Must precede standard express.json)
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
);

// 4. Body & Cookie Parsing with Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.cookieSecret));

// 5. API Routes
app.use('/api', routes);

// 6. 404 Handler for Unmatched Endpoints
app.use(notFoundHandler);

// 7. Centralized Error Handler (Must be registered last)
app.use(errorHandler);

module.exports = app;


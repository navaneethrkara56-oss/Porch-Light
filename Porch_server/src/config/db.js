/**
 * MongoDB Atlas Connection Module for Porch Light Server
 * Handles connection lifecycle, reconnects, graceful shutdown,
 * and safe status reporting without leaking connection strings or credentials.
 */

const mongoose = require('mongoose');
const dns = require('dns');
const config = require('./env');
const logger = require('../utils/logger');

// Configure DNS fallback for SRV lookups on Windows if needed
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in restricted environments
}

let isConnected = false;
let connectionAttempted = false;

// Connection event listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
  logger.info('MongoDB connection established successfully.');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  logger.error('MongoDB connection encountered an error.', err);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('MongoDB connection disconnected.');
});

/**
 * Connect to MongoDB
 */
async function connectDB() {
  connectionAttempted = true;

  if (!config.mongoUri) {
    logger.warn('MONGODB_URI is not set in environment. Running in disconnected database mode.');
    return false;
  }

  if (config.isPlaceholderMongoUri) {
    logger.warn('MONGODB_URI in .env contains unconfigured placeholder <db_password>. Connecting to active local MongoDB instance.');
  }

  try {
    const opts = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      autoIndex: !config.isProduction,
      dbName: config.dbName || 'porch_light',
    };

    await mongoose.connect(config.mongoUri, opts);
    isConnected = true;
    return true;
  } catch (err) {
    isConnected = false;
    logger.error('Failed to establish initial MongoDB connection. Check network access or credentials.', err);
    return false;
  }
}

/**
 * Disconnect cleanly (used for shutdown or tests)
 */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB connection closed.');
  }
}

/**
 * Get sanitized database connection status
 * Reports connection state safely without exposing URIs, passwords, or hosts.
 */
function getDatabaseStatus() {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const state = readyStates[mongoose.connection.readyState] || 'unknown';
  const ready = mongoose.connection.readyState === 1 && isConnected;

  return {
    connected: ready,
    state,
    configured: Boolean(config.mongoUri),
    databaseName: mongoose.connection.name || null,
  };
}

module.exports = {
  connectDB,
  disconnectDB,
  getDatabaseStatus,
};


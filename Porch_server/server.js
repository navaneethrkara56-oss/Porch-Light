/**
 * Server Entry Point for Porch Light Server
 * Initializes database connection, launches HTTP listener, and manages graceful shutdown.
 */

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in restricted environments
}

const app = require('./src/app');
const config = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');
const { startScheduler, stopScheduler } = require('./src/jobs/duePaymentScheduler');
const logger = require('./src/utils/logger');

let server;

async function startServer() {
  logger.info(`Starting Porch Light server in ${config.env} mode...`);

  // 1. Attempt MongoDB connection
  await connectDB();

  // 2. Start due payment notification scheduler
  startScheduler();

  // 3. Launch HTTP listener
  server = app.listen(config.port, () => {
    logger.info(`Porch Light server listening on port ${config.port}`);
    logger.info(`Health check available at http://localhost:${config.port}/api/health`);
    logger.info(`Allowed frontend origins: ${config.allowedOrigins.join(', ')}`);
  });

  // Graceful shutdown handlers
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down Porch Light server gracefully...`);

    stopScheduler();

    if (server) {
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDB();
        process.exit(0);
      });

      // Force exit after 10 seconds if hanging
      setTimeout(() => {
        logger.error('Forced shutdown timeout reached. Terminating process.');
        process.exit(1);
      }, 10000);
    } else {
      await disconnectDB();
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Global unhandled promise rejection handler
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();


/**
 * Health Controller for Porch Light Server
 * Reports operational status and MongoDB Atlas connectivity without exposing internal details.
 */

const { getDatabaseStatus } = require('../config/db');

function getHealth(req, res) {
  const dbStatus = getDatabaseStatus();

  // If DB is configured and connected: healthy (200)
  // If DB is configured but not connected: degraded (503)
  // If DB is not configured (e.g. initial setup): healthy server, db unconfigured (200)
  const isHealthy = !dbStatus.configured || dbStatus.connected;
  const httpStatus = isHealthy ? 200 : 503;

  res.status(httpStatus).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'porch-light-server',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      connected: dbStatus.connected,
      state: dbStatus.state,
      databaseName: dbStatus.databaseName,
    },
  });
}

module.exports = {
  getHealth,
};


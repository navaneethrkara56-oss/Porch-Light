/**
 * Analytics Routes for Porch Light Server
 */

const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.post('/views', optionalAuth, analyticsController.recordView);
router.post('/tour-opens', optionalAuth, analyticsController.recordTourOpen);
router.get('/agent', requireAuth, requireRole([ROLES.AGENT, ROLES.ADMIN]), analyticsController.getAgentAnalytics);

module.exports = router;


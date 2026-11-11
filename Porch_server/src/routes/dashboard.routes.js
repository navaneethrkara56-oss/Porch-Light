/**
 * Dashboard & Administration Routes for Porch Light Server
 */

const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(requireAuth);

// Cross-dashboard search
router.get('/search', dashboardController.searchDashboard);

// Aggregated role stats
router.get('/user/stats', requireRole([ROLES.USER, ROLES.ADMIN]), dashboardController.getUserStats);
router.get('/agent/stats', requireRole([ROLES.AGENT, ROLES.ADMIN]), dashboardController.getAgentStats);
router.get('/admin/stats', requireRole(ROLES.ADMIN), dashboardController.getAdminStats);
router.get('/users', requireRole(ROLES.ADMIN), dashboardController.getUsers);

// Admin property & agent moderation endpoints
router.post('/properties/:id/approve', requireRole(ROLES.ADMIN), dashboardController.approveProperty);
router.post('/properties/:id/reject', requireRole(ROLES.ADMIN), dashboardController.rejectProperty);
router.post('/properties/:id/archive', requireRole(ROLES.ADMIN), dashboardController.archiveProperty);
router.post('/agents/:id/verify', requireRole(ROLES.ADMIN), dashboardController.verifyAgent);
router.post('/agents/:id/reject', requireRole(ROLES.ADMIN), dashboardController.rejectAgent);

module.exports = router;

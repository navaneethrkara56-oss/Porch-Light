/**
 * Operational Routes (Notifications, Announcements, System Reports)
 */

const express = require('express');
const operationalController = require('../controllers/operational.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');

const router = express.Router();

// Notifications
router.get('/notifications', requireAuth, operationalController.getNotifications);
router.patch('/notifications/read-all', requireAuth, operationalController.markAllNotificationsRead);
router.patch('/notifications/:id/read', requireAuth, operationalController.markNotificationRead);
router.delete('/notifications/:id', requireAuth, operationalController.deleteNotification);
router.delete('/notifications', requireAuth, operationalController.deleteAllNotifications);

// Announcements
router.get('/announcements', optionalAuth, operationalController.getAnnouncements);
router.post('/announcements', requireAuth, requireRole(ROLES.ADMIN), operationalController.createAnnouncement);
router.delete('/announcements/:id', requireAuth, requireRole(ROLES.ADMIN), operationalController.deleteAnnouncement);

// System Reports (Diagnostics)
router.get('/reports', requireAuth, requireRole(ROLES.ADMIN), operationalController.getSystemReports);
router.post('/reports', optionalAuth, operationalController.createSystemReport);
router.post('/reports/:id/acknowledge', requireAuth, requireRole(ROLES.ADMIN), operationalController.acknowledgeSystemReport);
router.patch('/reports/:id/resolve', requireAuth, requireRole(ROLES.ADMIN), operationalController.resolveSystemReport);

module.exports = router;

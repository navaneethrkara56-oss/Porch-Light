/**
 * Authentication & Account Routes for Porch Light Server
 */

const express = require('express');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../constants/roles');

const router = express.Router();

// Public authentication endpoints (Rate limited)
router.get('/google/config', authController.getGoogleConfig);
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/google', authRateLimiter, authController.googleLogin);
router.post('/logout', authController.logout);

// Protected account profile endpoints
router.get('/me', requireAuth, authController.getMe);
router.get('/profile', requireAuth, authController.getMe);
router.patch('/profile', requireAuth, authController.updateProfile);
router.patch('/password', requireAuth, authRateLimiter, authController.updatePassword);

// User account deletion
router.get('/account-deletion-check', requireAuth, authController.checkAccountDeletion);
router.delete('/account', requireAuth, authController.deleteAccount);

// Agent account closure requests
router.get('/agent-deletion-obligations', requireAuth, requireRole(ROLES.AGENT), authController.getAgentDeletionObligations);
router.post('/agent-deletion-request', requireAuth, requireRole(ROLES.AGENT), authController.requestAgentDeletion);

// Admin moderation of agent deletion requests
router.get('/agent-deletion-requests', requireAuth, requireRole(ROLES.ADMIN), authController.getAgentDeletionRequests);
router.post('/agent-deletion-requests/:id/approve', requireAuth, requireRole(ROLES.ADMIN), authController.approveAgentDeletion);
router.post('/agent-deletion-requests/:id/reject', requireAuth, requireRole(ROLES.ADMIN), authController.rejectAgentDeletion);

// Saved properties
router.post('/saved/:id', requireAuth, authController.toggleSaveProperty);
router.get('/saved', requireAuth, authController.getSavedProperties);

module.exports = router;

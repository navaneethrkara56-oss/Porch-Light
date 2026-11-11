/**
 * Properties Routes for Porch Light Server
 */

const express = require('express');
const propertiesController = require('../controllers/properties.controller');
const authController = require('../controllers/auth.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireVerifiedAgent } = require('../middleware/authorize');

const router = express.Router();

// Public routes (with optional auth for privacy checks and view tracking)
router.get('/', optionalAuth, propertiesController.getProperties);
router.get('/home-stats', propertiesController.getHomeStats);
router.get('/:id/similar', propertiesController.getSimilarProperties);
router.get('/:id', optionalAuth, propertiesController.getPropertyById);

// Protected routes (Agent / Admin / User save)
router.post('/:id/save', requireAuth, authController.toggleSaveProperty);
router.post('/', requireAuth, requireVerifiedAgent, propertiesController.createProperty);
router.patch('/:id', requireAuth, requireVerifiedAgent, propertiesController.updateProperty);
router.delete('/:id', requireAuth, requireVerifiedAgent, propertiesController.deleteProperty);
router.patch('/:id/restore', requireAuth, requireVerifiedAgent, propertiesController.restoreProperty);
router.patch('/:id/status', requireAuth, requireVerifiedAgent, propertiesController.markSoldOrRented);

module.exports = router;


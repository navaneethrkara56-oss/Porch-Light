/**
 * Promotions Routes for Porch Light Server
 */

const express = require('express');
const promotionsController = require('../controllers/promotions.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole, requireVerifiedAgent } = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');

const router = express.Router();

// Public config reading
router.get('/config', promotionsController.getConfig);

// Protected routes
router.use(requireAuth);

router.patch('/config', requireRole(ROLES.ADMIN), promotionsController.updateConfig);
router.get('/', promotionsController.getPromotions);
router.put('/featured-curation', requireRole(ROLES.ADMIN), promotionsController.updateFeaturedCuration);
router.post('/featured-curation', requireRole(ROLES.ADMIN), promotionsController.updateFeaturedCuration);
router.post('/premium-badge', requireVerifiedAgent, promotionsController.requestPremium);
router.post('/featured-placement', requireVerifiedAgent, promotionsController.requestFeatured);
router.patch('/:id/status', requireRole(ROLES.ADMIN), promotionsController.updateStatus);
router.patch('/properties/:id/featured-window', requireRole(ROLES.ADMIN), promotionsController.updateFeaturedWindow);
router.post('/properties/:id/unpin-featured', requireRole(ROLES.ADMIN), promotionsController.removeFeaturedPlacement);
router.post('/featured-sync', promotionsController.syncFeaturedPlacements);

module.exports = router;


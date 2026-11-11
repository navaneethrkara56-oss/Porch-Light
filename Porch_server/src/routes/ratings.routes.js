/**
 * Ratings Routes for Porch Light Server
 */

const express = require('express');
const ratingsController = require('../controllers/ratings.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/my-ratings', requireAuth, ratingsController.getMyRatings);
router.get('/agents/:id/aggregate', ratingsController.getAgentAggregate);
router.get('/eligibility', requireAuth, ratingsController.checkEligibility);
router.post('/', requireAuth, ratingsController.submitRating);
router.get('/transaction/:txId', requireAuth, ratingsController.getTransactionRating);
router.get('/user-status', requireAuth, ratingsController.getUserPropertyStatus);

module.exports = router;


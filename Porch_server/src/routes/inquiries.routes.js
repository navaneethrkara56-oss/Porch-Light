/**
 * Inquiries Routes for Porch Light Server
 */

const express = require('express');
const inquiriesController = require('../controllers/inquiries.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, inquiriesController.getInquiries);
router.post('/', optionalAuth, inquiriesController.createInquiry);

module.exports = router;


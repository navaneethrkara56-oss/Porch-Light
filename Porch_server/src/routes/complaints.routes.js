/**
 * Complaints Routes for Porch Light Server
 */

const express = require('express');
const complaintsController = require('../controllers/complaints.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(requireAuth);

router.get('/', complaintsController.getComplaints);
router.post('/', complaintsController.submitComplaint);
router.post('/:id/reply', complaintsController.replyToComplaint);
router.patch('/:id/status', requireRole(ROLES.ADMIN), complaintsController.updateStatus);

module.exports = router;


/**
 * Bookings Routes for Porch Light Server
 */

const express = require('express');
const bookingsController = require('../controllers/bookings.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', bookingsController.getBookings);
router.post('/', bookingsController.createBooking);
router.patch('/:id/status', bookingsController.updateBookingStatus);
router.patch('/:id/cancel', bookingsController.cancelBooking);
router.patch('/:id/schedule', bookingsController.editPendingSchedule);
router.post('/:id/reschedule-request', bookingsController.requestReschedule);
router.post('/:id/reschedule-response', bookingsController.respondReschedule);

module.exports = router;


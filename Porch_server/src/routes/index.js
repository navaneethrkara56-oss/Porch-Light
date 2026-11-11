/**
 * Root API Router for Porch Light Server
 * Mounts all REST feature modules under /api.
 */

const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const propertiesRoutes = require('./properties.routes');
const bookingsRoutes = require('./bookings.routes');
const inquiriesRoutes = require('./inquiries.routes');
const chatRoutes = require('./chat.routes');
const paymentsRoutes = require('./payments.routes');
const promotionsRoutes = require('./promotions.routes');
const ratingsRoutes = require('./ratings.routes');
const complaintsRoutes = require('./complaints.routes');
const operationalRoutes = require('./operational.routes');
const analyticsRoutes = require('./analytics.routes');
const dashboardRoutes = require('./dashboard.routes');
const mediaRoutes = require('./media.routes');
const exampleRoutes = require('./example.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/properties', propertiesRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/inquiries', inquiriesRoutes);
router.use('/chat', chatRoutes);
router.use('/payments', paymentsRoutes);
router.use('/promotions', promotionsRoutes);
router.use('/ratings', ratingsRoutes);
router.use('/complaints', complaintsRoutes);
router.use('/operational', operationalRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/media', mediaRoutes);
router.use('/examples', exampleRoutes);

module.exports = router;

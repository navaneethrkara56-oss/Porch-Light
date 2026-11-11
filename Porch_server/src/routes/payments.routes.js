/**
 * Payments & Lease Routes for Porch Light Server
 */

const express = require('express');
const paymentsController = require('../controllers/payments.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Stripe Webhook (Unauthenticated, verified via raw body and Stripe signature header)
router.post('/webhook', paymentsController.handleStripeWebhook);

// Protected endpoints below
router.use(requireAuth);

router.get('/', paymentsController.getPayments);

// Stripe Checkout Session Creation & Status
router.post('/create-checkout-session', paymentsController.createStripeCheckoutSession);
router.get('/session-status/:sessionId', paymentsController.getSessionStatus);
router.post('/cancel-session/:sessionId', paymentsController.cancelCheckoutSession);

// Backward-compatible checkout / installment routes routed to checkout session creation
router.post('/checkout', paymentsController.createStripeCheckoutSession);

// Payment Schedule endpoints
router.get('/schedules', paymentsController.getPaymentSchedules);
router.get('/schedules/:id', paymentsController.getPaymentScheduleById);
router.post('/schedules/:id/installments/:installmentNumber/pay', paymentsController.createStripeCheckoutSession);
router.patch('/schedules/:id/autopay', paymentsController.toggleScheduleAutopay);

// Lease cancellation & handover endpoints
router.post('/leases/:id/cancellation-request', paymentsController.requestLeaseCancellation);
router.post('/leases/:id/cancellation-response', paymentsController.respondLeaseCancellation);
router.post('/leases/:id/agent-terminate', paymentsController.agentTerminateLease);
router.post('/properties/:id/confirm-handover', paymentsController.confirmRentalHandover);

module.exports = router;


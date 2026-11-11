/**
 * Stripe Event Model for Porch Light Server
 * Tracks processed Stripe Webhook event IDs for strict idempotency.
 */

const mongoose = require('mongoose');

const StripeEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    livemode: { type: Boolean, default: false },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const StripeEvent = mongoose.model('StripeEvent', StripeEventSchema);

module.exports = StripeEvent;


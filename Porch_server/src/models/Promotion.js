/**
 * Promotion & PromotionConfig Models for Porch Light Server
 */

const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true, index: true },
    propertyId: { type: String, required: true, index: true },
    propertyTitle: { type: String, required: true },
    agentId: { type: String, required: true, index: true },
    agentName: { type: String, required: true },
    type: {
      type: String,
      enum: ['premium_badge', 'featured_placement'],
      required: true,
      index: true,
    },
    feeAmount: { type: Number, default: 0 },
    paymentReference: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'rejected', 'waitlist'],
      default: 'pending_review',
      index: true,
    },
    adminNotes: { type: String, default: '' },
    featuredOrder: { type: Number, default: null },
    featuredUntil: { type: Date, default: null },
    promotedUntil: { type: Date, default: null },
    isPermanent: { type: Boolean, default: false },
    isDevSeed: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

const PromotionConfigSchema = new mongoose.Schema(
  {
    fee: { type: Number, default: 15000 },
    premiumFee: { type: Number, default: 15000 },
    active: { type: Boolean, default: true },
    terms: { type: String, default: '' },
    featuredDurationDays: { type: Number, default: 14 },
    featuredCapacity: { type: Number, default: 4 },
    featuredTerms: { type: String, default: '' },
  },
  { timestamps: true }
);

const Promotion = mongoose.model('Promotion', PromotionSchema);
const PromotionConfig = mongoose.model('PromotionConfig', PromotionConfigSchema);

module.exports = {
  Promotion,
  PromotionConfig,
};


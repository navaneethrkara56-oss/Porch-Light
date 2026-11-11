/**
 * Payment / Transaction Model for Porch Light Server
 * Tracks simulated financial ledger events, receipts, and lease lifecycle records.
 */

const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, required: true, index: true },
    receiptNumber: { type: String, required: true, index: true },
    propertyId: { type: String, required: true, index: true },
    propertyTitle: { type: String, required: true },
    propertySnapshot: {
      locality: { type: String },
      city: { type: String },
      price: { type: Number },
      listingType: { type: String },
      image: { type: String },
    },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    agentId: { type: String, required: true, index: true },
    agentName: { type: String, default: '' },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: [
        'token_amount',
        'rent_deposit',
        'promotion_fee',
        'full_purchase',
        'emi_down_payment',
        'emi_installment',
        'rent_installment',
      ],
      required: true,
      index: true,
    },
    method: { type: String, default: 'UPI' },
    scheduleId: { type: String, default: null, index: true },
    installmentNumber: { type: Number, default: null },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    // Canonical date fields
    paidAt: { type: Date, default: null, index: true },
    dueAt: { type: Date, default: null },
    refundReason: { type: String, default: '' },
    refundedAt: { type: Date, default: null },

    // Stripe checkout & processing records
    stripeSessionId: { type: String, default: null, index: true },
    stripePaymentIntentId: { type: String, default: null, index: true },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    stripeEventId: { type: String, default: null, index: true },
    cardBrand: { type: String, default: null },
    cardLast4: { type: String, default: null },
    autopayEnabled: { type: Boolean, default: false },

    // Rent lease lifecycle tracking
    leaseDetails: {
      startDate: { type: Date },
      endDate: { type: Date },
      monthlyRent: { type: Number },
      securityDeposit: { type: Number },
      cancellationRequest: {
        requestedBy: { type: String }, // 'tenant' | 'agent'
        requestedDate: { type: Date },
        reason: { type: String },
        status: { type: String, enum: ['none', 'pending', 'agreed', 'declined'], default: 'none' },
        updatedAt: { type: Date },
      },
    },

    // Buy financing calculation carried snapshot
    financingDetails: {
      planType: { type: String },
      downPayment: { type: Number },
      downPaymentPercent: { type: Number },
      loanAmount: { type: Number },
      tenureMonths: { type: Number },
      tenureYears: { type: Number },
      interestRate: { type: Number, default: 8.5 },
      monthlyEmi: { type: Number },
      totalInterest: { type: Number },
      totalRepayment: { type: Number },
    },
    isDevSeed: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        if (ret.paidAt instanceof Date) ret.paidAt = ret.paidAt.toISOString();
        if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();
        if (ret.dueAt instanceof Date) ret.dueAt = ret.dueAt.toISOString();
        // Provide canonical aliases for backward compatibility
        ret.timestamp = ret.paidAt || ret.createdAt || null;
        ret.paymentDate = ret.paidAt || null;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        if (ret.paidAt instanceof Date) ret.paidAt = ret.paidAt.toISOString();
        if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();
        if (ret.dueAt instanceof Date) ret.dueAt = ret.dueAt.toISOString();
        ret.timestamp = ret.paidAt || ret.createdAt || null;
        ret.paymentDate = ret.paidAt || null;
        delete ret.__v;
        return ret;
      },
    },
  }
);

PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ agentId: 1, createdAt: -1 });
PaymentSchema.index({ userId: 1, paidAt: -1 });
PaymentSchema.index({ agentId: 1, paidAt: -1 });

const Payment = mongoose.model('Payment', PaymentSchema);

module.exports = Payment;


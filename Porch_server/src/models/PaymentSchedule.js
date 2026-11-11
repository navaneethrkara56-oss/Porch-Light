/**
 * Payment Schedule Model for Porch Light Server
 * Tracks authoritative EMI installment schedules and recurring monthly rent schedules.
 */

const mongoose = require('mongoose');

const InstallmentItemSchema = new mongoose.Schema(
  {
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    dueAt: { type: Date, default: null }, // canonical alias for dueDate
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['upcoming', 'due_today', 'paid', 'overdue', 'failed'],
      default: 'upcoming',
      index: true,
    },
    paidAt: { type: Date, default: null },
    paymentId: { type: String, default: null },
    receiptNumber: { type: String, default: null },
    paymentMethod: { type: String, default: null },
    failureReason: { type: String, default: null },
    notificationSentAt: { type: Date, default: null },
  },
  { _id: true }
);

const PaymentScheduleSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, required: true, index: true },
    type: {
      type: String,
      enum: ['emi', 'rent'],
      required: true,
      index: true,
    },
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
    initialPaymentId: { type: String, unique: true, required: true, index: true },

    // Financial calculations
    totalAmount: { type: Number, required: true },
    downPayment: { type: Number, default: 0 },
    financedPrincipal: { type: Number, default: 0 },
    installmentAmount: { type: Number, required: true },
    totalInstallments: { type: Number, required: true },
    paidInstallments: { type: Number, default: 0 },
    remainingBalance: { type: Number, required: true },
    interestRate: { type: Number, default: 0 },

    frequency: { type: String, default: 'monthly' },
    dueDay: { type: Number, default: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },

    // Autopay recurring configuration (RBI compliant mandate reference)
    autopayEnabled: { type: Boolean, default: false },
    stripeCustomerId: { type: String, default: null },
    stripePaymentMethodId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    autopayCardBrand: { type: String, default: null },
    autopayCardLast4: { type: String, default: null },
    autopayMandateStatus: {
      type: String,
      enum: ['none', 'active', 'revoked'],
      default: 'none',
    },

    installments: [InstallmentItemSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        if (ret.startDate instanceof Date) ret.startDate = ret.startDate.toISOString();
        if (ret.endDate instanceof Date) ret.endDate = ret.endDate.toISOString();
        if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();
        if (ret.installments && Array.isArray(ret.installments)) {
          ret.installments.forEach((inst) => {
            if (inst.dueDate && !inst.dueAt) inst.dueAt = inst.dueDate;
            if (inst.dueAt instanceof Date) inst.dueAt = inst.dueAt.toISOString();
            if (inst.dueDate instanceof Date) inst.dueDate = inst.dueDate.toISOString();
            if (inst.paidAt instanceof Date) inst.paidAt = inst.paidAt.toISOString();
          });
        }
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        if (ret.startDate instanceof Date) ret.startDate = ret.startDate.toISOString();
        if (ret.endDate instanceof Date) ret.endDate = ret.endDate.toISOString();
        if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();
        if (ret.installments && Array.isArray(ret.installments)) {
          ret.installments.forEach((inst) => {
            if (inst.dueDate && !inst.dueAt) inst.dueAt = inst.dueDate;
            if (inst.dueAt instanceof Date) inst.dueAt = inst.dueAt.toISOString();
            if (inst.dueDate instanceof Date) inst.dueDate = inst.dueDate.toISOString();
            if (inst.paidAt instanceof Date) inst.paidAt = inst.paidAt.toISOString();
          });
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

PaymentScheduleSchema.index({ userId: 1, status: 1 });
PaymentScheduleSchema.index({ agentId: 1, status: 1 });
PaymentScheduleSchema.index({ propertyId: 1, status: 1 });

const PaymentSchedule = mongoose.model('PaymentSchedule', PaymentScheduleSchema);

module.exports = PaymentSchedule;


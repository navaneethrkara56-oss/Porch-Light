/**
 * Booking / Walkthrough Model for Porch Light Server
 */

const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true, index: true },
    propertyId: { type: String, required: true, index: true },
    agentId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userPhone: { type: String, default: '' },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'declined', 'cancelled', 'completed', 'visited'],
      default: 'pending',
      index: true,
    },
    rescheduleRequest: {
      proposedDate: { type: String },
      proposedTimeSlot: { type: String },
      reason: { type: String },
      requestedBy: { type: String },
      requestedAt: { type: Date },
      status: { type: String, enum: ['pending', 'accepted', 'declined'] },
    },
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

BookingSchema.index({ userId: 1, date: 1 });
BookingSchema.index({ agentId: 1, date: 1 });

const Booking = mongoose.model('Booking', BookingSchema);

module.exports = Booking;


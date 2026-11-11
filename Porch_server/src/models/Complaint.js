/**
 * Complaint / Support Ticket Model for Porch Light Server
 */

const mongoose = require('mongoose');

const ComplaintMessageSchema = new mongoose.Schema(
  {
    customId: { type: String },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ComplaintSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, default: 'user' },
    propertyId: { type: String, default: null },
    category: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open',
      index: true,
    },
    messages: [ComplaintMessageSchema],
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

const Complaint = mongoose.model('Complaint', ComplaintSchema);

module.exports = Complaint;


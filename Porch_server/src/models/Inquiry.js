/**
 * Inquiry Model for Porch Light Server
 */

const mongoose = require('mongoose');

const InquirySchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true, index: true },
    propertyId: { type: String, required: true, index: true },
    agentId: { type: String, required: true, index: true },
    userId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['new', 'read', 'replied'],
      default: 'new',
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

const Inquiry = mongoose.model('Inquiry', InquirySchema);

module.exports = Inquiry;


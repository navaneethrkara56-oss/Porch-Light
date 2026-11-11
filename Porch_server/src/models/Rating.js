/**
 * Agent Star Rating Model for Porch Light Server
 * Connected strictly to completed property payments.
 */

const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true, index: true },
    transactionId: { type: String, required: true, unique: true, index: true },
    propertyId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    agentId: { type: String, required: true, index: true },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5',
      },
    },
    status: {
      type: String,
      enum: ['active', 'ineligible'],
      default: 'active',
      index: true,
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

RatingSchema.index({ agentId: 1, status: 1 });

const Rating = mongoose.model('Rating', RatingSchema);

module.exports = Rating;


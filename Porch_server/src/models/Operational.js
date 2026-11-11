/**
 * Notification, Announcement, SystemReport, and Analytics Models for Porch Light Server
 */

const mongoose = require('mongoose');

// 1. Notification Schema
const NotificationSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true, index: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'info' },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
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

// 2. Announcement Schema
const AnnouncementSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    target: { type: String, enum: ['all', 'user', 'agent'], default: 'all' },
    priority: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    expiresAt: { type: Date, default: null },
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

// 3. SystemReport Schema (Client-side ErrorBoundary exceptions)
const SystemReportSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true, index: true },
    message: { type: String, required: true },
    reason: { type: String, default: '' },
    stack: { type: String, default: '' },
    source: { type: String, default: 'Client Component' },
    status: {
      type: String,
      enum: ['unresolved', 'acknowledged', 'resolved'],
      default: 'unresolved',
      index: true,
    },
    timestamp: { type: Date, default: Date.now },
    isDevSeed: { type: Boolean, default: false, index: true },
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

// 4. AnalyticsEvent Schema (Daily view & tour open deduplicated tracking)
const AnalyticsEventSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true, index: true },
    propertyId: { type: String, required: true, index: true },
    agentId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    type: { type: String, enum: ['view', 'tour_open'], required: true, index: true },
    date: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
    timestamp: { type: Date, default: Date.now },
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

// Deduplication compound index: Lifetime 1 unique view per signed-in user per property
AnalyticsEventSchema.index(
  { propertyId: 1, userId: 1, type: 1 },
  { unique: true, partialFilterExpression: { userId: { $ne: 'guest' } } }
);

const Notification = mongoose.model('Notification', NotificationSchema);
const Announcement = mongoose.model('Announcement', AnnouncementSchema);
const SystemReport = mongoose.model('SystemReport', SystemReportSchema);
const AnalyticsEvent = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);

module.exports = {
  Notification,
  Announcement,
  SystemReport,
  AnalyticsEvent,
};


/**
 * Data Access Layer for Porch Light Server
 * Strictly interacts with MongoDB Atlas via Mongoose models.
 * Fails safely and immediately when MongoDB connection is unavailable.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Mongoose Models
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Inquiry = require('../models/Inquiry');
const Chat = require('../models/Chat');
const Payment = require('../models/Payment');
const PaymentSchedule = require('../models/PaymentSchedule');
const StripeEvent = require('../models/StripeEvent');
const { Promotion, PromotionConfig } = require('../models/Promotion');
const Rating = require('../models/Rating');
const Complaint = require('../models/Complaint');
const { Notification, Announcement, SystemReport, AnalyticsEvent } = require('../models/Operational');

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function assertMongoReady() {
  if (!isMongoReady()) {
    const error = new Error('Database connection is unavailable. Operations cannot proceed.');
    error.statusCode = 503;
    error.code = 'DATABASE_UNAVAILABLE';
    throw error;
  }
}

function buildIdFilter(id) {
  if (!id) return { _id: null };
  const conditions = [{ customId: id }];
  if (mongoose.isValidObjectId(id)) {
    conditions.push({ _id: id });
  }
  return { $or: conditions };
}

const db = {
  isMongoReady,

  // Users Repository
  users: {
    async find(filter = {}) {
      assertMongoReady();
      const query = {};
      if (filter.role) query.role = filter.role;
      if (filter.isVerified !== undefined) query.isVerified = filter.isVerified;
      if (filter.isDeactivated !== undefined) query.isDeactivated = filter.isDeactivated;
      return User.find(query);
    },

    async findOne(filter = {}) {
      assertMongoReady();
      const query = { ...filter };
      const includePassword = Boolean(query.includePassword);
      delete query.includePassword;
      if (query.email) {
        query.email = query.email.toLowerCase().trim();
      }
      if (query.id) {
        Object.assign(query, buildIdFilter(query.id));
        delete query.id;
      }
      let q = User.findOne(query);
      if (includePassword) {
        q = q.select('+passwordHash');
      }
      return q;
    },

    async findById(id) {
      assertMongoReady();
      if (!id) return null;
      return User.findOne(buildIdFilter(id));
    },

    async findByEmail(email) {
      assertMongoReady();
      if (!email) return null;
      return User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    },

    async create(doc) {
      assertMongoReady();
      return User.create(doc);
    },

    async updateById(id, update) {
      assertMongoReady();
      return User.findOneAndUpdate(buildIdFilter(id), update, { new: true });
    },

    async deleteById(id) {
      assertMongoReady();
      return User.findOneAndDelete(buildIdFilter(id));
    },

    async countDocuments(filter = {}) {
      assertMongoReady();
      return User.countDocuments(filter);
    },
  },

  // Properties Repository
  properties: {
    async find(filter = {}) {
      assertMongoReady();
      const query = {};
      if (filter.agentId) query.agentId = filter.agentId;
      if (filter.status && filter.status !== 'all') query.status = filter.status;
      if (filter.listingType) query.listingType = filter.listingType;
      if (filter.city && filter.city.toLowerCase() !== 'all') query.city = new RegExp(`^${filter.city}$`, 'i');
      if (filter.isSold !== undefined) query.isSold = filter.isSold;
      if (filter.isLeased !== undefined) query.isLeased = filter.isLeased;
      if (filter.featured !== undefined) query.featured = filter.featured;
      return Property.find(query).sort({ createdAt: -1 });
    },

    async findById(id) {
      assertMongoReady();
      if (!id) return null;
      return Property.findOne(buildIdFilter(id));
    },

    async create(doc) {
      assertMongoReady();
      return Property.create(doc);
    },

    async updateById(id, update) {
      assertMongoReady();
      return Property.findOneAndUpdate(buildIdFilter(id), update, { new: true });
    },

    async atomicTransition(id, checkFilter = {}, updates = {}) {
      assertMongoReady();
      const idFilter = buildIdFilter(id);
      const query = {
        $and: [
          idFilter,
          checkFilter,
        ],
      };
      return Property.findOneAndUpdate(query, { $set: updates }, { new: true });
    },

    async deleteById(id) {
      assertMongoReady();
      return Property.findOneAndDelete(buildIdFilter(id));
    },

    async countDocuments(filter = {}) {
      assertMongoReady();
      return Property.countDocuments(filter);
    },
  },

  // Bookings Repository
  bookings: {
    async find(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.userId) q.userId = filter.userId;
      if (filter.agentId) q.agentId = filter.agentId;
      if (filter.propertyId) q.propertyId = filter.propertyId;
      if (filter.status) q.status = filter.status;
      return Booking.find(q).sort({ date: -1 });
    },

    async findById(id) {
      assertMongoReady();
      if (!id) return null;
      return Booking.findOne(buildIdFilter(id));
    },

    async create(doc) {
      assertMongoReady();
      return Booking.create(doc);
    },

    async updateById(id, update) {
      assertMongoReady();
      return Booking.findOneAndUpdate(buildIdFilter(id), update, { new: true });
    },

    async deleteById(id) {
      assertMongoReady();
      return Booking.findOneAndDelete(buildIdFilter(id));
    },
  },

  // Inquiries Repository
  inquiries: {
    async find(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.agentId) q.agentId = filter.agentId;
      if (filter.propertyId) q.propertyId = filter.propertyId;
      if (filter.userId) q.userId = filter.userId;
      return Inquiry.find(q).sort({ createdAt: -1 });
    },

    async create(doc) {
      assertMongoReady();
      return Inquiry.create(doc);
    },
  },

  // Chats Repository
  chats: {
    async find(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.userId) q.userId = filter.userId;
      if (filter.agentId) q.agentId = filter.agentId;
      return Chat.find(q).sort({ lastMessageAt: -1, updatedAt: -1 });
    },

    async findOne(filter = {}) {
      assertMongoReady();
      const q = { ...filter };
      if (q.id) {
        Object.assign(q, buildIdFilter(q.id));
        delete q.id;
      }
      return Chat.findOne(q);
    },

    async findById(id) {
      assertMongoReady();
      if (!id) return null;
      return Chat.findOne(buildIdFilter(id));
    },

    async create(doc) {
      assertMongoReady();
      return Chat.create(doc);
    },

    async updateById(id, update) {
      assertMongoReady();
      return Chat.findOneAndUpdate(buildIdFilter(id), update, { new: true });
    },
  },

  // Payments Repository
  payments: {
    async find(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.userId) q.userId = filter.userId;
      if (filter.agentId) q.agentId = filter.agentId;
      if (filter.propertyId) q.propertyId = filter.propertyId;
      if (filter.status) q.status = filter.status;
      if (filter.type) q.type = filter.type;
      if (filter.stripeSessionId) q.stripeSessionId = filter.stripeSessionId;
      if (filter.customId) q.customId = filter.customId;
      return Payment.find(q).sort({ createdAt: -1 });
    },

    async findOne(filter = {}) {
      assertMongoReady();
      const q = { ...filter };
      if (q.id) {
        Object.assign(q, buildIdFilter(q.id));
        delete q.id;
      }
      return Payment.findOne(q);
    },

    async findById(id) {
      assertMongoReady();
      if (!id) return null;
      return Payment.findOne(buildIdFilter(id));
    },

    async create(doc) {
      assertMongoReady();
      return Payment.create(doc);
    },

    async updateById(id, update) {
      assertMongoReady();
      return Payment.findOneAndUpdate(buildIdFilter(id), update, { new: true });
    },
  },

  // Stripe Events Idempotency Repository
  stripeEvents: {
    async findByEventId(eventId) {
      assertMongoReady();
      if (!eventId) return null;
      return StripeEvent.findOne({ eventId });
    },

    async record(eventId, type, livemode = false) {
      assertMongoReady();
      return StripeEvent.create({ eventId, type, livemode, processedAt: new Date() });
    },
  },

  // Payment Schedules Repository
  paymentSchedules: {
    async find(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.userId) q.userId = filter.userId;
      if (filter.agentId) {
        if (Array.isArray(filter.agentId)) {
          q.agentId = { $in: filter.agentId };
        } else {
          q.agentId = filter.agentId;
        }
      }
      if (filter.propertyId) q.propertyId = filter.propertyId;
      if (filter.type) q.type = filter.type;
      if (filter.status) q.status = filter.status;
      if (filter.initialPaymentId) q.initialPaymentId = filter.initialPaymentId;
      return PaymentSchedule.find(q).sort({ createdAt: -1 });
    },

    async findOne(filter = {}) {
      assertMongoReady();
      const q = { ...filter };
      if (q.id) {
        Object.assign(q, buildIdFilter(q.id));
        delete q.id;
      }
      return PaymentSchedule.findOne(q);
    },

    async findById(id) {
      assertMongoReady();
      if (!id) return null;
      return PaymentSchedule.findOne(buildIdFilter(id));
    },

    async create(doc) {
      assertMongoReady();
      return PaymentSchedule.create(doc);
    },

    async updateById(id, update) {
      assertMongoReady();
      return PaymentSchedule.findOneAndUpdate(buildIdFilter(id), update, { new: true });
    },
  },

  // Promotions Repository
  promotions: {
    async getConfig() {
      assertMongoReady();
      let cfg = await PromotionConfig.findOne();
      if (!cfg) {
        cfg = await PromotionConfig.create({
          fee: 15000,
          premiumFee: 15000,
          durationDays: 14,
          featuredDurationDays: 14,
          featuredCapacity: 4,
          active: true,
          terms: 'Includes top placement in the Home featured properties showcase and prominent search spotlight badge.',
        });
      }
      return cfg;
    },

    async updateConfig(newConfig) {
      assertMongoReady();
      return PromotionConfig.findOneAndUpdate({}, newConfig, { new: true, upsert: true });
    },

    async find(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.agentId) q.agentId = filter.agentId;
      if (filter.propertyId) q.propertyId = filter.propertyId;
      if (filter.type) q.type = filter.type;
      if (filter.status) q.status = filter.status;
      return Promotion.find(q).sort({ createdAt: -1 });
    },

    async findById(id) {
      assertMongoReady();
      if (!id) return null;
      return Promotion.findOne(buildIdFilter(id));
    },

    async create(doc) {
      assertMongoReady();
      return Promotion.create(doc);
    },

    async updateById(id, update) {
      assertMongoReady();
      return Promotion.findOneAndUpdate(buildIdFilter(id), update, { new: true });
    },
  },

  // Ratings Repository
  ratings: {
    async find(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.agentId) q.agentId = filter.agentId;
      if (filter.userId) q.userId = filter.userId;
      if (filter.propertyId) q.propertyId = filter.propertyId;
      if (filter.status) q.status = filter.status;
      return Rating.find(q).sort({ createdAt: -1 });
    },

    async findByTransactionId(txId) {
      assertMongoReady();
      if (!txId) return null;
      return Rating.findOne({ transactionId: txId });
    },

    async createOrUpdate(txId, doc) {
      assertMongoReady();
      return Rating.findOneAndUpdate(
        { transactionId: txId },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    },

    async create(doc) {
      assertMongoReady();
      return Rating.create(doc);
    },

    async updateById(id, update) {
      assertMongoReady();
      return Rating.findOneAndUpdate(buildIdFilter(id), update, { new: true });
    },
  },

  // Complaints Repository
  complaints: {
    async find(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.userId) q.userId = filter.userId;
      if (filter.status) q.status = filter.status;
      if (filter.category) q.category = filter.category;
      return Complaint.find(q).sort({ createdAt: -1 });
    },

    async findById(id) {
      assertMongoReady();
      if (!id) return null;
      return Complaint.findOne(buildIdFilter(id));
    },

    async create(doc) {
      assertMongoReady();
      return Complaint.create(doc);
    },

    async updateById(id, update) {
      assertMongoReady();
      return Complaint.findOneAndUpdate(buildIdFilter(id), update, { new: true });
    },
  },

  // Notifications Repository
  notifications: {
    async find(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.userId) {
        q.userId = filter.userId;
      }
      if (filter.read !== undefined) q.read = filter.read;
      return Notification.find(q).sort({ createdAt: -1 });
    },

    async create(doc) {
      assertMongoReady();
      try {
        return await Notification.create(doc);
      } catch (err) {
        if (err.code === 11000 && doc.customId) {
          return await Notification.findOne({ customId: doc.customId });
        }
        throw err;
      }
    },

    async markRead(id, userId) {
      assertMongoReady();
      const userCondition = Array.isArray(userId)
        ? { userId: { $in: userId } }
        : typeof userId === 'object' && userId.$in
        ? { userId }
        : { userId };
      return Notification.findOneAndUpdate(
        { ...buildIdFilter(id), ...userCondition },
        { read: true },
        { new: true }
      );
    },

    async markAllReadForUser(userId) {
      assertMongoReady();
      const userCondition = Array.isArray(userId) ? { $in: userId } : userId;
      return Notification.updateMany({ userId: userCondition }, { read: true });
    },

    async deleteById(id, userId) {
      assertMongoReady();
      const userCondition = Array.isArray(userId)
        ? { userId: { $in: userId } }
        : typeof userId === 'object' && userId.$in
        ? { userId }
        : { userId };
      return Notification.findOneAndDelete({ ...buildIdFilter(id), ...userCondition });
    },

    async deleteAllForUser(userId) {
      assertMongoReady();
      const userCondition = Array.isArray(userId) ? { $in: userId } : userId;
      return Notification.deleteMany({ userId: userCondition });
    },
  },

  // Announcements Repository
  announcements: {
    async find(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.target && filter.target !== 'all') {
        q.$or = [{ target: 'all' }, { target: filter.target }];
      }
      return Announcement.find(q).sort({ createdAt: -1 });
    },

    async create(doc) {
      assertMongoReady();
      return Announcement.create(doc);
    },

    async deleteById(id) {
      assertMongoReady();
      return Announcement.findOneAndDelete(buildIdFilter(id));
    },
  },

  // System Reports Repository
  systemReports: {
    async find(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.resolved !== undefined) q.resolved = filter.resolved;
      return SystemReport.find(q).sort({ createdAt: -1 });
    },

    async create(doc) {
      assertMongoReady();
      return SystemReport.create(doc);
    },

    async updateById(id, update) {
      assertMongoReady();
      return SystemReport.findOneAndUpdate(buildIdFilter(id), update, { new: true });
    },
  },

  // Analytics Repository
  analytics: {
    async recordEvent(event) {
      assertMongoReady();
      const today = new Date().toISOString().slice(0, 10);
      try {
        // Enforce lifetime deduplication for signed-in users on views
        if (event.type === 'view' && event.userId && event.userId !== 'guest') {
          const existing = await AnalyticsEvent.findOne({
            propertyId: event.propertyId,
            userId: event.userId,
            type: 'view',
          });
          if (existing) {
            return null;
          }
        }

        return await AnalyticsEvent.create({
          propertyId: event.propertyId,
          agentId: event.agentId,
          userId: event.userId,
          type: event.type,
          date: today,
          timestamp: new Date(),
        });
      } catch (err) {
        if (err.code === 11000) {
          // Deduplicated event already recorded
          return null;
        }
        throw err;
      }
    },

    async getEvents(filter = {}) {
      assertMongoReady();
      const q = {};
      if (filter.agentId) q.agentId = filter.agentId;
      if (filter.propertyId) q.propertyId = filter.propertyId;
      if (filter.type) q.type = filter.type;
      return AnalyticsEvent.find(q);
    },
  },
};

module.exports = db;

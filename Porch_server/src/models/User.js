/**
 * User Model for Porch Light Server
 * Authoritative schema for Users, Verified/Pending Agents, and Administrators.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, AGENT_STATUS } = require('../constants/roles');

const UserSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
      immutable: true,
    },
    city: {
      type: String,
      default: 'Bengaluru',
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      default: null,
    },

    // Agent-specific fields
    agency: {
      type: String,
      trim: true,
      default: '',
      required: function () {
        return this.role === ROLES.AGENT;
      },
    },
    reraNumber: {
      type: String,
      trim: true,
      default: '',
    },
    whatsappNumber: {
      type: String,
      trim: true,
      default: '',
    },
    licenseDocument: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: function () {
        return this.role !== ROLES.AGENT;
      },
    },
    verificationStatus: {
      type: String,
      enum: Object.values(AGENT_STATUS),
      default: function () {
        return this.role === ROLES.AGENT ? AGENT_STATUS.PENDING : AGENT_STATUS.VERIFIED;
      },
    },
    rating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    contactPreferences: {
      whatsapp: { type: Boolean, default: true },
      inAppChat: { type: Boolean, default: true },
      phoneCalls: { type: Boolean, default: true },
      emailAlerts: { type: Boolean, default: true },
    },

    // User-specific properties & compare
    savedProperties: [{ type: String }],
    compareSets: {
      sale: [{ type: String }],
      rent: [{ type: String }],
    },

    // Google OAuth integration (Strictly User accounts)
    googleId: {
      type: String,
      sparse: true,
      select: false,
    },

    // Account status & deletion safeguards
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeactivated: {
      type: Boolean,
      default: false,
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },
    deletionRequest: {
      requestedAt: { type: Date },
      reason: { type: String },
      status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
      adminNotes: { type: String },
      reviewedAt: { type: Date },
    },
    isDevSeed: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        delete ret.passwordHash;
        delete ret.googleId;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        delete ret.passwordHash;
        delete ret.googleId;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
UserSchema.index({ role: 1, isVerified: 1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return next();
  }

  if (this.passwordHash.startsWith('$2a$') || this.passwordHash.startsWith('$2b$')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;

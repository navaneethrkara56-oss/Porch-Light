/**
 * Property Model for Porch Light Server
 * Comprehensive schema for all 14 architectural property typologies,
 * dimensions, conditional floor fields, compliance, and media gallery.
 */

const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Property title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    listingType: {
      type: String,
      enum: ['sale', 'rent'],
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price or monthly rent is required'],
      min: [0, 'Price must be positive'],
    },
    ownership: {
      type: String,
      default: 'Freehold',
    },
    reraId: {
      type: String,
      default: '',
      trim: true,
    },
    possessionStatus: {
      type: String,
      default: 'Ready to Move',
    },
    salePaymentOptions: {
      type: [String],
      default: ['full_payment', 'emi'],
    },
    minDownPaymentPercent: {
      type: Number,
      default: 20,
    },
    age: {
      type: String,
      default: 'New',
    },
    availableFrom: {
      type: String,
      default: 'Immediate',
    },

    // Location
    address: { type: String, default: '', trim: true },
    locality: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, default: '', trim: true },
    pin: { type: String, default: '', trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },

    // Specs & Dimensions
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    balconies: { type: Number, default: 0 },
    totalFloors: { type: Number, default: 1 },
    facing: { type: String, default: 'East' },
    furnishing: { type: String, default: 'Unfurnished' },
    builtUpArea: { type: Number, default: 0 },
    carpetArea: { type: Number, default: 0 },
    plotArea: { type: Number, default: 0 },
    parking: { type: Number, default: 0 },

    // Commercial / Land extras
    ceilingHeight: { type: String, default: '' },
    loadingDocks: { type: Number, default: 0 },
    powerLoad: { type: String, default: '' },
    zoning: { type: String, default: '' },
    boundary: { type: String, default: '' },
    roadFrontage: { type: String, default: '' },

    // Access & Urban Connectivity
    approachRoad: { type: String, default: '' },
    nearestTransit: { type: String, default: '' },
    airportDistance: { type: String, default: '' },
    railwayDistance: { type: String, default: '' },
    hospitalDistance: { type: String, default: '' },
    commercialDistance: { type: String, default: '' },

    // Rental specific
    deposit: { type: Number, default: 0 },
    maintenanceFee: { type: Number, default: 0 },
    minLeaseMonths: { type: Number, default: 11 },
    noticePeriodMonths: { type: Number, default: 1 },
    preferredTenants: { type: String, default: 'Any' },

    // Amenities
    pool: { type: String, enum: ['private', 'shared', 'none'], default: 'none' },
    garden: { type: Boolean, default: false },
    gym: { type: Boolean, default: false },
    lift: { type: Boolean, default: false },
    powerBackup: { type: Boolean, default: false },
    waterSupply: { type: String, default: 'Corporation Supply' },
    security: { type: Boolean, default: false },
    gated: { type: Boolean, default: false },
    petsAllowed: { type: Boolean, default: false },

    // Media
    images: [{ type: String }],
    coverImage: { type: String, default: '' },
    coverImageIndex: { type: Number, default: 0 },
    floorPlans: [{ type: String }],
    tour360Url: { type: String, default: '' },

    // Agent representation
    agentId: {
      type: String,
      required: true,
      index: true,
    },

    // Moderation status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'archived'],
      default: 'pending',
      index: true,
    },
    adminNotes: { type: String, default: '' },

    // Transaction lifecycle
    isSold: { type: Boolean, default: false, index: true },
    buyerId: { type: String, default: null },
    soldAt: { type: Date, default: null },
    availabilityStatus: {
      type: String,
      enum: ['available', 'sold', 'reserved', 'pending_handover'],
      default: 'available',
    },
    externalSaleDetails: {
      isExternal: { type: Boolean, default: false },
      saleDate: { type: Date },
      buyerName: { type: String, default: '' },
      notes: { type: String, default: '' },
      externalReference: { type: String, default: '' },
      recordedAt: { type: Date },
    },

    isLeased: { type: Boolean, default: false, index: true },
    tenantId: { type: String, default: null },
    leasedAt: { type: Date, default: null },
    leaseStartDate: { type: Date, default: null },
    leaseEndDate: { type: Date, default: null },
    rentalStatus: {
      type: String,
      enum: ['available', 'leased', 'pending_handover'],
      default: 'available',
    },
    leaseCancellationPending: { type: Boolean, default: false },

    // Premium & Featured promotions
    isPremium: { type: Boolean, default: false, index: true },
    isPremiumAdminFlag: { type: Boolean, default: false },
    featured: { type: Boolean, default: false, index: true },
    featuredOrder: { type: Number, default: null },
    featuredUntil: { type: Date, default: null },
    promotedUntil: { type: Date, default: null },

    // Metrics
    views: { type: Number, default: 0 },
    inquiryCount: { type: Number, default: 0 },
    isDevSeed: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        if (!ret.coverImage && Array.isArray(ret.images) && ret.images.length > 0) {
          const idx = (ret.coverImageIndex >= 0 && ret.coverImageIndex < ret.images.length) ? ret.coverImageIndex : 0;
          ret.coverImage = ret.images[idx] || ret.images[0] || '';
        }
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        if (!ret.coverImage && Array.isArray(ret.images) && ret.images.length > 0) {
          const idx = (ret.coverImageIndex >= 0 && ret.coverImageIndex < ret.images.length) ? ret.coverImageIndex : 0;
          ret.coverImage = ret.images[idx] || ret.images[0] || '';
        }
        delete ret.__v;
        return ret;
      },
    },
  }
);

PropertySchema.pre('save', function (next) {
  if (Array.isArray(this.images) && this.images.length > 0) {
    const idx = (this.coverImageIndex >= 0 && this.coverImageIndex < this.images.length) ? this.coverImageIndex : 0;
    if (!this.coverImage || !this.images.includes(this.coverImage)) {
      this.coverImage = this.images[idx] || this.images[0] || '';
    }
  }
  next();
});

PropertySchema.index({ city: 1, listingType: 1, status: 1 });
PropertySchema.index({ price: 1 });
PropertySchema.index({ featured: 1, featuredOrder: 1 });

const Property = mongoose.model('Property', PropertySchema);

module.exports = Property;


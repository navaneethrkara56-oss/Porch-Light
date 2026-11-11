/**
 * Database Seed & Migration Script for Porch Light Server
 *
 * Usage:
 *   npm run seed           - Seeds empty database collections from canonical dataset
 *   npm run seed -- --force - Clears and re-seeds collections (DEVELOPMENT ONLY)
 *   npm run seed -- --import <path> - Imports an exported localStorage JSON file
 */

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const logger = require('../utils/logger');

// Models
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Inquiry = require('../models/Inquiry');
const Chat = require('../models/Chat');
const Payment = require('../models/Payment');
const { Promotion, PromotionConfig } = require('../models/Promotion');
const Rating = require('../models/Rating');
const Complaint = require('../models/Complaint');
const { Notification, Announcement, SystemReport, AnalyticsEvent } = require('../models/Operational');

async function seedDatabase() {
  const args = process.argv.slice(2);
  const isForce = args.includes('--force');
  const importIndex = args.indexOf('--import');
  const importPath = importIndex !== -1 ? args[importIndex + 1] : null;

  logger.info('Initializing Porch Light database seeder...');

  // Connect to DB
  const connected = await connectDB();
  if (!connected) {
    logger.error('Cannot seed: MongoDB connection could not be established. Please verify MONGODB_URI in .env.');
    process.exit(1);
  }

  try {
    let sourceData;
    if (importPath && fs.existsSync(importPath)) {
      logger.info(`Loading migration data from custom file: ${importPath}`);
      sourceData = JSON.parse(fs.readFileSync(importPath, 'utf8'));
    } else {
      const defaultSeedFile = path.resolve(__dirname, '../data/seedData.json');
      if (!fs.existsSync(defaultSeedFile)) {
        logger.error(`Default seed file not found at ${defaultSeedFile}`);
        process.exit(1);
      }
      sourceData = JSON.parse(fs.readFileSync(defaultSeedFile, 'utf8'));
    }

    // Safety check: Prevent accidental overwrite without --force
    const existingPropertyCount = await Property.countDocuments();
    if (existingPropertyCount > 0 && !isForce) {
      logger.warn(
        `Database already contains ${existingPropertyCount} properties. Aborting seed to prevent accidental data loss. Use 'npm run seed -- --force' if you intend to re-seed.`
      );
      await disconnectDB();
      process.exit(0);
    }

    if (isForce) {
      logger.warn('Force flag detected. Clearing existing database collections...');
      await Promise.all([
        User.deleteMany({}),
        Property.deleteMany({}),
        Booking.deleteMany({}),
        Inquiry.deleteMany({}),
        Chat.deleteMany({}),
        Payment.deleteMany({}),
        Promotion.deleteMany({}),
        PromotionConfig.deleteMany({}),
        Rating.deleteMany({}),
        Complaint.deleteMany({}),
        Notification.deleteMany({}),
        Announcement.deleteMany({}),
        SystemReport.deleteMany({}),
        AnalyticsEvent.deleteMany({}),
      ]);
    }

    logger.info('Seeding Users with bcrypt-hashed passwords...');
    const defaultPassword = process.env.DEMO_USER_PASSWORD || 'Demo@1234';
    const sharedPasswordHash = await bcrypt.hash(defaultPassword, 12);

    const userDocs = (sourceData.users || []).map((u) => ({
      customId: u.id,
      name: u.name,
      email: u.email.toLowerCase().trim(),
      passwordHash: sharedPasswordHash,
      role: u.role,
      city: u.city || 'Bengaluru',
      phone: u.phone || '',
      avatar: u.avatar || null,
      agency: u.agency || '',
      reraNumber: u.reraNumber || '',
      whatsappNumber: u.whatsappNumber || '',
      licenseDocument: u.licenseDocument || '',
      isVerified: u.isVerified !== undefined ? u.isVerified : (u.role !== 'agent'),
      verificationStatus: u.role === 'agent' ? (u.isVerified ? 'verified' : 'pending') : 'verified',
      rating: u.rating || 0,
      reviewCount: u.reviewCount || 0,
      contactPreferences: u.contactPreferences || {
        whatsapp: true,
        inAppChat: true,
        phoneCalls: true,
        emailAlerts: true,
      },
      savedProperties: sourceData.savedPropertyIds || ['prop-1', 'prop-3'],
      compareSets: {
        sale: [],
        rent: [],
      },
    }));
    await User.insertMany(userDocs, { ordered: false });

    logger.info(`Seeded ${userDocs.length} users.`);

    // 2. Properties
    logger.info('Seeding Property catalog...');
    const propDocs = (sourceData.properties || []).map((p) => ({
      customId: p.id,
      title: p.title,
      description: p.description,
      listingType: p.listingType,
      type: p.type,
      price: p.price,
      ownership: p.ownership || 'Freehold',
      reraId: p.reraId || '',
      possessionStatus: p.possessionStatus || 'Ready to Move',
      age: p.age || 'New',
      availableFrom: p.availableFrom || 'Immediate',
      address: p.address || '',
      locality: p.locality,
      city: p.city,
      state: p.state || '',
      pin: p.pin || '',
      lat: p.lat,
      lng: p.lng,
      bedrooms: p.bedrooms || 0,
      bathrooms: p.bathrooms || 0,
      balconies: p.balconies || 0,
      floor: p.floor || null,
      totalFloors: p.totalFloors || 1,
      facing: p.facing || 'East',
      furnishing: p.furnishing || 'Unfurnished',
      builtUpArea: p.builtUpArea || 0,
      carpetArea: p.carpetArea || 0,
      plotArea: p.plotArea || 0,
      parking: p.parking || 0,
      pool: p.pool || 'none',
      garden: Boolean(p.garden),
      gym: Boolean(p.gym),
      lift: Boolean(p.lift),
      powerBackup: Boolean(p.powerBackup),
      waterSupply: p.waterSupply || 'Corporation Supply',
      security: Boolean(p.security),
      gated: Boolean(p.gated),
      petsAllowed: Boolean(p.petsAllowed),
      images: p.images || [],
      coverImage: (p.images && p.images[p.coverImageIndex || 0]) || (p.images && p.images[0]) || '',
      coverImageIndex: p.coverImageIndex || 0,
      tour360Url: p.tour360Url || '',
      agentId: p.agentId || 'agt_1',
      status: p.status || 'approved',
      adminNotes: p.adminNotes || '',
      isSold: Boolean(p.isSold),
      buyerId: p.buyerId || null,
      soldAt: p.soldAt ? new Date(p.soldAt) : null,
      availabilityStatus: p.availabilityStatus || 'available',
      isLeased: Boolean(p.isLeased),
      tenantId: p.tenantId || null,
      leasedAt: p.leasedAt ? new Date(p.leasedAt) : null,
      rentalStatus: p.rentalStatus || 'available',
      isPremium: Boolean(p.isPremium || p.isPremiumAdminFlag),
      isPremiumAdminFlag: Boolean(p.isPremiumAdminFlag),
      featured: Boolean(p.featured),
      featuredOrder: p.featuredOrder || null,
      featuredUntil: p.featuredUntil ? new Date(p.featuredUntil) : null,
      promotedUntil: p.promotedUntil ? new Date(p.promotedUntil) : null,
      views: p.views || 0,
      inquiryCount: p.inquiryCount || 0,
    }));
    await Property.insertMany(propDocs, { ordered: false });
    logger.info(`Seeded ${propDocs.length} properties.`);

    // 3. Bookings
    if (sourceData.bookings && sourceData.bookings.length > 0) {
      const bookingDocs = sourceData.bookings.map((b) => ({
        customId: b.id,
        propertyId: b.propertyId,
        agentId: b.agentId,
        userId: b.userId,
        userName: b.userName,
        userEmail: b.userEmail,
        userPhone: b.userPhone || '',
        date: b.date,
        timeSlot: b.timeSlot,
        notes: b.notes || '',
        status: b.status || 'pending',
        rescheduleRequest: b.rescheduleRequest || null,
      }));
      await Booking.insertMany(bookingDocs, { ordered: false });
      logger.info(`Seeded ${bookingDocs.length} bookings.`);
    }

    // 4. Inquiries
    if (sourceData.inquiries && sourceData.inquiries.length > 0) {
      const inqDocs = sourceData.inquiries.map((iq) => ({
        customId: iq.id,
        propertyId: iq.propertyId,
        agentId: iq.agentId,
        userId: iq.userId || null,
        name: iq.name,
        email: iq.email,
        phone: iq.phone || '',
        message: iq.message,
        status: iq.status || 'new',
      }));
      await Inquiry.insertMany(inqDocs, { ordered: false });
      logger.info(`Seeded ${inqDocs.length} inquiries.`);
    }

    // 5. Payments
    if (sourceData.payments && sourceData.payments.length > 0) {
      const paymentDocs = sourceData.payments.map((py) => ({
        customId: py.id,
        receiptNumber: py.receiptNumber,
        propertyId: py.propertyId,
        propertyTitle: py.propertyTitle,
        propertySnapshot: py.propertySnapshot || {},
        userId: py.userId,
        userName: py.userName,
        agentId: py.agentId || 'agt_1',
        agentName: py.agentName || 'Priya Nambiar',
        amount: py.amount,
        type: py.type,
        method: py.method || 'UPI',
        status: py.status || 'completed',
        refundReason: py.refundReason || '',
        refundedAt: py.refundedAt ? new Date(py.refundedAt) : null,
        leaseDetails: py.leaseDetails || null,
        financingDetails: py.financingDetails || null,
        createdAt: py.timestamp ? new Date(py.timestamp) : new Date(),
      }));
      await Payment.insertMany(paymentDocs, { ordered: false });
      logger.info(`Seeded ${paymentDocs.length} payment records.`);
    }

    // 6. Chats
    if (sourceData.chats && sourceData.chats.length > 0) {
      const chatDocs = sourceData.chats.map((c) => ({
        customId: c.id,
        propertyId: c.propertyId,
        userId: c.userId,
        agentId: c.agentId,
        messages: (c.messages || []).map((m) => ({
          customId: m.id,
          senderId: m.senderId,
          senderRole: m.senderRole,
          senderName: m.senderName,
          text: m.text,
          attachments: m.attachments || [],
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        })),
        lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt) : new Date(),
      }));
      await Chat.insertMany(chatDocs, { ordered: false });
      logger.info(`Seeded ${chatDocs.length} conversation threads.`);
    }

    // 7. Promotions & Config
    if (sourceData.promotionConfig) {
      await PromotionConfig.create(sourceData.promotionConfig);
      logger.info('Seeded Promotion configuration parameters.');
    }

    if (sourceData.promotions && sourceData.promotions.length > 0) {
      const promoDocs = sourceData.promotions.map((pr) => ({
        customId: pr.id,
        propertyId: pr.propertyId,
        propertyTitle: pr.propertyTitle,
        agentId: pr.agentId,
        agentName: pr.agentName,
        type: pr.type,
        feeAmount: pr.feeAmount || 0,
        paymentReference: pr.paymentReference || '',
        status: pr.status || 'pending_review',
        adminNotes: pr.adminNotes || '',
        featuredOrder: pr.featuredOrder || null,
        featuredUntil: pr.featuredUntil ? new Date(pr.featuredUntil) : null,
        promotedUntil: pr.promotedUntil ? new Date(pr.promotedUntil) : null,
        isPermanent: Boolean(pr.isPermanent),
      }));
      await Promotion.insertMany(promoDocs, { ordered: false });
      logger.info(`Seeded ${promoDocs.length} promotion requests.`);
    }

    // 8. Ratings
    if (sourceData.ratings && sourceData.ratings.length > 0) {
      const ratingDocs = sourceData.ratings.map((rt) => ({
        customId: rt.id,
        transactionId: rt.transactionId,
        propertyId: rt.propertyId,
        userId: rt.userId,
        agentId: rt.agentId,
        rating: rt.rating,
        status: rt.status || 'active',
      }));
      await Rating.insertMany(ratingDocs, { ordered: false });
      logger.info(`Seeded ${ratingDocs.length} star ratings.`);
    }

    // 9. Complaints
    if (sourceData.complaints && sourceData.complaints.length > 0) {
      const complaintDocs = sourceData.complaints.map((cp) => ({
        customId: cp.id,
        userId: cp.userId,
        userName: cp.userName,
        userEmail: cp.userEmail,
        userRole: cp.userRole || 'user',
        propertyId: cp.propertyId || null,
        category: cp.category,
        subject: cp.subject,
        description: cp.description,
        status: cp.status || 'open',
        messages: (cp.messages || []).map((cm) => ({
          customId: cm.id,
          senderId: cm.senderId,
          senderName: cm.senderName,
          senderRole: cm.senderRole,
          message: cm.message,
          timestamp: cm.timestamp ? new Date(cm.timestamp) : new Date(),
        })),
      }));
      await Complaint.insertMany(complaintDocs, { ordered: false });
      logger.info(`Seeded ${complaintDocs.length} support complaint tickets.`);
    }

    // 10. Notifications
    if (sourceData.notifications && sourceData.notifications.length > 0) {
      const notifDocs = sourceData.notifications.map((nt) => ({
        customId: nt.id,
        userId: nt.userId,
        title: nt.title,
        message: nt.message,
        type: nt.type || 'info',
        link: nt.link || '',
        read: Boolean(nt.read),
      }));
      await Notification.insertMany(notifDocs, { ordered: false });
      logger.info(`Seeded ${notifDocs.length} notifications.`);
    }

    // 11. Announcements
    if (sourceData.announcements && sourceData.announcements.length > 0) {
      const annDocs = sourceData.announcements.map((an) => ({
        customId: an.id,
        title: an.title,
        content: an.content,
        target: an.target || 'all',
        priority: an.priority || 'info',
        expiresAt: an.expiresAt ? new Date(an.expiresAt) : null,
      }));
      await Announcement.insertMany(annDocs, { ordered: false });
      logger.info(`Seeded ${annDocs.length} announcements.`);
    }

    // 12. System Reports
    if (sourceData.systemReports && sourceData.systemReports.length > 0) {
      const srDocs = sourceData.systemReports.map((sr) => ({
        customId: sr.id,
        message: sr.message,
        reason: sr.reason || '',
        stack: sr.stack || '',
        source: sr.source || 'Client Component',
        status: sr.status || 'unresolved',
        timestamp: sr.timestamp ? new Date(sr.timestamp) : new Date(),
      }));
      await SystemReport.insertMany(srDocs, { ordered: false });
      logger.info(`Seeded ${srDocs.length} diagnostic reports.`);
    }

    // 13. Analytics Events
    if (sourceData.propertyViews && sourceData.propertyViews.length > 0) {
      const seen = new Set();
      const analyticsDocs = [];
      for (const pv of sourceData.propertyViews) {
        const key = `${pv.propertyId}-${pv.userId}-${pv.date}-view`;
        if (!seen.has(key)) {
          seen.add(key);
          analyticsDocs.push({
            customId: pv.id,
            propertyId: pv.propertyId,
            agentId: pv.agentId || 'agt_1',
            userId: pv.userId,
            type: 'view',
            date: pv.date,
            timestamp: pv.timestamp ? new Date(pv.timestamp) : new Date(),
          });
        }
      }
      if (analyticsDocs.length > 0) {
        await AnalyticsEvent.insertMany(analyticsDocs, { ordered: false });
        logger.info(`Seeded ${analyticsDocs.length} property view telemetry events.`);
      }
    }

    logger.info('Database seeding completed successfully.');
  } catch (err) {
    logger.error('Error occurred during database seed:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };


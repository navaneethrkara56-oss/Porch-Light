/**
 * Development Database Seeder for Porch Light
 *
 * Seeds a coherent development dataset into the configured MongoDB database:
 * - 1 Admin (navaneethestate56@gmail.com with development password admin123)
 * - 4 Users with distinct identities
 * - 3 Approved Agents owning exactly 9 properties each (27 properties total)
 * - 1 Pending Agent (isVerified: false, 0 properties)
 * - 27 Properties spread across 9 cities with consistent statuses & typologies
 * - Related visits, inquiries, chats, simulated payments, ratings, notifications
 * - 4 Admin-curated Featured showcase placements with waitlist
 *
 * Idempotent: Uses dev seed markers, backs up previous collections, and refuses to run in production.
 */

const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment from Porch_server/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const config = require('../config/env');
const { ROLES } = require('../constants/roles');

// Mongoose Models
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

// Curated stock photos for Indian architectural typologies (each set contains exactly 5 curated images)
const PHOTOS = {
  villa: [
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80',
  ],
  mansion: [
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=80',
  ],
  penthouse: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1600&q=80',
  ],
  apartment: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1502005229762-ee1b2b8ab275?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1600&q=80',
  ],
  house: [
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1600&q=80',
  ],
  farmhouse: [
    'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1600&q=80',
  ],
  townhouse: [
    'https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80',
  ],
  studio: [
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=80',
  ],
  office: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
  ],
  commercial: [
    'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80',
  ],
  plot: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1524813686514-a57563d77d61?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1500076656116-558758c991c1?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1600&q=80',
  ],
};

const PANORAMA_SAMPLE = 'https://images.unsplash.com/photo-1557971370-e7298ee473fb?auto=format&fit=crop&w=2400&q=80';

async function seed() {
  console.log('--- Porch Light Development Database Seeder ---');

  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Development seeding is strictly prohibited in production mode.');
    process.exit(1);
  }

  // Connect to MongoDB
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      dbName: config.dbName || 'porch_light',
    });
    console.log(`Connected to MongoDB database: ${mongoose.connection.name}`);
    if (mongoose.connection.name !== 'porch_light') {
      console.error(`ERROR: Expected database 'porch_light' but connected to '${mongoose.connection.name}'. Aborting seed.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('ERROR: Could not establish MongoDB connection:', err.message);
    process.exit(1);
  }

  // Backup existing data if any collections exist
  const backupDir = path.resolve(__dirname, '../../backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const existingUsers = await User.find().lean();
  const existingProps = await Property.find().lean();
  if (existingUsers.length > 0 || existingProps.length > 0) {
    const backupFile = path.join(backupDir, `db_backup_${Date.now()}.json`);
    const backupData = {
      timestamp: new Date().toISOString(),
      usersCount: existingUsers.length,
      propertiesCount: existingProps.length,
      users: existingUsers,
      properties: existingProps,
    };
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`Backed up ${existingUsers.length} users and ${existingProps.length} properties to backups/ directory.`);
  }

  // Seed identifiers for idempotent dev cleanup
  const seedEmails = [
    'navaneethestate56@gmail.com',
    'aarav.mehta@example.com',
    'diya.sengupta@example.com',
    'rohan.varma@example.com',
    'ananya.iyer@example.com',
    'vikram.singhania@porchlight.in',
    'meera.nambiar@porchlight.in',
    'kabir.shroff@porchlight.in',
    'pooja.deshmukh@porchlight.in',
  ];

  // Remove existing dev-seed documents (idempotent cleanup)
  await User.deleteMany({ $or: [{ isDevSeed: true }, { email: { $in: seedEmails } }] });
  await Property.deleteMany({ $or: [{ isDevSeed: true }, { customId: { $regex: /^prop-/ } }] });
  await Booking.deleteMany({ $or: [{ isDevSeed: true }, { customId: { $regex: /^vst_/ } }] });
  await Inquiry.deleteMany({ $or: [{ isDevSeed: true }, { email: { $in: seedEmails } }] });
  await Chat.deleteMany({ $or: [{ isDevSeed: true }, { customId: { $regex: /^chat_dev_/ } }] });
  await Payment.deleteMany({ $or: [{ isDevSeed: true }, { customId: { $regex: /^TX-2026-/ } }] });
  await Promotion.deleteMany({ $or: [{ isDevSeed: true }, { customId: { $regex: /^promo_/ } }] });
  await Rating.deleteMany({ $or: [{ isDevSeed: true }, { transactionId: { $regex: /^TX-2026-/ } }] });
  await Complaint.deleteMany({ $or: [{ isDevSeed: true }, { userEmail: { $in: seedEmails } }] });
  await Notification.deleteMany({ $or: [{ isDevSeed: true }, { userId: { $in: ['adm_navaneeth', 'agt_vikram', 'agt_meera', 'agt_kabir', 'usr_aarav'] } }] });
  await Announcement.deleteMany({ $or: [{ isDevSeed: true }, { title: { $regex: /Curated 2026/ } }] });
  await AnalyticsEvent.deleteMany({ $or: [{ isDevSeed: true }, { customId: { $regex: /^ae_/ } }] });
  await SystemReport.deleteMany({ $or: [{ isDevSeed: true }, { customId: { $regex: /^rep_/ } }] });

  console.log('Cleared previous development seed records.');

  // Password hashes (bcrypt 12 salt rounds)
  const adminHash = bcrypt.hashSync('admin123', 12);
  const agentHash = bcrypt.hashSync('Agent@1234', 12);
  const userHash = bcrypt.hashSync('User@1234', 12);

  // 1. One Admin
  const adminUser = {
    customId: 'adm_navaneeth',
    name: 'Navaneeth K.',
    email: 'navaneethestate56@gmail.com',
    passwordHash: adminHash,
    role: ROLES.ADMIN,
    isVerified: true,
    verificationStatus: 'verified',
    city: 'Bengaluru',
    isDevSeed: true,
  };

  // 2. Four Users
  const users = [
    {
      customId: 'usr_aarav',
      name: 'Aarav Mehta',
      email: 'aarav.mehta@example.com',
      passwordHash: userHash,
      role: ROLES.USER,
      city: 'Mumbai',
      phone: '+91 98201 11222',
      savedProperties: ['prop-mumbai-1', 'prop-goa-1', 'prop-bengaluru-1'],
      isDevSeed: true,
    },
    {
      customId: 'usr_diya',
      name: 'Diya Sengupta',
      email: 'diya.sengupta@example.com',
      passwordHash: userHash,
      role: ROLES.USER,
      city: 'Bengaluru',
      phone: '+91 98451 22334',
      savedProperties: ['prop-bengaluru-2', 'prop-kochi-1'],
      isDevSeed: true,
    },
    {
      customId: 'usr_rohan',
      name: 'Rohan Varma',
      email: 'rohan.varma@example.com',
      passwordHash: userHash,
      role: ROLES.USER,
      city: 'Kochi',
      phone: '+91 94471 33445',
      savedProperties: ['prop-kochi-2', 'prop-chennai-1'],
      isDevSeed: true,
    },
    {
      customId: 'usr_ananya',
      name: 'Ananya Iyer',
      email: 'ananya.iyer@example.com',
      passwordHash: userHash,
      role: ROLES.USER,
      city: 'Chennai',
      phone: '+91 98401 44556',
      savedProperties: ['prop-chennai-2', 'prop-hyderabad-1'],
      isDevSeed: true,
    },
  ];

  // 3. Three Approved Agents
  const approvedAgents = [
    {
      customId: 'agt_vikram',
      name: 'Vikramaditya Singhania',
      email: 'vikram.singhania@porchlight.in',
      passwordHash: agentHash,
      role: ROLES.AGENT,
      isVerified: true,
      verificationStatus: 'verified',
      agency: 'Singhania Heritage Realty',
      agencyName: 'Singhania Heritage Realty',
      reraNumber: 'PRM/KA/RERA/1251/310/AG/220815/002341',
      reraId: 'PRM/KA/RERA/1251/310/AG/220815/002341',
      phone: '+91 98450 12345',
      city: 'Bengaluru',
      isDevSeed: true,
    },
    {
      customId: 'agt_meera',
      name: 'Meera Nambiar',
      email: 'meera.nambiar@porchlight.in',
      passwordHash: agentHash,
      role: ROLES.AGENT,
      isVerified: true,
      verificationStatus: 'verified',
      agency: 'Malabar Coastal Estates',
      agencyName: 'Malabar Coastal Estates',
      reraNumber: 'K-RERA/AG/0045/2021',
      reraId: 'K-RERA/AG/0045/2021',
      phone: '+91 94471 23456',
      city: 'Kochi',
      isDevSeed: true,
    },
    {
      customId: 'agt_kabir',
      name: 'Kabir Shroff',
      email: 'kabir.shroff@porchlight.in',
      passwordHash: agentHash,
      role: ROLES.AGENT,
      isVerified: true,
      verificationStatus: 'verified',
      agency: 'Shroff & Associates Luxury Living',
      agencyName: 'Shroff & Associates Luxury Living',
      reraNumber: 'A51900001289',
      reraId: 'A51900001289',
      phone: '+91 98200 34567',
      city: 'Mumbai',
      isDevSeed: true,
    },
  ];

  // 4. One Pending Agent
  const pendingAgent = {
    customId: 'agt_pooja',
    name: 'Pooja Deshmukh',
    email: 'pooja.deshmukh@porchlight.in',
    passwordHash: agentHash,
    role: ROLES.AGENT,
    isVerified: false,
    verificationStatus: 'pending',
    agency: 'Deccan Prime Realty',
    agencyName: 'Deccan Prime Realty',
    reraNumber: 'A52100034891',
    reraId: 'A52100034891',
    phone: '+91 97654 32100',
    city: 'Pune',
    isDevSeed: true,
  };

  const allSeedUsers = [adminUser, ...users, ...approvedAgents, pendingAgent];
  await User.insertMany(allSeedUsers);
  console.log(`Seeded 1 Admin, 4 Users, 3 Approved Agents, 1 Pending Agent (${allSeedUsers.length} total accounts).`);

  // 5. Exactly 27 Properties: 9 per approved agent, 3 in each of the 9 cities
  const cities = ['Kochi', 'Bengaluru', 'Mumbai', 'Hyderabad', 'Chennai', 'Delhi NCR', 'Pune', 'Kolkata', 'Goa'];

  const cityCoords = {
    'Kochi': { lat: 9.9312, lng: 76.2673 },
    'Bengaluru': { lat: 12.9716, lng: 77.5946 },
    'Mumbai': { lat: 19.0760, lng: 72.8777 },
    'Hyderabad': { lat: 17.3850, lng: 78.4867 },
    'Chennai': { lat: 13.0827, lng: 80.2707 },
    'Delhi NCR': { lat: 28.6139, lng: 77.2090 },
    'Pune': { lat: 18.5204, lng: 73.8567 },
    'Kolkata': { lat: 22.5726, lng: 88.3639 },
    'Goa': { lat: 15.2993, lng: 74.1240 },
  };

  const properties = [];

  // Helper to assign agent cyclically: 9 props each for agt_vikram, agt_meera, agt_kabir
  const agentIds = ['agt_vikram', 'agt_meera', 'agt_kabir'];
  let propCounter = 1;

  cities.forEach((city, cityIdx) => {
    const coords = cityCoords[city];

    for (let slot = 1; slot <= 3; slot++) {
      const assignedAgentId = agentIds[(propCounter - 1) % 3];
      const customId = `prop-${city.toLowerCase().replace(/\s+/g, '-')}-${slot}`;

      // Realistic mix of typologies and listing types
      let type = 'apartment';
      let listingType = 'sale';
      let price = 18500000;
      let bedrooms = 3;
      let bathrooms = 3;
      let carpetArea = 1850;
      let builtUpArea = 2200;
      let status = 'approved';
      let isSold = false;
      let isLeased = false;
      let isPremium = false;
      let featured = false;
      let featuredOrder = null;
      let featuredUntil = null;
      let buyerId = null;
      let tenantId = null;

      // Slot 1: Premium / Sale Villa or Penthouse
      if (slot === 1) {
        type = cityIdx % 2 === 0 ? 'villa' : 'penthouse';
        listingType = 'sale';
        price = 35000000 + (cityIdx * 4500000);
        bedrooms = 4;
        bathrooms = 4;
        carpetArea = 3200;
        builtUpArea = 3800;
        // Make 4 of slot 1 properties Featured Showcase items on Home page
        if (cityIdx < 4) {
          featured = true;
          featuredOrder = cityIdx + 1;
          featuredUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        }
        // Make 5 properties Premium
        if (cityIdx < 5) {
          isPremium = true;
        }
      }
      // Slot 2: Rental Apartment / House
      else if (slot === 2) {
        type = cityIdx % 3 === 0 ? 'house' : 'apartment';
        listingType = 'rent';
        price = 65000 + (cityIdx * 8000); // monthly rent
        bedrooms = cityIdx % 2 === 0 ? 3 : 2;
        bathrooms = 2;
        carpetArea = 1450;
        builtUpArea = 1750;
        // Mark 4 rental properties as currently leased
        if (cityIdx < 4) {
          status = 'approved';
          isLeased = true;
          tenantId = users[cityIdx % 4].customId;
        }
      }
      // Slot 3: Varied statuses (sold, pending moderation, rejected, commercial/studio)
      else if (slot === 3) {
        if (cityIdx === 0 || cityIdx === 1) {
          // 2 Sold properties
          type = 'apartment';
          listingType = 'sale';
          price = 24000000;
          status = 'approved';
          isSold = true;
          buyerId = users[cityIdx].customId;
        } else if (cityIdx === 2 || cityIdx === 3) {
          // 2 Pending Review properties (awaiting admin curation)
          type = cityIdx === 2 ? 'townhouse' : 'farmhouse';
          listingType = 'sale';
          price = 42000000;
          status = 'pending';
        } else if (cityIdx === 4 || cityIdx === 5) {
          // 2 Rejected properties
          type = 'studio';
          listingType = 'rent';
          price = 35000;
          status = 'rejected';
        } else {
          // Approved commercial / plot
          type = cityIdx === 6 ? 'office' : cityIdx === 7 ? 'commercial' : 'plot';
          listingType = 'sale';
          price = 28000000;
          status = 'approved';
        }
      }

      const imgSet = PHOTOS[type] || PHOTOS.apartment;
      const images = imgSet.slice(0, 5);

      properties.push({
        customId,
        agentId: assignedAgentId,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Sanctuary at ${city}`,
        description: `An exceptional architectural residence located in prime ${city}. Designed with serene spatial proportions, natural ventilation, and quiet finishes.`,
        type,
        listingType,
        status,
        price,
        deposit: listingType === 'rent' ? price * 2 : undefined,
        city,
        locality: `${city} Central`,
        address: `${100 + propCounter}, Sanctuary Way, ${city}`,
        lat: coords.lat + (slot * 0.008) - 0.015,
        lng: coords.lng + (slot * 0.008) - 0.015,
        bedrooms: type === 'plot' ? 0 : bedrooms,
        bathrooms: type === 'plot' ? 0 : bathrooms,
        carpetArea,
        builtUpArea,
        furnishing: slot === 2 ? 'semi-furnished' : 'unfurnished',
        possessionStatus: 'ready_to_move',
        isSold,
        isLeased,
        buyerId,
        tenantId,
        isPremium,
        panoramaUrl: isPremium ? PANORAMA_SAMPLE : null,
        tour360Url: isPremium ? PANORAMA_SAMPLE : null,
        featured,
        featuredOrder,
        featuredUntil,
        images,
        coverImage: images[0],
        coverImageIndex: 0,
        coverImage: images[0],
        views: 45 + (cityIdx * 12) + slot,
        viewsCount: 45 + (cityIdx * 12) + slot,
        rejectionReason: status === 'rejected' ? 'Incomplete structural floor plan documents submitted.' : undefined,
        isDevSeed: true,
      });

      propCounter++;
    }
  });

  await Property.insertMany(properties);
  console.log(`Seeded exactly 27 properties (9 per approved agent, 3 in each of the 9 cities).`);

  // 6. Seed Featured Showcase Configuration & Waitlist
  await PromotionConfig.deleteMany({});
  await PromotionConfig.create({
    fee: 15000,
    premiumFee: 15000,
    durationDays: 14,
    featuredDurationDays: 14,
    featuredCapacity: 4,
    active: true,
    terms: 'Unpaid editorial showcase curation for 1 of exactly 4 Front-Page Home slots.',
  });

  // Seed 1 waitlisted featured promotion for an agent
  await Promotion.create({
    customId: 'promo_waitlist_1',
    propertyId: properties[4].customId,
    propertyTitle: properties[4].title,
    agentId: properties[4].agentId,
    agentName: 'Singhania Heritage Realty',
    type: 'featured_placement',
    status: 'waitlist',
    queuePosition: 1,
    isDevSeed: true,
  });

  // 7. Seed Logical Payments for Sold & Leased Properties
  const payments = [
    // 2 Completed Buy Token Advances
    {
      customId: 'TX-2026-881201',
      receiptNumber: 'REC-2026-881201',
      propertyId: properties[2].customId,
      propertyTitle: properties[2].title,
      propertySnapshot: {
        city: properties[2].city,
        locality: properties[2].locality,
        price: properties[2].price,
        listingType: 'sale',
      },
      userId: users[0].customId,
      userName: users[0].name,
      agentId: properties[2].agentId,
      agentName: 'Singhania Heritage Realty',
      amount: 500000, // 5 Lakhs token advance
      type: 'token_amount',
      method: 'NEFT / RTGS',
      status: 'completed',
      paidAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      isDevSeed: true,
    },
    {
      customId: 'TX-2026-881202',
      receiptNumber: 'REC-2026-881202',
      propertyId: properties[5].customId,
      propertyTitle: properties[5].title,
      propertySnapshot: {
        city: properties[5].city,
        locality: properties[5].locality,
        price: properties[5].price,
        listingType: 'sale',
      },
      userId: users[1].customId,
      userName: users[1].name,
      agentId: properties[5].agentId,
      agentName: 'Malabar Coastal Estates',
      amount: 500000,
      type: 'token_amount',
      method: 'UPI',
      status: 'completed',
      paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      isDevSeed: true,
    },
    // 4 Rental Move-in Deposit Payments for Leased properties
    {
      customId: 'TX-2026-771101',
      receiptNumber: 'REC-2026-771101',
      propertyId: properties[1].customId,
      propertyTitle: properties[1].title,
      userId: users[0].customId,
      userName: users[0].name,
      agentId: properties[1].agentId,
      amount: 150000,
      type: 'rent_deposit',
      method: 'UPI',
      status: 'completed',
      paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      leaseDetails: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        monthlyRent: properties[1].price,
      },
      isDevSeed: true,
    },
    {
      customId: 'TX-2026-771102',
      receiptNumber: 'REC-2026-771102',
      propertyId: properties[4].customId,
      propertyTitle: properties[4].title,
      userId: users[1].customId,
      userName: users[1].name,
      agentId: properties[4].agentId,
      amount: 160000,
      type: 'rent_deposit',
      method: 'Net Banking',
      status: 'completed',
      paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      leaseDetails: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        monthlyRent: properties[4].price,
      },
      isDevSeed: true,
    },
    // 2 Premium Promotion Fees Paid by Agents
    {
      customId: 'TX-2026-990001',
      receiptNumber: 'REC-2026-990001',
      propertyId: properties[0].customId,
      propertyTitle: properties[0].title,
      userId: properties[0].agentId,
      userName: 'Singhania Heritage Realty',
      agentId: properties[0].agentId,
      amount: 15000,
      type: 'promotion_fee',
      method: 'Corporate Card',
      status: 'completed',
      paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      isDevSeed: true,
    },
  ];

  await Payment.insertMany(payments);
  console.log(`Seeded ${payments.length} simulated payments (Token Advances, Leases, Promotion Fees).`);

  // 8. Seed Verified Agent Ratings Tied to Completed Transactions
  const ratings = [
    {
      transactionId: 'TX-2026-881201',
      propertyId: properties[2].customId,
      userId: users[0].customId,
      agentId: properties[2].agentId,
      rating: 5,
      status: 'active',
      isDevSeed: true,
    },
    {
      transactionId: 'TX-2026-881202',
      propertyId: properties[5].customId,
      userId: users[1].customId,
      agentId: properties[5].agentId,
      rating: 5,
      status: 'active',
      isDevSeed: true,
    },
    {
      transactionId: 'TX-2026-771101',
      propertyId: properties[1].customId,
      userId: users[0].customId,
      agentId: properties[1].agentId,
      rating: 4,
      status: 'active',
      isDevSeed: true,
    },
  ];

  await Rating.insertMany(ratings);
  console.log(`Seeded ${ratings.length} verified star ratings linked to completed transactions.`);

  // 9. Seed Walkthrough Visits
  const bookings = [
    {
      customId: 'vst_101',
      propertyId: properties[0].customId,
      agentId: properties[0].agentId,
      userId: users[0].customId,
      userName: users[0].name,
      userEmail: users[0].email,
      userPhone: users[0].phone,
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      timeSlot: '11:00 AM',
      notes: 'Interested in private garden and terrace specs.',
      status: 'confirmed',
      isDevSeed: true,
    },
    {
      customId: 'vst_102',
      propertyId: properties[3].customId,
      agentId: properties[3].agentId,
      userId: users[1].customId,
      userName: users[1].name,
      userEmail: users[1].email,
      userPhone: users[1].phone,
      date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      timeSlot: '03:30 PM',
      notes: 'Walkthrough with architectural advisor.',
      status: 'pending',
      isDevSeed: true,
    },
  ];

  await Booking.insertMany(bookings);
  console.log(`Seeded ${bookings.length} visit bookings.`);

  // 10. Seed Inquiries & Conversations
  const inquiries = [
    {
      propertyId: properties[0].customId,
      agentId: properties[0].agentId,
      userId: users[2].customId,
      name: users[2].name,
      email: users[2].email,
      phone: users[2].phone,
      message: 'Could you share the high-resolution architectural layout and OC certificate details?',
      status: 'new',
      isDevSeed: true,
    },
  ];

  await Inquiry.insertMany(inquiries);

  const chats = [
    {
      customId: 'chat_dev_1',
      propertyId: properties[0].customId,
      userId: users[0].customId,
      userName: users[0].name,
      userEmail: users[0].email,
      agentId: properties[0].agentId,
      messages: [
        {
          id: 'msg_1',
          senderId: users[0].customId,
          senderName: users[0].name,
          senderRole: 'user',
          text: 'Good afternoon. I am interested in scheduling a walkthrough for this residence.',
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: 'msg_2',
          senderId: properties[0].agentId,
          senderName: 'Vikramaditya Singhania',
          senderRole: 'agent',
          text: 'Good afternoon Aarav. I would be pleased to host you for a private walkthrough this Saturday.',
          timestamp: new Date(Date.now() - 1800000),
        },
      ],
      lastMessageAt: new Date(),
      isDevSeed: true,
    },
  ];

  await Chat.insertMany(chats);
  console.log('Seeded client inquiries and conversation threads.');

  // 11. Seed Notifications & Operational Broadcasts
  const notifications = [
    {
      userId: 'adm_navaneeth',
      title: 'New Listings Awaiting Curation',
      message: '2 new property submissions from verified agents are awaiting architectural review.',
      type: 'approval',
      link: '/admin/approvals',
      read: false,
      isDevSeed: true,
    },
    {
      userId: 'agt_vikram',
      title: 'Visit Walkthrough Confirmed',
      message: `Aarav Mehta confirmed walkthrough for "${properties[0].title}".`,
      type: 'visit',
      link: '/agent/visits',
      read: false,
      isDevSeed: true,
    },
    {
      userId: 'usr_aarav',
      title: 'Acquisition Token Confirmed',
      message: `Simulated advance token for "${properties[2].title}" has been recorded.`,
      type: 'payment',
      link: '/dashboard/properties',
      read: false,
      isDevSeed: true,
    },
  ];

  await Notification.insertMany(notifications);

  const announcements = [
    {
      title: 'Curated 2026 Architectural Showcase',
      content: 'Welcome to Porch Light. All listed sanctuaries have undergone documentation vetting.',
      target: 'all',
      priority: 'info',
      isDevSeed: true,
    },
  ];

  await Announcement.insertMany(announcements);

  // 12. Seed Support Ticket
  const complaints = [
    {
      userId: users[0].customId,
      userName: users[0].name,
      userRole: 'user',
      userEmail: users[0].email,
      subject: 'Clarification regarding parking allocation',
      description: 'Requesting confirmation on whether covered visitor parking is included in the deed.',
      category: 'Documentation',
      status: 'open',
      messages: [
        {
          senderId: users[0].customId,
          senderName: users[0].name,
          senderRole: 'user',
          message: 'Requesting confirmation on whether covered visitor parking is included in the deed.',
          timestamp: new Date(),
        },
      ],
      isDevSeed: true,
    },
  ];

  await Complaint.insertMany(complaints);

  // 13. Seed System Reports (Admin Telemetry & Diagnostics)
  const systemReports = [
    {
      customId: 'rep_1',
      message: 'CDN asset health: All 27 property image galleries responding with HTTP 200.',
      reason: 'Automated Media Diagnostic',
      stack: '',
      source: 'Asset Verification Worker',
      status: 'resolved',
      timestamp: new Date(Date.now() - 3600000 * 12),
      isDevSeed: true,
    },
    {
      customId: 'rep_2',
      message: 'Mapbox vector tile latency check within nominal threshold (<50ms).',
      reason: 'Spatial Telemetry Check',
      stack: '',
      source: 'Map Coordinate Validator',
      status: 'resolved',
      timestamp: new Date(Date.now() - 3600000 * 6),
      isDevSeed: true,
    },
  ];
  await SystemReport.insertMany(systemReports);

  // 14. Seed Analytics Events (Views & Tour Opens across recent days)
  const analyticsEvents = [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().slice(0, 10);

  // Seed events for the 4 featured properties and popular residences
  const samplePropIndices = [0, 1, 2, 3, 4, 5];
  samplePropIndices.forEach((idx, i) => {
    const prop = properties[idx];
    users.forEach((usr, uIdx) => {
      // View event today
      analyticsEvents.push({
        customId: `ae_v_today_${i}_${uIdx}`,
        propertyId: prop.customId,
        agentId: prop.agentId,
        userId: usr.customId,
        type: 'view',
        date: todayStr,
        timestamp: new Date(),
        isDevSeed: true,
      });

      // View event yesterday
      analyticsEvents.push({
        customId: `ae_v_yest_${i}_${uIdx}`,
        propertyId: prop.customId,
        agentId: prop.agentId,
        userId: usr.customId,
        type: 'view',
        date: yesterday,
        timestamp: new Date(Date.now() - 86400000),
        isDevSeed: true,
      });

      // Tour open for premium residences
      if (prop.isPremium && uIdx < 2) {
        analyticsEvents.push({
          customId: `ae_t_today_${i}_${uIdx}`,
          propertyId: prop.customId,
          agentId: prop.agentId,
          userId: usr.customId,
          type: 'tour_open',
          date: todayStr,
          timestamp: new Date(),
          isDevSeed: true,
        });
      }
    });
  });

  await AnalyticsEvent.insertMany(analyticsEvents);

  console.log(`Seeded platform announcements, notifications, support tickets, system reports (${systemReports.length}), and analytics events (${analyticsEvents.length}).`);
  console.log('--------------------------------------------------');
  console.log('DEV SEED COMPLETED SUCCESSFULLY IN MONGODB:');
  console.log(` - Database: ${mongoose.connection.name}`);
  console.log(` - Admin: navaneethestate56@gmail.com (development hash stored)`);
  console.log(` - Users: ${users.length}`);
  console.log(` - Agents: 3 approved (9 properties each = 27 total), 1 pending`);
  console.log(` - Cities: 9 cities (Kochi, Bengaluru, Mumbai, Hyderabad, Chennai, Delhi NCR, Pune, Kolkata, Goa)`);
  console.log(` - Properties: 27 total (17 available, 4 leased, 2 sold, 2 pending, 2 rejected; 5 premium, 4 featured)`);
  console.log(` - Payments: ${payments.length}`);
  console.log(` - Ratings: ${ratings.length}`);
  console.log(` - Bookings: ${bookings.length}`);
  console.log(` - Conversations: ${chats.length}`);
  console.log(` - Analytics Events: ${analyticsEvents.length}`);
  console.log(` - System Reports: ${systemReports.length}`);
  console.log('--------------------------------------------------');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed process failed:', err);
  process.exit(1);
});

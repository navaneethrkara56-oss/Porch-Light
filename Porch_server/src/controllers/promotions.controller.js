/**
 * Promotions & Showcase Controller for Porch Light Server
 * Permanent Premium Upgrades & Timed 4-Slot Front-Page Showcase Management.
 */

const db = require('../db/dataStore');
const { ROLES } = require('../constants/roles');

/**
 * Get Platform Promotion Parameters
 * GET /api/promotions/config
 */
async function getConfig(req, res, next) {
  try {
    const config = await db.promotions.getConfig();
    const cleanCfg = config?.toJSON ? config.toJSON() : (config?.toObject ? config.toObject() : (config || {}));
    const fee = cleanCfg?.fee || cleanCfg?.premiumFee || 15000;
    const duration = cleanCfg?.featuredDurationDays || cleanCfg?.durationDays || 14;
    res.json({
      success: true,
      data: {
        ...cleanCfg,
        fee,
        premiumFee: fee,
        durationDays: duration,
        featuredDurationDays: duration,
        featuredCapacity: 4,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Platform Promotion Parameters (Admin only)
 * PATCH /api/promotions/config
 */
async function updateConfig(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    const { premiumFee, fee, active, terms, featuredDurationDays, featuredTerms } = req.body;
    const cleanFee = Number(premiumFee || fee);
    const cleanDuration = Number(featuredDurationDays);

    if (cleanFee <= 0 || cleanDuration < 1 || cleanDuration > 90) {
      return res.status(400).json({ success: false, error: { message: 'Invalid promotion configuration parameters.' } });
    }

    const updated = await db.promotions.updateConfig({
      fee: cleanFee,
      premiumFee: cleanFee,
      active: Boolean(active),
      terms: terms || '',
      featuredDurationDays: cleanDuration,
      featuredTerms: featuredTerms || '',
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Promotions List
 * GET /api/promotions
 */
async function getPromotions(req, res, next) {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const { type, status } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (userRole === ROLES.AGENT) {
      filter.agentId = userId;
    }

    const promotions = await db.promotions.find(filter);
    res.json({ success: true, data: promotions });
  } catch (err) {
    next(err);
  }
}

/**
 * Request Permanent Premium Status
 * POST /api/promotions/premium-badge
 */
async function requestPremium(req, res, next) {
  try {
    const { propertyId } = req.body;
    const prop = await db.properties.findById(propertyId);

    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found.' } });
    }

    if (prop.agentId !== req.user.id && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
    }

    if (prop.isPremium || prop.isPremiumAdminFlag) {
      return res.status(400).json({ success: false, error: { message: 'This property is already verified Premium.' } });
    }

    // Check existing pending request
    const existing = await db.promotions.find({ propertyId, type: 'premium_badge', status: 'pending_review' });
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: { message: 'A Premium request is already pending review.' } });
    }

    const config = await db.promotions.getConfig();
    const feeAmount = config.premiumFee || 15000;
    const agent = await db.users.findById(req.user.id);

    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const paymentRef = `TX-2026-${randomNum}`;

    // Record promotion fee payment
    await db.payments.create({
      customId: paymentRef,
      receiptNumber: `REC-2026-${randomNum}`,
      propertyId,
      propertyTitle: prop.title,
      propertySnapshot: {
        locality: prop.locality,
        city: prop.city,
        price: prop.price,
        listingType: prop.listingType,
        image: prop.images && prop.images[0] ? prop.images[0] : null,
      },
      userId: req.user.id,
      userName: agent ? agent.name : 'Agent',
      agentId: req.user.id,
      agentName: agent ? agent.name : 'Agent',
      amount: feeAmount,
      type: 'promotion_fee',
      method: 'Card / Net Banking',
      status: 'completed',
    });

    const promotion = await db.promotions.create({
      propertyId,
      propertyTitle: prop.title,
      agentId: req.user.id,
      agentName: agent ? agent.name : 'Agent',
      type: 'premium_badge',
      feeAmount,
      paymentReference: paymentRef,
      status: 'pending_review',
      isPermanent: true,
    });

    // Notify admins
    const admins = await db.users.find({ role: ROLES.ADMIN });
    for (const adm of admins) {
      await db.notifications.create({
        userId: adm.id || adm.customId,
        title: 'New Premium Upgrade Request',
        message: `Agent submitted Premium request for "${prop.title}".`,
        type: 'promotion',
        link: '/admin/promotions',
      });
    }

    res.status(201).json({ success: true, data: promotion });
  } catch (err) {
    next(err);
  }
}

/**
 * Request Featured Showcase Placement (Unpaid, 4-Slot)
 * POST /api/promotions/featured-placement
 */
async function requestFeatured(req, res, next) {
  try {
    const { propertyId } = req.body;
    const prop = await db.properties.findById(propertyId);

    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found.' } });
    }

    if (prop.agentId !== req.user.id && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
    }

    const agent = await db.users.findById(req.user.id);
    const activeShowcase = await db.properties.find({ featured: true });

    // Check if space available in 4-slot ceiling
    const spaceAvailable = activeShowcase.length < 4;
    const status = spaceAvailable ? 'pending_review' : 'waitlist';

    const promotion = await db.promotions.create({
      propertyId,
      propertyTitle: prop.title,
      agentId: req.user.id,
      agentName: agent ? agent.name : 'Agent',
      type: 'featured_placement',
      feeAmount: 0,
      status,
      isPermanent: false,
    });

    // Notify admins
    const admins = await db.users.find({ role: ROLES.ADMIN });
    for (const adm of admins) {
      await db.notifications.create({
        userId: adm.id || adm.customId,
        title: 'New Home Showcase Request',
        message: `Agent requested Featured placement for "${prop.title}" (${status === 'waitlist' ? 'Enqueued in Waitlist' : 'Awaiting Review'}).`,
        type: 'promotion',
        link: '/admin/featured',
      });
    }

    res.status(201).json({ success: true, data: promotion });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Promotion Status (Admin only)
 * PATCH /api/promotions/:id/status
 */
async function updateStatus(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const promo = await db.promotions.findById(id);

    if (!promo) {
      return res.status(404).json({ success: false, error: { message: 'Promotion request not found.' } });
    }

    const updates = { status, adminNotes: adminNotes || '' };

    if (promo.type === 'premium_badge' && status === 'approved') {
      // Permanently unlock Premium on Property
      await db.properties.updateById(promo.propertyId, {
        isPremium: true,
        isPremiumAdminFlag: true,
      });

      await db.notifications.create({
        customId: `notif_promo_premium_appr_${promo.id || promo.customId || id}`,
        userId: promo.agentId,
        title: 'Premium Upgrade Approved',
        message: `Verified Gold Star Badge and 360° Virtual Tour permanently activated for "${promo.propertyTitle}".`,
        type: 'promotion',
        link: `/property/${promo.propertyId}`,
      });
    } else if (promo.type === 'featured_placement' && status === 'approved') {
      const cfg = await db.promotions.getConfig();
      const durationDays = cfg.featuredDurationDays || 14;
      const until = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      updates.featuredUntil = until;
      await db.properties.updateById(promo.propertyId, {
        featured: true,
        featuredUntil: until,
      });

      await db.notifications.create({
        customId: `notif_promo_feat_appr_${promo.id || promo.customId || id}`,
        userId: promo.agentId,
        title: 'Showcase Placement Approved',
        message: `"${promo.propertyTitle}" is now live on the Front-Page Home Showcase for ${durationDays} days.`,
        type: 'promotion',
        link: `/property/${promo.propertyId}`,
      });
    }

    const updated = await db.promotions.updateById(id, updates);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Featured Window
 * PATCH /api/properties/:id/featured-window
 */
async function updateFeaturedWindow(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const { durationDays, endDate } = req.body;

    const newDate = endDate ? new Date(endDate) : new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000);

    const updated = await db.properties.updateById(id, {
      featuredUntil: newDate,
      featured: true,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove from Featured Slot (Advances Waitlist)
 * POST /api/properties/:id/unpin-featured
 */
async function removeFeaturedPlacement(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    const { id } = req.params;
    await db.properties.updateById(id, { featured: false, featuredOrder: null });

    // Advance top waitlisted property if exists
    const waitlist = await db.promotions.find({ type: 'featured_placement', status: 'waitlist' });
    if (waitlist.length > 0) {
      const nextPromo = waitlist[0];
      const cfg = await db.promotions.getConfig();
      const until = new Date(Date.now() + (cfg.featuredDurationDays || 14) * 24 * 60 * 60 * 1000);

      await db.promotions.updateById(nextPromo.id, {
        status: 'approved',
        featuredUntil: until,
      });

      await db.properties.updateById(nextPromo.propertyId, {
        featured: true,
        featuredUntil: until,
      });
    }

    res.json({ success: true, message: 'Featured property unpinned and waitlist advanced.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Sync Featured Placements Worker
 * POST /api/promotions/featured-sync
 */
async function syncFeaturedPlacements(req, res, next) {
  try {
    const now = new Date();
    const active = await db.properties.find({ featured: true });

    for (const p of active) {
      if (p.featuredUntil && new Date(p.featuredUntil) < now) {
        await db.properties.updateById(p.id || p.customId, { featured: false, featuredOrder: null });
      }
    }

    res.json({ success: true, message: 'Featured placements synchronized.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Admin Front-Page Featured Curation
 * PUT /api/promotions/featured-curation
 */
async function updateFeaturedCuration(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    const rawItems = req.body.items || req.body.slots || (Array.isArray(req.body) ? req.body : null);
    if (!rawItems || !Array.isArray(rawItems)) {
      return res.status(400).json({ success: false, error: { message: 'Items or slots array required.' } });
    }

    const featuredItems = rawItems.filter((item) => (item.featured !== undefined ? Boolean(item.featured) : true));
    if (featuredItems.length > 4) {
      return res.status(400).json({
        success: false,
        error: { message: 'Showcase capacity is strictly 4 slots. Unpin an active slot first.' },
      });
    }

    // Reset any properties currently marked featured that are not in the newly selected set
    const selectedFeaturedIds = new Set(
      featuredItems.map((item) => String(item.id || item.propertyId || item.customId))
    );
    const allCurrentlyFeatured = await db.properties.find({ featured: true });
    for (const oldProp of allCurrentlyFeatured) {
      const oldId = String(oldProp.id || oldProp.customId);
      if (!selectedFeaturedIds.has(oldId)) {
        await db.properties.updateById(oldId, {
          featured: false,
          featuredOrder: null,
          featuredUntil: null,
        });
      }
    }

    const cfg = await db.promotions.getConfig();
    const durationDays = cfg?.featuredDurationDays || 14;
    const defaultUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    for (const item of rawItems) {
      const propId = item.id || item.propertyId || item.customId;
      if (!propId) continue;

      const prop = await db.properties.findById(propId);
      if (!prop) continue;

      const shouldFeature = item.featured !== undefined ? Boolean(item.featured) : true;
      const order = Number(item.featuredOrder || item.slotNumber) || 99;

      if (shouldFeature) {
        // Enforce moderation & availability eligibility rules
        if (prop.status !== 'approved' || prop.isSold || prop.isLeased) {
          continue;
        }
        const currentUntil = prop.featuredUntil ? new Date(prop.featuredUntil) : null;
        const validUntil = currentUntil && currentUntil > new Date() ? currentUntil : defaultUntil;

        await db.properties.updateById(prop.id || prop.customId, {
          featured: true,
          featuredOrder: order,
          featuredUntil: validUntil,
        });
      } else {
        await db.properties.updateById(prop.id || prop.customId, {
          featured: false,
          featuredOrder: null,
          featuredUntil: null,
        });
      }
    }

    const activeFeatured = await db.properties.find({ featured: true });
    res.json({
      success: true,
      message: 'Front-page featured showcase updated successfully.',
      data: {
        curatedCount: activeFeatured.length,
        properties: activeFeatured,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getConfig,
  updateConfig,
  getPromotions,
  requestPremium,
  requestFeatured,
  updateStatus,
  updateFeaturedWindow,
  removeFeaturedPlacement,
  syncFeaturedPlacements,
  updateFeaturedCuration,
};

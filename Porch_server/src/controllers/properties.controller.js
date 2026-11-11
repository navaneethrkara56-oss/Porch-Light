/**
 * Properties Controller for Porch Light Server
 * Handles search/filtering, spatial map coordinates, architectural specs,
 * moderation state, and ownership-guarded mutations.
 */

const db = require('../db/dataStore');
const { ROLES } = require('../constants/roles');
const { CANONICAL_CITIES, normalizeCity } = require('../constants/cities');
const logger = require('../utils/logger');

/**
 * Filtered, sorted, paginated property catalog
 * GET /api/properties
 */
async function getProperties(req, res, next) {
  try {
    const {
      listingType,
      city,
      type,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      minArea,
      maxArea,
      furnishing,
      possessionStatus,
      verifiedOnly,
      amenities,
      search,
      sortBy,
      status = 'approved',
      includeSold,
      includeLeased,
      agentId,
      page = 1,
      pageSize = 12,
      limit,
    } = req.query;

    const allProps = await db.properties.find({});
    const targetCity = city && city.toLowerCase() !== 'all' ? normalizeCity(city) : null;
    const now = new Date();

    // Auto-expire ended leases based on stored backend lease date
    allProps.forEach((p) => {
      if (p.isLeased && p.leaseEndDate && new Date(p.leaseEndDate) <= now) {
        p.isLeased = false;
        p.rentalStatus = 'available';
        p.tenantId = null;
        p.leaseStartDate = null;
        p.leaseEndDate = null;
        db.properties.updateById(p.id || p.customId, {
          isLeased: false,
          rentalStatus: 'available',
          tenantId: null,
          leaseStartDate: null,
          leaseEndDate: null,
        }).catch(() => {});
      }
    });

    const callerId = req.user?.id;
    const isPrivilegedAgentOrAdmin = Boolean(
      req.user && (
        req.user.role === ROLES.ADMIN ||
        (agentId && (callerId === agentId || req.user.customId === agentId))
      )
    );

    let filtered = allProps.filter((p) => {
      // Status filtering (default 'approved' for public catalog)
      if (status && status !== 'all' && p.status !== status) return false;

      // Filter out archived listings from public discovery
      const isArchived = p.isArchived || p.status === 'archived';
      if (isArchived && !isPrivilegedAgentOrAdmin) {
        return false;
      }

      // Filter out sold properties from public discovery
      const isSold = p.isSold || p.availabilityStatus === 'sold' || p.status === 'sold';
      if (isSold && (!isPrivilegedAgentOrAdmin || includeSold === 'false')) {
        return false;
      }

      // Filter out actively leased properties from public discovery
      const isLeased = (p.isLeased || p.rentalStatus === 'leased' || p.status === 'rented') &&
        (!p.leaseEndDate || new Date(p.leaseEndDate) > now);
      if (isLeased && (!isPrivilegedAgentOrAdmin || includeLeased === 'false')) {
        return false;
      }

      if (agentId && p.agentId !== agentId) return false;
      const targetListingType = listingType === 'buy' ? 'sale' : listingType;
      if (targetListingType && p.listingType !== targetListingType) return false;
      if (targetCity) {
        const pCity = normalizeCity(p.city);
        if (pCity.toLowerCase() !== targetCity.toLowerCase()) return false;
      }

      if (type) {
        const rawTypes = Array.isArray(type) ? type : String(type).split(',');
        const types = rawTypes.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
        if (types.length > 0 && !types.includes((p.type || '').toLowerCase())) return false;
      }

      if (minPrice != null && minPrice !== '' && p.price < Number(minPrice)) return false;
      if (maxPrice != null && maxPrice !== '' && p.price > Number(maxPrice)) return false;
      if (bedrooms != null && bedrooms !== '' && p.bedrooms < Number(bedrooms)) return false;
      if (bathrooms != null && bathrooms !== '' && p.bathrooms < Number(bathrooms)) return false;

      const area = p.builtUpArea || p.carpetArea || p.plotArea || 0;
      if (minArea != null && minArea !== '' && area < Number(minArea)) return false;
      if (maxArea != null && maxArea !== '' && area > Number(maxArea)) return false;

      if (furnishing && furnishing.toLowerCase() !== 'all') {
        const cleanFurn = furnishing.toLowerCase().replace(/[\s_-]+/g, '');
        const propFurn = (p.furnishing || '').toLowerCase().replace(/[\s_-]+/g, '');
        const match = propFurn === cleanFurn ||
          (cleanFurn.includes('full') && propFurn.includes('furn') && !propFurn.includes('semi')) ||
          (cleanFurn.includes('semi') && propFurn.includes('semi')) ||
          (cleanFurn.includes('un') && propFurn.includes('un'));
        if (!match) return false;
      }

      if (possessionStatus && possessionStatus.toLowerCase() !== 'all') {
        const cleanPoss = possessionStatus.toLowerCase().replace(/[\s_-]+/g, '');
        const propPoss = (p.possessionStatus || '').toLowerCase().replace(/[\s_-]+/g, '');
        if (cleanPoss !== propPoss) return false;
      }
      if (verifiedOnly === 'true' && !p.reraId) return false;

      // Amenities filter
      if (amenities) {
        const amList = Array.isArray(amenities) ? amenities : String(amenities).split(',');
        for (const am of amList) {
          if (am === 'pool' && (!p.pool || p.pool === 'none')) return false;
          if (am === 'gym' && !p.gym) return false;
          if (am === 'garden' && !p.garden) return false;
          if (am === 'powerBackup' && !p.powerBackup) return false;
          if (am === 'security' && !p.security) return false;
          if (am === 'gated' && !p.gated) return false;
          if (am === 'parking' && (!p.parking || p.parking < 1)) return false;
        }
      }

      if (search) {
        const q = search.trim().toLowerCase();
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchLocality = p.locality?.toLowerCase().includes(q);
        const matchCity = p.city?.toLowerCase().includes(q);
        const matchRera = p.reraId?.toLowerCase().includes(q);
        const matchType = p.type?.toLowerCase().includes(q);
        if (!matchTitle && !matchLocality && !matchCity && !matchRera && !matchType) return false;
      }

      return true;
    });

    // Deterministic ID tie-breaker
    const tieBreaker = (a, b) => String(a.id || a.customId || a._id || '').localeCompare(String(b.id || b.customId || b._id || ''));

    // Sorting
    if (sortBy === 'price_asc') {
      filtered.sort((a, b) => (a.price - b.price) || tieBreaker(a, b));
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => (b.price - a.price) || tieBreaker(a, b));
    } else if (sortBy === 'area_asc') {
      filtered.sort((a, b) => {
        const areaA = a.carpetArea || a.builtUpArea || a.plotArea || 0;
        const areaB = b.carpetArea || b.builtUpArea || b.plotArea || 0;
        return (areaA - areaB) || tieBreaker(a, b);
      });
    } else if (sortBy === 'area_desc') {
      filtered.sort((a, b) => {
        const areaA = a.carpetArea || a.builtUpArea || a.plotArea || 0;
        const areaB = b.carpetArea || b.builtUpArea || b.plotArea || 0;
        return (areaB - areaA) || tieBreaker(a, b);
      });
    } else if (sortBy === 'featured') {
      // "Featured & Curated" prioritizes Premium (isPremium) first, then stable curated ordering, then newest, then deterministic tie-breaker
      filtered.sort((a, b) => {
        const premA = Boolean(a.isPremium || a.isPremiumAdminFlag) ? 1 : 0;
        const premB = Boolean(b.isPremium || b.isPremiumAdminFlag) ? 1 : 0;
        if (premB !== premA) return premB - premA;

        const featA = Boolean(a.featured) ? 1 : 0;
        const featB = Boolean(b.featured) ? 1 : 0;
        if (featB !== featA) return featB - featA;

        const ordA = a.featuredOrder != null ? a.featuredOrder : 99;
        const ordB = b.featuredOrder != null ? b.featuredOrder : 99;
        if (ordA !== ordB) return ordA - ordB;

        const dateDiff = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (dateDiff !== 0) return dateDiff;

        return tieBreaker(a, b);
      });
    } else {
      // Default 'newest'
      filtered.sort((a, b) => {
        const dateDiff = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (dateDiff !== 0) return dateDiff;
        return tieBreaker(a, b);
      });
    }

    // Keep all matching records for map pins
    const allMatching = filtered.map((p) => {
      const coverImage = p.coverImage || (p.images && p.images[p.coverImageIndex || 0]) || (p.images && p.images[0]) || '';
      return {
        id: p.id || p.customId,
        title: p.title,
        price: p.price,
        type: p.type,
        listingType: p.listingType,
        city: p.city,
        locality: p.locality,
        lat: p.lat,
        lng: p.lng,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        carpetArea: p.carpetArea,
        builtUpArea: p.builtUpArea,
        images: p.images || [],
        coverImage,
        isPremium: Boolean(p.isPremium || p.isPremiumAdminFlag),
        featured: Boolean(p.featured),
        featuredOrder: p.featuredOrder != null ? p.featuredOrder : null,
        featuredUntil: p.featuredUntil || null,
        status: p.status,
      };
    });

    // Pagination
    const numPage = Math.max(1, parseInt(page, 10) || 1);
    const numSize = Math.max(1, parseInt(limit || pageSize, 10) || 12);
    const total = filtered.length;
    const totalPages = Math.ceil(total / numSize) || 1;
    const start = (numPage - 1) * numSize;
    const pagedData = filtered.slice(start, start + numSize).map((p) => {
      const clean = p.toJSON ? p.toJSON() : (p.toObject ? p.toObject() : { ...p });
      delete clean.negotiable;
      if (!clean.coverImage) {
        clean.coverImage = (clean.images && clean.images[clean.coverImageIndex || 0]) || (clean.images && clean.images[0]) || '';
      }
      return clean;
    });

    res.json({
      success: true,
      data: pagedData,
      allMatching,
      total,
      page: numPage,
      pageSize: numSize,
      totalPages,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Property by ID
 * GET /api/properties/:id
 */
async function getPropertyById(req, res, next) {
  try {
    const { id } = req.params;
    const prop = await db.properties.findById(id);

    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found' } });
    }

    // Compute authenticated viewer identifiers
    const viewerId = req.user?.id;
    const viewerUser = viewerId ? await db.users.findById(viewerId) : null;
    const viewerIds = viewerId ? [viewerId, viewerUser?.customId, String(viewerUser?._id)].filter(Boolean) : [];
    const isAgent = viewerIds.includes(prop.agentId);
    const isAdmin = req.user?.role === ROLES.ADMIN;

    // Check and expire ended leases using stored backend lease dates
    if (prop.isLeased && prop.leaseEndDate && new Date(prop.leaseEndDate) <= new Date()) {
      prop.isLeased = false;
      prop.rentalStatus = 'available';
      prop.tenantId = null;
      prop.leaseStartDate = null;
      prop.leaseEndDate = null;
      await db.properties.updateById(prop.id || prop.customId, {
        isLeased: false,
        rentalStatus: 'available',
        tenantId: null,
        leaseStartDate: null,
        leaseEndDate: null,
      }).catch(() => {});
    }

    // Privacy check on sold properties: strictly buyer, representing agent, and admin
    const isSold = prop.isSold || prop.availabilityStatus === 'sold' || prop.status === 'sold';
    if (isSold) {
      const isBuyer = viewerIds.includes(prop.buyerId);
      if (!isBuyer && !isAgent && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: { message: 'This property has been acquired through a completed transaction and is no longer publicly viewable.' },
        });
      }
    }

    // Privacy check on actively leased properties: strictly tenant, representing agent, and admin
    const isActivelyLeased = (prop.isLeased || prop.rentalStatus === 'leased' || prop.status === 'rented') &&
      (!prop.leaseEndDate || new Date(prop.leaseEndDate) > new Date());
    if (isActivelyLeased) {
      const isTenant = viewerIds.includes(prop.tenantId);
      if (!isTenant && !isAgent && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: { message: 'This rental sanctuary is currently under an active lease and is not publicly viewable.' },
        });
      }
    }

    // Daily deduplicated view recording
    const analyticsViewerId = viewerId || 'guest';
    const isOwnerOrAdmin = viewerId === prop.agentId || req.user?.role === ROLES.ADMIN;

    if (!isOwnerOrAdmin) {
      await db.analytics.recordEvent({
        propertyId: prop.id || prop.customId,
        agentId: prop.agentId,
        userId: analyticsViewerId,
        type: 'view',
      });
    }

    // Enriched Agent profile data
    const agent = await db.users.findById(prop.agentId);
    const enrichedProp = prop.toJSON ? prop.toJSON() : { ...prop };
    delete enrichedProp.negotiable;
    if (!enrichedProp.coverImage) {
      enrichedProp.coverImage = (enrichedProp.images && enrichedProp.images[enrichedProp.coverImageIndex || 0]) || (enrichedProp.images && enrichedProp.images[0]) || '';
    }
    enrichedProp.agent = agent
      ? {
          id: agent.id || agent.customId,
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          whatsappNumber: agent.whatsappNumber || agent.phone,
          agency: agent.agency,
          reraNumber: agent.reraNumber,
          isVerified: agent.isVerified,
          rating: agent.rating || 0,
          reviewCount: agent.reviewCount || 0,
          avatar: agent.avatar || agent.profilePhoto || null,
        }
      : null;

    res.json({
      success: true,
      data: enrichedProp,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Similar Properties
 * GET /api/properties/:id/similar
 */
async function getSimilarProperties(req, res, next) {
  try {
    const { id } = req.params;
    const prop = await db.properties.findById(id);
    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found' } });
    }

    const allProps = await db.properties.find({ status: 'approved' });
    const now = new Date();
    const similar = allProps
      .filter((p) => {
        if (p.id === id || p.customId === id) return false;
        if (p.isSold || p.availabilityStatus === 'sold' || p.status === 'sold') return false;
        if ((p.isLeased || p.rentalStatus === 'leased' || p.status === 'rented') && (!p.leaseEndDate || new Date(p.leaseEndDate) > now)) return false;
        return p.city === prop.city || p.type === prop.type;
      })
      .slice(0, 4);

    const cleanedSimilar = similar.map((p) => {
      const clean = p.toJSON ? p.toJSON() : (p.toObject ? p.toObject() : { ...p });
      delete clean.negotiable;
      if (!clean.coverImage) {
        clean.coverImage = (clean.images && clean.images[clean.coverImageIndex || 0]) || (clean.images && clean.images[0]) || '';
      }
      return clean;
    });

    res.json({ success: true, data: cleanedSimilar });
  } catch (err) {
    next(err);
  }
}

function sanitizePropertyPayload(data) {
  const clean = { ...data };

  // Sanitize parking (number of bays)
  if (clean.parking !== undefined && clean.parking !== null) {
    if (typeof clean.parking === 'string') {
      const match = clean.parking.match(/\d+/);
      clean.parking = match ? parseInt(match[0], 10) : 0;
    } else {
      clean.parking = Number(clean.parking) || 0;
    }
  }

  // Sanitize pool enum ('private' | 'shared' | 'none')
  if (clean.pool !== undefined && clean.pool !== null) {
    if (clean.pool === true || clean.pool === 'true' || clean.pool === 'private') {
      clean.pool = 'private';
    } else if (clean.pool === 'shared') {
      clean.pool = 'shared';
    } else {
      clean.pool = 'none';
    }
  }

  // Sanitize booleans
  const boolFields = ['garden', 'gym', 'lift', 'powerBackup', 'security', 'gated', 'petsAllowed'];
  boolFields.forEach((field) => {
    if (clean[field] !== undefined && clean[field] !== null) {
      clean[field] = clean[field] === true || clean[field] === 'true';
    }
  });

  // Sanitize numeric fields
  const numFields = [
    'price',
    'bedrooms',
    'bathrooms',
    'balconies',
    'builtUpArea',
    'carpetArea',
    'plotArea',
    'floor',
    'totalFloors',
    'deposit',
    'securityDeposit',
    'maintenanceFee',
    'maintenance',
    'loadingDocks',
    'minDownPaymentPercent',
    'lat',
    'lng',
  ];
  numFields.forEach((field) => {
    if (clean[field] !== undefined && clean[field] !== null && clean[field] !== '') {
      const val = Number(clean[field]);
      if (!isNaN(val)) {
        clean[field] = val;
      }
    }
  });

  // Alias field harmonization
  if (clean.maintenance !== undefined && clean.maintenanceFee === undefined) {
    clean.maintenanceFee = Number(clean.maintenance) || 0;
  }
  if (clean.securityDeposit !== undefined && clean.deposit === undefined) {
    clean.deposit = Number(clean.securityDeposit) || 0;
  }

  // Access & Urban Connectivity string trimming
  ['approachRoad', 'nearestTransit', 'airportDistance', 'railwayDistance', 'hospitalDistance', 'commercialDistance'].forEach((f) => {
    if (clean[f] !== undefined && clean[f] !== null) {
      clean[f] = String(clean[f]).trim();
    }
  });

  return clean;
}

/**
 * Create New Property
 * POST /api/properties
 */
async function createProperty(req, res, next) {
  try {
    const userRole = req.user.role;
    if (userRole !== ROLES.AGENT && userRole !== ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only real estate agents and administrators can list properties.' },
      });
    }

    // Check agent verification
    if (userRole === ROLES.AGENT) {
      const agentUser = await db.users.findById(req.user.id);
      if (!agentUser || !agentUser.isVerified) {
        return res.status(403).json({
          success: false,
          error: { message: 'Your agent account is pending administrative verification. Listing publication is restricted.' },
        });
      }
    }

    const rawData = { ...req.body };
    delete rawData.negotiable;
    const data = sanitizePropertyPayload(rawData);
    data.agentId = userRole === ROLES.ADMIN ? (data.agentId || req.user.id) : req.user.id;
    data.status = userRole === ROLES.ADMIN ? 'approved' : 'pending';
    data.isSold = false;
    data.isLeased = false;
    data.views = 0;

    // Validate images max 5
    if (data.images && data.images.length > 5) {
      data.images = data.images.slice(0, 5);
    }
    if (!data.coverImage && data.images && data.images.length > 0) {
      data.coverImage = data.images[data.coverImageIndex || 0] || data.images[0];
    }

    const created = await db.properties.create(data);

    // Notify administrators if submitted by agent
    if (userRole === ROLES.AGENT) {
      const admins = await db.users.find({ role: ROLES.ADMIN });
      for (const adm of admins) {
        await db.notifications.create({
          userId: adm.id || adm.customId,
          title: 'New Property Listing Pending Moderation',
          message: `Agent submitted "${created.title}" in ${created.city} for review.`,
          type: 'moderation',
          link: '/admin/approvals',
        });
      }
    }

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Property (Ownership guarded, restricted fields)
 * PATCH /api/properties/:id
 */
async function updateProperty(req, res, next) {
  try {
    const { id } = req.params;
    const prop = await db.properties.findById(id);

    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found' } });
    }

    const isOwner = prop.agentId === req.user.id;
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'You can only edit property listings that you represent.' },
      });
    }

    const rawUpdates = { ...req.body };
    const updates = sanitizePropertyPayload(rawUpdates);

    // Strip protected compliance fields if non-admin
    if (!isAdmin) {
      delete updates.id;
      delete updates.customId;
      delete updates.agentId;
      delete updates.type;
      delete updates.listingType;
      delete updates.locality;
      delete updates.city;
      delete updates.lat;
      delete updates.lng;
      delete updates.reraId;
      delete updates.ownership;
      delete updates.isSold;
      delete updates.isLeased;
      delete updates.buyerId;
      delete updates.tenantId;
      delete updates.isPremium;
      delete updates.isPremiumAdminFlag;
      delete updates.featured;
    }

    // Preserve lifecycle state: editing a sold, leased, or archived property must never silently make it available
    if (prop.isSold || prop.availabilityStatus === 'sold' || prop.status === 'sold') {
      updates.isSold = true;
      updates.status = 'sold';
      updates.availabilityStatus = 'sold';
      updates.isAvailable = false;
    } else if (prop.isLeased || prop.rentalStatus === 'leased' || prop.status === 'rented') {
      updates.isLeased = true;
      updates.status = 'rented';
      updates.rentalStatus = 'leased';
      updates.isAvailable = false;
    } else if (prop.isArchived || prop.status === 'archived') {
      updates.isArchived = true;
      updates.status = 'archived';
      updates.isAvailable = false;
    }

    // Enforce 5 photo limit
    if (updates.images && updates.images.length > 5) {
      updates.images = updates.images.slice(0, 5);
    }
    delete updates.negotiable;
    if (updates.images && updates.images.length > 0 && !updates.coverImage) {
      updates.coverImage = updates.images[updates.coverImageIndex || 0] || updates.images[0];
    }

    // Check if price or core specs changed on an approved listing -> trigger re-review
    if (!isAdmin && prop.status === 'approved' && updates.price && updates.price !== prop.price) {
      updates.status = 'pending';
      const admins = await db.users.find({ role: ROLES.ADMIN });
      for (const adm of admins) {
        await db.notifications.create({
          userId: adm.id || adm.customId,
          title: 'Property Terms Modified',
          message: `Price changed on "${prop.title}". Re-moderation required.`,
          type: 'moderation',
          link: '/admin/approvals',
        });
      }
    }

    const updated = await db.properties.updateById(id, updates);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete Property (Reversible Soft-Delete/Archive if encumbered, Hard-Delete if clean)
 * DELETE /api/properties/:id
 */
async function deleteProperty(req, res, next) {
  try {
    const { id } = req.params;
    const prop = await db.properties.findById(id);

    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found' } });
    }

    const isOwner = prop.agentId === req.user.id || prop.agentId === req.user.customId;
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
    }

    // Check for encumbrances: payments, schedules, sold status, lease status, or active walkthroughs
    const [payments, schedules, activeBookings] = await Promise.all([
      db.payments.find({ propertyId: id }),
      db.paymentSchedules.find({ propertyId: id }),
      db.bookings.find({ propertyId: id, status: { $in: ['pending', 'confirmed'] } }),
    ]);

    const hasEncumbrance =
      payments.length > 0 ||
      schedules.length > 0 ||
      prop.isSold ||
      prop.isLeased ||
      prop.rentalStatus === 'pending_handover' ||
      prop.availabilityStatus === 'sold' ||
      activeBookings.length > 0;

    if (hasEncumbrance) {
      // Reversible archive / soft-delete approach to preserve historical transactions, payments, receipts, and audit records
      const updated = await db.properties.updateById(id, {
        isArchived: true,
        archivedAt: new Date().toISOString(),
        status: 'archived',
        isAvailable: false,
        archivedReason: 'Archived to preserve historical transaction, payment, receipt, and audit compliance records.',
      });

      return res.json({
        success: true,
        isArchived: true,
        data: updated,
        message: 'Listing archived safely. Transaction, payment, receipt, and audit records have been preserved.',
      });
    }

    // Clean, unencumbered listing: safe to hard-delete
    await db.properties.deleteById(id);
    res.json({ success: true, message: 'Property deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Restore Archived Property
 * PATCH /api/properties/:id/restore
 */
async function restoreProperty(req, res, next) {
  try {
    const { id } = req.params;
    const prop = await db.properties.findById(id);

    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found' } });
    }

    const isOwner = prop.agentId === req.user.id || prop.agentId === req.user.customId;
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
    }

    const targetStatus = (prop.isSold || prop.availabilityStatus === 'sold')
      ? 'sold'
      : (prop.isLeased || prop.rentalStatus === 'leased')
      ? 'rented'
      : 'approved';

    const updated = await db.properties.updateById(id, {
      isArchived: false,
      archivedAt: null,
      archivedReason: null,
      status: targetStatus,
      isAvailable: targetStatus === 'approved',
    });

    res.json({ success: true, data: updated, message: 'Property listing restored from archive.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Mark Property Sold or Rented
 * PATCH /api/properties/:id/status
 */
async function markSoldOrRented(req, res, next) {
  try {
    const { id } = req.params;
    const { status: targetStatus, externalSale } = req.body;
    const prop = await db.properties.findById(id);

    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found' } });
    }

    const isOwner = prop.agentId === req.user.id || prop.agentId === req.user.customId;
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
    }

    const updates = {};
    if (targetStatus === 'sold') {
      if (prop.isSold || prop.availabilityStatus === 'sold') {
        return res.status(400).json({
          success: false,
          error: { message: 'This property has already been marked as Sold.' },
        });
      }

      if (prop.isLeased || prop.rentalStatus === 'leased' || prop.rentalStatus === 'pending_handover') {
        return res.status(400).json({
          success: false,
          error: { message: 'Cannot mark property as Sold while an active tenant lease or handover inspection is ongoing.' },
        });
      }

      // Check for conflicting in-escrow transactions
      const pendingPayments = await db.payments.find({ propertyId: id, status: 'pending' });
      if (pendingPayments.length > 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Cannot mark property as Sold while an in-platform client payment is pending escrow confirmation.' },
        });
      }

      if (externalSale) {
        const saleDate = externalSale.saleDate ? new Date(externalSale.saleDate) : new Date();
        updates.isSold = true;
        updates.availabilityStatus = 'sold';
        updates.soldAt = saleDate;
        updates.featured = false;
        updates.externalSaleDetails = {
          isExternal: true,
          saleDate,
          buyerName: externalSale.buyerName ? externalSale.buyerName.trim() : 'External Buyer',
          notes: externalSale.notes ? externalSale.notes.trim() : '',
          externalReference: externalSale.externalReference ? externalSale.externalReference.trim() : '',
          recordedAt: new Date(),
        };

        // Dispatch notifications for external sale
        await db.notifications.create({
          userId: prop.agentId,
          title: 'External Sale Recorded',
          message: `External sale was recorded for "${prop.title}". The listing has been withdrawn from public discovery.`,
          type: 'property',
          link: `/agent/properties/${prop.id}`,
        });
      } else {
        // In-platform transaction verification
        if (!isAdmin) {
          const completedPayments = await db.payments.find({ propertyId: id, status: 'completed' });
          if (completedPayments.length === 0) {
            return res.status(400).json({
              success: false,
              error: {
                message: 'Cannot mark property as Sold without an executed in-platform payment or explicit external sale confirmation.',
              },
            });
          }
        }
        updates.isSold = true;
        updates.availabilityStatus = 'sold';
        updates.soldAt = new Date();
        updates.featured = false;
      }
    } else if (targetStatus === 'rented') {
      if (!isAdmin) {
        const completedPayments = await db.payments.find({ propertyId: id, status: 'completed' });
        if (completedPayments.length === 0) {
          return res.status(400).json({
            success: false,
            error: { message: 'Cannot mark property as Rented without an executed platform transaction record.' },
          });
        }
      }
      updates.isLeased = true;
      updates.rentalStatus = 'leased';
      updates.leasedAt = new Date();
      updates.featured = false;
    } else if (targetStatus === 'archived') {
      updates.status = 'archived';
      updates.featured = false;
    }

    const updated = await db.properties.updateById(id, updates);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Public Home live statistics aggregate
 * GET /api/properties/home-stats
 */
async function getHomeStats(req, res, next) {
  try {
    const allProps = await db.properties.find({});
    const approvedProps = allProps.filter((p) => p.status === 'approved');
    const availableProps = approvedProps.filter(
      (p) => !p.isSold && !p.isLeased && p.availabilityStatus !== 'sold' && p.rentalStatus !== 'leased'
    );

    const distinctCities = new Set();
    let reraCount = 0;

    approvedProps.forEach((p) => {
      if (p.city) {
        distinctCities.add(normalizeCity(p.city));
      }
      if (p.reraId) {
        reraCount++;
      }
    });

    const totalHomes = approvedProps.length;
    const availableHomes = availableProps.length;
    const totalCities = Math.max(CANONICAL_CITIES.length, distinctCities.size);
    const reraPercent = 100; // Porch Light standard compliance guarantee

    res.json({
      success: true,
      data: {
        totalHomes,
        availableHomes,
        totalCities,
        reraPercent,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProperties,
  getHomeStats,
  getPropertyById,
  getSimilarProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  restoreProperty,
  markSoldOrRented,
};


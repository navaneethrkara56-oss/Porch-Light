/**
 * Agent Star Ratings Controller for Porch Light Server
 * Connected strictly to completed property transactions.
 */

const db = require('../db/dataStore');
const { ROLES } = require('../constants/roles');

/**
 * Check Rating Eligibility
 * GET /api/ratings/eligibility
 */
async function checkEligibility(req, res, next) {
  try {
    const { tx: transactionId, propertyId } = req.query;
    const userId = req.user.id;

    if (req.user.role !== ROLES.USER) {
      return res.json({
        success: true,
        data: { eligible: false, reason: 'Only buyers and tenants can rate representing agents.' },
      });
    }

    const tx = await db.payments.findById(transactionId);
    if (!tx) {
      return res.json({ success: true, data: { eligible: false, reason: 'Transaction record not found.' } });
    }

    if (tx.userId !== userId) {
      return res.json({ success: true, data: { eligible: false, reason: 'You can only rate your own completed transactions.' } });
    }

    if (tx.status !== 'completed') {
      return res.json({
        success: true,
        data: { eligible: false, reason: `Ratings require completed payment status (current: ${tx.status}).` },
      });
    }

    if (tx.type !== 'token_amount' && tx.type !== 'rent_deposit') {
      return res.json({
        success: true,
        data: { eligible: false, reason: 'Transaction is not an eligible property acquisition or lease deposit.' },
      });
    }

    const prop = await db.properties.findById(propertyId || tx.propertyId);
    const agentId = prop?.agentId || tx.agentId;

    if (agentId === userId) {
      return res.json({ success: true, data: { eligible: false, reason: 'Self-rating is prohibited.' } });
    }

    const existingRating = await db.ratings.findByTransactionId(transactionId);

    res.json({
      success: true,
      data: {
        eligible: true,
        agentId,
        existingRating: existingRating ? existingRating.rating : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Submit or Update Star Rating (1-5)
 * POST /api/ratings
 */
async function submitRating(req, res, next) {
  try {
    const { transactionId, propertyId, rating } = req.body;
    const userId = req.user.id;

    if (req.user.role !== ROLES.USER) {
      return res.status(403).json({ success: false, error: { message: 'Only users can submit agent ratings.' } });
    }

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, error: { message: 'Rating must be an integer between 1 and 5.' } });
    }

    const tx = await db.payments.findById(transactionId);
    if (!tx || tx.userId !== userId || tx.status !== 'completed') {
      return res.status(400).json({ success: false, error: { message: 'Ineligible transaction.' } });
    }

    const prop = await db.properties.findById(propertyId || tx.propertyId);
    const targetAgentId = req.body.agentId || prop?.agentId || tx.agentId;

    if (!targetAgentId) {
      return res.status(400).json({ success: false, error: { message: 'Representing agent could not be determined.' } });
    }

    const agentUser = await db.users.findById(targetAgentId);
    const resolvedAgentCustomId = agentUser?.customId || targetAgentId;

    const savedRating = await db.ratings.createOrUpdate(transactionId, {
      transactionId,
      propertyId: prop?.id || tx.propertyId,
      userId,
      agentId: resolvedAgentCustomId,
      rating: numRating,
      status: 'active',
    });

    // Recompute agent aggregate strictly for this target agent
    const allAgentRatings = await db.ratings.find({ agentId: resolvedAgentCustomId, status: 'active' });
    const count = allAgentRatings.length;
    const sum = allAgentRatings.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;

    await db.users.updateById(resolvedAgentCustomId, {
      rating: avg,
      reviewCount: count,
    });

    // Notify the target agent exclusively (prevent duplicate notifications on rating updates)
    const existingNotif = await db.notifications.findOne({
      userId: resolvedAgentCustomId,
      type: 'rating',
      referenceId: transactionId,
    });

    if (!existingNotif) {
      await db.notifications.create({
        userId: resolvedAgentCustomId,
        title: 'New Client Rating Received',
        message: `A client recorded a ${numRating}-star rating for ${prop?.title || 'your completed transaction'}.`,
        type: 'rating',
        referenceId: transactionId,
        link: '/agent/profile',
      });
    } else {
      await db.notifications.updateById(existingNotif.id || existingNotif.customId || existingNotif._id, {
        message: `A client updated their rating to ${numRating} stars for ${prop?.title || 'your completed transaction'}.`,
        isRead: false,
        read: false,
      });
    }

    res.status(201).json({ success: true, data: savedRating });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Agent Rating Aggregate
 * GET /api/agents/:id/ratings/aggregate
 */
async function getAgentAggregate(req, res, next) {
  try {
    const { id: agentId } = req.params;
    const user = await db.users.findById(agentId);
    const validIds = [agentId];
    if (user?.customId) validIds.push(user.customId);
    if (user?._id) validIds.push(String(user._id));

    const ratings = await db.ratings.find({ agentId: { $in: validIds }, status: 'active' });

    const count = ratings.length;
    if (count === 0) {
      return res.json({
        success: true,
        data: {
          averageRating: null,
          totalRatings: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          recentRatings: [],
        },
      });
    }

    const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
    const average = Math.round((sum / count) * 10) / 10;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      if (distribution[r.rating] !== undefined) distribution[r.rating]++;
    });

    const properties = await db.properties.find({});
    const propMap = new Map();
    properties.forEach((p) => {
      if (p.id) propMap.set(p.id, p.title);
      if (p.customId) propMap.set(p.customId, p.title);
    });

    const recentRatings = ratings
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 10)
      .map((r) => ({
        id: r.id || r.customId || String(r._id),
        rating: r.rating,
        propertyTitle: propMap.get(r.propertyId) || 'Architectural Residence',
        createdAt: r.createdAt,
      }));

    res.json({
      success: true,
      data: {
        averageRating: average,
        totalRatings: count,
        distribution,
        recentRatings,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getMyRatings(req, res, next) {
  req.params.id = req.user.id;
  return getAgentAggregate(req, res, next);
}

/**
 * Get Rating for Transaction
 * GET /api/ratings/transaction/:txId
 */
async function getTransactionRating(req, res, next) {
  try {
    const { txId } = req.params;
    const rating = await db.ratings.findByTransactionId(txId);
    res.json({ success: true, data: rating });
  } catch (err) {
    next(err);
  }
}

/**
 * Get User Rating Status for Property
 * GET /api/ratings/user-status
 */
async function getUserPropertyStatus(req, res, next) {
  try {
    const { propertyId } = req.query;
    const userId = req.user.id;

    const payments = await db.payments.find({ propertyId, userId, status: 'completed' });
    const eligibleTx = payments.find((p) => p.type === 'token_amount' || p.type === 'rent_deposit');

    if (!eligibleTx) {
      return res.json({ success: true, data: { canRate: false } });
    }

    const rating = await db.ratings.findByTransactionId(eligibleTx.id);
    res.json({
      success: true,
      data: {
        canRate: true,
        transactionId: eligibleTx.id,
        existingRating: rating ? rating.rating : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkEligibility,
  submitRating,
  getAgentAggregate,
  getMyRatings,
  getTransactionRating,
  getUserPropertyStatus,
};


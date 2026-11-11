/**
 * Role Authorization & Access Control Middleware for Porch Light Server
 *
 * Server Authority:
 * - The server dictates role permissions based on cryptographically verified JWT claims / database records.
 * - Client-supplied role headers or body overrides are ignored.
 *
 * Future Domain Record Ownership Rules:
 * - User Records: Users can only access/mutate their own private bookings, inquiries, receipts, and saved items.
 * - Agent Listings: Agents can only mutate and manage listings where `listing.agentId === req.user.id`.
 * - Admin Overrides: Administrators have platform-wide moderation rights over all listings, users, and disputes.
 */

const db = require('../db/dataStore');
const { ROLES } = require('../constants/roles');

/**
 * Enforce role membership
 * @param {string|string[]} allowedRoles - Role or array of roles permitted to access the endpoint
 */
function requireRole(allowedRoles) {
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
    }

    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have administrative or role clearance to access this resource.',
        },
      });
    }

    next();
  };
}

/**
 * Enforce that an agent is approved/verified before performing publishing actions
 */
async function requireVerifiedAgent(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
    });
  }

  if (req.user.role === ROLES.ADMIN) {
    return next();
  }

  if (req.user.role !== ROLES.AGENT) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Agent clearance required.' },
    });
  }

  let isVerified = req.user.isVerified;
  if (isVerified === undefined) {
    try {
      const userRecord = await db.users.findById(req.user.id);
      isVerified = userRecord ? userRecord.isVerified : false;
      if (userRecord) req.user.isVerified = userRecord.isVerified;
    } catch {
      isVerified = false;
    }
  }

  if (isVerified === false) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'AGENT_PENDING_VERIFICATION',
        message: 'Your agent account is currently pending administrative verification. Listing publication is restricted.',
      },
    });
  }

  next();
}

module.exports = {
  requireRole,
  requireVerifiedAgent,
};


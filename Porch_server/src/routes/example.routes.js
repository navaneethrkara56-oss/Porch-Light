/**
 * Protected Example Routes for Role Authorization Demonstration
 *
 * Demonstrates:
 * - requireAuth (any signed-in account)
 * - requireRole(ROLES.AGENT) with requireVerifiedAgent
 * - requireRole(ROLES.ADMIN)
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireRole, requireVerifiedAgent } = require('../middleware/authorize');
const { ROLES } = require('../constants/roles');

const router = express.Router();

/**
 * GET /api/examples/user-area
 * Accessible to any authenticated role (User, Agent, Admin)
 */
router.get('/user-area', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Authenticated workspace accessible to signed-in accounts.',
    caller: {
      id: req.user.id,
      role: req.user.role,
      email: req.user.email,
    },
    ownershipNote: 'Future domain routes will scope private user records (saved properties, bookings, payment receipts) strictly to matching user id.',
  });
});

/**
 * GET /api/examples/agent-area
 * Accessible ONLY to verified Agents
 */
router.get(
  '/agent-area',
  requireAuth,
  requireRole(ROLES.AGENT),
  requireVerifiedAgent,
  (req, res) => {
    res.json({
      success: true,
      message: 'Verified agent workspace accessible.',
      caller: {
        id: req.user.id,
        role: req.user.role,
      },
      ownershipNote: 'Future listing mutation routes will restrict property edits strictly to listings where listing.agentId === req.user.id.',
    });
  }
);

/**
 * GET /api/examples/admin-area
 * Accessible ONLY to Platform Administrators
 */
router.get(
  '/admin-area',
  requireAuth,
  requireRole(ROLES.ADMIN),
  (req, res) => {
    res.json({
      success: true,
      message: 'Administrative moderation workspace accessible.',
      caller: {
        id: req.user.id,
        role: req.user.role,
      },
      authorityNote: 'Administrators have platform-wide moderation authority across all listing approvals, agent verifications, complaints, and announcements.',
    });
  }
);

module.exports = router;


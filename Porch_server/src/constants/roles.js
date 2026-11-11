/**
 * Canonical System Roles & Verification Statuses for Porch Light
 *
 * Strict Server Authority:
 * - Roles are authoritative on the server and cannot be altered by client request or editable profile payloads.
 * - Public registration permits ONLY 'user' and 'agent'. Admin accounts are NEVER created via public signup.
 * - Google OAuth is strictly restricted to User accounts.
 */

const ROLES = Object.freeze({
  USER: 'user',
  AGENT: 'agent',
  ADMIN: 'admin',
});

const AGENT_STATUS = Object.freeze({
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
});

const PERMITTED_PUBLIC_REGISTRATION_ROLES = Object.freeze([
  ROLES.USER,
  ROLES.AGENT,
]);

module.exports = {
  ROLES,
  AGENT_STATUS,
  PERMITTED_PUBLIC_REGISTRATION_ROLES,
};


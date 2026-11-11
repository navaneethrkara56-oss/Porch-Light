/**
 * Authentication Service for Porch Light Server
 * Handles registration, credential verification, and token issuance with strict role authorization.
 */

const User = require('../models/User');
const { ROLES, AGENT_STATUS, PERMITTED_PUBLIC_REGISTRATION_ROLES } = require('../constants/roles');
const { signToken } = require('../utils/tokens');

/**
 * Register a new User or Agent
 *
 * Rules:
 * - Public registration permits ONLY 'user' and 'agent'. Admin registration is rejected.
 * - Password must be at least 6 characters.
 * - Agent accounts must provide an agency name and default to isVerified = false.
 */
async function registerUser({ name, email, password, role = ROLES.USER, city, phone, agency, reraNumber }) {
  // Validate input
  if (!name || !name.trim()) {
    const error = new Error('Full name is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!email || !email.trim()) {
    const error = new Error('Email address is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!password || password.length < 6) {
    const error = new Error('Password must be at least 6 characters long.');
    error.statusCode = 400;
    throw error;
  }

  // Enforce role boundary
  const normalizedRole = (role || ROLES.USER).toLowerCase().trim();
  if (!PERMITTED_PUBLIC_REGISTRATION_ROLES.includes(normalizedRole)) {
    const error = new Error('Invalid account role specified. Public registration permits User or Agent accounts only.');
    error.statusCode = 400;
    throw error;
  }

  // Agent requirement check
  if (normalizedRole === ROLES.AGENT && (!agency || !agency.trim())) {
    const error = new Error('Agency / Brokerage name is required for Agent registration.');
    error.statusCode = 400;
    throw error;
  }

  // Check email uniqueness
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    const error = new Error('An account with this email address already exists. Please sign in instead.');
    error.statusCode = 409;
    throw error;
  }

  // Build user data
  const userData = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: password, // Will be hashed by User pre-save hook
    role: normalizedRole,
    city: city ? city.trim() : 'Bengaluru',
    phone: phone ? phone.trim() : '',
  };

  if (normalizedRole === ROLES.AGENT) {
    userData.agency = agency.trim();
    userData.reraNumber = reraNumber ? reraNumber.trim() : '';
    userData.isVerified = false; // Pending moderation
    userData.verificationStatus = AGENT_STATUS.PENDING;
  } else {
    userData.isVerified = true;
    userData.verificationStatus = AGENT_STATUS.VERIFIED;
  }

  const user = await User.create(userData);

  // Issue token
  const token = signToken({
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  return {
    user: user.toJSON(),
    token,
  };
}

/**
 * Authenticate existing user by email and password
 */
async function loginUser({ email, password }) {
  if (!email || !password) {
    const error = new Error('Email and password are required.');
    error.statusCode = 400;
    throw error;
  }

  // Find user and explicitly select passwordHash
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  if (user.isActive === false) {
    const error = new Error('This account has been deactivated. Please contact concierge support.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const token = signToken({
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  return {
    user: user.toJSON(),
    token,
  };
}

/**
 * Get current authenticated user profile from database
 */
async function getProfileById(userId) {
  const user = await User.findById(userId);
  if (!user || user.isActive === false) {
    const error = new Error('User account not found or has been deactivated.');
    error.statusCode = 404;
    throw error;
  }
  return user.toJSON();
}

/**
 * Google OAuth Verification Extension Point (Placeholder)
 *
 * ARCHITECTURAL RULE:
 * - Google OAuth is strictly restricted to User accounts only.
 * - It can never create or authenticate an Agent or Admin account.
 * - In production, token verification uses Google Auth Library on the server:
 *   const ticket = await client.verifyIdToken({ idToken, audience: config.google.clientId });
 */
async function verifyGoogleTokenPlaceholder(idToken) {
  // Document extension point for future server-side verification
  throw new Error('Google OAuth server verification extension point ready for production configuration.');
}

module.exports = {
  registerUser,
  loginUser,
  getProfileById,
  verifyGoogleTokenPlaceholder,
};


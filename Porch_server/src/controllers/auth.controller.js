/**
 * Authentication & Account Management Controller for Porch Light Server
 */

const bcrypt = require('bcryptjs');
const db = require('../db/dataStore');
const { ROLES, AGENT_STATUS, PERMITTED_PUBLIC_REGISTRATION_ROLES } = require('../constants/roles');
const { signToken, AUTH_COOKIE_NAME, getAuthCookieOptions, getClearCookieOptions } = require('../utils/tokens');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Register User or Agent
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role = ROLES.USER, city, phone, agency, reraNumber, licenseDocument } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Full name is required.' } });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Email address is required.' } });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: { message: 'Password must be at least 6 characters long.' } });
    }

    const normRole = (role || ROLES.USER).toLowerCase().trim();
    if (!PERMITTED_PUBLIC_REGISTRATION_ROLES.includes(normRole)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Public registration allows User or Agent accounts only. Admin signup is prohibited.' },
      });
    }

    if (normRole === ROLES.AGENT && (!agency || !agency.trim())) {
      return res.status(400).json({ success: false, error: { message: 'Agency / Brokerage name is required for agents.' } });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.users.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ success: false, error: { message: 'An account with this email address already exists.' } });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const isAgent = normRole === ROLES.AGENT;
    const userData = {
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: normRole,
      city: city ? city.trim() : 'Bengaluru',
      phone: phone ? phone.trim() : '',
      avatar: null,
      agency: isAgent ? agency.trim() : '',
      reraNumber: isAgent && reraNumber ? reraNumber.trim() : '',
      licenseDocument: isAgent && licenseDocument ? licenseDocument : '',
      isVerified: !isAgent, // Agents default to pending moderation
      verificationStatus: isAgent ? AGENT_STATUS.PENDING : AGENT_STATUS.VERIFIED,
      rating: 0,
      reviewCount: 0,
      savedProperties: [],
      compareSets: { sale: [], rent: [] },
    };

    const user = await db.users.create(userData);

    const token = signToken({
      id: user.customId || user._id.toString(),
      role: user.role,
      email: user.email,
    });

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    const safeUser = user.toJSON ? user.toJSON() : (user.toObject ? user.toObject() : { ...user });
    delete safeUser.passwordHash;
    delete safeUser.password;

    res.status(201).json({
      success: true,
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Sign In
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { message: 'Email and password are required.' } });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.users.findOne({ email: cleanEmail, includePassword: true });
    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password.' } });
    }

    if (user.isActive === false || user.isDeactivated === true) {
      return res.status(403).json({
        success: false,
        error: { message: 'This account has been deactivated. Please contact concierge support.' },
      });
    }

    const storedHash = user.passwordHash || user.password;
    let isMatch = false;
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, storedHash);
    } else {
      isMatch = password === storedHash;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password.' } });
    }

    const userId = user.customId || user._id.toString();
    const token = signToken({
      id: userId,
      role: user.role,
      email: user.email,
    });

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    const safeUser = user.toJSON ? user.toJSON() : (user.toObject ? user.toObject() : { ...user });
    delete safeUser.passwordHash;
    delete safeUser.password;
    delete safeUser.password;

    res.json({
      success: true,
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Public Google OAuth Configuration
 * GET /api/auth/google/config
 */
function getGoogleConfig(req, res) {
  res.json({
    success: true,
    data: {
      clientId: config.google.clientId || '',
    },
  });
}

/**
 * Google Sign In (User accounts strictly)
 * POST /api/auth/google
 */
async function googleLogin(req, res, next) {
  try {
    const { credential, accessToken } = req.body;

    if (!credential && !accessToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'Google authentication credential or access token is required.' },
      });
    }

    let googleProfile = null;

    // 1. Verify via ID Token if credential provided
    if (credential) {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (verifyRes.ok) {
          const tokenInfo = await verifyRes.json();
          if (config.google.clientId && tokenInfo.aud !== config.google.clientId) {
            return res.status(401).json({
              success: false,
              error: { message: 'Google token client ID mismatch.' },
            });
          }
          googleProfile = {
            email: tokenInfo.email?.toLowerCase().trim(),
            name: tokenInfo.name || tokenInfo.email?.split('@')[0] || 'Google User',
            avatar: tokenInfo.picture || null,
            sub: tokenInfo.sub,
          };
        }
      } catch (err) {
        logger.warn('Google ID token verification failed:', err.message);
      }
    }

    // 2. Verify via Access Token if accessToken provided and profile not yet obtained
    if (!googleProfile && accessToken) {
      try {
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (userinfoRes.ok) {
          const info = await userinfoRes.json();
          googleProfile = {
            email: info.email?.toLowerCase().trim(),
            name: info.name || info.email?.split('@')[0] || 'Google User',
            avatar: info.picture || null,
            sub: info.sub,
          };
        }
      } catch (err) {
        logger.warn('Google userinfo fetch failed:', err.message);
      }
    }

    if (!googleProfile || !googleProfile.email) {
      return res.status(401).json({
        success: false,
        error: { message: 'Could not verify Google account with Google Identity Services.' },
      });
    }

    // Enforce strict User-only rule: Check if an account already exists with this email
    let targetUser = await db.users.findOne({ email: googleProfile.email });

    if (targetUser) {
      // Never allow a Google credential to authenticate or access an Agent or Admin account
      if (targetUser.role !== ROLES.USER) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Google sign-in is available strictly for User accounts. Agent and Admin accounts must sign in using their registered password.',
          },
        });
      }

      // Check deactivation
      if (targetUser.isActive === false || targetUser.isDeactivated === true) {
        return res.status(403).json({
          success: false,
          error: { message: 'This account has been deactivated. Please contact concierge support.' },
        });
      }

      // Update avatar if not present
      if (!targetUser.avatar && googleProfile.avatar) {
        await db.users.updateById(targetUser.id || targetUser.customId || targetUser._id, {
          avatar: googleProfile.avatar,
        });
      }
    } else {
      // Provision brand new verified User account
      targetUser = await db.users.create({
        name: googleProfile.name,
        email: googleProfile.email,
        role: ROLES.USER,
        avatar: googleProfile.avatar,
        city: 'Bengaluru',
        isVerified: true,
        verificationStatus: 'verified',
        rating: 0,
        reviewCount: 0,
        savedProperties: [],
        compareSets: { sale: [], rent: [] },
      });
    }

    const userId = targetUser.customId || targetUser._id.toString();
    const token = signToken({
      id: userId,
      role: ROLES.USER,
      email: targetUser.email,
    });

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    const safeUser = targetUser.toJSON ? targetUser.toJSON() : (targetUser.toObject ? targetUser.toObject() : { ...targetUser });
    delete safeUser.passwordHash;
    delete safeUser.password;

    res.json({
      success: true,
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Sign Out
 * POST /api/auth/logout
 */
function logout(req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
  res.json({ success: true, message: 'Signed out successfully.' });
}

/**
 * Get Current Authenticated Profile
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: { message: 'Not authenticated.' } });
    }

    const user = await db.users.findById(req.user.id);
    if (!user || user.isDeactivated) {
      return res.status(404).json({ success: false, error: { message: 'Account not found.' } });
    }

    const safeUser = user.toJSON ? user.toJSON() : { ...user };
    delete safeUser.passwordHash;
    delete safeUser.password;

    res.json({
      success: true,
      data: {
        user: safeUser,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Profile
 * PATCH /api/auth/profile
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, phone, city, avatar, agency, reraNumber, whatsappNumber, contactPreferences } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (city !== undefined) updates.city = city.trim();
    if (avatar !== undefined) updates.avatar = avatar;

    if (req.user.role === ROLES.AGENT) {
      if (agency) updates.agency = agency.trim();
      if (reraNumber !== undefined) updates.reraNumber = reraNumber.trim();
      if (whatsappNumber !== undefined) updates.whatsappNumber = whatsappNumber.trim();
      if (contactPreferences) updates.contactPreferences = contactPreferences;
    }

    // Role cannot be modified through profile update
    delete updates.role;
    delete updates.isVerified;

    const updated = await db.users.updateById(userId, updates);

    const safeUser = updated.toJSON ? updated.toJSON() : { ...updated };
    delete safeUser.passwordHash;
    delete safeUser.password;

    res.json({ success: true, data: { user: safeUser } });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Password
 * PATCH /api/auth/password
 */
async function updatePassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: { message: 'New password must be at least 6 characters.' } });
    }

    const user = await db.users.findOne({ id: userId, includePassword: true });
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'Account not found.' } });
    }

    const storedHash = user.passwordHash || user.password;
    if (storedHash) {
      const isMatch = storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')
        ? await bcrypt.compare(currentPassword, storedHash)
        : currentPassword === storedHash;

      if (!isMatch) {
        return res.status(400).json({ success: false, error: { message: 'Current password does not match.' } });
      }
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.users.updateById(userId, { passwordHash: newHash });

    // Security notification
    await db.notifications.create({
      userId,
      title: 'Security Alert: Password Changed',
      message: 'Your account password was updated successfully. If you did not authorize this, contact concierge immediately.',
      type: 'security',
      link: req.user.role === ROLES.ADMIN ? '/admin/settings' : req.user.role === ROLES.AGENT ? '/agent/profile' : '/dashboard/profile',
    });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Account Deletion Check (Obligations)
 * GET /api/auth/account-deletion-check
 */
async function checkAccountDeletion(req, res, next) {
  try {
    const userId = req.user.id;
    const reasons = [];

    // Check active leases
    const properties = await db.properties.find({ isLeased: true });
    const activeLease = properties.find((p) => p.tenantId === userId);
    if (activeLease) {
      reasons.push(`You have an active residential lease for "${activeLease.title}". Leases must be completed or ended before closure.`);
    }

    // Check pending payments
    const pendingPayments = await db.payments.find({ userId, status: 'pending' });
    if (pendingPayments.length > 0) {
      reasons.push(`You have ${pendingPayments.length} pending transaction(s). Unsettled payments must be resolved first.`);
    }

    // Check unresolved bookings
    const bookings = await db.bookings.find({ userId });
    const activeBookings = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed');
    if (activeBookings.length > 0) {
      reasons.push(`You have ${activeBookings.length} unresolved active walkthrough appointment(s). Please cancel or complete them first.`);
    }

    res.json({
      success: true,
      data: {
        allowed: reasons.length === 0,
        reasons,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete / Deactivate Account
 * DELETE /api/auth/account
 */
async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;

    // Check obligations
    const properties = await db.properties.find({ isLeased: true });
    if (properties.some((p) => p.tenantId === userId)) {
      return res.status(400).json({ success: false, error: { message: 'Cannot deactivate account with active leases.' } });
    }

    await db.users.updateById(userId, {
      name: 'Former Member (Deactivated)',
      email: `deactivated_${userId}@porchlight.internal`,
      phone: '',
      avatar: null,
      isDeactivated: true,
      isActive: false,
      deactivatedAt: new Date(),
    });

    res.clearCookie(AUTH_COOKIE_NAME, getClearCookieOptions());
    res.json({ success: true, message: 'Account deactivated successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Agent Deletion Obligations Check
 * GET /api/auth/agent-deletion-obligations
 */
async function getAgentDeletionObligations(req, res, next) {
  try {
    const agentId = req.user.id;

    const properties = await db.properties.find({ agentId });
    const activeListings = properties.filter((p) => p.status === 'approved' && !p.isSold && !p.isLeased);
    const activeLeases = properties.filter((p) => p.isLeased);

    const bookings = await db.bookings.find({ agentId });
    const activeBookings = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed');

    const promotions = await db.promotions.find({ agentId, status: 'pending_review' });

    const reasons = [];
    if (activeListings.length > 0) reasons.push(`You have ${activeListings.length} active listing(s). Please archive or withdraw them.`);
    if (activeLeases.length > 0) reasons.push(`You manage ${activeLeases.length} property(ies) under active lease.`);
    if (activeBookings.length > 0) reasons.push(`You have ${activeBookings.length} pending or confirmed walkthrough appointment(s).`);
    if (promotions.length > 0) reasons.push(`You have ${promotions.length} pending promotion request(s).`);

    res.json({
      success: true,
      data: {
        allowed: reasons.length === 0,
        reasons,
        counts: {
          activeListings: activeListings.length,
          activeLeases: activeLeases.length,
          activeBookings: activeBookings.length,
          pendingPromotions: promotions.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Request Agent Account Deletion
 * POST /api/auth/agent-deletion-request
 */
async function requestAgentDeletion(req, res, next) {
  try {
    const agentId = req.user.id;
    const { reason = '' } = req.body;

    const deletionRequest = {
      requestedAt: new Date(),
      reason: reason.trim(),
      status: 'pending',
    };

    await db.users.updateById(agentId, { deletionRequest });

    // Notify administrators
    const admins = await db.users.find({ role: ROLES.ADMIN });
    for (const adm of admins) {
      await db.notifications.create({
        userId: adm.id || adm.customId,
        title: 'Agent Account Deletion Request',
        message: `Agent requested account deletion: "${reason.slice(0, 100)}"`,
        type: 'moderation',
        link: '/admin/users',
      });
    }

    res.json({ success: true, message: 'Deletion request submitted for administrative review.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Agent Deletion Requests (Admin only)
 * GET /api/auth/agent-deletion-requests
 */
async function getAgentDeletionRequests(req, res, next) {
  try {
    const agents = await db.users.find({ role: ROLES.AGENT });
    const requests = agents
      .filter((a) => a.deletionRequest && a.deletionRequest.status === 'pending')
      .map((a) => ({
        id: `del_req_${a.id || a.customId}`,
        agentId: a.id || a.customId,
        agentName: a.name,
        agentEmail: a.email,
        agency: a.agency,
        requestedAt: a.deletionRequest.requestedAt,
        reason: a.deletionRequest.reason,
        status: a.deletionRequest.status,
      }));

    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
}

/**
 * Approve Agent Account Deletion (Admin only)
 * POST /api/auth/agent-deletion-requests/:id/approve
 */
async function approveAgentDeletion(req, res, next) {
  try {
    const { id } = req.params;
    const { adminNotes = '' } = req.body;

    // Look up agent by agentId or requestId
    const agentId = id.replace('del_req_', '');
    const agent = await db.users.findById(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, error: { message: 'Agent account not found.' } });
    }

    // Archive all agent listings
    const properties = await db.properties.find({ agentId });
    for (const p of properties) {
      await db.properties.updateById(p.id || p.customId, { status: 'archived', featured: false });
    }

    // Deactivate agent
    await db.users.updateById(agentId, {
      name: 'Former Partner Agent (Deactivated)',
      email: `deactivated_agent_${agentId}@porchlight.internal`,
      phone: '',
      isDeactivated: true,
      isActive: false,
      deactivatedAt: new Date(),
      deletionRequest: {
        status: 'approved',
        adminNotes,
        reviewedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Agent account deactivated and portfolio safely archived.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Reject Agent Account Deletion (Admin only)
 * POST /api/auth/agent-deletion-requests/:id/reject
 */
async function rejectAgentDeletion(req, res, next) {
  try {
    const { id } = req.params;
    const { adminNotes = '' } = req.body;

    const agentId = id.replace('del_req_', '');
    const agent = await db.users.findById(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, error: { message: 'Agent account not found.' } });
    }

    await db.users.updateById(agentId, {
      deletionRequest: {
        status: 'rejected',
        adminNotes,
        reviewedAt: new Date(),
      },
    });

    await db.notifications.create({
      userId: agentId,
      title: 'Account Closure Request Declined',
      message: `Your account closure request was reviewed by administration: ${adminNotes || 'Active obligations or portfolio records pending.'}`,
      type: 'moderation',
      link: '/agent/profile',
    });

    res.json({ success: true, message: 'Deletion request declined and agent notified.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle Saved Property
 * POST /api/auth/saved/:id
 */
async function toggleSaveProperty(req, res, next) {
  try {
    const userId = req.user.id;
    const propertyId = req.params.id;

    if (req.user.role !== ROLES.USER) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only client user accounts can save properties to collections.' },
      });
    }

    const user = await db.users.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found.' } });
    }

    // Resolve property to ensure it exists and get canonical ID
    const prop = await db.properties.findById(propertyId);
    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found.' } });
    }
    const canonicalId = prop.customId || prop.id || propertyId;

    let saved = Array.isArray(user.savedProperties) ? [...user.savedProperties] : [];
    let isSaved = false;

    // Check if canonicalId or propertyId is currently in saved
    if (saved.includes(canonicalId) || saved.includes(propertyId)) {
      saved = saved.filter((id) => id !== canonicalId && id !== propertyId);
      isSaved = false;
    } else {
      saved = Array.from(new Set([...saved, canonicalId]));
      isSaved = true;
    }

    await db.users.updateById(userId, { savedProperties: saved });

    res.json({
      success: true,
      saved: isSaved,
      isSaved,
      data: {
        isSaved,
        saved: isSaved,
        savedPropertyIds: saved,
      },
      savedPropertyIds: saved,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Saved Properties
 * GET /api/auth/saved
 */
async function getSavedProperties(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await db.users.findById(userId);
    const savedIds = Array.isArray(user?.savedProperties) ? user.savedProperties : [];

    const allProps = await db.properties.find({});
    const matchedProps = allProps.filter((p) => savedIds.includes(p.id) || savedIds.includes(p.customId));

    const properties = matchedProps.map((p) => {
      const clean = p.toJSON ? p.toJSON() : (p.toObject ? p.toObject() : { ...p });
      delete clean.negotiable;
      if (!clean.coverImage) {
        clean.coverImage = (clean.images && clean.images[clean.coverImageIndex || 0]) || (clean.images && clean.images[0]) || '';
      }
      return clean;
    });

    res.json({
      success: true,
      data: properties,
      properties,
      savedPropertyIds: savedIds,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getGoogleConfig,
  register,
  login,
  googleLogin,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  checkAccountDeletion,
  deleteAccount,
  getAgentDeletionObligations,
  requestAgentDeletion,
  getAgentDeletionRequests,
  approveAgentDeletion,
  rejectAgentDeletion,
  toggleSaveProperty,
  getSavedProperties,
};

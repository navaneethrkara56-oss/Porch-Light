/**
 * Dashboard Controller for Porch Light Server
 * Aggregated statistics and role-scoped cross-dashboard search.
 */

const db = require('../db/dataStore');
const { ROLES } = require('../constants/roles');

/**
 * Unified Dashboard Search (Role Scoped)
 * GET /api/dashboard/search
 */
async function searchDashboard(req, res, next) {
  try {
    const { q = '' } = req.query;
    const cleanQ = q.trim().toLowerCase();
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!cleanQ) {
      return res.json({
        success: true,
        data: { actions: [], pages: [], properties: [], visits: [], transactions: [], messages: [] },
      });
    }

    // Role-specific static pages
    const allPages = {
      user: [
        { title: 'Overview', path: '/dashboard/overview', description: 'Personal sanctuary welcome and shortcuts' },
        { title: 'My Properties', path: '/dashboard/properties', description: 'Acquisitions and active rental leases' },
        { title: 'Saved Homes', path: '/dashboard/saved', description: 'Saved wishlist residences' },
        { title: 'Compare', path: '/dashboard/compare', description: 'Technical specification sheets' },
        { title: 'Visits & Bookings', path: '/dashboard/visits', description: 'Scheduled and past property walkthroughs' },
        { title: 'Messages', path: '/dashboard/chat', description: 'Conversations with verified agents' },
        { title: 'Payments & Activity', path: '/dashboard/payments', description: 'Token deposits and receipts' },
        { title: 'Notifications', path: '/dashboard/notifications', description: 'Inbox and alerts' },
        { title: 'Help & Support', path: '/dashboard/complaints', description: 'Concierge tickets' },
        { title: 'Profile & Settings', path: '/dashboard/profile', description: 'Personal details' },
      ],
      agent: [
        { title: 'Overview', path: '/agent/overview', description: 'Portfolio health and pending tasks' },
        { title: 'Sales Analytics', path: '/agent/analytics', description: 'Views, inquiries, and conversion' },
        { title: 'My Listings', path: '/agent/listings', description: 'Manage listings' },
        { title: 'Add Property', path: '/agent/new-listing', description: 'Submit new listing' },
        { title: 'Visit Requests', path: '/agent/visits', description: 'Inbound client bookings' },
        { title: 'Messages & Inquiries', path: '/agent/inquiries', description: 'Client inquiries' },
        { title: 'Transactions', path: '/agent/transactions', description: 'Financial ledger' },
        { title: 'Premium Promotions', path: '/agent/promotions', description: 'Showcase requests' },
        { title: 'Notifications', path: '/agent/notifications', description: 'Alerts' },
        { title: 'Profile & Verification', path: '/agent/profile', description: 'Credentials & RERA' },
        { title: 'Help & Support', path: '/agent/support', description: 'Support tickets' },
      ],
      admin: [
        { title: 'Platform Overview', path: '/admin/overview', description: 'System metrics' },
        { title: 'Users & Agents', path: '/admin/users', description: 'Manage accounts and verify agents' },
        { title: 'Property Review', path: '/admin/approvals', description: 'Listing moderation queue' },
        { title: 'Featured Homes', path: '/admin/featured', description: 'Curate Home showcase' },
        { title: 'Premium Promotions', path: '/admin/promotions', description: 'Review promotion requests' },
        { title: 'Transactions & Revenue', path: '/admin/transactions', description: 'Platform ledger' },
        { title: 'Support Requests', path: '/admin/complaints', description: 'Resolve tickets' },
        { title: 'Reports & System Issues', path: '/admin/reports', description: 'Diagnostic error logs' },
        { title: 'Notifications & Broadcasts', path: '/admin/announcements', description: 'Dispatch alerts' },
        { title: 'Profile & Settings', path: '/admin/settings', description: 'Platform parameters' },
      ],
    };

    const pages = (allPages[userRole] || allPages.user).filter(
      (p) => p.title.toLowerCase().includes(cleanQ) || p.description.toLowerCase().includes(cleanQ)
    );

    // Properties search
    const propFilter = userRole === ROLES.AGENT ? { agentId: userId } : {};
    const allProps = await db.properties.find(propFilter);
    const properties = allProps
      .filter((p) => p.title?.toLowerCase().includes(cleanQ) || p.locality?.toLowerCase().includes(cleanQ) || p.city?.toLowerCase().includes(cleanQ))
      .slice(0, 8)
      .map((p) => ({
        id: p.id || p.customId,
        title: p.title,
        locality: p.locality,
        city: p.city,
        price: p.price,
        listingType: p.listingType,
        status: p.status,
      }));

    // Bookings search
    const bookingFilter = userRole === ROLES.USER ? { userId } : userRole === ROLES.AGENT ? { agentId: userId } : {};
    const allBookings = await db.bookings.find(bookingFilter);
    const visits = allBookings
      .filter((b) => b.userName?.toLowerCase().includes(cleanQ) || b.date?.includes(cleanQ) || b.timeSlot?.toLowerCase().includes(cleanQ))
      .slice(0, 6)
      .map((b) => ({
        id: b.id || b.customId,
        userName: b.userName,
        date: b.date,
        timeSlot: b.timeSlot,
        status: b.status,
      }));

    // Payments search - only include authoritative completed payments
    const payFilter = {
      ...(userRole === ROLES.USER ? { userId } : userRole === ROLES.AGENT ? { agentId: userId } : {}),
      status: 'completed',
    };
    const allPayments = await db.payments.find(payFilter);
    const transactions = allPayments
      .filter((py) => py.id?.toLowerCase().includes(cleanQ) || py.propertyTitle?.toLowerCase().includes(cleanQ) || py.receiptNumber?.toLowerCase().includes(cleanQ))
      .slice(0, 6)
      .map((py) => ({
        id: py.id,
        receiptNumber: py.receiptNumber,
        propertyTitle: py.propertyTitle,
        amount: py.amount,
        type: py.type,
      }));

    res.json({
      success: true,
      data: {
        actions: [],
        pages,
        properties,
        visits,
        transactions,
        messages: [],
      },
    });
  } catch (err) {
    next(err);
  }
}

function parseBookingDateTime(dateStr, timeSlotStr) {
  if (!dateStr) return null;
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let year, month, day;
  if (dateMatch) {
    year = parseInt(dateMatch[1], 10);
    month = parseInt(dateMatch[2], 10) - 1;
    day = parseInt(dateMatch[3], 10);
  } else {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    } else {
      return null;
    }
  }

  let hour = 0;
  let minute = 0;
  if (timeSlotStr) {
    const match = timeSlotStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (match) {
      hour = parseInt(match[1], 10);
      minute = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3] ? match[3].toUpperCase() : null;
      if (meridiem === 'PM' && hour < 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
    }
  }

  return new Date(year, month, day, hour, minute, 0);
}

/**
 * Get User Dashboard Statistics
 * GET /api/dashboard/user/stats
 */
async function getUserStats(req, res, next) {
  try {
    const rawUserId = req.user.id;
    const user = await db.users.findById(rawUserId);
    const userIds = [rawUserId, user?.customId, user?._id?.toString()].filter(Boolean);

    const savedCount = user?.savedProperties?.length || 0;
    const bookings = await db.bookings.find({ userId: { $in: userIds } });
    const upcomingVisits = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');

    const payments = await db.payments.find({ userId: { $in: userIds }, status: 'completed' });
    const buyPayments = payments.filter((p) => p.type === 'token_amount' || p.type === 'full_purchase');
    const rentPayments = payments.filter((p) => p.type === 'rent_deposit');
    const boughtCount = buyPayments.length;
    const rentedCount = rentPayments.length;
    const propertiesCount = boughtCount + rentedCount;

    const chats = await db.chats.find({ userId: { $in: userIds } });
    const inquiries = await db.inquiries.find({ userId: { $in: userIds } });
    const activeInquiriesCount = chats.length || inquiries.length;

    // Determine next upcoming visit
    const futureVisits = upcomingVisits
      .map((b) => {
        const item = b.toObject ? b.toObject() : (b._doc ? b._doc : b);
        const bookingDate = item.date || b.date;
        const bookingTimeSlot = item.timeSlot || b.timeSlot;
        return {
          ...item,
          id: item.customId || item.id || String(item._id || b._id),
          date: bookingDate,
          timeSlot: bookingTimeSlot,
          propertyId: item.propertyId || b.propertyId,
          status: item.status || b.status,
          parsedDateTime: parseBookingDateTime(bookingDate, bookingTimeSlot),
        };
      })
      .filter((b) => !b.parsedDateTime || b.parsedDateTime >= new Date(Date.now() - 24 * 3600 * 1000))
      .sort((a, b) => {
        if (!a.parsedDateTime) return 1;
        if (!b.parsedDateTime) return -1;
        return a.parsedDateTime - b.parsedDateTime;
      });

    let nextVisit = null;
    if (futureVisits.length > 0) {
      const earliest = futureVisits[0];
      const prop = await db.properties.findById(earliest.propertyId);
      nextVisit = {
        id: earliest.id || earliest.customId || String(earliest._id),
        propertyId: earliest.propertyId,
        propertyTitle: prop?.title || earliest.propertyTitle || 'Residence Walkthrough',
        date: earliest.date || null,
        timeSlot: earliest.timeSlot || null,
        status: earliest.status || 'confirmed',
      };
    }

    // Build recent user activity feed
    const activityItems = [];
    payments.slice(0, 5).forEach((p) => {
      const pItem = p.toObject ? p.toObject() : p;
      activityItems.push({
        id: `act_pay_${pItem.id || pItem.customId || pItem._id}`,
        type: 'payment',
        title: pItem.type === 'token_amount' ? 'Token Advance Deposit' : 'Rental Lease Deposit',
        subtitle: `${pItem.propertyTitle || 'Property'} • ₹${pItem.amount?.toLocaleString('en-IN')}`,
        date: pItem.paidAt || pItem.createdAt || null,
        link: '/dashboard/payments',
      });
    });
    bookings.slice(0, 5).forEach((b) => {
      const bItem = b.toObject ? b.toObject() : b;
      const bDate = bItem.date || b.date;
      const bSlot = bItem.timeSlot || b.timeSlot;
      activityItems.push({
        id: `act_book_${bItem.id || bItem.customId || bItem._id}`,
        type: 'booking',
        title: bItem.status === 'confirmed' ? 'Walkthrough Confirmed' : bItem.status === 'completed' ? 'Walkthrough Completed' : 'Walkthrough Requested',
        subtitle: `${bDate || 'Date unavailable'} (${bSlot || 'Time unavailable'})`,
        date: bItem.createdAt || new Date(),
        link: '/dashboard/visits',
      });
    });
    activityItems.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        savedCount,
        upcomingVisitsCount: upcomingVisits.length,
        activeInquiriesCount,
        propertiesCount,
        boughtCount,
        rentedCount,
        completedTransactionsCount: payments.length,
        nextVisit,
        recentActivity: activityItems.slice(0, 6),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Agent Dashboard Statistics
 * GET /api/dashboard/agent/stats
 */
async function getAgentStats(req, res, next) {
  try {
    const rawAgentId = req.user.id;
    const agentUser = await db.users.findById(rawAgentId);
    const agentIds = [rawAgentId, agentUser?.customId, agentUser?._id?.toString()].filter(Boolean);

    const properties = await db.properties.find({ agentId: { $in: agentIds } });
    const activeListings = properties.filter((p) => p.status === 'approved' && !p.isSold && !p.isLeased);
    const pendingReview = properties.filter((p) => p.status === 'pending');

    const bookings = await db.bookings.find({ agentId: { $in: agentIds } });
    const pendingVisits = bookings.filter((b) => b.status === 'pending');
    const upcomingVisits = bookings.filter((b) => b.status === 'confirmed');

    const inquiries = await db.inquiries.find({ agentId: { $in: agentIds } });
    const chats = await db.chats.find({ agentId: { $in: agentIds } });
    const totalInquiries = inquiries.length || chats.length;

    // Action items queue
    const actionItems = [];
    pendingVisits.forEach((b) => {
      actionItems.push({
        id: `act_visit_${b.id || b.customId}`,
        type: 'visit_request',
        title: `Walkthrough Request: ${b.userName || 'Prospective Buyer'}`,
        subtitle: `${b.date} (${b.timeSlot})`,
        date: b.createdAt || new Date(),
        link: `/agent/visits#visit-${b.id || b.customId}`,
      });
    });
    bookings.filter((b) => b.status === 'confirmed' && b.rescheduleRequest?.status === 'pending').forEach((b) => {
      actionItems.push({
        id: `act_resched_${b.id || b.customId}`,
        type: 'visit_request',
        title: `Reschedule Request: ${b.userName || 'Client'}`,
        subtitle: `Requested: ${b.rescheduleRequest?.proposedDate} (${b.rescheduleRequest?.proposedTimeSlot})`,
        date: b.rescheduleRequest?.requestedAt || b.createdAt || new Date(),
        link: `/agent/visits#visit-${b.id || b.customId}`,
      });
    });
    actionItems.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        activeListingsCount: activeListings.length,
        pendingListingsCount: pendingReview.length,
        pendingReviewCount: pendingReview.length,
        upcomingVisitsCount: upcomingVisits.length,
        pendingVisitsCount: pendingVisits.length,
        unreadInquiriesCount: totalInquiries,
        inquiriesCount: totalInquiries,
        isVerified: Boolean(agentUser?.isVerified),
        rating: agentUser?.rating || 0,
        actionItems: actionItems.slice(0, 6),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Admin Platform Statistics
 * GET /api/dashboard/admin/stats
 */
async function getAdminStats(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    // 1. Registered Accounts strictly counts Users & Agents only (Admins excluded)
    const allUsers = await db.users.find({});
    const clientUsers = allUsers.filter((u) => u.role === ROLES.USER);
    const agents = allUsers.filter((u) => u.role === ROLES.AGENT);
    const pendingAgents = agents.filter((a) => !a.isVerified);

    // 2. Properties: Available Now vs All Properties
    const allProps = await db.properties.find({});
    const availableNow = allProps.filter((p) => p.status === 'approved' && !p.isSold && !p.isLeased);
    const pendingProps = allProps.filter((p) => p.status === 'pending');
    const soldProps = allProps.filter((p) => p.isSold || p.availabilityStatus === 'sold' || p.status === 'sold');
    const leasedProps = allProps.filter((p) => p.isLeased || p.rentalStatus === 'leased' || p.status === 'rented');

    // 3. Featured Showcase Capacity
    const featuredProps = allProps.filter((p) => p.featured);
    const waitlistPromos = await db.promotions.find({ type: 'featured_placement', status: 'waitlist' });
    const pendingPromos = await db.promotions.find({ status: 'pending' });

    // 4. Financial Volume Itemization
    const allPayments = await db.payments.find({ status: 'completed' });
    const fullPurchaseVolume = allPayments
      .filter((p) => p.type === 'full_purchase' || p.type === 'full_payment')
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    const emiVolume = allPayments
      .filter((p) => p.type === 'emi_down_payment' || p.type === 'emi_installment' || p.type === 'emi')
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    const rentVolume = allPayments
      .filter((p) => p.type === 'rent_deposit' || p.type === 'rent_installment')
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    const promoVolume = allPayments
      .filter((p) => p.type === 'promotion_fee')
      .reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalSimulatedVolume = allPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // 5. Open Complaints
    const openComplaints = await db.complaints.find({ status: 'open' });

    // 6. Platform Agent Reputation Average
    const allRatings = await db.ratings.find({ status: 'active' });
    const ratingCount = allRatings.length;
    const avgRating = ratingCount > 0 ? Math.round((allRatings.reduce((acc, r) => acc + r.rating, 0) / ratingCount) * 10) / 10 : null;

    res.json({
      success: true,
      data: {
        accounts: {
          total: clientUsers.length + agents.length,
          users: clientUsers.length,
          agents: agents.length,
          pendingAgentVerifications: pendingAgents.length,
        },
        properties: {
          totalRegistered: allProps.length,
          availableNow: availableNow.length,
          pendingModeration: pendingProps.length,
          sold: soldProps.length,
          leased: leasedProps.length,
        },
        featuredShowcase: {
          occupiedSlots: featuredProps.length,
          capacity: 4,
          waitlistCount: waitlistPromos.length,
        },
        promotions: {
          pendingCount: pendingPromos.length,
        },
        pendingPromotions: pendingPromos.length,
        financialLedger: {
          fullPurchaseVolume,
          emiVolume,
          tokenAdvanceVolume: fullPurchaseVolume + emiVolume,
          rentalDepositVolume: rentVolume,
          promotionFeeVolume: promoVolume,
          totalSimulatedVolume,
          totalTransactions: allPayments.length,
        },
        support: {
          openTicketsCount: openComplaints.length,
        },
        reputation: {
          averageRating: avgRating,
          totalRatings: ratingCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Admin Moderation Actions (Approve, Reject, Archive Property, Verify/Reject Agent)
 */
async function approveProperty(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) return res.status(403).json({ success: false, error: { message: 'Unauthorized' } });
    const { id } = req.params;
    const updated = await db.properties.updateById(id, { status: 'approved' });
    if (updated?.agentId) {
      await db.notifications.create({
        customId: `notif_mod_prop_appr_${id}`,
        userId: updated.agentId,
        title: 'Property Listing Approved',
        message: `Your listing "${updated.title}" has been approved and is now live on Porch Light.`,
        type: 'moderation',
        link: `/property/${id}`,
      });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function rejectProperty(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) return res.status(403).json({ success: false, error: { message: 'Unauthorized' } });
    const { id } = req.params;
    const { reason = '' } = req.body;
    const updated = await db.properties.updateById(id, { status: 'rejected', adminNotes: reason });
    if (updated?.agentId) {
      await db.notifications.create({
        customId: `notif_mod_prop_rej_${id}_${Date.now()}`,
        userId: updated.agentId,
        title: 'Listing Moderation Notice',
        message: `Your listing "${updated.title}" was declined: ${reason}`,
        type: 'moderation',
        link: '/agent/listings',
      });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function archiveProperty(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) return res.status(403).json({ success: false, error: { message: 'Unauthorized' } });
    const { id } = req.params;
    const { reason = '' } = req.body;
    const updated = await db.properties.updateById(id, { status: 'archived', featured: false, adminNotes: reason });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function verifyAgent(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) return res.status(403).json({ success: false, error: { message: 'Unauthorized' } });
    const { id } = req.params;
    const updated = await db.users.updateById(id, { isVerified: true, verificationStatus: 'verified' });
    await db.notifications.create({
      customId: `notif_agent_verified_${id}`,
      userId: id,
      title: 'Agent Credentials Verified',
      message: 'Your RERA license credentials have been verified by administration. Listing publication is unlocked.',
      type: 'moderation',
      link: '/agent/new-listing',
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function rejectAgent(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) return res.status(403).json({ success: false, error: { message: 'Unauthorized' } });
    const { id } = req.params;
    const { reason = '' } = req.body;
    const updated = await db.users.updateById(id, { isVerified: false, verificationStatus: 'rejected' });
    await db.notifications.create({
      customId: `notif_agent_declined_${id}_${Date.now()}`,
      userId: id,
      title: 'Agent Verification Notice',
      message: `Your brokerage verification was declined: ${reason}`,
      type: 'moderation',
      link: '/agent/profile',
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Platform Users for Admin
 * GET /api/dashboard/users
 */
async function getUsers(req, res, next) {
  try {
    const allUsers = await db.users.find({});
    const safeUsers = allUsers.map((u) => {
      const doc = u.toObject ? u.toObject() : { ...u };
      delete doc.passwordHash;
      return doc;
    });
    res.json({ success: true, data: safeUsers });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchDashboard,
  getUserStats,
  getAgentStats,
  getAdminStats,
  getUsers,
  approveProperty,
  rejectProperty,
  archiveProperty,
  verifyAgent,
  rejectAgent,
};

/**
 * Bookings / Walkthrough Controller for Porch Light Server
 */

const db = require('../db/dataStore');
const { ROLES } = require('../constants/roles');

/**
 * Parse booking date and timeSlot into a reliable Date object
 */
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
 * Get Bookings (Role Scoped)
 * GET /api/bookings
 */
async function getBookings(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { propertyId, status } = req.query;

    const filter = {};
    if (propertyId) filter.propertyId = propertyId;
    if (status) filter.status = status;

    if (userRole === ROLES.USER) {
      filter.userId = userId;
    } else if (userRole === ROLES.AGENT) {
      filter.agentId = userId;
    }

    const bookings = await db.bookings.find(filter);
    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
}

/**
 * Create Booking Request
 * POST /api/bookings
 */
async function createBooking(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === ROLES.AGENT) {
      return res.status(403).json({
        success: false,
        error: { message: "Agent accounts cannot book property walkthroughs." },
      });
    }

    const { propertyId, date, timeSlot, notes } = req.body;
    if (!propertyId || !date || !timeSlot) {
      return res.status(400).json({
        success: false,
        error: { message: 'Property, date, and preferred time slot are required.' },
      });
    }

    const prop = await db.properties.findById(propertyId);
    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found.' } });
    }

    const user = await db.users.findById(userId);

    const isSold = prop.isSold || prop.availabilityStatus === 'sold' || prop.status === 'sold';
    if (isSold && prop.buyerId !== userId && user?.customId !== prop.buyerId) {
      return res.status(400).json({ success: false, error: { message: 'This property has been acquired and cannot be booked by the public.' } });
    }

    const isActivelyLeased = (prop.isLeased || prop.rentalStatus === 'leased') &&
      (!prop.leaseEndDate || new Date(prop.leaseEndDate) > new Date());
    if (isActivelyLeased && prop.tenantId !== userId && user?.customId !== prop.tenantId) {
      return res.status(400).json({ success: false, error: { message: 'This rental property is currently under an active lease and unavailable for public visits.' } });
    }

    const booking = await db.bookings.create({
      propertyId,
      agentId: prop.agentId,
      userId,
      userName: user ? user.name : 'Verified Member',
      userEmail: user ? user.email : '',
      userPhone: user ? user.phone || '' : '',
      date,
      timeSlot,
      notes: notes || '',
      status: 'pending',
    });

    const bookingId = booking.id || booking.customId || booking._id?.toString();

    // Notify agent with idempotent key
    await db.notifications.create({
      customId: `notif_visit_req_agent_${bookingId}`,
      userId: prop.agentId,
      title: 'New Walkthrough Visit Request',
      message: `${user ? user.name : 'A prospective buyer'} requested a visit to "${prop.title}" on ${date} (${timeSlot}).`,
      type: 'booking',
      link: '/agent/visits',
    });

    // Notify user with receipt of request
    await db.notifications.create({
      customId: `notif_visit_req_user_${bookingId}`,
      userId,
      title: 'Walkthrough Request Submitted',
      message: `Your visit request for "${prop.title}" on ${date} (${timeSlot}) was sent to the agent.`,
      type: 'booking',
      link: '/dashboard/visits',
    });

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Booking Status (Confirm / Decline / Mark Completed)
 * PATCH /api/bookings/:id/status
 */
async function updateBookingStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const booking = await db.bookings.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
    }

    const isAgent = booking.agentId === req.user.id;
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isAgent && !isAdmin) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized. Only the listing agent can manage visit status.' } });
    }

    const bookingKey = booking.id || booking.customId || id;
    const targetStatus = (status === 'visited' || status === 'completed') ? 'completed' : status;

    // Strict visit completion logic
    if (targetStatus === 'completed') {
      if (booking.status !== 'confirmed') {
        return res.status(400).json({
          success: false,
          error: { message: 'Only confirmed visits can be marked as completed.' },
        });
      }

      // Check whether scheduled time has arrived
      const scheduledDateTime = parseBookingDateTime(booking.date, booking.timeSlot);
      if (scheduledDateTime && new Date() < scheduledDateTime) {
        return res.status(400).json({
          success: false,
          error: { message: 'Cannot mark a visit as completed before its scheduled time.' },
        });
      }

      const updated = await db.bookings.updateById(id, { status: 'completed' });

      // Notify user
      await db.notifications.create({
        customId: `notif_visit_complete_${bookingKey}`,
        userId: booking.userId,
        title: 'Walkthrough Visit Completed',
        message: `Your walkthrough visit on ${booking.date} (${booking.timeSlot}) has been marked as completed.`,
        type: 'booking',
        link: '/dashboard/visits',
      });

      return res.json({ success: true, data: updated });
    }

    // Normal confirm or decline
    const updated = await db.bookings.updateById(id, { status: targetStatus });

    // Notify user with idempotent key
    await db.notifications.create({
      customId: `notif_visit_${targetStatus}_${bookingKey}`,
      userId: booking.userId,
      title: targetStatus === 'confirmed' ? 'Walkthrough Appointment Confirmed' : 'Visit Request Declined',
      message: `Your visit for ${booking.date} (${booking.timeSlot}) was ${targetStatus}.`,
      type: 'booking',
      link: '/dashboard/visits',
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Cancel Booking
 * PATCH /api/bookings/:id/cancel
 */
async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;
    const booking = await db.bookings.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
    }

    const isUser = booking.userId === req.user.id;
    const isAgent = booking.agentId === req.user.id;
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isUser && !isAgent && !isAdmin) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
    }

    const updated = await db.bookings.updateById(id, { status: 'cancelled' });
    const bookingKey = booking.id || booking.customId || id;

    // Notify other party
    const targetUserId = isUser ? booking.agentId : booking.userId;
    await db.notifications.create({
      customId: `notif_visit_cancel_${bookingKey}`,
      userId: targetUserId,
      title: 'Walkthrough Visit Cancelled',
      message: `The appointment on ${booking.date} (${booking.timeSlot}) was cancelled.`,
      type: 'booking',
      link: isUser ? '/agent/visits' : '/dashboard/visits',
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Edit Pending Booking Schedule
 * PATCH /api/bookings/:id/schedule
 */
async function editPendingSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const { date, timeSlot, notes } = req.body;
    const booking = await db.bookings.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
    }

    if (booking.userId !== req.user.id && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, error: { message: 'Only pending bookings can be edited directly.' } });
    }

    const updated = await db.bookings.updateById(id, { date, timeSlot, notes, scheduleEditedAt: new Date() });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Request Booking Reschedule
 * POST /api/bookings/:id/reschedule-request
 */
async function requestReschedule(req, res, next) {
  try {
    const { id } = req.params;
    const { proposedDate, proposedTimeSlot, reason } = req.body;
    const booking = await db.bookings.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
    }

    const rescheduleRequest = {
      proposedDate,
      proposedTimeSlot,
      reason: reason || '',
      requestedBy: req.user.role,
      requestedAt: new Date(),
      status: 'pending',
    };

    const updated = await db.bookings.updateById(id, { rescheduleRequest });
    const bookingKey = booking.id || booking.customId || id;

    // Notify agent with idempotent key
    await db.notifications.create({
      customId: `notif_visit_resched_req_${bookingKey}_${Date.now()}`,
      userId: booking.agentId,
      title: 'Visit Reschedule Requested',
      message: `Client requested new time: ${proposedDate} (${proposedTimeSlot}).`,
      type: 'booking',
      link: '/agent/visits',
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * Respond to Booking Reschedule
 * POST /api/bookings/:id/reschedule-response
 */
async function respondReschedule(req, res, next) {
  try {
    const { id } = req.params;
    const { accept } = req.body;
    const booking = await db.bookings.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, error: { message: 'Booking not found.' } });
    }

    if (booking.agentId !== req.user.id && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
    }

    const updates = {};
    if (accept && booking.rescheduleRequest) {
      updates.date = booking.rescheduleRequest.proposedDate;
      updates.timeSlot = booking.rescheduleRequest.proposedTimeSlot;
      updates.status = 'confirmed';
      updates.rescheduleRequest = { ...booking.rescheduleRequest, status: 'accepted' };
    } else if (booking.rescheduleRequest) {
      updates.rescheduleRequest = { ...booking.rescheduleRequest, status: 'declined' };
    }

    const updated = await db.bookings.updateById(id, updates);
    const bookingKey = booking.id || booking.customId || id;

    // Notify user with idempotent key
    await db.notifications.create({
      customId: `notif_visit_resched_resp_${bookingKey}_${accept ? 'acc' : 'dec'}`,
      userId: booking.userId,
      title: accept ? 'Reschedule Accepted' : 'Reschedule Declined',
      message: accept
        ? `Appointment moved to ${updated.date} (${updated.timeSlot}).`
        : `Original appointment time preserved.`,
      type: 'booking',
      link: '/dashboard/visits',
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBookings,
  createBooking,
  updateBookingStatus,
  cancelBooking,
  editPendingSchedule,
  requestReschedule,
  respondReschedule,
};


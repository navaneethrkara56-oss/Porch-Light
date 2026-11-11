/**
 * Operational Controller for Porch Light Server
 * Notifications, Platform Broadcast Announcements, and System ErrorBoundary Diagnostics.
 */

const db = require('../db/dataStore');
const { ROLES } = require('../constants/roles');

// -------------------------------------------------------------
// Notifications
// -------------------------------------------------------------

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

async function getNotifications(req, res, next) {
  try {
    const rawUserId = req.user.id;
    const user = await db.users.findById(rawUserId);
    const userIds = [rawUserId, user?.customId, user?._id?.toString()].filter(Boolean);

    // Generate upcoming visit reminders if approaching within 48 hours
    try {
      const bookings = await db.bookings.find({
        userId: { $in: userIds },
        status: 'confirmed',
      });
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      for (const b of bookings) {
        const visitTime = parseBookingDateTime(b.date, b.timeSlot);
        if (visitTime && visitTime >= now && visitTime <= in48Hours) {
          await db.notifications.create({
            customId: `notif_remind_visit_${b.id || b.customId}_${b.date}`,
            userId: rawUserId,
            title: 'Upcoming Walkthrough Reminder',
            message: `Reminder: You have a scheduled property walkthrough on ${b.date} (${b.timeSlot}).`,
            type: 'booking',
            link: '/dashboard/visits',
          });
        }
      }
    } catch (reminderErr) {
      // Non-blocking reminder evaluation
      console.warn('Reminder generation check:', reminderErr.message);
    }

    const notifications = await db.notifications.find({ userId: { $in: userIds } });
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const rawUserId = req.user.id;
    const user = await db.users.findById(rawUserId);
    const userIds = [rawUserId, user?.customId, user?._id?.toString()].filter(Boolean);
    const { id } = req.params;
    const updated = await db.notifications.markRead(id, userIds);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const rawUserId = req.user.id;
    const user = await db.users.findById(rawUserId);
    const userIds = [rawUserId, user?.customId, user?._id?.toString()].filter(Boolean);
    await db.notifications.markAllReadForUser(userIds);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const rawUserId = req.user.id;
    const user = await db.users.findById(rawUserId);
    const userIds = [rawUserId, user?.customId, user?._id?.toString()].filter(Boolean);
    const { id } = req.params;
    await db.notifications.deleteById(id, userIds);
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (err) {
    next(err);
  }
}

async function deleteAllNotifications(req, res, next) {
  try {
    const rawUserId = req.user.id;
    const user = await db.users.findById(rawUserId);
    const userIds = [rawUserId, user?.customId, user?._id?.toString()].filter(Boolean);
    await db.notifications.deleteAllForUser(userIds);
    res.json({ success: true, message: 'All notifications cleared.' });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// Announcements
// -------------------------------------------------------------

async function getAnnouncements(req, res, next) {
  try {
    const isAdmin = req.user && req.user.role === ROLES.ADMIN;
    const target = isAdmin ? 'all' : (req.user ? req.user.role : 'all');
    const announcements = await db.announcements.find({ target });
    res.json({ success: true, data: announcements });
  } catch (err) {
    next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    const { title, content, target = 'all', priority = 'info', expiresAt } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: { message: 'Title and content are required.' } });
    }

    const announcement = await db.announcements.create({
      title: title.trim(),
      content: content.trim(),
      target,
      priority,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    next(err);
  }
}

async function deleteAnnouncement(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    const { id } = req.params;
    await db.announcements.deleteById(id);
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (err) {
    next(err);
  }
}

// -------------------------------------------------------------
// System Reports (ErrorBoundary Exceptions)
// -------------------------------------------------------------

async function getSystemReports(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    const { status } = req.query;
    const filter = status && status !== 'all' ? { status } : {};
    const reports = await db.systemReports.find(filter);
    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
}

async function createSystemReport(req, res, next) {
  try {
    const { message, reason, stack, source } = req.body;
    if (!message && !reason) {
      return res.status(400).json({ success: false, error: { message: 'Error message required.' } });
    }

    const report = await db.systemReports.create({
      message: message || reason,
      reason: reason || '',
      stack: stack || '',
      source: source || 'Client ErrorBoundary',
    });

    res.status(201).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

async function acknowledgeSystemReport(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const updated = await db.systemReports.updateById(id, { status: 'acknowledged' });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function resolveSystemReport(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const updated = await db.systemReports.updateById(id, { status: 'resolved' });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getSystemReports,
  createSystemReport,
  acknowledgeSystemReport,
  resolveSystemReport,
};

/**
 * Complaints & Support Tickets Controller for Porch Light Server
 */

const db = require('../db/dataStore');
const { ROLES } = require('../constants/roles');

async function getComplaints(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, userRole: filterRole } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (filterRole && filterRole !== 'all') filter.userRole = filterRole;

    if (userRole !== ROLES.ADMIN) {
      filter.userId = userId;
    }

    const complaints = await db.complaints.find(filter);
    res.json({ success: true, data: complaints });
  } catch (err) {
    next(err);
  }
}

async function submitComplaint(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { category, subject, description, propertyId } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({ success: false, error: { message: 'Category, subject, and description are required.' } });
    }

    const user = await db.users.findById(userId);

    const complaint = await db.complaints.create({
      userId,
      userName: user ? user.name : 'Verified Member',
      userEmail: user ? user.email : '',
      userRole,
      propertyId: propertyId || null,
      category,
      subject: subject.trim(),
      description: description.trim(),
      status: 'open',
      messages: [
        {
          id: 'initial',
          senderId: userId,
          senderName: user ? user.name : 'Verified Member',
          senderRole: userRole,
          message: description.trim(),
          timestamp: new Date(),
        },
      ],
    });

    // Notify admins with idempotent key
    const compId = complaint.id || complaint.customId || complaint._id?.toString();
    const admins = await db.users.find({ role: ROLES.ADMIN });
    for (const adm of admins) {
      const adminId = adm.id || adm.customId || adm._id?.toString();
      await db.notifications.create({
        customId: `notif_ticket_${compId}_${adminId}`,
        userId: adminId,
        title: 'New Support Request',
        message: `${user ? user.name : 'Member'} opened ticket: "${subject.slice(0, 80)}"`,
        type: 'support',
        link: '/admin/complaints',
      });
    }

    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    next(err);
  }
}

async function replyToComplaint(req, res, next) {
  try {
    const { id } = req.params;
    const { message, status } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Message text is required.' } });
    }

    const complaint = await db.complaints.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, error: { message: 'Ticket not found.' } });
    }

    const isOwner = complaint.userId === req.user.id;
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized.' } });
    }

    const user = await db.users.findById(req.user.id);
    const newMsg = {
      id: `msg_${Date.now()}`,
      senderId: req.user.id,
      senderName: isAdmin ? 'Administration Concierge' : user.name,
      senderRole: req.user.role,
      message: message.trim(),
      timestamp: new Date(),
    };

    const nextStatus = status || (isAdmin ? 'in_progress' : complaint.status);
    const updated = await db.complaints.updateById(id, {
      status: nextStatus,
      messages: [...(complaint.messages || []), newMsg],
    });

    // Notify recipient with idempotent key
    const recipientId = isAdmin ? complaint.userId : null;
    if (recipientId) {
      await db.notifications.create({
        customId: `notif_ticket_reply_${complaint.id || complaint.customId || id}_${newMsg.id}`,
        userId: recipientId,
        title: 'Support Concierge Response',
        message: `New reply on "${complaint.subject}": "${message.slice(0, 80)}"`,
        type: 'support',
        link: complaint.userRole === ROLES.AGENT ? '/agent/support' : '/dashboard/complaints',
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, error: { message: 'Admin access required.' } });
    }

    const { id } = req.params;
    const { status } = req.body;

    const updated = await db.complaints.updateById(id, { status });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getComplaints,
  submitComplaint,
  replyToComplaint,
  updateStatus,
};


/**
 * Inquiries Controller for Porch Light Server
 */

const db = require('../db/dataStore');
const { ROLES } = require('../constants/roles');

async function getInquiries(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { propertyId } = req.query;

    const filter = {};
    if (propertyId) filter.propertyId = propertyId;
    if (userRole === ROLES.AGENT) {
      filter.agentId = userId;
    }

    const inquiries = await db.inquiries.find(filter);
    res.json({ success: true, data: inquiries });
  } catch (err) {
    next(err);
  }
}

async function createInquiry(req, res, next) {
  try {
    const { propertyId, name, email, phone, message } = req.body;
    if (!propertyId || !name || !email || !message) {
      return res.status(400).json({ success: false, error: { message: 'Missing required inquiry fields.' } });
    }

    const prop = await db.properties.findById(propertyId);
    if (!prop) {
      return res.status(404).json({ success: false, error: { message: 'Property not found.' } });
    }

    const inquiry = await db.inquiries.create({
      propertyId,
      agentId: prop.agentId,
      userId: req.user?.id || null,
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : '',
      message: message.trim(),
      status: 'new',
    });

    // Notify agent with idempotent key
    const inqId = inquiry.id || inquiry.customId || inquiry._id?.toString();
    await db.notifications.create({
      customId: `notif_inquiry_${inqId}`,
      userId: prop.agentId,
      title: 'New Listing Inquiry',
      message: `${name} inquired about "${prop.title}".`,
      type: 'inquiry',
      link: '/agent/inquiries',
    });

    res.status(201).json({ success: true, data: inquiry });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInquiries,
  createInquiry,
};


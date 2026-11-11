/**
 * Chat / Messaging Controller for Porch Light Server
 * Strictly participant-authorized, prevents duplicate threads per user-agent-property pair,
 * and synchronizes across user dashboard and agent inquiries.
 */

const db = require('../db/dataStore');
const { ROLES } = require('../constants/roles');

/**
 * Get Conversation Threads (Role Scoped)
 * GET /api/chat/threads
 */
async function getChats(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userRecord = await db.users.findById(userId);

    const myIds = [userId];
    if (userRecord?.customId) myIds.push(userRecord.customId);
    if (userRecord?._id) myIds.push(String(userRecord._id));

    const filter = {};
    if (userRole === ROLES.USER) {
      filter.userId = { $in: myIds };
    } else if (userRole === ROLES.AGENT) {
      filter.agentId = { $in: myIds };
    }

    const chats = await db.chats.find(filter);
    const properties = await db.properties.find({});
    const propMap = new Map();
    properties.forEach((p) => {
      if (p.id) propMap.set(p.id, p);
      if (p.customId) propMap.set(p.customId, p);
      if (p._id) propMap.set(String(p._id), p);
    });

    const users = await db.users.find({});
    const userMap = new Map();
    users.forEach((u) => {
      if (u.id) userMap.set(u.id, u);
      if (u.customId) userMap.set(u.customId, u);
      if (u._id) userMap.set(String(u._id), u);
    });

    const populated = chats.map((c) => {
      const chatObj = c.toJSON ? c.toJSON() : (c.toObject ? c.toObject() : { ...c });
      const prop = propMap.get(chatObj.propertyId) || { title: 'Porch Light Property', price: 0 };
      const chatUser = userMap.get(chatObj.userId);
      const chatAgent = userMap.get(chatObj.agentId);

      return {
        ...chatObj,
        id: chatObj.customId || chatObj.id || String(chatObj._id),
        property: prop,
        userName: chatUser ? chatUser.name : (chatObj.userName || 'Verified Client'),
        userEmail: chatUser ? chatUser.email : (chatObj.userEmail || ''),
        agentName: chatAgent ? chatAgent.name : (chatObj.agentName || 'Representing Agent'),
      };
    });

    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
}

/**
 * Find or Create Single Chat Thread per User-Agent-Property Pair
 * POST /api/chat/threads/find-or-create
 */
async function getOrCreateChat(req, res, next) {
  try {
    const { propertyId, agentId } = req.body;
    const userId = req.user.id;

    if (!propertyId || !agentId) {
      return res.status(400).json({ success: false, error: { message: 'Property and agent required.' } });
    }

    const userRecord = await db.users.findById(userId);
    const agentRecord = await db.users.findById(agentId);
    const propRecord = await db.properties.findById(propertyId);

    const validUserIds = [userId];
    if (userRecord?.customId) validUserIds.push(userRecord.customId);
    if (userRecord?._id) validUserIds.push(String(userRecord._id));

    const validAgentIds = [agentId];
    if (agentRecord?.customId) validAgentIds.push(agentRecord.customId);
    if (agentRecord?._id) validAgentIds.push(String(agentRecord._id));
    if (propRecord?.agentId) validAgentIds.push(propRecord.agentId);

    const validPropIds = [propertyId];
    if (propRecord?.customId) validPropIds.push(propRecord.customId);
    if (propRecord?._id) validPropIds.push(String(propRecord._id));

    if (propRecord) {
      const isSold = propRecord.isSold || propRecord.availabilityStatus === 'sold' || propRecord.status === 'sold';
      if (isSold) {
        const isBuyer = validUserIds.includes(propRecord.buyerId);
        const isAgent = validUserIds.includes(propRecord.agentId);
        const isAdmin = req.user.role === ROLES.ADMIN;
        if (!isBuyer && !isAgent && !isAdmin) {
          return res.status(403).json({
            success: false,
            error: { message: 'This property has been acquired and chat is only available to the authorized buyer.' },
          });
        }
      }

      const isActivelyLeased = (propRecord.isLeased || propRecord.rentalStatus === 'leased' || propRecord.status === 'rented') &&
        (!propRecord.leaseEndDate || new Date(propRecord.leaseEndDate) > new Date());
      if (isActivelyLeased) {
        const isTenant = validUserIds.includes(propRecord.tenantId);
        const isAgent = validUserIds.includes(propRecord.agentId);
        const isAdmin = req.user.role === ROLES.ADMIN;
        if (!isTenant && !isAgent && !isAdmin) {
          return res.status(403).json({
            success: false,
            error: { message: 'This rental sanctuary is currently under an active lease and chat is restricted to the current tenant.' },
          });
        }
      }
    }

    // Find existing single thread matching any combination of identifiers
    let chat = await db.chats.findOne({
      propertyId: { $in: validPropIds },
      userId: { $in: validUserIds },
      agentId: { $in: validAgentIds },
    });

    if (!chat) {
      const canonicalPropId = propRecord?.customId || propRecord?.id || propertyId;
      const canonicalUserId = userRecord?.customId || userId;
      const canonicalAgentId = propRecord?.agentId || agentRecord?.customId || agentId;
      const threadId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      chat = await db.chats.create({
        customId: threadId,
        propertyId: canonicalPropId,
        userId: canonicalUserId,
        agentId: canonicalAgentId,
        userName: userRecord?.name || 'Verified Member',
        userEmail: userRecord?.email || '',
        agentName: agentRecord?.name || 'Representing Agent',
        messages: [],
      });
    }

    const chatObj = chat.toJSON ? chat.toJSON() : (chat.toObject ? chat.toObject() : { ...chat });
    chatObj.id = chatObj.customId || chatObj.id || String(chatObj._id);
    chatObj.property = propRecord || { title: 'Porch Light Property', price: 0 };

    res.json({ success: true, data: chatObj });
  } catch (err) {
    next(err);
  }
}

/**
 * Send Message in Conversation Thread
 * POST /api/chat/:id/messages
 */
async function sendMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { text, attachments = [] } = req.body;

    const chat = await db.chats.findOne({ id });
    if (!chat) {
      return res.status(404).json({ success: false, error: { message: 'Chat thread not found.' } });
    }

    const userRecord = await db.users.findById(req.user.id);
    const myIds = [req.user.id];
    if (userRecord?.customId) myIds.push(userRecord.customId);
    if (userRecord?._id) myIds.push(String(userRecord._id));

    const isUser = myIds.includes(chat.userId);
    const isAgent = myIds.includes(chat.agentId);
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isUser && !isAgent && !isAdmin) {
      return res.status(403).json({ success: false, error: { message: 'Unauthorized participant.' } });
    }

    const senderRole = isUser ? ROLES.USER : (isAgent ? ROLES.AGENT : req.user.role);
    const senderName = userRecord ? userRecord.name : (isAdmin ? 'Porch Light Concierge' : 'Verified Member');

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      customId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: req.user.id,
      senderRole,
      senderName,
      text: text ? text.trim() : '',
      attachments: attachments || [],
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...(chat.messages || []), message];
    await db.chats.updateById(chat.id || chat.customId || id, {
      messages: updatedMessages,
      lastMessageAt: new Date().toISOString(),
    });

    // Notify recipient with idempotent key
    const recipientId = isUser ? chat.agentId : chat.userId;
    await db.notifications.create({
      customId: `notif_chat_${message.id}`,
      userId: recipientId,
      title: 'New Message Received',
      message: `${senderName} sent you a message: "${(text || 'Sent an attachment').slice(0, 80)}"`,
      type: 'chat',
      link: isUser ? '/agent/inquiries' : '/dashboard/chat',
    });

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getChats,
  getOrCreateChat,
  sendMessage,
};

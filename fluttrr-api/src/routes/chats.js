const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../utils/prisma');
const { requireAuth } = require('../middleware/auth');
const { sendMessageSchema, validate } = require('../validators/schemas');
const { sendPushNotifications } = require('../utils/pushNotifications');

const router = express.Router();

// Basic HTML/script tag sanitization for message content
function sanitizeContent(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&(?!lt;|gt;|amp;|quot;|#)/g, '&amp;');
}

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many messages, please slow down' },
});

// Helper to get member identity
function getMemberFilter(req) {
  if (req.accountType === 'user') return { userId: req.user.id };
  return { businessId: req.business.id };
}

function getMemberId(req) {
  return req.accountType === 'user' ? req.user.id : req.business.id;
}

// ─── GET / — List my chats ───────────────────────────────

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const memberFilter = getMemberFilter(req);

    const memberships = await prisma.chatMember.findMany({
      where: memberFilter,
      include: {
        chat: {
          include: {
            event: { select: { id: true, title: true, emoji: true, date: true } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { chat: { updatedAt: 'desc' } },
    });

    const chats = memberships.map((m) => ({
      id: m.chat.id,
      type: m.chat.type,
      event: m.chat.event,
      lastMessage: m.chat.messages[0] || null,
      memberCount: m.chat._count.members,
      hasUnread: m.chat.messages[0]
        ? !m.lastReadAt || m.chat.messages[0].createdAt > m.lastReadAt
        : false,
      joinedAt: m.joinedAt,
    }));

    res.json({ chats });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/messages ───────────────────────────────────

router.get('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const memberFilter = getMemberFilter(req);

    // Verify membership
    const membership = await prisma.chatMember.findFirst({
      where: { chatId: req.params.id, ...memberFilter },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this chat' });

    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { chatId: req.params.id },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.message.count({ where: { chatId: req.params.id } }),
    ]);

    // Resolve sender info
    const userIds = [...new Set(messages.filter((m) => m.senderType === 'USER').map((m) => m.senderId))];
    const bizIds = [...new Set(messages.filter((m) => m.senderType === 'BUSINESS').map((m) => m.senderId))];

    const [users, businesses] = await Promise.all([
      userIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, displayName: true, profilePhoto: true },
          })
        : [],
      bizIds.length > 0
        ? prisma.business.findMany({
            where: { id: { in: bizIds } },
            select: { id: true, businessName: true, logo: true },
          })
        : [],
    ]);

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const bizMap = Object.fromEntries(businesses.map((b) => [b.id, b]));

    const messagesWithSender = messages.map((m) => ({
      ...m,
      sender: m.senderType === 'USER' ? userMap[m.senderId] : bizMap[m.senderId],
    }));

    // Update lastReadAt
    await prisma.chatMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    });

    res.json({
      messages: messagesWithSender,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/messages ─────────────────────────────────

router.post('/:id/messages', requireAuth, messageLimiter, validate(sendMessageSchema), async (req, res, next) => {
  try {
    const memberFilter = getMemberFilter(req);

    const membership = await prisma.chatMember.findFirst({
      where: { chatId: req.params.id, ...memberFilter },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this chat' });

    const message = await prisma.message.create({
      data: {
        chatId: req.params.id,
        senderId: getMemberId(req),
        senderType: req.accountType === 'user' ? 'USER' : 'BUSINESS',
        content: sanitizeContent(req.body.content),
      },
    });

    // Update chat timestamp
    await prisma.chat.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });

    // Build sender info
    let sender;
    if (req.accountType === 'user') {
      sender = {
        id: req.user.id,
        username: req.user.username,
        displayName: req.user.displayName,
        profilePhoto: req.user.profilePhoto,
      };
    } else {
      sender = {
        id: req.business.id,
        businessName: req.business.businessName,
        logo: req.business.logo,
      };
    }

    const messageWithSender = { ...message, sender };

    // Emit via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${req.params.id}`).emit('new_message', messageWithSender);
    }

    // Push notification to other chat members (fire and forget)
    const senderName = sender.displayName || sender.businessName || 'Someone';
    const chatMembers = await prisma.chatMember.findMany({
      where: { chatId: req.params.id },
      include: {
        user: { select: { id: true, fcmToken: true } },
        business: { select: { id: true, fcmToken: true } },
      },
    });

    const pushMessages = chatMembers
      .filter((m) => {
        const memberId = m.userId || m.businessId;
        return memberId !== getMemberId(req);
      })
      .map((m) => {
        const token = m.user?.fcmToken || m.business?.fcmToken;
        return token ? { to: token, title: senderName, body: req.body.content.substring(0, 100), data: { chatId: req.params.id, type: 'CHAT_MESSAGE' } } : null;
      })
      .filter(Boolean);

    if (pushMessages.length > 0) {
      sendPushNotifications(pushMessages).catch(() => {});
    }

    // Create in-app notifications for user members (not businesses, not sender)
    const userRecipients = chatMembers
      .filter((m) => m.userId && m.userId !== getMemberId(req))
      .map((m) => m.userId);

    if (userRecipients.length > 0) {
      prisma.notification.createMany({
        data: userRecipients.map((userId) => ({
          userId,
          type: 'CHAT_MESSAGE',
          title: senderName,
          body: req.body.content.substring(0, 100),
          data: { chatId: req.params.id },
        })),
      }).catch(() => {});
    }

    res.status(201).json(messageWithSender);
  } catch (err) {
    next(err);
  }
});

// ─── POST /dm — Create or find DM ───────────────────────

router.post('/dm', requireAuth, async (req, res, next) => {
  try {
    const { targetUserId, targetBusinessId } = req.body;

    if (!targetUserId && !targetBusinessId) {
      return res.status(400).json({ error: 'Target user or business ID required' });
    }

    const currentId = getMemberId(req);
    const chatType = targetBusinessId ? 'BIZ_DM' : 'DM';

    // Check block status (only for user-to-user DMs)
    if (targetUserId && req.accountType === 'user') {
      const blocked = await prisma.blockedUser.findFirst({
        where: {
          OR: [
            { blockerId: req.user.id, blockedId: targetUserId },
            { blockerId: targetUserId, blockedId: req.user.id },
          ],
        },
      });
      if (blocked) {
        return res.status(403).json({ error: 'Cannot message this user' });
      }
    }

    // Check for existing DM
    let existingChat;
    if (targetUserId) {
      existingChat = await prisma.chat.findFirst({
        where: {
          type: 'DM',
          AND: [
            { members: { some: { userId: currentId } } },
            { members: { some: { userId: targetUserId } } },
          ],
        },
      });
    } else if (targetBusinessId) {
      const memberFilter = req.accountType === 'user'
        ? { userId: currentId }
        : { businessId: currentId };
      existingChat = await prisma.chat.findFirst({
        where: {
          type: 'BIZ_DM',
          AND: [
            { members: { some: memberFilter } },
            { members: { some: { businessId: targetBusinessId } } },
          ],
        },
      });
    }

    if (existingChat) {
      return res.json({ chatId: existingChat.id, existing: true });
    }

    // Create new DM chat
    const membersToCreate = [];
    if (req.accountType === 'user') {
      membersToCreate.push({ userId: currentId });
    } else {
      membersToCreate.push({ businessId: currentId });
    }

    if (targetUserId) {
      membersToCreate.push({ userId: targetUserId });
    } else {
      membersToCreate.push({ businessId: targetBusinessId });
    }

    const chat = await prisma.chat.create({
      data: {
        type: chatType,
        members: { create: membersToCreate },
      },
    });

    res.status(201).json({ chatId: chat.id, existing: false });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:id/read ───────────────────────────────────────

router.put('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const memberFilter = getMemberFilter(req);

    const membership = await prisma.chatMember.findFirst({
      where: { chatId: req.params.id, ...memberFilter },
    });
    if (!membership) return res.status(403).json({ error: 'Not a member of this chat' });

    await prisma.chatMember.update({
      where: { id: membership.id },
      data: { lastReadAt: new Date() },
    });

    res.json({ message: 'Chat marked as read' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

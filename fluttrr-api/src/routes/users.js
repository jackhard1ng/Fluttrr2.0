const express = require('express');
const prisma = require('../utils/prisma');
const { requireUser } = require('../middleware/auth');
const { updateUserSchema, createReportSchema, validate } = require('../validators/schemas');

const router = express.Router();

// ─── GET /me ─────────────────────────────────────────────

router.get('/me', requireUser, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, username: true, displayName: true,
        bio: true, profilePhoto: true, city: true, lat: true, lng: true,
        role: true, status: true, emailVerified: true, createdAt: true,
        _count: {
          select: {
            eventAttendees: { where: { status: 'JOINED' } },
            moments: true,
          },
        },
      },
    });

    res.json({
      ...user,
      eventsJoined: user._count.eventAttendees,
      momentsCount: user._count.moments,
      _count: undefined,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /me ─────────────────────────────────────────────

router.put('/me', requireUser, validate(updateUserSchema), async (req, res, next) => {
  try {
    // Whitelist safe fields to prevent role escalation
    const { displayName, bio, profilePhoto, photos, city, fcmToken } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { displayName, bio, profilePhoto, photos, city, fcmToken },
    });

    const { passwordHash, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

// ─── GET /me/events ──────────────────────────────────────

router.get('/me/events', requireUser, async (req, res, next) => {
  try {
    const { type = 'upcoming', page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const dateFilter = type === 'past'
      ? { lt: new Date() }
      : { gte: new Date() };

    const attendees = await prisma.eventAttendee.findMany({
      where: {
        userId: req.user.id,
        status: 'JOINED',
        event: { date: dateFilter },
      },
      include: {
        event: {
          include: {
            business: { select: { id: true, businessName: true, logo: true } },
            _count: { select: { attendees: { where: { status: 'JOINED' } } } },
          },
        },
      },
      orderBy: { event: { date: type === 'past' ? 'desc' : 'asc' } },
      skip,
      take: limitNum,
    });

    const events = attendees.map((a) => ({
      ...a.event,
      attendeeCount: a.event._count.attendees,
      joinedAt: a.joinedAt,
      _count: undefined,
    }));

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

// ─── GET /me/blocked ────────────────────────────────────

router.get('/me/blocked', requireUser, async (req, res, next) => {
  try {
    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: req.user.id },
      include: {
        blocked: {
          select: {
            id: true, displayName: true, username: true, profilePhoto: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users: blocked.map((b) => ({ ...b.blocked, blockedAt: b.createdAt })) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /me/notifications ───────────────────────────────

router.get('/me/notifications', requireUser, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.notification.count({ where: { userId: req.user.id } }),
      prisma.notification.count({ where: { userId: req.user.id, read: false } }),
    ]);

    res.json({
      notifications,
      total,
      unreadCount,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /me/notifications/read ──────────────────────────

router.put('/me/notifications/read', requireUser, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id (PUBLIC) ──────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, username: true, displayName: true, bio: true,
        profilePhoto: true, city: true, createdAt: true,
        _count: {
          select: {
            eventAttendees: { where: { status: 'JOINED' } },
            moments: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      ...user,
      eventsJoined: user._count.eventAttendees,
      momentsCount: user._count.moments,
      _count: undefined,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/block ────────────────────────────────────

router.post('/:id/block', requireUser, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: "You can't block yourself" });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    await prisma.blockedUser.upsert({
      where: {
        blockerId_blockedId: { blockerId: req.user.id, blockedId: req.params.id },
      },
      create: { blockerId: req.user.id, blockedId: req.params.id },
      update: {},
    });

    res.json({ message: 'User blocked' });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:id/block ───────────────────────────────────

router.delete('/:id/block', requireUser, async (req, res, next) => {
  try {
    await prisma.blockedUser.deleteMany({
      where: { blockerId: req.user.id, blockedId: req.params.id },
    });

    res.json({ message: 'User unblocked' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /report ────────────────────────────────────────

router.post('/report', requireUser, validate(createReportSchema), async (req, res, next) => {
  try {
    const report = await prisma.report.create({
      data: {
        ...req.body,
        reportedById: req.user.id,
      },
    });

    res.status(201).json({ message: 'Report submitted', reportId: report.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

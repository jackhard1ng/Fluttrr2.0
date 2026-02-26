const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../utils/prisma');
const { requireUser, requireAuth } = require('../middleware/auth');
const { createMomentSchema, validate } = require('../validators/schemas');
const { notifyUser } = require('../utils/pushNotifications');
const { checkContent } = require('../utils/wordFilter');

const router = express.Router();

const momentCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many moments created, please try again later' },
});

// ─── GET / — Moments feed (PUBLIC) ─────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, userId, eventId } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (userId) where.userId = userId;
    if (eventId) where.eventId = eventId;

    const [moments, total] = await Promise.all([
      prisma.moment.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, displayName: true, profilePhoto: true },
          },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.moment.count({ where }),
    ]);

    const momentsWithCounts = moments.map((m) => ({
      ...m,
      likeCount: m._count.likes,
      commentCount: m._count.comments,
      _count: undefined,
    }));

    res.json({
      moments: momentsWithCounts,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id — Moment detail (PUBLIC) ─────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const moment = await prisma.moment.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, profilePhoto: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, profilePhoto: true },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!moment) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    res.json({
      ...moment,
      likeCount: moment._count.likes,
      commentCount: moment._count.comments,
      _count: undefined,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST / — Create moment (requireUser) ──────────────

router.post('/', requireUser, momentCreateLimiter, validate(createMomentSchema), async (req, res, next) => {
  try {
    const { content, photos, eventId } = req.body;

    if (!content && (!photos || photos.length === 0)) {
      return res.status(400).json({ error: 'Moment must have content or photos' });
    }

    // If eventId provided, verify it exists
    if (eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
    }

    // Auto-moderation: flag harmful content
    if (content) {
      const modResult = checkContent(content);
      if (modResult.flagged && modResult.severity === 'high') {
        // Auto-create a report for admin review
        await prisma.report.create({
          data: {
            reportType: 'MOMENT',
            targetId: 'auto-flagged',
            reportedById: req.user.id,
            reason: 'Auto-flagged: ' + modResult.reason,
            details: content.substring(0, 500),
          },
        }).catch(() => {});
      }
    }

    const moment = await prisma.moment.create({
      data: {
        userId: req.user.id,
        content,
        photos: photos || [],
        eventId,
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, profilePhoto: true },
        },
      },
    });

    res.status(201).json({ ...moment, likeCount: 0, commentCount: 0 });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:id — Delete moment (requireUser) ─────────

router.delete('/:id', requireUser, async (req, res, next) => {
  try {
    const moment = await prisma.moment.findUnique({ where: { id: req.params.id } });
    if (!moment) return res.status(404).json({ error: 'Moment not found' });
    if (moment.userId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own moments' });
    }

    await prisma.moment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Moment deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/like — Like a moment (requireUser) ──────

router.post('/:id/like', requireUser, async (req, res, next) => {
  try {
    const moment = await prisma.moment.findUnique({ where: { id: req.params.id } });
    if (!moment) return res.status(404).json({ error: 'Moment not found' });

    const existing = await prisma.momentLike.findUnique({
      where: { momentId_userId: { momentId: moment.id, userId: req.user.id } },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already liked this moment' });
    }

    await prisma.momentLike.create({
      data: { momentId: moment.id, userId: req.user.id },
    });

    // Create notification for moment owner (if not self-like)
    if (moment.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: moment.userId,
          type: 'MOMENT_LIKE',
          title: 'New like',
          body: `${req.user.displayName} liked your moment`,
          data: { momentId: moment.id },
        },
      }).catch(() => {});

      // Push notification
      notifyUser(prisma, moment.userId, {
        title: 'New like',
        body: `${req.user.displayName} liked your moment`,
        data: { momentId: moment.id, type: 'MOMENT_LIKE' },
      }).catch(() => {});
    }

    const likeCount = await prisma.momentLike.count({ where: { momentId: moment.id } });
    res.json({ message: 'Liked', likeCount });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:id/like — Unlike a moment (requireUser) ──

router.delete('/:id/like', requireUser, async (req, res, next) => {
  try {
    const existing = await prisma.momentLike.findUnique({
      where: { momentId_userId: { momentId: req.params.id, userId: req.user.id } },
    });

    if (!existing) {
      return res.status(400).json({ error: 'Not liked' });
    }

    await prisma.momentLike.delete({ where: { id: existing.id } });

    const likeCount = await prisma.momentLike.count({ where: { momentId: req.params.id } });
    res.json({ message: 'Unliked', likeCount });
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/comments — Comment on moment (requireUser)

router.post('/:id/comments', requireUser, async (req, res, next) => {
  try {
    const moment = await prisma.moment.findUnique({ where: { id: req.params.id } });
    if (!moment) return res.status(404).json({ error: 'Moment not found' });

    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Comment too long' });
    }

    const comment = await prisma.momentComment.create({
      data: {
        momentId: moment.id,
        userId: req.user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, profilePhoto: true },
        },
      },
    });

    // Create notification for moment owner (if not self-comment)
    if (moment.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: moment.userId,
          type: 'MOMENT_COMMENT',
          title: 'New comment',
          body: `${req.user.displayName} commented on your moment`,
          data: { momentId: moment.id },
        },
      }).catch(() => {});

      // Push notification
      notifyUser(prisma, moment.userId, {
        title: 'New comment',
        body: `${req.user.displayName} commented on your moment`,
        data: { momentId: moment.id, type: 'MOMENT_COMMENT' },
      }).catch(() => {});
    }

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/comments — List comments (PUBLIC) ────────

router.get('/:id/comments', async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [comments, total] = await Promise.all([
      prisma.momentComment.findMany({
        where: { momentId: req.params.id },
        include: {
          user: {
            select: { id: true, username: true, displayName: true, profilePhoto: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.momentComment.count({ where: { momentId: req.params.id } }),
    ]);

    res.json({
      comments,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/likes — Check if liked (requireUser) ─────

router.get('/:id/likes/check', requireUser, async (req, res, next) => {
  try {
    const existing = await prisma.momentLike.findUnique({
      where: { momentId_userId: { momentId: req.params.id, userId: req.user.id } },
    });

    res.json({ liked: !!existing });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

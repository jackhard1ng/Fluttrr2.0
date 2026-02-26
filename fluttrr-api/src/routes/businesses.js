const express = require('express');
const prisma = require('../utils/prisma');
const { requireBusiness } = require('../middleware/auth');
const { updateBusinessSchema, createReviewSchema, validate } = require('../validators/schemas');
const { requireUser } = require('../middleware/auth');
const { geocodeAddress } = require('../utils/geocode');

const router = express.Router();

// ─── GET /profile (requireBusiness) ──────────────────────

router.get('/profile', requireBusiness, async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.business.id },
      include: {
        _count: { select: { events: true, reviews: true } },
      },
    });

    const avgRating = await prisma.review.aggregate({
      where: { businessId: req.business.id },
      _avg: { rating: true },
    });

    const { passwordHash, ...safe } = business;
    res.json({
      ...safe,
      eventCount: business._count.events,
      reviewCount: business._count.reviews,
      avgRating: avgRating._avg.rating ? parseFloat(avgRating._avg.rating.toFixed(1)) : null,
      _count: undefined,
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /profile (requireBusiness) ──────────────────────

router.put('/profile', requireBusiness, validate(updateBusinessSchema), async (req, res, next) => {
  try {
    // Whitelist safe fields to prevent verified/status manipulation
    const { businessName, description, address, phone, website, logo, fcmToken } = req.body;
    const updateData = { businessName, description, address, phone, website, logo, fcmToken };

    // Re-geocode if address changed
    if (address) {
      const current = await prisma.business.findUnique({
        where: { id: req.business.id },
        select: { address: true, city: true },
      });
      if (current && address !== current.address) {
        const coords = await geocodeAddress(address, current.city);
        if (coords) {
          updateData.lat = coords.lat;
          updateData.lng = coords.lng;
        }
      }
    }

    const updated = await prisma.business.update({
      where: { id: req.business.id },
      data: updateData,
    });

    const { passwordHash, ...safe } = updated;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

// ─── GET /events (requireBusiness) ───────────────────────

router.get('/events', requireBusiness, async (req, res, next) => {
  try {
    const { filter = 'all', page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = { businessId: req.business.id };
    if (filter === 'active') {
      where.status = 'ACTIVE';
      where.date = { gte: new Date() };
    } else if (filter === 'past') {
      where.date = { lt: new Date() };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          _count: { select: { attendees: { where: { status: 'JOINED' } } } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.event.count({ where }),
    ]);

    const eventsWithStats = events.map((event) => ({
      ...event,
      attendeeCount: event._count.attendees,
      _count: undefined,
    }));

    res.json({
      events: eventsWithStats,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /stats (requireBusiness) ────────────────────────

router.get('/stats', requireBusiness, async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      activeEvents,
      totalAttendees,
      totalViews,
      avgRating,
      reviewCount,
      recentAttendees,
    ] = await Promise.all([
      prisma.event.count({ where: { businessId: req.business.id } }),
      prisma.event.count({
        where: { businessId: req.business.id, status: 'ACTIVE', date: { gte: new Date() } },
      }),
      prisma.eventAttendee.count({
        where: { event: { businessId: req.business.id }, status: 'JOINED' },
      }),
      prisma.event.aggregate({
        where: { businessId: req.business.id },
        _sum: { views: true },
      }),
      prisma.review.aggregate({
        where: { businessId: req.business.id },
        _avg: { rating: true },
      }),
      prisma.review.count({ where: { businessId: req.business.id } }),
      prisma.eventAttendee.count({
        where: {
          event: { businessId: req.business.id },
          status: 'JOINED',
          joinedAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    res.json({
      totalEvents,
      activeEvents,
      totalAttendees,
      totalViews: totalViews._sum.views || 0,
      avgRating: avgRating._avg.rating ? parseFloat(avgRating._avg.rating.toFixed(1)) : null,
      reviewCount,
      recentAttendees,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /analytics (requireBusiness) ────────────────────

router.get('/analytics', requireBusiness, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = Math.min(90, Math.max(7, parseInt(days) || 30));
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
    const bizId = req.business.id;

    // Daily attendee joins over the period
    const dailyJoins = await prisma.$queryRawUnsafe(`
      SELECT DATE("joinedAt") as date, COUNT(*)::int as count
      FROM "EventAttendee"
      WHERE "eventId" IN (SELECT id FROM "Event" WHERE "businessId" = $1::uuid)
        AND "joinedAt" >= $2
      GROUP BY DATE("joinedAt")
      ORDER BY date ASC
    `, bizId, since);

    // Daily event views over the period
    const eventViewTotals = await prisma.event.findMany({
      where: { businessId: bizId },
      select: { id: true, title: true, views: true, date: true },
      orderBy: { views: 'desc' },
      take: 10,
    });

    // Category breakdown
    const categoryBreakdown = await prisma.event.groupBy({
      by: ['category'],
      where: { businessId: bizId },
      _count: true,
      orderBy: { _count: { category: 'desc' } },
    });

    // Recent reviews
    const recentReviews = await prisma.review.findMany({
      where: { businessId: bizId, createdAt: { gte: since } },
      include: {
        user: { select: { displayName: true, profilePhoto: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Subscription usage (event count this month for free tier)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const eventsThisMonth = await prisma.event.count({
      where: { businessId: bizId, createdAt: { gte: monthStart } },
    });

    res.json({
      period: daysNum,
      dailyJoins,
      topEvents: eventViewTotals,
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        count: c._count,
      })),
      recentReviews,
      eventsThisMonth,
      subscriptionTier: req.business.subscriptionTier,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id (PUBLIC) ──────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, businessName: true, description: true, address: true,
        city: true, lat: true, lng: true, phone: true, website: true,
        logo: true, photos: true, verified: true, createdAt: true,
      },
    });

    if (!business) return res.status(404).json({ error: 'Business not found' });

    const [upcomingEvents, reviews, avgRating] = await Promise.all([
      prisma.event.findMany({
        where: {
          businessId: req.params.id,
          status: 'ACTIVE',
          date: { gte: new Date() },
        },
        include: {
          _count: { select: { attendees: { where: { status: 'JOINED' } } } },
        },
        orderBy: { date: 'asc' },
        take: 10,
      }),
      prisma.review.findMany({
        where: { businessId: req.params.id },
        include: {
          user: { select: { id: true, username: true, displayName: true, profilePhoto: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.review.aggregate({
        where: { businessId: req.params.id },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    res.json({
      ...business,
      upcomingEvents: upcomingEvents.map((e) => ({
        ...e,
        attendeeCount: e._count.attendees,
        _count: undefined,
      })),
      reviews,
      avgRating: avgRating._avg.rating ? parseFloat(avgRating._avg.rating.toFixed(1)) : null,
      reviewCount: avgRating._count.rating,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/reviews (PUBLIC) ───────────────────────────

router.get('/:id/reviews', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { businessId: req.params.id },
        include: {
          user: { select: { id: true, username: true, displayName: true, profilePhoto: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.review.count({ where: { businessId: req.params.id } }),
    ]);

    res.json({
      reviews,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/reviews (requireUser) ────────────────────

router.post('/:id/reviews', requireUser, validate(createReviewSchema), async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!business) return res.status(404).json({ error: 'Business not found' });

    const existing = await prisma.review.findUnique({
      where: { businessId_userId: { businessId: req.params.id, userId: req.user.id } },
    });
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this business' });
    }

    const review = await prisma.review.create({
      data: {
        businessId: req.params.id,
        userId: req.user.id,
        rating: req.body.rating,
        content: req.body.content,
      },
    });

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:id/reviews (requireUser) ─────────────────────

router.put('/:id/reviews', requireUser, async (req, res, next) => {
  try {
    const review = await prisma.review.findUnique({
      where: { businessId_userId: { businessId: req.params.id, userId: req.user.id } },
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const updated = await prisma.review.update({
      where: { id: review.id },
      data: {
        rating: req.body.rating ?? review.rating,
        content: req.body.content ?? review.content,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:id/reviews (requireUser) ───────────────────

router.delete('/:id/reviews', requireUser, async (req, res, next) => {
  try {
    const review = await prisma.review.findUnique({
      where: { businessId_userId: { businessId: req.params.id, userId: req.user.id } },
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await prisma.review.delete({ where: { id: review.id } });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

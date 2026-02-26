const express = require('express');
const prisma = require('../utils/prisma');

const router = express.Router();

// All routes are PUBLIC (no auth required)

// ─── GET /events — Public event listing ──────────────────

router.get('/events', async (req, res, next) => {
  try {
    const { category, area, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      status: 'ACTIVE',
      date: { gte: new Date() },
    };
    if (category) where.category = category;
    if (area) where.area = { contains: area, mode: 'insensitive' };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        select: {
          id: true, title: true, description: true, category: true,
          startTime: true, endTime: true, date: true, area: true,
          color: true, emoji: true, photos: true,
          business: { select: { businessName: true, logo: true } },
          attendees: { where: { status: 'JOINED' }, select: { guestCount: true } },
        },
        orderBy: { date: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.event.count({ where }),
    ]);

    const eventsForWeb = events.map((event) => ({
      ...event,
      attendeeCount: event.attendees.reduce((sum, a) => sum + 1 + a.guestCount, 0),
      attendees: undefined,
    }));

    res.json({
      events: eventsForWeb,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /events/featured — Featured for homepage ────────

router.get('/events/featured', async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        date: { gte: new Date() },
      },
      select: {
        id: true, title: true, description: true, category: true,
        startTime: true, date: true, area: true, color: true, emoji: true,
        business: { select: { businessName: true, logo: true } },
        attendees: { where: { status: 'JOINED' }, select: { guestCount: true } },
      },
      orderBy: [{ views: 'desc' }, { date: 'asc' }],
      take: 10,
    });

    res.json({
      events: events.map((e) => ({
        ...e,
        attendeeCount: e.attendees.reduce((sum, a) => sum + 1 + a.guestCount, 0),
        attendees: undefined,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /events/:id — Public event detail (SEO) ────────

router.get('/events/:id', async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, title: true, description: true, category: true,
        startTime: true, endTime: true, date: true, area: true,
        color: true, emoji: true, photos: true,
        business: { select: { id: true, businessName: true, logo: true, address: true } },
        attendees: { where: { status: 'JOINED' }, select: { guestCount: true } },
      },
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });

    res.json({
      ...event,
      attendeeCount: event.attendees.reduce((sum, a) => sum + 1 + a.guestCount, 0),
      attendees: undefined,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /areas — KC neighborhoods with event counts ────

router.get('/areas', async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        date: { gte: new Date() },
        area: { not: null },
      },
      select: { area: true },
    });

    const areaCounts = {};
    for (const event of events) {
      if (event.area) {
        areaCounts[event.area] = (areaCounts[event.area] || 0) + 1;
      }
    }

    const areas = Object.entries(areaCounts)
      .map(([area, eventCount]) => ({ area, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount);

    res.json({ areas });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

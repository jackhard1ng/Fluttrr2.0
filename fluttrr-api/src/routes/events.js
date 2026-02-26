const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../utils/prisma');
const { requireUser, requireVerifiedBusiness } = require('../middleware/auth');
const { createEventSchema, updateEventSchema, validate } = require('../validators/schemas');
const { notifyEventAttendees, notifyBusiness } = require('../utils/pushNotifications');
const { enforceEventLimit } = require('../middleware/requireSubscription');

const router = express.Router();

// Haversine distance in miles
function haversine(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const eventCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many events created, please try again later' },
});

// ─── GET / — List events (PUBLIC) ────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const {
      category,
      date,
      area,
      search,
      lat,
      lng,
      radius = 25,
      page = 1,
      limit = 20,
      sort = 'date',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      status: 'ACTIVE',
      date: { gte: new Date() },
    };

    if (category) where.category = category;
    if (date) {
      const d = new Date(date);
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));
      // Only allow filtering future dates; don't let clients list past events
      const now = new Date();
      where.date = {
        gte: dayStart > now ? dayStart : now,
        lt: dayEnd,
      };
    }
    if (area) where.area = { contains: area, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { area: { contains: search, mode: 'insensitive' } },
        { business: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    let orderBy = { date: 'asc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };
    if (sort === 'popular') orderBy = { views: 'desc' };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          business: { select: { id: true, businessName: true, logo: true, address: true } },
          attendees: { where: { status: 'JOINED' }, select: { guestCount: true } },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.event.count({ where }),
    ]);

    let eventsWithSpots = events.map((event) => {
      const totalPeople = event.attendees.reduce((sum, a) => sum + 1 + a.guestCount, 0);
      const result = {
        ...event,
        attendeeCount: totalPeople,
        spotsLeft: event.maxSpots ? Math.max(0, event.maxSpots - totalPeople) : null,
        attendees: undefined,
      };

      // Calculate distance if user location provided
      if (lat && lng && event.lat && event.lng) {
        result.distance = haversine(parseFloat(lat), parseFloat(lng), event.lat, event.lng);
      }

      return result;
    });

    // Filter by radius if location provided
    if (lat && lng) {
      const maxDist = parseFloat(radius);
      eventsWithSpots = eventsWithSpots.filter((e) => e.distance == null || e.distance <= maxDist);
      if (sort === 'distance' || sort === 'date') {
        eventsWithSpots.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
      }
    }

    res.json({
      events: eventsWithSpots,
      total: lat && lng ? eventsWithSpots.length : total,
      page: pageNum,
      totalPages: lat && lng ? 1 : Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /featured (PUBLIC) ──────────────────────────────

router.get('/featured', async (req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        date: { gte: new Date() },
      },
      include: {
        business: { select: { id: true, businessName: true, logo: true, address: true } },
        attendees: { where: { status: 'JOINED' }, select: { guestCount: true } },
      },
      orderBy: [{ views: 'desc' }, { date: 'asc' }],
      take: 10,
    });

    const eventsWithSpots = events.map((event) => {
      const totalPeople = event.attendees.reduce((sum, a) => sum + 1 + a.guestCount, 0);
      return {
        ...event,
        attendeeCount: totalPeople,
        spotsLeft: event.maxSpots ? Math.max(0, event.maxSpots - totalPeople) : null,
        attendees: undefined,
      };
    });

    res.json({ events: eventsWithSpots });
  } catch (err) {
    next(err);
  }
});

// ─── GET /search (PUBLIC) ────────────────────────────────

router.get('/search', async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      status: 'ACTIVE',
      date: { gte: new Date() },
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { area: { contains: q, mode: 'insensitive' } },
        { business: { businessName: { contains: q, mode: 'insensitive' } } },
      ],
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          business: { select: { id: true, businessName: true, logo: true, address: true } },
          attendees: { where: { status: 'JOINED' }, select: { guestCount: true } },
        },
        orderBy: { date: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.event.count({ where }),
    ]);

    const eventsWithSpots = events.map((event) => {
      const totalPeople = event.attendees.reduce((sum, a) => sum + 1 + a.guestCount, 0);
      return {
        ...event,
        attendeeCount: totalPeople,
        spotsLeft: event.maxSpots ? Math.max(0, event.maxSpots - totalPeople) : null,
        attendees: undefined,
      };
    });

    res.json({
      events: eventsWithSpots,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id (PUBLIC) ──────────────────────────────────

router.get('/:id', async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        business: {
          select: { id: true, businessName: true, logo: true, address: true, lat: true, lng: true },
        },
        attendees: {
          where: { status: 'JOINED' },
          include: {
            user: { select: { id: true, username: true, displayName: true, profilePhoto: true } },
          },
        },
        chat: { select: { id: true } },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Increment view count (fire and forget)
    prisma.event.update({
      where: { id: event.id },
      data: { views: { increment: 1 } },
    }).catch(() => {});

    const totalPeople = event.attendees.reduce((sum, a) => sum + 1 + (a.guestCount || 0), 0);
    res.json({
      ...event,
      attendeeCount: totalPeople,
      spotsLeft: event.maxSpots ? Math.max(0, event.maxSpots - totalPeople) : null,
      chatId: event.chat?.id || null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST / (requireVerifiedBusiness) ────────────────────

router.post('/', requireVerifiedBusiness, enforceEventLimit, eventCreateLimiter, validate(createEventSchema), async (req, res, next) => {
  try {
    const { title, description, category, startTime, endTime, date, maxSpots, area, color, emoji, recurring, recurringDay } = req.body;

    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    if (eventDate <= new Date()) {
      return res.status(400).json({ error: 'Event date must be in the future' });
    }

    const event = await prisma.event.create({
      data: {
        businessId: req.business.id,
        title,
        description,
        category,
        startTime,
        endTime,
        date: eventDate,
        maxSpots,
        lat: req.business.lat,
        lng: req.business.lng,
        area,
        color,
        emoji,
        recurring,
        recurringDay,
      },
    });

    // Auto-create event group chat
    const chat = await prisma.chat.create({
      data: {
        type: 'EVENT_GROUP',
        eventId: event.id,
        pinnedMessage: description || title,
        members: {
          create: {
            businessId: req.business.id,
          },
        },
      },
    });

    res.status(201).json({ ...event, chatId: chat.id });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:id (requireVerifiedBusiness) ──────────────────

router.put('/:id', requireVerifiedBusiness, validate(updateEventSchema), async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.businessId !== req.business.id) {
      return res.status(403).json({ error: 'You can only update your own events' });
    }

    // Whitelist safe fields to prevent businessId/status manipulation
    const { title, description, category, startTime, endTime, date, maxSpots, area, color, emoji, recurring } = req.body;
    const updateData = { title, description, category, startTime, endTime, maxSpots, area, color, emoji, recurring };

    // Validate maxSpots isn't below current occupancy (including guests)
    if (maxSpots != null) {
      const currentAttendees = await prisma.eventAttendee.findMany({
        where: { eventId: event.id, status: 'JOINED' },
        select: { guestCount: true },
      });
      const totalPeople = currentAttendees.reduce((sum, a) => sum + 1 + a.guestCount, 0);
      if (maxSpots < totalPeople) {
        return res.status(400).json({
          error: `Cannot reduce capacity below current attendance (${totalPeople} people)`,
        });
      }
    }

    if (date) {
      const eventDate = new Date(date);
      if (eventDate <= new Date()) {
        return res.status(400).json({ error: 'Event date must be in the future' });
      }
      updateData.date = eventDate;
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:id (requireVerifiedBusiness) ───────────────

router.delete('/:id', requireVerifiedBusiness, async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.businessId !== req.business.id) {
      return res.status(403).json({ error: 'You can only delete your own events' });
    }

    // Notify attendees before deletion
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: event.id, status: 'JOINED' },
      include: { user: { select: { id: true, fcmToken: true } } },
    });

    if (attendees.length > 0) {
      await prisma.notification.createMany({
        data: attendees.map((a) => ({
          userId: a.user.id,
          type: 'EVENT_CANCELLED',
          title: `${event.emoji || '😔'} Event cancelled`,
          body: `${event.title} has been cancelled by the organizer`,
          data: { eventId: event.id },
        })),
      });

      notifyEventAttendees(prisma, event.id, {
        title: `${event.emoji || '😔'} Event cancelled`,
        body: `${event.title} has been cancelled`,
        data: { type: 'EVENT_CANCELLED' },
      }).catch(() => {});
    }

    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /:id/join (requireUser) ───────────────────────

router.post('/:id/join', requireUser, async (req, res, next) => {
  try {
    const guestCount = Math.max(0, Math.min(10, parseInt(req.body.guestCount) || 0));

    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        attendees: { where: { status: 'JOINED' }, select: { guestCount: true } },
        chat: true,
      },
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status !== 'ACTIVE') return res.status(400).json({ error: 'Event is not active' });
    if (new Date(event.date) < new Date()) return res.status(400).json({ error: 'Event has already passed' });

    // Use a transaction to prevent race conditions on capacity checks
    await prisma.$transaction(async (tx) => {
      // Re-check capacity inside transaction for consistency
      const currentAttendees = await tx.eventAttendee.findMany({
        where: { eventId: event.id, status: 'JOINED' },
        select: { guestCount: true },
      });
      const totalPeople = currentAttendees.reduce((sum, a) => sum + 1 + a.guestCount, 0);

      if (event.maxSpots && (totalPeople + 1 + guestCount) > event.maxSpots) {
        const spotsLeft = Math.max(0, event.maxSpots - totalPeople);
        const msg = spotsLeft > 0 ? `Only ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left` : 'Event is full';
        throw new Error(msg);
      }

      // Check if already joined
      const existing = await tx.eventAttendee.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: req.user.id } },
      });
      if (existing && existing.status === 'JOINED') {
        throw new Error('Already joined this event');
      }

      // Upsert attendee (handles re-joining after leaving)
      await tx.eventAttendee.upsert({
        where: { eventId_userId: { eventId: event.id, userId: req.user.id } },
        create: { eventId: event.id, userId: req.user.id, status: 'JOINED', guestCount },
        update: { status: 'JOINED', joinedAt: new Date(), guestCount },
      });

      // Add user to event group chat
      if (event.chat) {
        await tx.chatMember.upsert({
          where: { chatId_userId: { chatId: event.chat.id, userId: req.user.id } },
          create: { chatId: event.chat.id, userId: req.user.id },
          update: {},
        });
      }
    });

    // Emit socket event (only if chat exists)
    if (event.chat) {
      const io = req.app.get('io');
      if (io) {
        io.to(`chat:${event.chat.id}`).emit('user_joined_event', {
          eventId: event.id,
          userId: req.user.id,
          username: req.user.username,
          displayName: req.user.displayName,
        });
      }
    }

    // Push notification to business owner
    const guestNote = guestCount > 0 ? ` (+${guestCount} guest${guestCount > 1 ? 's' : ''})` : '';
    notifyBusiness(prisma, event.businessId, {
      title: 'New attendee!',
      body: `${req.user.displayName} joined ${event.title}${guestNote}`,
      data: { eventId: event.id, type: 'EVENT_JOINED' },
    }).catch(() => {});

    res.json({ message: 'Joined event', chatId: event.chat?.id, guestCount });
  } catch (err) {
    // Handle known errors from the transaction as 400s
    if (err.message === 'Event is full' || err.message === 'Already joined this event' || err.message?.startsWith('Only ')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// ─── DELETE /:id/leave (requireUser) ─────────────────────

router.delete('/:id/leave', requireUser, async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: { chat: true },
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });

    const attendee = await prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: req.user.id } },
    });
    if (!attendee || attendee.status !== 'JOINED') {
      return res.status(400).json({ error: 'Not currently joined to this event' });
    }

    await prisma.eventAttendee.update({
      where: { id: attendee.id },
      data: { status: 'LEFT' },
    });

    // Remove from event chat
    if (event.chat) {
      await prisma.chatMember.deleteMany({
        where: { chatId: event.chat.id, userId: req.user.id },
      });
    }

    res.json({ message: 'Left event' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id/attendees (PUBLIC) ─────────────────────────

router.get('/:id/attendees', async (req, res, next) => {
  try {
    const attendees = await prisma.eventAttendee.findMany({
      where: { eventId: req.params.id, status: 'JOINED' },
      include: {
        user: { select: { id: true, username: true, displayName: true, profilePhoto: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({ attendees: attendees.map((a) => ({ ...a.user, joinedAt: a.joinedAt })) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require('express');
const prisma = require('../utils/prisma');

const router = express.Router();

const CATEGORY_LABELS = {
  GAMES: 'Games',
  FOOD_DRINK: 'Food & Drink',
  MUSIC: 'Music',
  SPORTS: 'Sports',
  FITNESS: 'Fitness',
  ARTS: 'Arts',
  SOCIAL: 'Social',
  EDUCATION: 'Education',
  NIGHTLIFE: 'Nightlife',
  OTHER: 'Other',
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
}

// ─── GET /events — Event listing page ──────────────────

router.get('/events', async (req, res, next) => {
  try {
    const { category, area, page = 1 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limit = 20;
    const skip = (pageNum - 1) * limit;

    const where = {
      status: 'ACTIVE',
      date: { gte: new Date() },
    };
    if (category) where.category = category;
    if (area) where.area = { contains: area, mode: 'insensitive' };

    const [events, total, areasResult] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          business: { select: { businessName: true, logo: true } },
          _count: { select: { attendees: { where: { status: 'JOINED' } } } },
        },
        orderBy: { date: 'asc' },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
      prisma.event.findMany({
        where: { status: 'ACTIVE', date: { gte: new Date() }, area: { not: null } },
        select: { area: true },
      }),
    ]);

    // Calculate area counts
    const areaCounts = {};
    for (const e of areasResult) {
      if (e.area) areaCounts[e.area] = (areaCounts[e.area] || 0) + 1;
    }
    const areas = Object.entries(areaCounts)
      .map(([a, eventCount]) => ({ area: a, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount);

    const eventsFormatted = events.map((e) => ({
      ...e,
      attendeeCount: e._count.attendees,
      _count: undefined,
    }));

    const totalPages = Math.ceil(total / limit);
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.render('events', {
      title: area ? `Events in ${area}` : 'Events in Kansas City',
      description: `Discover ${total} upcoming events in Kansas City. Find food, music, sports, nightlife and more local events on Fluttrr.`,
      ogTitle: area ? `Events in ${area} - Fluttrr` : 'Fluttrr - Kansas City Events',
      ogDescription: `Discover ${total} upcoming events in Kansas City. Join the community and meet new people!`,
      ogType: 'website',
      ogUrl: `${baseUrl}/events`,
      deepLinkPath: 'events',
      jsonLd: null,
      events: eventsFormatted,
      areas,
      currentArea: area || null,
      currentPage: pageNum,
      totalPages,
      categoryLabels: CATEGORY_LABELS,
      formatDate,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /event/:id — Event detail page ────────────────

router.get('/event/:id', async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        business: { select: { id: true, businessName: true, logo: true, address: true } },
        _count: { select: { attendees: { where: { status: 'JOINED' } } } },
      },
    });

    if (!event) {
      return res.status(404).send('<h1>Event not found</h1>');
    }

    // Increment views
    prisma.event.update({
      where: { id: event.id },
      data: { views: { increment: 1 } },
    }).catch(() => {});

    const eventFormatted = {
      ...event,
      attendeeCount: event._count.attendees,
      _count: undefined,
    };

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const catLabel = CATEGORY_LABELS[event.category] || event.category;
    const dateStr = formatDateFull(event.date);
    const timeStr = formatTime(event.startTime);

    res.render('event-detail', {
      title: event.title,
      description: `${event.title} - ${catLabel} event on ${dateStr} at ${timeStr}. ${event.description ? event.description.substring(0, 155) : `Join this ${catLabel.toLowerCase()} event in Kansas City!`}`,
      ogTitle: `${event.title} - Fluttrr Event`,
      ogDescription: `${catLabel} event on ${dateStr} at ${timeStr}. ${eventFormatted.attendeeCount} people going. ${event.area ? `Located in ${event.area}, Kansas City.` : 'Kansas City.'}`,
      ogType: 'article',
      ogUrl: `${baseUrl}/event/${event.id}`,
      deepLinkPath: `event/${event.id}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        description: event.description || `${catLabel} event in Kansas City`,
        startDate: new Date(event.date).toISOString(),
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: {
          '@type': 'Place',
          name: event.area || event.business?.address || 'Kansas City',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Kansas City',
            addressRegion: 'MO',
          },
        },
        organizer: {
          '@type': 'Organization',
          name: event.business?.businessName,
          url: `${baseUrl}/events`,
        },
      },
      event: eventFormatted,
      categoryLabels: CATEGORY_LABELS,
      formatDate,
      formatDateFull,
      formatTime,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET / — Redirect to events ────────────────────────

router.get('/', (req, res) => {
  res.redirect('/events');
});

module.exports = router;

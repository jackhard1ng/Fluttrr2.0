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

// ─── Legal / Support Pages ──────────────────────────────

const legalPageDefaults = {
  ogType: 'website',
  deepLinkPath: '',
  jsonLd: null,
};

router.get('/privacy', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.render('privacy', {
    title: 'Privacy Policy',
    description: 'Fluttrr Privacy Policy — how we collect, use, and protect your data.',
    ogTitle: 'Privacy Policy - Fluttrr',
    ogDescription: 'Learn how Fluttrr handles your personal information.',
    ogUrl: `${baseUrl}/privacy`,
    ...legalPageDefaults,
  });
});

router.get('/terms', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.render('terms', {
    title: 'Terms of Service',
    description: 'Fluttrr Terms of Service — rules and guidelines for using the platform.',
    ogTitle: 'Terms of Service - Fluttrr',
    ogDescription: 'Terms and conditions for using Fluttrr.',
    ogUrl: `${baseUrl}/terms`,
    ...legalPageDefaults,
  });
});

router.get('/support', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.render('support', {
    title: 'Support',
    description: 'Get help with Fluttrr — contact us for questions, issues, or business inquiries.',
    ogTitle: 'Support - Fluttrr',
    ogDescription: 'Need help with Fluttrr? Contact our support team.',
    ogUrl: `${baseUrl}/support`,
    ...legalPageDefaults,
  });
});

// ─── Sitemap & Robots ──────────────────────────────────

router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Get all active events for dynamic URLs
    const events = await prisma.event.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, updatedAt: true },
      orderBy: { date: 'desc' },
      take: 500,
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    const staticPages = [
      { path: '/', priority: '1.0', freq: 'daily' },
      { path: '/events', priority: '0.9', freq: 'daily' },
      { path: '/privacy', priority: '0.3', freq: 'monthly' },
      { path: '/terms', priority: '0.3', freq: 'monthly' },
      { path: '/support', priority: '0.3', freq: 'monthly' },
    ];

    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
      xml += `    <changefreq>${page.freq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Dynamic event pages
    for (const event of events) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/event/${event.id}</loc>\n`;
      xml += `    <lastmod>${event.updatedAt.toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += '</urlset>';

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

router.get('/robots.txt', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.set('Content-Type', 'text/plain');
  res.send(
    `User-agent: *\n` +
    `Allow: /\n` +
    `Disallow: /api/\n` +
    `Disallow: /uploads/\n\n` +
    `Sitemap: ${baseUrl}/sitemap.xml\n`
  );
});

// ─── GET / — Homepage ────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Fetch featured events
    const featured = await prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        date: { gte: new Date() },
      },
      include: {
        business: { select: { businessName: true, logo: true } },
        _count: { select: { attendees: { where: { status: 'JOINED' } } } },
      },
      orderBy: [{ views: 'desc' }, { date: 'asc' }],
      take: 6,
    });

    const featuredFormatted = featured.map((e) => ({
      ...e,
      attendeeCount: e._count.attendees,
      _count: undefined,
    }));

    // Fetch area counts
    const areasResult = await prisma.event.findMany({
      where: { status: 'ACTIVE', date: { gte: new Date() }, area: { not: null } },
      select: { area: true },
    });

    const areaCounts = {};
    for (const e of areasResult) {
      if (e.area) areaCounts[e.area] = (areaCounts[e.area] || 0) + 1;
    }
    const areas = Object.entries(areaCounts)
      .map(([area, eventCount]) => ({ area, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount);

    res.render('home', {
      title: 'Find Your Vibe in Kansas City',
      description: 'Discover local events, meet new people, and explore Kansas City with Fluttrr. Food, music, sports, nightlife and more.',
      ogTitle: 'Fluttrr - Find Your Vibe in Kansas City',
      ogDescription: 'Discover local events, meet new people, and explore Kansas City together.',
      ogType: 'website',
      ogUrl: baseUrl,
      deepLinkPath: '',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Fluttrr',
        url: baseUrl,
        description: 'Discover local events in Kansas City',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${baseUrl}/events?area={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      featured: featuredFormatted,
      areas,
      categoryLabels: CATEGORY_LABELS,
      formatDate,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

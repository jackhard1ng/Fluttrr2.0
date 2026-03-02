const express = require('express');
const prisma = require('../utils/prisma');
const { requireBusiness } = require('../middleware/auth');
const { createEventRecapSchema, updateEventRecapSchema, validate } = require('../validators/schemas');

const router = express.Router();

// ─── POST / (requireBusiness) — Create a recap for an event ──

router.post('/', requireBusiness, validate(createEventRecapSchema), async (req, res, next) => {
  try {
    const { eventId, content, photos } = req.body;

    // Verify the event belongs to this business
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, businessId: true, title: true },
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.businessId !== req.business.id) {
      return res.status(403).json({ error: 'You can only create recaps for your own events' });
    }

    // Must have content or photos
    if (!content && (!photos || photos.length === 0)) {
      return res.status(400).json({ error: 'Recap must include text or at least one photo' });
    }

    try {
      const recap = await prisma.eventRecap.create({
        data: {
          businessId: req.business.id,
          eventId,
          content,
          photos: photos || [],
        },
        include: {
          event: {
            select: { id: true, title: true, category: true, date: true, emoji: true, color: true },
          },
        },
      });

      res.status(201).json(recap);
    } catch (createErr) {
      if (createErr.code === 'P2002') {
        return res.status(409).json({ error: 'A recap already exists for this event' });
      }
      throw createErr;
    }
  } catch (err) {
    next(err);
  }
});

// ─── GET /mine (requireBusiness) — Get all recaps for the logged-in business ──

router.get('/mine', requireBusiness, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [recaps, total] = await Promise.all([
      prisma.eventRecap.findMany({
        where: { businessId: req.business.id },
        include: {
          event: {
            select: {
              id: true, title: true, category: true, date: true,
              emoji: true, color: true,
              _count: { select: { attendees: { where: { status: 'JOINED' } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.eventRecap.count({ where: { businessId: req.business.id } }),
    ]);

    res.json({
      recaps,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /business/:businessId (PUBLIC) — Get all recaps for a business ──

router.get('/business/:businessId', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [recaps, total] = await Promise.all([
      prisma.eventRecap.findMany({
        where: { businessId: req.params.businessId },
        include: {
          event: {
            select: {
              id: true, title: true, category: true, date: true,
              emoji: true, color: true,
            },
          },
          business: {
            select: { id: true, businessName: true, logo: true, verified: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.eventRecap.count({ where: { businessId: req.params.businessId } }),
    ]);

    res.json({
      recaps,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:id (requireBusiness) — Update a recap ──

router.put('/:id', requireBusiness, validate(updateEventRecapSchema), async (req, res, next) => {
  try {
    const recap = await prisma.eventRecap.findUnique({ where: { id: req.params.id } });
    if (!recap) return res.status(404).json({ error: 'Recap not found' });
    if (recap.businessId !== req.business.id) {
      return res.status(403).json({ error: 'You can only edit your own recaps' });
    }

    const updated = await prisma.eventRecap.update({
      where: { id: req.params.id },
      data: {
        content: req.body.content ?? recap.content,
        photos: req.body.photos ?? recap.photos,
      },
      include: {
        event: {
          select: { id: true, title: true, category: true, date: true, emoji: true, color: true },
        },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:id (requireBusiness) — Delete a recap ──

router.delete('/:id', requireBusiness, async (req, res, next) => {
  try {
    const recap = await prisma.eventRecap.findUnique({ where: { id: req.params.id } });
    if (!recap) return res.status(404).json({ error: 'Recap not found' });
    if (recap.businessId !== req.business.id) {
      return res.status(403).json({ error: 'You can only delete your own recaps' });
    }

    await prisma.eventRecap.delete({ where: { id: req.params.id } });
    res.json({ message: 'Recap deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

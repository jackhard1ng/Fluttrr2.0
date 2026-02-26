const express = require('express');
const prisma = require('../utils/prisma');
const { requireAdmin } = require('../middleware/auth');
const { adminMessageSchema, validate } = require('../validators/schemas');

const router = express.Router();

// All routes require admin
router.use(requireAdmin);

// ─── GET /stats ──────────────────────────────────────────

router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalBusinesses,
      pendingBusinesses,
      verifiedBusinesses,
      totalEvents,
      activeEvents,
      totalReports,
      pendingReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.business.count({ where: { status: 'PENDING' } }),
      prisma.business.count({ where: { verified: true } }),
      prisma.event.count(),
      prisma.event.count({ where: { status: 'ACTIVE', date: { gte: new Date() } } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      totalUsers,
      totalBusinesses,
      pendingBusinesses,
      verifiedBusinesses,
      totalEvents,
      activeEvents,
      totalReports,
      pendingReports,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /businesses ─────────────────────────────────────

router.get('/businesses', async (req, res, next) => {
  try {
    const { status, verified, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;
    if (verified !== undefined) where.verified = verified === 'true';

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        select: {
          id: true, email: true, businessName: true, address: true,
          city: true, phone: true, website: true, logo: true,
          verified: true, status: true, createdAt: true,
          _count: { select: { events: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.business.count({ where }),
    ]);

    res.json({
      businesses: businesses.map((b) => ({
        ...b,
        eventCount: b._count.events,
        _count: undefined,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /businesses/:id/verify ──────────────────────────

router.put('/businesses/:id/verify', async (req, res, next) => {
  try {
    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: { verified: true, status: 'ACTIVE' },
    });

    // Create notification for business
    // (Businesses don't have userId, so we log it; push notification via FCM later)
    console.log(`[ADMIN] Business verified: ${business.businessName} (${business.id})`);

    res.json({ message: 'Business verified', business: { id: business.id, businessName: business.businessName, verified: true, status: 'ACTIVE' } });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /businesses/:id/unverify ────────────────────────

router.put('/businesses/:id/unverify', async (req, res, next) => {
  try {
    await prisma.business.update({
      where: { id: req.params.id },
      data: { verified: false },
    });
    res.json({ message: 'Business unverified' });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /businesses/:id/suspend ─────────────────────────

router.put('/businesses/:id/suspend', async (req, res, next) => {
  try {
    await prisma.business.update({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED', verified: false },
    });
    res.json({ message: 'Business suspended' });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /businesses/:id/reinstate ───────────────────────

router.put('/businesses/:id/reinstate', async (req, res, next) => {
  try {
    await prisma.business.update({
      where: { id: req.params.id },
      data: { status: 'PENDING' },
    });
    res.json({ message: 'Business reinstated to pending' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /users ──────────────────────────────────────────

router.get('/users', async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, displayName: true,
          profilePhoto: true, city: true, role: true, status: true,
          emailVerified: true, createdAt: true, lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /users/:id/suspend ─────────────────────────────

router.put('/users/:id/suspend', async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED' },
    });
    res.json({ message: 'User suspended' });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /users/:id/reinstate ────────────────────────────

router.put('/users/:id/reinstate', async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
    });
    res.json({ message: 'User reinstated' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /reports ────────────────────────────────────────

router.get('/reports', async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;
    if (type) where.reportType = type;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reportedBy: { select: { id: true, username: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.report.count({ where }),
    ]);

    res.json({
      reports,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /reports/:id ────────────────────────────────────

router.put('/reports/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['REVIEWED', 'RESOLVED', 'DISMISSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: REVIEWED, RESOLVED, or DISMISSED' });
    }

    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
});

// ─── POST /messages ──────────────────────────────────────

router.post('/messages', validate(adminMessageSchema), async (req, res, next) => {
  try {
    const { targetType, targetId, subject, body } = req.body;

    // Store admin message
    const adminMsg = await prisma.adminMessage.create({
      data: {
        targetType,
        targetId,
        subject,
        body,
        sentBy: req.user.id,
      },
    });

    // Create notifications
    if (targetType === 'user' && targetId) {
      await prisma.notification.create({
        data: {
          userId: targetId,
          type: 'ADMIN_MESSAGE',
          title: subject,
          body,
          data: { adminMessageId: adminMsg.id },
        },
      });
    } else if (targetType === 'all_users') {
      const users = await prisma.user.findMany({ select: { id: true } });
      await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: 'ADMIN_MESSAGE',
          title: subject,
          body,
          data: { adminMessageId: adminMsg.id },
        })),
      });
    }
    // Note: business notifications would be handled via FCM push since businesses don't have userId in Notification table

    res.status(201).json({ message: 'Admin message sent', id: adminMsg.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

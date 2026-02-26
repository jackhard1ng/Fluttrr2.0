/**
 * Middleware to enforce subscription tier limits on event creation.
 * Free tier: max 5 events per calendar month.
 * Growth/Pro: unlimited.
 */

const prisma = require('../utils/prisma');

const FREE_MONTHLY_LIMIT = 5;

async function enforceEventLimit(req, res, next) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.business.id },
      select: { subscriptionTier: true },
    });

    // Growth and Pro have unlimited events
    if (business.subscriptionTier !== 'FREE') {
      return next();
    }

    // Count events created this calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const eventCount = await prisma.event.count({
      where: {
        businessId: req.business.id,
        createdAt: { gte: monthStart },
      },
    });

    if (eventCount >= FREE_MONTHLY_LIMIT) {
      return res.status(403).json({
        error: `Free plan is limited to ${FREE_MONTHLY_LIMIT} events per month. Upgrade to create more.`,
        code: 'EVENT_LIMIT_REACHED',
        limit: FREE_MONTHLY_LIMIT,
        used: eventCount,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { enforceEventLimit };

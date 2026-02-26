const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
      payload = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (payload.type === 'user') {
      const user = await prisma.user.findUnique({ where: { id: payload.id } });
      if (!user) return res.status(401).json({ error: 'User not found' });
      if (user.status === 'SUSPENDED') return res.status(403).json({ error: 'Account suspended' });
      req.user = user;
      req.accountType = 'user';
    } else if (payload.type === 'business') {
      const business = await prisma.business.findUnique({ where: { id: payload.id } });
      if (!business) return res.status(401).json({ error: 'Business not found' });
      if (business.status === 'SUSPENDED') return res.status(403).json({ error: 'Account suspended' });
      req.business = business;
      req.accountType = 'business';
    } else {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    next();
  } catch (err) {
    next(err);
  }
}

async function requireUser(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.accountType !== 'user') {
      return res.status(403).json({ error: 'User account required' });
    }
    next();
  });
}

async function requireBusiness(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.accountType !== 'business') {
      return res.status(403).json({ error: 'Business account required' });
    }
    next();
  });
}

async function requireVerifiedBusiness(req, res, next) {
  await requireBusiness(req, res, () => {
    if (!req.business.verified) {
      return res.status(403).json({ error: 'Business must be verified to perform this action' });
    }
    if (req.business.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Business account is not active' });
    }
    next();
  });
}

async function requireAdmin(req, res, next) {
  await requireUser(req, res, () => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = {
  requireAuth,
  requireUser,
  requireBusiness,
  requireVerifiedBusiness,
  requireAdmin,
};

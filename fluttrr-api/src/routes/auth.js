const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const prisma = require('../utils/prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateOtp, getOtpExpiry, isOtpExpired, MAX_OTP_ATTEMPTS } = require('../utils/otp');
const {
  registerUserSchema,
  registerBusinessSchema,
  loginSchema,
  verifyOtpSchema,
  validate,
} = require('../validators/schemas');
const { sendOtpEmail, sendPasswordResetEmail, sendPasswordChangedEmail } = require('../utils/email');
const { geocodeAddress } = require('../utils/geocode');
const { checkLockout, recordFailedAttempt, clearAttempts } = require('../middleware/accountLockout');

const router = express.Router();

// ─── Rate Limiters ───────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many login attempts, please try again later' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Too many accounts created, please try again later' },
});

const otpResendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  message: { error: 'Please wait before requesting another code' },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Too many verification attempts, please try again later' },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many password reset attempts, please try again later' },
});

// ─── Helpers ─────────────────────────────────────────────

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function sanitizeBusiness(business) {
  const { passwordHash, ...safe } = business;
  return safe;
}

// ─── POST /register ──────────────────────────────────────

router.post('/register', registerLimiter, validate(registerUserSchema), async (req, res, next) => {
  try {
    const { email, password, username, displayName, profilePhoto, bio, city } = req.body;

    // Check uniqueness
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already in use', field: 'email' });
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken', field: 'username' });
    }

    const passwordHash = await hashPassword(password);

    // Auto-promote to admin if email matches ADMIN_EMAIL
    const isAdmin = process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        username,
        displayName,
        profilePhoto,
        bio,
        city: city || 'Kansas City',
        emailVerified: true,
        ...(isAdmin && { role: 'ADMIN' }),
      },
    });

    const tokenPayload = { id: user.id, email: user.email, type: 'user', role: user.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    res.status(201).json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      otpRequired: false,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /register/business ─────────────────────────────

router.post('/register/business', registerLimiter, validate(registerBusinessSchema), async (req, res, next) => {
  try {
    const { email, password, businessName, address, description, phone, website, city } = req.body;

    const existingEmail = await prisma.business.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already in use', field: 'email' });
    }

    const passwordHash = await hashPassword(password);

    // Geocode address in background (don't block registration)
    const coords = await geocodeAddress(address, city || 'Kansas City');

    const business = await prisma.business.create({
      data: {
        email,
        passwordHash,
        businessName,
        address,
        description,
        phone,
        website,
        city: city || 'Kansas City',
        lat: coords?.lat,
        lng: coords?.lng,
      },
    });

    const tokenPayload = { id: business.id, email: business.email, type: 'business' };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    res.status(201).json({
      business: sanitizeBusiness(business),
      accessToken,
      refreshToken,
      otpRequired: false,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /login ─────────────────────────────────────────

router.post('/login', loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check account lockout (by email, across all IPs)
    const lockout = checkLockout(email);
    if (lockout.locked) {
      return res.status(429).json({
        error: `Account temporarily locked. Try again in ${lockout.retryAfter} seconds.`,
        retryAfter: lockout.retryAfter,
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      recordFailedAttempt(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      recordFailedAttempt(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    clearAttempts(email);

    // Auto-promote to admin if email matches ADMIN_EMAIL
    const shouldBeAdmin = process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        ...(shouldBeAdmin && user.role !== 'ADMIN' && { role: 'ADMIN' }),
      },
    });
    const finalUser = { ...user, ...updatedUser };

    const tokenPayload = { id: finalUser.id, email: finalUser.email, type: 'user', role: finalUser.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    res.json({
      user: sanitizeUser(finalUser),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /login/business ────────────────────────────────

router.post('/login/business', loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check account lockout (by email, across all IPs)
    const lockout = checkLockout(email);
    if (lockout.locked) {
      return res.status(429).json({
        error: `Account temporarily locked. Try again in ${lockout.retryAfter} seconds.`,
        retryAfter: lockout.retryAfter,
      });
    }

    const business = await prisma.business.findUnique({ where: { email } });
    if (!business) {
      recordFailedAttempt(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (business.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Account suspended' });
    }

    const valid = await comparePassword(password, business.passwordHash);
    if (!valid) {
      recordFailedAttempt(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    clearAttempts(email);

    const tokenPayload = { id: business.id, email: business.email, type: 'business' };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    res.json({
      business: sanitizeBusiness(business),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /verify-otp ───────────────────────────────────

router.post('/verify-otp', verifyOtpLimiter, validate(verifyOtpSchema), async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const otp = await prisma.otpCode.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return res.status(400).json({ error: 'No valid OTP found. Please request a new code.' });
    }

    if (isOtpExpired(otp.expiresAt)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(400).json({ error: 'Too many attempts. Please request a new code.' });
    }

    // Constant-time comparison to prevent timing attacks
    const otpValid = crypto.timingSafeEqual(Buffer.from(otp.code), Buffer.from(code));
    if (!otpValid) {
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = MAX_OTP_ATTEMPTS - otp.attempts - 1;
      return res.status(400).json({
        error: 'Invalid code',
        attemptsRemaining: remaining,
      });
    }

    // OTP is correct
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    // Mark email as verified
    if (otp.userId) {
      await prisma.user.update({
        where: { id: otp.userId },
        data: { emailVerified: true },
      });
    } else if (otp.businessId) {
      // Businesses don't have emailVerified field, but OTP is consumed
    }

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /resend-otp ───────────────────────────────────

router.post('/resend-otp', otpResendLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user or business
    const user = await prisma.user.findUnique({ where: { email } });
    const business = !user ? await prisma.business.findUnique({ where: { email } }) : null;

    // Generate OTP regardless (don't reveal if account exists)
    const code = generateOtp();
    await prisma.otpCode.create({
      data: {
        email,
        code,
        expiresAt: getOtpExpiry(),
        userId: user?.id,
        businessId: business?.id,
      },
    });

    await sendOtpEmail(email, code);

    // Always return success
    res.json({ message: 'If an account exists with that email, a verification code has been sent.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /refresh ───────────────────────────────────────

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify account still exists and is active
    if (payload.type === 'user') {
      const user = await prisma.user.findUnique({ where: { id: payload.id } });
      if (!user || user.status === 'SUSPENDED') {
        return res.status(401).json({ error: 'Account not found or suspended' });
      }
      const accessToken = signAccessToken({ id: user.id, email: user.email, type: 'user', role: user.role });
      return res.json({ accessToken });
    }

    if (payload.type === 'business') {
      const business = await prisma.business.findUnique({ where: { id: payload.id } });
      if (!business || business.status === 'SUSPENDED') {
        return res.status(401).json({ error: 'Account not found or suspended' });
      }
      const accessToken = signAccessToken({ id: business.id, email: business.email, type: 'business' });
      return res.json({ accessToken });
    }

    res.status(401).json({ error: 'Invalid token type' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /forgot-password ──────────────────────────────

router.post('/forgot-password', otpResendLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    const business = !user ? await prisma.business.findUnique({ where: { email } }) : null;

    const code = generateOtp();
    await prisma.otpCode.create({
      data: {
        email,
        code,
        expiresAt: getOtpExpiry(),
        userId: user?.id,
        businessId: business?.id,
      },
    });

    await sendPasswordResetEmail(email, code);

    res.json({ message: 'If an account exists with that email, a reset code has been sent.' });
  } catch (err) {
    next(err);
  }
});

// ─── POST /reset-password ───────────────────────────────

router.post('/reset-password', resetPasswordLimiter, async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: 'Password must be 8-128 characters' });
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain both letters and numbers' });
    }

    // Validate OTP
    const otp = await prisma.otpCode.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return res.status(400).json({ error: 'No valid reset code found' });
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(400).json({ error: 'Too many attempts. Please request a new code.' });
    }

    // Constant-time comparison to prevent timing attacks
    const resetOtpValid = crypto.timingSafeEqual(Buffer.from(otp.code), Buffer.from(code));
    if (!resetOtpValid) {
      await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    // Hash new password and update
    const passwordHash = await hashPassword(newPassword);

    if (otp.userId) {
      await prisma.user.update({
        where: { id: otp.userId },
        data: { passwordHash },
      });
    } else if (otp.businessId) {
      await prisma.business.update({
        where: { id: otp.businessId },
        data: { passwordHash },
      });
    } else {
      return res.status(400).json({ error: 'No account associated with this code' });
    }

    // Notify user that their password was changed
    sendPasswordChangedEmail(email).catch(() => {});

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

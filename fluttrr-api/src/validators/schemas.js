const { z } = require('zod');

// ─── User Schemas ────────────────────────────────────────

const registerUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  displayName: z.string().min(1, 'Display name is required').max(50),
  profilePhoto: z.string().min(1, 'Profile photo is required'),
  bio: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
});

const registerBusinessSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  businessName: z.string().min(1, 'Business name is required').max(100),
  address: z.string().min(1, 'Address is required').max(300),
  description: z.string().max(2000).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  city: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

// ─── Event Schemas ───────────────────────────────────────

const eventCategoryValues = [
  'GAMES', 'FOOD_DRINK', 'MUSIC', 'SPORTS', 'FITNESS',
  'ARTS', 'SOCIAL', 'EDUCATION', 'NIGHTLIFE', 'OTHER',
];

const recurrenceTypeValues = ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'FIRST_FRIDAY'];

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(2000).optional(),
  category: z.enum(eventCategoryValues),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  maxSpots: z.number().int().positive().optional().nullable(),
  area: z.string().max(100).optional(),
  color: z.string().max(7).optional(),
  emoji: z.string().max(4).optional(),
  recurring: z.enum(recurrenceTypeValues).optional().nullable(),
  recurringDay: z.number().int().min(0).max(6).optional().nullable(),
});

const updateEventSchema = createEventSchema.partial();

// ─── User Update Schemas ─────────────────────────────────

const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  profilePhoto: z.string().min(1).optional(),
  city: z.string().max(100).optional(),
  fcmToken: z.string().optional(),
});

const updateBusinessSchema = z.object({
  businessName: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  address: z.string().min(1).max(300).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  logo: z.string().optional(),
  city: z.string().max(100).optional(),
  fcmToken: z.string().optional(),
});

const joinEventSchema = z.object({
  guestCount: z.number().int().min(0).max(10).optional().default(0),
});

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  content: z.string().max(2000).optional(),
});

// ─── Chat / Message Schemas ──────────────────────────────

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000),
});

// ─── Review Schema ───────────────────────────────────────

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().max(2000).optional(),
});

// ─── Report Schema ───────────────────────────────────────

const reportTypeValues = ['USER', 'BUSINESS', 'EVENT', 'MESSAGE', 'MOMENT'];

const createReportSchema = z.object({
  reportType: z.enum(reportTypeValues),
  targetId: z.string().uuid('Invalid target ID'),
  reason: z.string().min(1, 'Reason is required').max(500),
  details: z.string().max(2000).optional(),
});

// ─── Moment Schema ───────────────────────────────────────

const createMomentSchema = z.object({
  content: z.string().max(2000).optional(),
  photos: z.array(z.string()).max(10).optional(),
  eventId: z.string().uuid().optional(),
});

// ─── Admin Message Schema ────────────────────────────────

const adminMessageSchema = z.object({
  targetType: z.enum(['user', 'business', 'all_users', 'all_businesses']),
  targetId: z.string().uuid().optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

// ─── Validate Middleware ─────────────────────────────────

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({ error: 'Validation failed', errors });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  registerUserSchema,
  registerBusinessSchema,
  loginSchema,
  verifyOtpSchema,
  createEventSchema,
  updateEventSchema,
  updateUserSchema,
  updateBusinessSchema,
  sendMessageSchema,
  joinEventSchema,
  createReviewSchema,
  updateReviewSchema,
  createReportSchema,
  createMomentSchema,
  adminMessageSchema,
  validate,
};

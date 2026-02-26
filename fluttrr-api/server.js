require('dotenv').config();

// ─── Startup Validation ──────────────────────────────────

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const { verifyToken } = require('./src/utils/jwt');
const prisma = require('./src/utils/prisma');
const { requestLogger } = require('./src/middleware/requestLogger');
const { sanitizeBody } = require('./src/middleware/sanitize');

const path = require('path');

const app = express();
const server = http.createServer(app);

// ─── View Engine (EJS) ─────────────────────────────────

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── CORS ────────────────────────────────────────────────

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    maxAge: 86400, // Cache preflight responses for 24 hours
  })
);

// ─── Security ────────────────────────────────────────────

app.use(helmet());

// ─── Request Logging ────────────────────────────────────

app.use(requestLogger);

// ─── Body Parsing ────────────────────────────────────────

// Raw body for Stripe webhooks (must be before json parser)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON for everything else
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Input Sanitization ─────────────────────────────────

app.use(sanitizeBody);

// ─── Global Rate Limit ──────────────────────────────────

const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api', globalLimiter);

// ─── Socket.io ───────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});

// Socket auth middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const payload = verifyToken(token);

    // Verify the entity actually exists in the database
    if (payload.type === 'user') {
      const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true } });
      if (!user) return next(new Error('User not found'));
    } else if (payload.type === 'business') {
      const biz = await prisma.business.findUnique({ where: { id: payload.id }, select: { id: true } });
      if (!biz) return next(new Error('Business not found'));
    }

    socket.userId = payload.id;
    socket.userType = payload.type;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Socket events
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.userId} (${socket.userType})`);

  socket.on('join_chat', async (chatId) => {
    try {
      // Verify the user is actually a member of this chat
      const memberFilter = socket.userType === 'user'
        ? { userId: socket.userId }
        : { businessId: socket.userId };
      const membership = await prisma.chatMember.findFirst({
        where: { chatId, ...memberFilter },
      });
      if (!membership) return; // silently reject
      socket.join(`chat:${chatId}`);
    } catch (err) {
      console.error('join_chat error:', err.message);
    }
  });

  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat:${chatId}`);
  });

  socket.on('typing', (chatId) => {
    socket.to(`chat:${chatId}`).emit('typing', {
      chatId,
      userId: socket.userId,
      userType: socket.userType,
    });
  });

  socket.on('stop_typing', (chatId) => {
    socket.to(`chat:${chatId}`).emit('stop_typing', {
      chatId,
      userId: socket.userId,
    });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.userId}`);
  });
});

// Make io available to routes
app.set('io', io);

// ─── Routes ──────────────────────────────────────────────

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/business', require('./src/routes/businesses'));
app.use('/api/events', require('./src/routes/events'));
app.use('/api/chats', require('./src/routes/chats'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/moments', require('./src/routes/moments'));
app.use('/api/uploads', require('./src/routes/uploads'));
app.use('/api/stripe', require('./src/routes/stripe'));
app.use('/api/web', require('./src/routes/web'));

// Serve uploaded files and public directory statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Web Pages (SEO) ───────────────────────────────────

app.use('/', require('./src/routes/pages'));

// ─── Health Check ────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'connected';
  } catch {
    health.database = 'disconnected';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// ─── 404 Handler ─────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Error Handler ───────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Cron Jobs ───────────────────────────────────────────

const { setupCronJobs } = require('./src/cron');
setupCronJobs();

// ─── Start Server ────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Fluttrr API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };

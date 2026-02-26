require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const { verifyToken } = require('./src/utils/jwt');

const app = express();
const server = http.createServer(app);

// ─── CORS ────────────────────────────────────────────────

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// ─── Security ────────────────────────────────────────────

app.use(helmet());

// ─── Body Parsing ────────────────────────────────────────

// Raw body for Stripe webhooks (must be before json parser)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// JSON for everything else
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));

  try {
    const payload = verifyToken(token);
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

  socket.on('join_chat', (chatId) => {
    socket.join(`chat:${chatId}`);
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
app.use('/api/web', require('./src/routes/web'));

// Serve uploaded files statically
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// ─── Health Check ────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// ─── Start Server ────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Fluttrr API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };

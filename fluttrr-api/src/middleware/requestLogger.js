/**
 * Lightweight request logger.
 * Logs method, path, status code, and response time.
 * Skips health checks to avoid noise.
 */

function requestLogger(req, res, next) {
  // Skip health check noise
  if (req.path === '/api/health') return next();

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    const log = `[${level.toUpperCase()}] ${req.method} ${req.originalUrl} ${status} ${duration}ms`;

    if (level === 'error') {
      console.error(log);
    } else if (level === 'warn') {
      console.warn(log);
    } else if (process.env.NODE_ENV !== 'production' || duration > 1000) {
      // In production, only log slow requests
      console.log(log);
    }
  });

  next();
}

module.exports = { requestLogger };

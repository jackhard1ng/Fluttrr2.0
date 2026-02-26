/**
 * In-memory account lockout tracker.
 * Locks accounts after MAX_ATTEMPTS failed logins within WINDOW_MS.
 * Lock duration is LOCKOUT_MS.
 *
 * This is in addition to express-rate-limit (which limits by IP).
 * This tracks by email, so a distributed attack from many IPs still triggers lockout.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

// Map<email, { attempts: number, firstAttempt: number, lockedUntil: number | null }>
const loginAttempts = new Map();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of loginAttempts) {
    if (data.lockedUntil && now > data.lockedUntil) {
      loginAttempts.delete(email);
    } else if (!data.lockedUntil && now - data.firstAttempt > WINDOW_MS) {
      loginAttempts.delete(email);
    }
  }
}, 10 * 60 * 1000);

/**
 * Check if an email is currently locked out.
 * @returns {{ locked: boolean, retryAfter?: number }}
 */
function checkLockout(email) {
  const key = email.toLowerCase();
  const data = loginAttempts.get(key);
  if (!data) return { locked: false };

  if (data.lockedUntil) {
    const now = Date.now();
    if (now < data.lockedUntil) {
      return {
        locked: true,
        retryAfter: Math.ceil((data.lockedUntil - now) / 1000),
      };
    }
    // Lock expired
    loginAttempts.delete(key);
    return { locked: false };
  }

  return { locked: false };
}

/**
 * Record a failed login attempt. Returns true if account is now locked.
 */
function recordFailedAttempt(email) {
  const key = email.toLowerCase();
  const now = Date.now();
  let data = loginAttempts.get(key);

  if (!data || now - data.firstAttempt > WINDOW_MS) {
    data = { attempts: 1, firstAttempt: now, lockedUntil: null };
    loginAttempts.set(key, data);
    return false;
  }

  data.attempts++;

  if (data.attempts >= MAX_ATTEMPTS) {
    data.lockedUntil = now + LOCKOUT_MS;
    console.warn(`[SECURITY] Account locked: ${key} after ${data.attempts} failed attempts`);
    return true;
  }

  return false;
}

/**
 * Clear failed attempts on successful login.
 */
function clearAttempts(email) {
  loginAttempts.delete(email.toLowerCase());
}

module.exports = { checkLockout, recordFailedAttempt, clearAttempts };

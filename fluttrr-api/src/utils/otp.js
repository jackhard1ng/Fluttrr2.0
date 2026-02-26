const crypto = require('crypto');

const MAX_OTP_ATTEMPTS = 5;

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

function getOtpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
}

function isOtpExpired(expiresAt) {
  return new Date() > new Date(expiresAt);
}

module.exports = { generateOtp, getOtpExpiry, isOtpExpired, MAX_OTP_ATTEMPTS };

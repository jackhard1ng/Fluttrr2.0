/**
 * Basic content moderation word filter.
 * Checks text against a blocklist of harmful terms.
 * Returns { flagged: boolean, reason: string | null }
 *
 * This is a first line of defense — not a replacement for human review.
 * Flagged content can still be posted but creates an auto-report for admin review.
 */

// Common slurs and spam indicators (keep lowercase)
const BLOCKED_PATTERNS = [
  // Spam indicators
  /\b(buy now|click here|earn money|free gift|act now)\b/i,
  /https?:\/\/\S+\.(ru|cn|tk|ml)\b/i, // Suspicious TLDs
  // Repeated characters (spam indicator)
  /(.)\1{7,}/,
];

// Severe terms that should auto-flag for admin review
const FLAGGED_TERMS = [
  'kill yourself',
  'kys',
  'bomb threat',
  'school shooting',
  'i will find you',
];

/**
 * @param {string} text
 * @returns {{ flagged: boolean, severity: 'none' | 'low' | 'high', reason: string | null }}
 */
function checkContent(text) {
  if (!text || typeof text !== 'string') {
    return { flagged: false, severity: 'none', reason: null };
  }

  const lower = text.toLowerCase();

  // High severity — threats and dangerous content
  for (const term of FLAGGED_TERMS) {
    if (lower.includes(term)) {
      return { flagged: true, severity: 'high', reason: `Contains prohibited content: "${term}"` };
    }
  }

  // Low severity — spam patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { flagged: true, severity: 'low', reason: 'Content matches spam pattern' };
    }
  }

  return { flagged: false, severity: 'none', reason: null };
}

module.exports = { checkContent };

/**
 * Stripe client singleton.
 * Returns null when STRIPE_SECRET_KEY is not set (dev mode).
 */

const isConfigured = !!process.env.STRIPE_SECRET_KEY;

let stripe = null;
if (isConfigured) {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

module.exports = { stripe, isConfigured };

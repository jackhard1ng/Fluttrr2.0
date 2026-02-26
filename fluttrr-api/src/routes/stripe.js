const express = require('express');
const prisma = require('../utils/prisma');
const { stripe, isConfigured } = require('../utils/stripe');
const { requireBusiness } = require('../middleware/auth');

const router = express.Router();

// Price IDs from env
const PRICE_IDS = {
  GROWTH: process.env.STRIPE_GROWTH_PRICE_ID,
  PRO: process.env.STRIPE_PRO_PRICE_ID,
};

// Reverse lookup: price_id → tier name
function tierFromPriceId(priceId) {
  if (priceId === PRICE_IDS.GROWTH) return 'GROWTH';
  if (priceId === PRICE_IDS.PRO) return 'PRO';
  return 'FREE';
}

// ─── POST /checkout — Create Stripe Checkout Session ────

router.post('/checkout', requireBusiness, async (req, res, next) => {
  try {
    if (!isConfigured) {
      return res.status(503).json({ error: 'Payments are not configured yet' });
    }

    const { plan } = req.body;
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan. Must be GROWTH or PRO' });
    }

    const business = await prisma.business.findUnique({
      where: { id: req.business.id },
      select: { id: true, email: true, stripeCustomerId: true },
    });

    // Create or retrieve Stripe customer
    let customerId = business.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: business.email,
        metadata: { businessId: business.id },
      });
      customerId = customer.id;
      await prisma.business.update({
        where: { id: business.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${req.headers.origin || 'fluttrr://'}?checkout=success`,
      cancel_url: `${req.headers.origin || 'fluttrr://'}?checkout=cancel`,
      metadata: { businessId: business.id, plan },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

// ─── POST /portal — Create billing portal session ───────

router.post('/portal', requireBusiness, async (req, res, next) => {
  try {
    if (!isConfigured) {
      return res.status(503).json({ error: 'Payments are not configured yet' });
    }

    const business = await prisma.business.findUnique({
      where: { id: req.business.id },
      select: { stripeCustomerId: true },
    });

    if (!business?.stripeCustomerId) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: `${req.headers.origin || 'fluttrr://'}`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// ─── GET /status — Current subscription status ──────────

router.get('/status', requireBusiness, async (req, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.business.id },
      select: { subscriptionTier: true, subscriptionEndsAt: true, stripeSubId: true },
    });

    res.json({
      tier: business.subscriptionTier,
      endsAt: business.subscriptionEndsAt,
      hasSubscription: !!business.stripeSubId,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /webhook — Stripe webhook handler ────────────

router.post('/webhook', async (req, res) => {
  if (!isConfigured) return res.status(503).send('Not configured');

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[STRIPE] Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const businessId = session.metadata?.businessId;
        if (!businessId) break;

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = tierFromPriceId(priceId);

        await prisma.business.update({
          where: { id: businessId },
          data: {
            stripeCustomerId: session.customer,
            stripeSubId: subscription.id,
            subscriptionTier: tier,
            subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
          },
        });

        console.log(`[STRIPE] Business ${businessId} subscribed to ${tier}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const businessId = customer.metadata?.businessId;
        if (!businessId) break;

        const priceId = subscription.items.data[0]?.price?.id;
        const tier = subscription.status === 'active' ? tierFromPriceId(priceId) : 'FREE';

        await prisma.business.update({
          where: { id: businessId },
          data: {
            subscriptionTier: tier,
            subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
          },
        });

        console.log(`[STRIPE] Business ${businessId} subscription updated to ${tier}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const businessId = customer.metadata?.businessId;
        if (!businessId) break;

        await prisma.business.update({
          where: { id: businessId },
          data: {
            stripeSubId: null,
            subscriptionTier: 'FREE',
            subscriptionEndsAt: null,
          },
        });

        console.log(`[STRIPE] Business ${businessId} subscription cancelled`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn(`[STRIPE] Payment failed for customer ${invoice.customer}`);
        break;
      }
    }
  } catch (err) {
    console.error('[STRIPE] Webhook processing error:', err.message);
  }

  res.json({ received: true });
});

module.exports = router;

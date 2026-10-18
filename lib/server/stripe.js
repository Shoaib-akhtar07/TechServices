import 'server-only';
import Stripe from 'stripe';
import { prisma } from './db';

export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  yearly: process.env.STRIPE_PRICE_YEARLY,
};

/** Return the user's Stripe customer id, creating the customer on first checkout. */
export async function ensureCustomer(user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({ email: user.email, name: user.name || undefined, metadata: { userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/** Mirror a Stripe subscription object into our database. */
export async function syncSubscription(sub) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const user =
    (await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })) ||
    (sub.metadata?.userId && (await prisma.user.findUnique({ where: { id: sub.metadata.userId } })));
  if (!user) throw new Error(`No user for Stripe customer ${customerId}`);

  const item = sub.items?.data?.[0];
  const interval = item?.price?.recurring?.interval;
  // current_period_end moved from the subscription to its items in newer Stripe API versions.
  const periodEnd = sub.current_period_end ?? item?.current_period_end;
  const data = {
    stripeSubscriptionId: sub.id,
    status: sub.status,
    plan: interval === 'year' ? 'yearly' : 'monthly',
    currentPeriodEnd: new Date(periodEnd * 1000),
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
  };
  await prisma.subscription.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
}

/**
 * After checkout, pull the subscription straight from Stripe so Pro is active right away,
 * even before (or without) the webhook. Only accepts a completed session that belongs to this user.
 */
export async function syncCheckoutSession(sessionId, userId) {
  if (!stripe || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    if (session.client_reference_id !== userId || session.status !== 'complete' || !session.subscription) return false;
    await syncSubscription(session.subscription);
    return true;
  } catch (e) {
    console.error('Checkout sync failed', e);
    return false;
  }
}

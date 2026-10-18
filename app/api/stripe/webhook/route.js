import { stripe, syncSubscription } from '@/lib/server/stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stripe is the source of truth: every subscription change is mirrored into our DB here.
export async function POST(req) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return new Response('Stripe not configured', { status: 503 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), req.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return new Response(`Invalid signature: ${e.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        if (s.mode === 'subscription' && s.subscription) await syncSubscription(await stripe.subscriptions.retrieve(s.subscription));
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object);
        break;
    }
  } catch (e) {
    console.error('Stripe webhook error', e);
    return new Response('Webhook handler failed', { status: 500 }); // Stripe retries
  }
  return Response.json({ received: true });
}

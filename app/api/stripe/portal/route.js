import { getAccess } from '@/lib/server/auth';
import { stripe } from '@/lib/server/stripe';

export const runtime = 'nodejs';

// Stripe's hosted billing portal: change plan, update card, download invoices, cancel.
export async function POST(req) {
  const { user } = await getAccess();
  if (!user) return Response.json({ error: 'Please log in first.' }, { status: 401 });
  if (!stripe || !user.stripeCustomerId) return Response.json({ error: 'No billing account found.' }, { status: 400 });

  const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
  const portal = await stripe.billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: `${origin}/account/` });
  return Response.json({ url: portal.url });
}

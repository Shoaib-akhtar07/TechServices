import { getAccess } from '@/lib/server/auth';
import { stripe, PRICE_IDS, ensureCustomer } from '@/lib/server/stripe';

export const runtime = 'nodejs';

export async function POST(req) {
  const { user, pro } = await getAccess();
  if (!user) return Response.json({ error: 'Please log in first.' }, { status: 401 });
  if (pro) return Response.json({ error: 'You already have an active Pro subscription.' }, { status: 409 });

  const { plan } = await req.json().catch(() => ({}));
  const price = PRICE_IDS[plan];
  if (!stripe || !price) return Response.json({ error: 'Payments are not configured yet.', code: 'stripe_not_configured' }, { status: 503 });

  const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: await ensureCustomer(user),
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
    success_url: `${origin}/account/?checkout=success`,
    cancel_url: `${origin}/pricing/`,
  });
  return Response.json({ url: session.url });
}

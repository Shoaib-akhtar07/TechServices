import { prisma } from '@/lib/server/db';
import { getAccess, testBillingEnabled } from '@/lib/server/auth';

export const runtime = 'nodejs';

// Local development only: activate/cancel Pro without Stripe. Disabled in production.
export async function POST(req) {
  if (!testBillingEnabled()) return Response.json({ error: 'Not available.' }, { status: 404 });
  const { user } = await getAccess();
  if (!user) return Response.json({ error: 'Please log in first.' }, { status: 401 });

  const { action, plan = 'monthly' } = await req.json().catch(() => ({}));
  if (action === 'cancel') {
    await prisma.subscription.deleteMany({ where: { userId: user.id } });
    return Response.json({ ok: true });
  }
  const days = plan === 'yearly' ? 365 : 30;
  const data = { status: 'active', plan, currentPeriodEnd: new Date(Date.now() + days * 864e5), cancelAtPeriodEnd: false, stripeSubscriptionId: null };
  await prisma.subscription.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  return Response.json({ ok: true });
}

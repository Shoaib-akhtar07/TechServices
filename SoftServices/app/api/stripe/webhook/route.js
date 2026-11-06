import { forwardWebhook } from '@/lib/server/webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Stripe → .NET API (/api/webhooks/stripe). Same URL as before, so the Stripe dashboard needs no change.
export const POST = (req) => forwardWebhook(req, 'stripe', ['stripe-signature']);

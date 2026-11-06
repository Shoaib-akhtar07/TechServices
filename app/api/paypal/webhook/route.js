import { forwardWebhook } from '@/lib/server/webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PayPal → .NET API (/api/webhooks/paypal). Same URL as before, so the PayPal app needs no change.
export const POST = (req) =>
  forwardWebhook(req, 'paypal', ['paypal-auth-algo', 'paypal-cert-url', 'paypal-transmission-id', 'paypal-transmission-sig', 'paypal-transmission-time']);

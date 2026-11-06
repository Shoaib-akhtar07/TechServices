import 'server-only';
import { API_URL } from './api';

/**
 * Pass a payment provider's webhook to the .NET API unchanged (raw body + signature headers), so the
 * webhook URLs saved in the Stripe / PayPal dashboards keep working. The API checks the signature.
 */
export async function forwardWebhook(req, apiPath, headerNames) {
  const headers = { 'Content-Type': req.headers.get('content-type') || 'application/json' };
  for (const h of headerNames) {
    const v = req.headers.get(h);
    if (v) headers[h] = v;
  }
  try {
    const res = await fetch(`${API_URL}/api/webhooks/${apiPath}`, { method: 'POST', headers, body: await req.text(), cache: 'no-store' });
    return new Response(await res.text(), { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'text/plain' } });
  } catch (e) {
    console.error(`Webhook forward to API failed (${apiPath})`, e.message);
    return new Response('API unreachable', { status: 503 }); // the provider retries later
  }
}

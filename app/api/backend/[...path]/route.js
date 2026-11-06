import { API_URL, sessionToken } from '@/lib/server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Browser components call the .NET API through here: /api/backend/billing/manual/ → API /api/billing/manual.
// The user's API token is added on the server, so it never reaches the browser.
// Only the routes the browser needs are allowed; admin pages use server actions instead.
const ALLOWED = [
  /^auth\/register$/,
  /^billing\/(plans|history|manual|stripe\/(checkout|portal|sync)|paypal\/(checkout|sync|cancel)|test-activate|test-cancel)$/,
];

async function forward(req, { params }) {
  const path = (params.path || []).join('/');
  if (!ALLOWED.some((r) => r.test(path))) return Response.json({ error: 'Not found.' }, { status: 404 });

  const token = await sessionToken();
  const headers = { 'Content-Type': req.headers.get('content-type') || 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text();

  try {
    const res = await fetch(`${API_URL}/api/${path}${new URL(req.url).search}`, { method: req.method, headers, body, cache: 'no-store' });
    // Sign-up returns an API token; the browser logs in through NextAuth instead, so keep the token server-side.
    if (path === 'auth/register' && res.ok) return Response.json({ ok: true });
    return new Response(res.status === 204 ? null : await res.text(), {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (e) {
    console.error('API unreachable', e.message);
    return Response.json({ error: 'Our server is not reachable right now. Please try again in a moment.' }, { status: 502 });
  }
}

export { forward as GET, forward as POST };

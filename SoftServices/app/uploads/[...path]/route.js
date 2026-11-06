import { API_URL } from '@/lib/server/api';

export const runtime = 'nodejs';

// Blog images are stored by the .NET API; serve them from the website's own domain (/uploads/…)
// so the API itself does not have to be public.
export async function GET(_req, { params }) {
  const path = (params.path || []).map(encodeURIComponent).join('/');
  if (!/^[\w%-]+\/[\w%-]+\.(jpg|png|webp|gif)$/i.test(path)) return new Response('Not found', { status: 404 });
  const res = await fetch(`${API_URL}/uploads/${path}`, { cache: 'no-store' }).catch(() => null);
  if (!res?.ok) return new Response('Not found', { status: 404 });
  return new Response(res.body, {
    headers: {
      'Content-Type': res.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

import { getAccess } from '@/lib/server/auth';
import { PRO_TEMPLATES } from '@/lib/server/pro-templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Pro template content is only ever sent to signed-in subscribers.
export async function GET(req, { params }) {
  const tpl = PRO_TEMPLATES[params.id];
  if (!tpl) return Response.json({ error: 'Template not found.' }, { status: 404 });
  const { user, pro } = await getAccess();
  if (!user) return Response.json({ error: 'Please log in to use Pro templates.' }, { status: 401 });
  if (!pro) return Response.json({ error: 'This template is part of SoftServices Pro.' }, { status: 402 });
  return Response.json(tpl, { headers: { 'Cache-Control': 'private, no-store' } });
}

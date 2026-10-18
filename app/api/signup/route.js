import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim().slice(0, 80);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  if (password.length < 8) return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email } }))
    return Response.json({ error: 'An account with this email already exists. Please log in.' }, { status: 409 });

  await prisma.user.create({ data: { email, name: name || null, passwordHash: await bcrypt.hash(password, 12) } });
  return Response.json({ ok: true });
}

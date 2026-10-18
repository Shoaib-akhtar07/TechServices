import 'server-only';
import { prisma } from './db';

// Fair-use cap on Pro files per user per UTC day (protects the server from bots / abuse).
export const DAILY_LIMIT = Number(process.env.PRO_DAILY_LIMIT || 200);

export const today = () => new Date().toISOString().slice(0, 10);

export async function usageToday(userId) {
  const row = await prisma.usage.findUnique({ where: { userId_day: { userId, day: today() } } });
  return row?.count || 0;
}

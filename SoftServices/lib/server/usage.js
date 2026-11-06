import 'server-only';
import { api, ApiError } from './api';
import { getDailyLimit } from './settings';
import { getAccess } from './auth';

// Fair-use cap on Pro files per user per UTC day, counted by the .NET API.
// The limit is set in the admin panel (Settings → Limits).
export { getDailyLimit };

export const today = () => new Date().toISOString().slice(0, 10);

/** Pro files the current user has processed today. */
export async function usageToday() {
  return (await getAccess()).usage?.today || 0;
}

/** Count `n` Pro files for the current user. Returns false (and counts nothing) if that would pass the limit. */
export async function consume(_userId, n = 1) {
  try {
    await api('/pro/consume', { method: 'POST', body: { count: n } });
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) return false;
    throw e;
  }
}

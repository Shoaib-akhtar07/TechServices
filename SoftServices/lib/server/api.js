import 'server-only';
import { cookies, headers } from 'next/headers';
import { getToken } from 'next-auth/jwt';

// Every account, payment, blog and settings call goes to the .NET backend (SoftServices.Api).
// The browser never talks to it directly: server code calls it here, and browser components go
// through the /api/backend/ proxy. The user's API token lives only inside the encrypted session cookie.

export const API_URL = (process.env.API_URL || 'http://localhost:5087').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** The logged-in user's API token, read from the NextAuth session cookie (null when logged out). */
export async function sessionToken() {
  try {
    const t = await getToken({ req: { cookies: cookies(), headers: headers() } });
    return t?.apiToken || null;
  } catch {
    // Outside a request (build time) there are no cookies.
    return null;
  }
}

/**
 * Call the API. `token`: undefined = use the current session, null = anonymous, string = this token.
 * Returns the parsed JSON. Throws ApiError (with the API's `error` message) on a non-2xx response.
 */
export async function api(path, { method = 'GET', body, token, headers: extra } = {}) {
  const auth = token === undefined ? await sessionToken() : token;
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(auth && { Authorization: `Bearer ${auth}` }),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!res.ok) throw new ApiError(data?.error || `API error ${res.status}`, res.status, data);
  return data;
}

/** Upload a file (multipart) with the current session's token. Returns the parsed JSON. */
export async function apiUpload(path, file, field = 'file') {
  const token = await sessionToken();
  const form = new FormData();
  form.append(field, file, file.name || 'upload');
  const res = await fetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error || `Upload failed (${res.status})`, res.status, data);
  return data;
}

/** API upload URL (http://api-host/uploads/…) → the website's own /uploads/… path. */
export const toSiteUploadUrl = (url) => {
  const m = String(url || '').match(/\/uploads\/[^?#]+$/);
  return m ? m[0] : url;
};

/** Like api(), but returns null instead of throwing for 401 / 404. */
export async function apiOrNull(path, opts) {
  try {
    return await api(path, opts);
  } catch (e) {
    if (e instanceof ApiError && [401, 404].includes(e.status)) return null;
    throw e;
  }
}

// ---------- Public site configuration (prices, payment methods, site details, tool changes) ----------

const TTL_MS = 10_000;
let siteCache = null;

/**
 * GET /api/site, kept in memory for a few seconds (it is read on every page). When the API cannot be
 * reached (e.g. during `next build`), null is returned and callers use their built-in defaults.
 */
export async function getSiteConfig() {
  if (siteCache && siteCache.at > Date.now() - TTL_MS) return siteCache.value;
  try {
    const value = await api('/site', { token: null });
    siteCache = { at: Date.now(), value };
    return value;
  } catch (e) {
    console.warn(`Site settings unavailable (${API_URL}): ${e.message}`);
    return siteCache?.value || null;
  }
}

/** Call after an admin change so the next page shows it immediately. */
export function clearSiteCache() {
  siteCache = null;
}

'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api, apiUpload, ApiError, clearSiteCache, toSiteUploadUrl } from '@/lib/server/api';
import { requireAdmin } from '@/lib/server/admin';
import { SETTINGS, saveSettings, clearSetting } from '@/lib/server/settings';
import { getTool } from '@/lib/tools';
import { TOOL_TEXT_FIELDS, getToolOverrides } from '@/lib/server/content';

// Every action re-checks admin access (server actions are public endpoints), and the .NET API
// checks it again on every admin call.

/** Back to the page the form came from, with a message for the banner. */
function back(formData, msg, isError = false) {
  go(String(formData.get('back') || '/admin/'), msg, isError);
}

/** To an admin page, with a message for the banner. */
function go(path, msg, isError = false) {
  const safe = path.startsWith('/admin/') ? path : '/admin/';
  const url = new URL(safe, 'http://x');
  url.searchParams.delete('msg');
  url.searchParams.delete('err');
  url.searchParams.set(isError ? 'err' : 'msg', msg);
  redirect(url.pathname + url.search);
}

/** Run an API call; on an API error go back with its message. */
async function call(formData, fn) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) back(formData, e.message, true);
    throw e;
  }
}

const plan = (v) => (v === 'yearly' ? 'yearly' : 'monthly');

/** Trimmed text field, cut to `max` characters. */
const text = (formData, key, max = 500) => String(formData.get(key) ?? '').trim().slice(0, max);

/** Checkboxes send a hidden "0" followed by "1" when ticked, so the last value wins. */
const checked = (formData, key) => formData.getAll(key).at(-1) === '1';

/** Public pages are cached; after a change, rebuild all of them (header, footer, sitemap included). */
const refreshSite = () => {
  clearSiteCache();
  revalidatePath('/', 'layout');
};

// ---------- Settings ----------

// Saved by their own pages (Tools), not by the generic settings forms.
const MANAGED_ELSEWHERE = new Set(['tools']);

export async function saveSettingsAction(formData) {
  await requireAdmin();
  const values = {};
  for (const key of new Set(formData.keys())) if (SETTINGS[key] && !MANAGED_ELSEWHERE.has(key)) values[key] = String(formData.getAll(key).at(-1));

  if ('site_email' in values && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.site_email)) back(formData, 'Please enter a valid contact email.', true);
  if ('site_twitter' in values && values.site_twitter && !/^@\w{1,15}$/.test(values.site_twitter)) back(formData, 'The X / Twitter handle should look like @yourname.', true);
  if ('site_developer_url' in values && values.site_developer_url && !/^https?:\/\/\S+$/.test(values.site_developer_url)) back(formData, 'The developer website must start with https://', true);
  // Accept the whole <meta …> tag as well as just its content value.
  for (const k of ['verify_google', 'verify_bing']) {
    if (!(k in values)) continue;
    values[k] = (values[k].match(/content=["']([^"']+)["']/) || [, values[k]])[1].trim();
    if (values[k] && !/^[\w-]{6,100}$/.test(values[k])) back(formData, 'A verification code should only contain letters, numbers, - and _.', true);
  }

  // Office & profiles (local SEO). Numbers and links are checked so the structured data stays valid.
  if (values.biz_phone && !/^\+?[\d\s()-]{6,25}$/.test(values.biz_phone)) back(formData, 'The phone number may only contain digits, spaces, ( ) - and a leading +.', true);
  for (const [k, min, max] of [['biz_lat', -90, 90], ['biz_lng', -180, 180]]) {
    if (values[k] && !(Number(values[k]) >= min && Number(values[k]) <= max)) back(formData, 'Latitude must be -90 to 90 and longitude -180 to 180 (decimal degrees, e.g. 31.52037).', true);
  }
  if (values.biz_maps_url && !/^https:\/\/\S+$/.test(values.biz_maps_url)) back(formData, 'The Google Business Profile / Maps link must start with https://', true);
  if ('biz_country' in values) values.biz_country = values.biz_country.toUpperCase();
  if (values.biz_country && !/^[A-Z]{2}$/.test(values.biz_country)) back(formData, 'Country must be a 2-letter code such as PK, US or GB.', true);
  if ('social_profiles' in values) {
    const lines = values.social_profiles.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.some((l) => !/^https:\/\/\S+$/.test(l))) back(formData, 'Each profile must be a full link starting with https:// on its own line.', true);
    values.social_profiles = lines.join('\n');
  }

  if ('price_monthly' in values || 'price_yearly' in values) {
    for (const k of ['price_monthly', 'price_yearly']) {
      if (!(Number(values[k]) > 0)) back(formData, 'Prices must be numbers greater than 0.', true);
    }
    if (!/^[A-Za-z]{3}$/.test(values.currency || '')) back(formData, 'Currency must be a 3-letter code like USD, EUR or GBP.', true);
    values.currency = values.currency.toUpperCase();
  }
  if ('pro_daily_limit' in values && !(Number(values.pro_daily_limit) >= 1)) back(formData, 'The daily limit must be at least 1.', true);
  if ('stripe_secret_key' in values && values.stripe_secret_key && !/^(sk|rk)_(test|live)_/.test(values.stripe_secret_key))
    back(formData, 'The Stripe secret key should start with sk_test_ or sk_live_.', true);
  if ('paypal_mode' in values && !['sandbox', 'live'].includes(values.paypal_mode)) values.paypal_mode = 'sandbox';

  await call(formData, () => saveSettings(values));
  refreshSite();
  back(formData, 'Settings saved.');
}

export async function clearSecretAction(formData) {
  await requireAdmin();
  const key = String(formData.get('key'));
  if (!SETTINGS[key]?.secret) back(formData, 'Unknown setting.', true);
  await call(formData, () => clearSetting(key));
  back(formData, 'Removed.');
}

/** Test / create buttons: the API returns { message } or an { error } (shown as the banner). */
async function settingsButton(formData, path) {
  await requireAdmin();
  const r = await call(formData, () => api(`/admin/settings/${path}`, { method: 'POST' }));
  clearSiteCache();
  back(formData, r.message);
}

export async function testStripeAction(formData) {
  await settingsButton(formData, 'stripe/test');
}
export async function createStripePricesAction(formData) {
  await settingsButton(formData, 'stripe/create-prices');
}
export async function testPaypalAction(formData) {
  await settingsButton(formData, 'paypal/test');
}
export async function createPaypalPlansAction(formData) {
  await settingsButton(formData, 'paypal/create-plans');
}

// ---------- Users ----------

const userPath = (formData, action = '') => `/admin/users/${encodeURIComponent(String(formData.get('userId')))}${action}`;

export async function grantProAction(formData) {
  await requireAdmin();
  const days = Math.floor(Number(formData.get('days'))) || undefined;
  if (days !== undefined && (days < 1 || days > 3660)) back(formData, 'Days must be between 1 and 3660.', true);
  const r = await call(formData, () => api(userPath(formData, '/grant-pro'), { method: 'POST', body: { plan: plan(formData.get('plan')), days } }));
  back(formData, r.message);
}

export async function revokeProAction(formData) {
  await requireAdmin();
  const r = await call(formData, () => api(userPath(formData, '/revoke-pro'), { method: 'POST' }));
  back(formData, r.warning ? `${r.message} ${r.warning}` : r.message, !!r.warning);
}

export async function setRoleAction(formData) {
  await requireAdmin();
  const role = ['admin', 'author'].includes(formData.get('role')) ? formData.get('role') : 'user';
  const r = await call(formData, () => api(userPath(formData, '/role'), { method: 'PUT', body: { role } }));
  back(formData, r.message);
}

export async function createUserAction(formData) {
  await requireAdmin();
  const role = ['admin', 'author'].includes(formData.get('role')) ? formData.get('role') : 'user';
  const body = { email: text(formData, 'email', 254), name: text(formData, 'name', 80), password: String(formData.get('password') || ''), role };
  const r = await call(formData, () => api('/admin/users', { method: 'POST', body }));
  go(`/admin/users/?q=${encodeURIComponent(body.email)}`, r.message);
}

export async function updateUserAction(formData) {
  await requireAdmin();
  const body = { email: text(formData, 'email', 254), name: text(formData, 'name', 80) };
  const r = await call(formData, () => api(userPath(formData), { method: 'PUT', body }));
  back(formData, r.message);
}

export async function setPasswordAction(formData) {
  await requireAdmin();
  const r = await call(formData, () => api(userPath(formData, '/password'), { method: 'POST', body: { password: String(formData.get('password') || '') } }));
  back(formData, r.message);
}

export async function suspendUserAction(formData) {
  await requireAdmin();
  const suspended = formData.get('suspended') === '1';
  const r = await call(formData, () => api(userPath(formData, '/suspend'), { method: 'POST', body: { suspended } }));
  back(formData, r.message);
}

export async function deleteUserAction(formData) {
  await requireAdmin();
  await call(formData, () => api(userPath(formData), { method: 'DELETE' }));
  back(formData, 'User deleted.');
}

// ---------- Manual payments ----------

const paymentPath = (formData, action) => `/admin/payments/manual/${encodeURIComponent(String(formData.get('id')))}/${action}`;

export async function approvePaymentAction(formData) {
  await requireAdmin();
  const r = await call(formData, () => api(paymentPath(formData, 'approve'), { method: 'POST' }));
  back(formData, r.message);
}

export async function rejectPaymentAction(formData) {
  await requireAdmin();
  const adminNote = text(formData, 'adminNote', 300) || null;
  const r = await call(formData, () => api(paymentPath(formData, 'reject'), { method: 'POST', body: { adminNote } }));
  back(formData, r.message);
}

// ---------- Tools ----------

// Limits keep search snippets sensible: Google shows ~60 characters of a title and ~160 of a description.
const TOOL_LIMITS = { name: 40, short: 120, title: 70, description: 170 };

export async function saveToolAction(formData) {
  await requireAdmin();
  const slug = text(formData, 'slug', 80);
  const tool = getTool(slug);
  if (!tool) back(formData, 'Unknown tool.', true);

  // Only what differs from the built-in text is stored, so later improvements in code still show up.
  const change = {};
  for (const k of TOOL_TEXT_FIELDS) {
    const v = text(formData, k, TOOL_LIMITS[k]);
    if (v && v !== tool[k]) change[k] = v;
  }
  if (checked(formData, 'hidden')) change.hidden = true;

  const all = await getToolOverrides();
  if (Object.keys(change).length) all[slug] = change;
  else delete all[slug];
  await call(formData, () => saveSettings({ tools: JSON.stringify(all) }));
  refreshSite();
  back(formData, `${change.name || tool.name} saved.`);
}

export async function resetToolAction(formData) {
  await requireAdmin();
  const slug = text(formData, 'slug', 80);
  const all = await getToolOverrides();
  delete all[slug];
  await call(formData, () => saveSettings({ tools: JSON.stringify(all) }));
  refreshSite();
  back(formData, 'Tool reset to its original text and shown again.');
}

// ---------- Blog ----------

export async function savePostAction(formData) {
  await requireAdmin();
  const id = text(formData, 'id', 40);
  const date = text(formData, 'date', 10);
  if (date && Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) back(formData, 'The date is not valid.', true);
  const tool = text(formData, 'tool', 80);

  // Cover image: a newly chosen file is uploaded first; "remove" clears it; otherwise keep the URL field.
  let coverImageUrl = text(formData, 'coverImageUrl', 500) || null;
  const file = formData.get('coverFile');
  if (file && typeof file === 'object' && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) back(formData, 'The cover image can be at most 5 MB.', true);
    const up = await call(formData, () => apiUpload('/posts/uploads', file));
    coverImageUrl = toSiteUploadUrl(up.url);
  }
  if (checked(formData, 'removeCover')) coverImageUrl = null;

  const body = {
    title: text(formData, 'title', 120),
    slug: text(formData, 'slug', 100),
    description: text(formData, 'description', 200),
    body: text(formData, 'body', 50000),
    tool: getTool(tool) ? tool : null,
    coverImageUrl,
    tags: text(formData, 'tags', 300).split(',').map((t) => t.trim()).filter(Boolean),
    published: checked(formData, 'published'),
    ...(date && { publishedAt: `${date}T00:00:00Z` }),
  };

  const post = await call(formData, () =>
    id ? api(`/posts/${encodeURIComponent(id)}`, { method: 'PUT', body }) : api('/posts', { method: 'POST', body }),
  );
  refreshSite();
  go(`/admin/blog/${post.id}/`, body.published ? 'Post saved and published.' : 'Draft saved (not visible on the site).');
}

export async function deletePostAction(formData) {
  await requireAdmin();
  await api(`/posts/${encodeURIComponent(text(formData, 'id', 40))}`, { method: 'DELETE' }).catch(() => null);
  refreshSite();
  go('/admin/blog/', 'Post deleted.');
}

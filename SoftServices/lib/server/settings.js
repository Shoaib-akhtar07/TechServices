import 'server-only';
import { PLANS } from '@/lib/plans';
import { api, clearSiteCache, getSiteConfig } from './api';

// Admin settings are stored by the .NET API (secrets encrypted there). These keys can be saved
// from the admin panel; `secret` ones are never sent back, only whether they are set.
export const SETTINGS = Object.fromEntries(
  [
    'free_mode', 'site_email', 'site_twitter', 'site_developer', 'site_developer_url', 'site_announcement', 'verify_google', 'verify_bing', 'tools',
    'biz_name', 'biz_phone', 'biz_street', 'biz_city', 'biz_region', 'biz_postal', 'biz_country', 'biz_lat', 'biz_lng', 'biz_hours', 'biz_maps_url', 'social_profiles',
    'currency', 'price_monthly', 'price_yearly', 'pro_daily_limit',
    'stripe_enabled', 'stripe_secret_key', 'stripe_webhook_secret', 'stripe_price_monthly', 'stripe_price_yearly',
    'paypal_enabled', 'paypal_mode', 'paypal_client_id', 'paypal_client_secret', 'paypal_webhook_id', 'paypal_product_id', 'paypal_plan_monthly', 'paypal_plan_yearly',
    'manual_enabled', 'manual_label', 'manual_methods', 'manual_price_monthly', 'manual_price_yearly', 'manual_instructions',
  ].map((k) => [k, { secret: ['stripe_secret_key', 'stripe_webhook_secret', 'paypal_client_secret'].includes(k) }]),
);

/** Shown in place of a saved secret (the admin form only checks that one is set). */
const SAVED = '••••saved';

/** Admin only: every setting as a string. Saved secrets come back as a placeholder, unsaved ones as ''. */
export async function getSettings() {
  const { values } = await api('/admin/settings');
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === 'object' && v !== null ? (v.saved ? SAVED : '') : String(v ?? '')]));
}

/** Admin only. Empty secret fields are ignored by the API, so a saved key is never wiped by accident. */
export async function saveSettings(values) {
  await api('/admin/settings', { method: 'PUT', body: values });
  clearSiteCache();
}

export async function clearSetting(key) {
  await api(`/admin/settings/${encodeURIComponent(key)}`, { method: 'DELETE' });
  clearSiteCache();
}

const DEFAULT_PLANS = { currency: 'USD', plans: PLANS };

/** Display plans with the admin's prices. */
export async function getPlans() {
  const c = await getSiteConfig();
  if (!c) return DEFAULT_PLANS;
  const { currency, monthly, yearly } = c.plans;
  const save = Math.round((1 - yearly.price / (monthly.price * 12)) * 100);
  return {
    currency,
    plans: {
      monthly: { ...PLANS.monthly, price: monthly.price },
      yearly: { ...PLANS.yearly, price: yearly.price, perMonth: yearly.perMonth, save, note: yearly.note },
    },
  };
}

/** Free mode: everything is free, no plans. */
export async function isFreeMode() {
  return (await getSiteConfig())?.freeMode ?? true;
}

export async function getDailyLimit() {
  return (await getSiteConfig())?.dailyLimit ?? 200;
}

/** Which checkout options are switched on and fully configured. */
export async function paymentMethods() {
  return (await getSiteConfig())?.methods || { stripe: false, paypal: false, manual: false, manualLabel: 'Bank transfer' };
}

/** Manual payment details for customers (null when that method is off). */
export async function manualPaymentInfo() {
  return (await getSiteConfig())?.manual || null;
}

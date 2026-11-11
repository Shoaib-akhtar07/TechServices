import { requireAdmin } from '@/lib/server/admin';
import { getSettings, paymentMethods } from '@/lib/server/settings';
import { saveSettingsAction, clearSecretAction, testStripeAction, createStripePricesAction, testPaypalAction, createPaypalPlansAction } from '../actions';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Badge, BackField, Code, Field, Flash, PageTitle, Secret, Section, Toggle, dangerBtn, input, primaryBtn, smallBtn } from '@/components/admin/ui';

const BACK = '/admin/settings/';
const Hidden = () => <BackField to={BACK} />;

export default async function AdminSettings({ searchParams }) {
  await requireAdmin();
  const [s, live] = await Promise.all([getSettings(), paymentMethods()]);
  const origin = (process.env.NEXTAUTH_URL || 'https://yourdomain.com').replace(/\/$/, '');
  const status = (on, enabled) => <Badge tone={on ? 'green' : enabled ? 'amber' : 'slate'}>{on ? 'Live' : enabled ? 'Enabled — setup incomplete' : 'Off'}</Badge>;

  return (
    <>
      <PageTitle eyebrow="System" sub="Everything here is saved in the database. Secret keys are stored encrypted.">Settings</PageTitle>
      <Flash searchParams={searchParams} />

      <div className="space-y-6">
        <Section
          title="Free mode"
          status={<Badge tone={s.free_mode === '1' ? 'green' : 'slate'}>{s.free_mode === '1' ? 'On — everything is free' : 'Off — Pro is paid'}</Badge>}
          help={<p>When on, every signed-in user gets all Pro tools, editors and templates for free, and the pricing page, Pro badges and “Go Pro” buttons are hidden. The daily file limit below still applies. Paid subscriptions keep running.</p>}
        >
          <form action={saveSettingsAction} className="flex flex-wrap items-center gap-4">
            <Hidden />
            <Toggle name="free_mode" on={s.free_mode === '1'} label="Make the whole site free" />
            <ConfirmButton className={primaryBtn}>Save</ConfirmButton>
          </form>
        </Section>

        <Section title="Site details" help={<p>Shown in the footer, the contact page and search results. The site name and domain are part of every link, so they are changed in <Code>lib/site.js</Code> by a developer.</p>}>
          <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
            <Hidden />
            <Field label="Contact email">
              <input name="site_email" type="email" defaultValue={s.site_email} className={input} />
            </Field>
            <Field label="X / Twitter handle" hint="Starts with @">
              <input name="site_twitter" defaultValue={s.site_twitter} className={input} />
            </Field>
            <Field label="Developer credit (footer)">
              <input name="site_developer" defaultValue={s.site_developer} className={input} />
            </Field>
            <Field label="Developer website" hint="Optional — makes the credit a link (https://…)">
              <input name="site_developer_url" type="url" defaultValue={s.site_developer_url} className={input} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Announcement bar" hint="Optional line shown above the header on every page. Links: [text](/path/). Leave empty to hide.">
                <input name="site_announcement" defaultValue={s.site_announcement} maxLength={200} className={input} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <ConfirmButton className={primaryBtn}>Save site details</ConfirmButton>
            </div>
          </form>
        </Section>

        <Section
          title="Office & profiles (local SEO)"
          help={
            <>
              <p>
                Shown on the contact page and in the footer, and sent to Google as LocalBusiness data. Nothing is shown until a street and city are saved.
                Write the name, address and phone exactly as on your Google Business Profile.
              </p>
            </>
          }
        >
          <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
            <Hidden />
            <Field label="Business name" hint="As on Google Business Profile. Empty = the site name.">
              <input name="biz_name" defaultValue={s.biz_name} maxLength={100} className={input} />
            </Field>
            <Field label="Phone" hint="With country code, e.g. +92 300 1234567">
              <input name="biz_phone" type="tel" defaultValue={s.biz_phone} maxLength={25} className={input} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Street address">
                <input name="biz_street" defaultValue={s.biz_street} maxLength={200} className={input} />
              </Field>
            </div>
            <Field label="City">
              <input name="biz_city" defaultValue={s.biz_city} maxLength={80} className={input} />
            </Field>
            <Field label="Province / state">
              <input name="biz_region" defaultValue={s.biz_region} maxLength={80} className={input} />
            </Field>
            <Field label="Postal code">
              <input name="biz_postal" defaultValue={s.biz_postal} maxLength={20} className={input} />
            </Field>
            <Field label="Country code" hint="2 letters, e.g. PK">
              <input name="biz_country" defaultValue={s.biz_country} maxLength={2} className={input} />
            </Field>
            <Field label="Latitude" hint="From Google Maps: right-click the pin, copy the first number">
              <input name="biz_lat" inputMode="decimal" defaultValue={s.biz_lat} className={input} />
            </Field>
            <Field label="Longitude">
              <input name="biz_lng" inputMode="decimal" defaultValue={s.biz_lng} className={input} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Opening hours" hint="schema.org format, separated by ; — e.g. Mo-Fr 09:00-18:00; Sa 10:00-14:00">
                <input name="biz_hours" defaultValue={s.biz_hours} maxLength={200} className={input} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Google Business Profile / Maps link" hint="Share link of your profile (https://maps.app.goo.gl/… or https://g.page/…)">
                <input name="biz_maps_url" type="url" defaultValue={s.biz_maps_url} className={input} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Official profiles" hint="One link per line: Facebook, LinkedIn, YouTube, Instagram, Crunchbase, Wikipedia… Tells search engines and AI tools these accounts are yours.">
                <textarea name="social_profiles" rows={4} defaultValue={s.social_profiles} className={input} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <ConfirmButton className={primaryBtn}>Save office &amp; profiles</ConfirmButton>
            </div>
          </form>
        </Section>

        <Section
          title="Search engines"
          status={<Badge tone={s.verify_google && s.verify_bing ? 'green' : s.verify_google || s.verify_bing ? 'amber' : 'slate'}>{[s.verify_google && 'Google', s.verify_bing && 'Bing'].filter(Boolean).join(' + ') || 'Not verified'}</Badge>}
          help={
            <p>
              Google Search Console → Add property → HTML tag: copy only the <Code>content</Code> value. Bing Webmaster Tools → Add site → HTML meta tag: same. Then submit{' '}
              <Code>{origin}/sitemap.xml</Code> in both.
            </p>
          }
        >
          <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
            <Hidden />
            <Field label="Google verification code">
              <input name="verify_google" defaultValue={s.verify_google} className={input} autoComplete="off" />
            </Field>
            <Field label="Bing verification code">
              <input name="verify_bing" defaultValue={s.verify_bing} className={input} autoComplete="off" />
            </Field>
            <div className="sm:col-span-2">
              <ConfirmButton className={primaryBtn}>Save codes</ConfirmButton>
            </div>
          </form>
        </Section>

        <Section title="Prices & limits" help={<p>Shown on the pricing page. After changing a price, create new Stripe prices / PayPal plans below so customers are charged the new amount.</p>}>
          <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-4">
            <Hidden />
            <Field label="Currency" hint="USD, EUR, GBP…">
              <input name="currency" defaultValue={s.currency} maxLength={3} className={input} />
            </Field>
            <Field label="Monthly price">
              <input name="price_monthly" type="number" step="0.01" min="0.5" defaultValue={s.price_monthly} className={input} />
            </Field>
            <Field label="Yearly price">
              <input name="price_yearly" type="number" step="0.01" min="0.5" defaultValue={s.price_yearly} className={input} />
            </Field>
            <Field label="Pro files per user per day">
              <input name="pro_daily_limit" type="number" min="1" defaultValue={s.pro_daily_limit} className={input} />
            </Field>
            <div className="sm:col-span-4">
              <ConfirmButton className={primaryBtn}>Save</ConfirmButton>
            </div>
          </form>
        </Section>

        <Section
          title="Card payments (Stripe)"
          status={status(live.stripe, s.stripe_enabled === '1')}
          help={
            <>
              <p>Stripe Dashboard → Developers → API keys → copy the <strong>Secret key</strong>.</p>
              <p>
                Webhook: Developers → Webhooks → add endpoint <Code>{origin}/api/stripe/webhook/</Code> with events <Code>checkout.session.completed</Code>,{' '}
                <Code>customer.subscription.created</Code>, <Code>customer.subscription.updated</Code>, <Code>customer.subscription.deleted</Code> → copy the signing secret.
              </p>
            </>
          }
        >
          <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
            <Hidden />
            <div className="sm:col-span-2">
              <Toggle name="stripe_enabled" on={s.stripe_enabled === '1'} label="Show “Pay with card” on the pricing page" />
            </div>
            <Secret name="stripe_secret_key" label="Secret key" value={s.stripe_secret_key} hint="sk_test_… while testing, sk_live_… when live" />
            <Secret name="stripe_webhook_secret" label="Webhook signing secret" value={s.stripe_webhook_secret} hint="whsec_…" />
            <Field label="Monthly price ID" hint="price_… — or use “Create prices” below">
              <input name="stripe_price_monthly" defaultValue={s.stripe_price_monthly} className={input} />
            </Field>
            <Field label="Yearly price ID">
              <input name="stripe_price_yearly" defaultValue={s.stripe_price_yearly} className={input} />
            </Field>
            <div className="sm:col-span-2">
              <ConfirmButton className={primaryBtn}>Save Stripe settings</ConfirmButton>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-900/10 pt-4 dark:border-white/10">
            <form action={testStripeAction}>
              <Hidden />
              <ConfirmButton className={smallBtn}>Test connection</ConfirmButton>
            </form>
            <form action={createStripePricesAction}>
              <Hidden />
              <ConfirmButton confirm={`Create a new Stripe product with ${s.price_monthly}/month and ${s.price_yearly}/year (${s.currency}) and use it for new checkouts?`} className={smallBtn}>
                Create prices from the amounts above
              </ConfirmButton>
            </form>
            {s.stripe_secret_key && (
              <form action={clearSecretAction}>
                <Hidden />
                <input type="hidden" name="key" value="stripe_secret_key" />
                <ConfirmButton confirm="Remove the saved Stripe secret key?" className={dangerBtn}>
                  Remove key
                </ConfirmButton>
              </form>
            )}
          </div>
        </Section>

        <Section
          title="PayPal"
          status={status(live.paypal, s.paypal_enabled === '1')}
          help={
            <>
              <p>
                developer.paypal.com → Apps & Credentials → create an app (use <strong>Sandbox</strong> to test, <strong>Live</strong> for real money) → copy the Client ID and Secret.
              </p>
              <p>
                Webhook: in the same app add <Code>{origin}/api/paypal/webhook/</Code> with events <Code>BILLING.SUBSCRIPTION.*</Code> (activated, updated, cancelled, suspended, expired) and{' '}
                <Code>PAYMENT.SALE.COMPLETED</Code> → copy the Webhook ID.
              </p>
            </>
          }
        >
          <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
            <Hidden />
            <div className="sm:col-span-2">
              <Toggle name="paypal_enabled" on={s.paypal_enabled === '1'} label="Show “Pay with PayPal” on the pricing page" />
            </div>
            <Field label="Mode" hint="Sandbox and Live use different credentials and plans">
              <select name="paypal_mode" defaultValue={s.paypal_mode} className={input}>
                <option value="sandbox">Sandbox (testing)</option>
                <option value="live">Live</option>
              </select>
            </Field>
            <Field label="Client ID">
              <input name="paypal_client_id" defaultValue={s.paypal_client_id} className={input} autoComplete="off" />
            </Field>
            <Secret name="paypal_client_secret" label="Secret" value={s.paypal_client_secret} />
            <Field label="Webhook ID">
              <input name="paypal_webhook_id" defaultValue={s.paypal_webhook_id} className={input} />
            </Field>
            <Field label="Monthly plan ID" hint="P-… — or use “Create plans” below">
              <input name="paypal_plan_monthly" defaultValue={s.paypal_plan_monthly} className={input} />
            </Field>
            <Field label="Yearly plan ID">
              <input name="paypal_plan_yearly" defaultValue={s.paypal_plan_yearly} className={input} />
            </Field>
            <div className="sm:col-span-2">
              <ConfirmButton className={primaryBtn}>Save PayPal settings</ConfirmButton>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-900/10 pt-4 dark:border-white/10">
            <form action={testPaypalAction}>
              <Hidden />
              <ConfirmButton className={smallBtn}>Test connection</ConfirmButton>
            </form>
            <form action={createPaypalPlansAction}>
              <Hidden />
              <ConfirmButton confirm={`Create a PayPal product with ${s.price_monthly}/month and ${s.price_yearly}/year (${s.currency}) in ${s.paypal_mode} mode and use it for new checkouts?`} className={smallBtn}>
                Create plans from the amounts above
              </ConfirmButton>
            </form>
            {s.paypal_product_id && <span className="self-center text-xs text-slate-500">Product: {s.paypal_product_id}</span>}
          </div>
        </Section>

        <Section
          title="Manual payments (bank / JazzCash / Easypaisa)"
          status={status(live.manual, s.manual_enabled === '1')}
          help={<p>Customers see your instructions, send the money, and submit the transaction ID. You approve it under Manual payments, and Pro is switched on for 30 or 365 days.</p>}
        >
          <form action={saveSettingsAction} className="grid gap-4 sm:grid-cols-2">
            <Hidden />
            <div className="sm:col-span-2">
              <Toggle name="manual_enabled" on={s.manual_enabled === '1'} label="Show this option on the pricing page" />
            </div>
            <Field label="Button text">
              <input name="manual_label" defaultValue={s.manual_label} className={input} />
            </Field>
            <Field label="Methods (comma-separated)" hint="Customers pick one of these">
              <input name="manual_methods" defaultValue={s.manual_methods} className={input} />
            </Field>
            <Field label="Monthly amount" hint="As shown to customers, e.g. PKR 1,700">
              <input name="manual_price_monthly" defaultValue={s.manual_price_monthly} className={input} />
            </Field>
            <Field label="Yearly amount" hint="e.g. PKR 13,500">
              <input name="manual_price_yearly" defaultValue={s.manual_price_yearly} className={input} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Payment instructions" hint="Account title, account / IBAN / wallet numbers, and anything the customer should write in the reference.">
                <textarea
                  name="manual_instructions"
                  rows={6}
                  defaultValue={s.manual_instructions}
                  className={input}
                  placeholder={'Bank: Meezan Bank\nAccount title: ...\nIBAN: PK00 ...\n\nJazzCash / Easypaisa: 03xx xxxxxxx (Name)'}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <ConfirmButton className={primaryBtn}>Save manual payment settings</ConfirmButton>
            </div>
          </form>
        </Section>
      </div>
    </>
  );
}

import JsonLd from '@/components/JsonLd';
import PricingClient from '@/components/PricingClient';
import { getAccess, testBillingEnabled } from '@/lib/server/auth';
import { redirect } from 'next/navigation';
import { getPlans, paymentMethods, isFreeMode } from '@/lib/server/settings';
import { fmtPrice } from '@/lib/plans';
import { SITE } from '@/lib/site';

// Prices and payment methods are managed in the admin panel.
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { plans, currency } = await getPlans();
  return {
    title: 'Pricing – SoftServices Pro Plans',
    description: `Unlock PDF to Word, Excel & PowerPoint, Office to PDF, OCR and PDF password tools with SoftServices Pro. From ${fmtPrice(plans.yearly.perMonth, currency)}/month. Cancel anytime.`,
    alternates: { canonical: '/pricing/' },
  };
}

const FAQS = [
  { q: 'Are the standard tools still free?', a: 'Yes. All browser-based tools — merge, split, compress, sign, convert images and more — stay free with no limits. Pro adds server-powered tools on top.' },
  { q: 'How do I cancel?', a: 'Open your Account page and click “Manage billing” (card) or “Cancel PayPal subscription”. You keep Pro until the end of the period you already paid for.' },
  { q: 'Which payment methods do you accept?', a: 'The options shown above — credit and debit cards, PayPal, and local bank or mobile-wallet transfers where available. Card and PayPal payments are processed securely by our payment partners; we never see your card number.' },
  { q: 'Can I switch between monthly and yearly?', a: 'Yes. Cancel your current plan and subscribe to the other one when it ends, or contact support and we will help you switch.' },
];

export default async function Pricing() {
  if (await isFreeMode()) redirect('/');
  const [{ plans, currency }, methods, { sub, paid }] = await Promise.all([getPlans(), paymentMethods(), getAccess()]);
  // Manual / admin-granted Pro does not renew by itself, so those users may pay again to extend it.
  const canRenew = paid && ['manual', 'admin'].includes(sub.provider);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-14">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Product',
              name: `${SITE.name} Pro`,
              description: 'Subscription that unlocks server-powered PDF tools: PDF to Office, Office to PDF, OCR, protect and unlock PDF.',
              brand: { '@type': 'Brand', name: SITE.name },
              offers: Object.values(plans).map((p) => ({
                '@type': 'Offer',
                name: `${SITE.name} Pro ${p.label}`,
                price: String(p.price),
                priceCurrency: currency,
                url: `${SITE.url}/pricing/`,
              })),
            },
            { '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
          ],
        }}
      />
      <div className="text-center">
        <h1 className="text-5xl font-semibold sm:text-6xl">Simple pricing, serious PDF power</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          Keep using every free tool forever. Go Pro when you need Office conversions, OCR and password protection.
        </p>
      </div>
      <PricingClient plans={plans} currency={currency} methods={methods} canRenew={canRenew} testBilling={testBillingEnabled()} />
      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-3xl font-semibold">Billing questions</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="rounded-2xl card p-5">
              <summary className="cursor-pointer list-none font-semibold">{f.q}</summary>
              <p className="mt-3 text-slate-600 dark:text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

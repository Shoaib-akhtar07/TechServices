import JsonLd from '@/components/JsonLd';
import PricingClient from '@/components/PricingClient';
import { PLANS } from '@/lib/plans';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Pricing – NexPDF Pro Plans',
  description: `Unlock PDF to Word, Excel & PowerPoint, Office to PDF, OCR and PDF password tools with NexPDF Pro. From $${PLANS.yearly.perMonth.toFixed(2)}/month. Cancel anytime.`,
  alternates: { canonical: '/pricing/' },
};

const FAQS = [
  { q: 'Are the standard tools still free?', a: 'Yes. All 22 browser-based tools — merge, split, compress, sign, convert images and more — stay free with no limits. Pro adds server-powered tools on top.' },
  { q: 'How do I cancel?', a: 'Open your Account page and click “Manage billing”. You can cancel in one click and keep Pro until the end of the period you already paid for.' },
  { q: 'Which payment methods do you accept?', a: 'All major credit and debit cards (Visa, Mastercard, American Express) plus Apple Pay and Google Pay where available. Payments are processed securely by Stripe — we never see your card number.' },
  { q: 'Can I switch between monthly and yearly?', a: 'Yes, any time from Manage billing. Stripe automatically credits the unused part of your current plan.' },
];

export default function Pricing() {
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
              offers: Object.values(PLANS).map((p) => ({
                '@type': 'Offer',
                name: `${SITE.name} Pro ${p.label}`,
                price: String(p.price),
                priceCurrency: 'USD',
                url: `${SITE.url}/pricing/`,
              })),
            },
            { '@type': 'FAQPage', mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
          ],
        }}
      />
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Simple pricing, serious PDF power</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          Keep using every free tool forever. Go Pro when you need Office conversions, OCR and password protection.
        </p>
      </div>
      <PricingClient testBilling={process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_TEST_BILLING === 'true'} />
      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-2xl font-bold">Billing questions</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <summary className="cursor-pointer list-none font-semibold">{f.q}</summary>
              <p className="mt-3 text-slate-600 dark:text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

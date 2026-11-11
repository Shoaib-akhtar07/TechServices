import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';
import JsonLd from '@/components/JsonLd';
import { COMPARISONS, getComparison } from '@/lib/comparisons';
import { SITE } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

const fmt = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function generateMetadata({ params }) {
  const c = getComparison(params.slug);
  if (!c) return {};
  const url = `/compare/${c.slug}/`;
  return {
    title: { absolute: `${c.title} | ${SITE.name}` },
    description: c.description,
    alternates: { canonical: url },
    openGraph: { title: c.title, description: c.description, url, type: 'article', siteName: SITE.name },
  };
}

export default function ComparisonPage({ params }) {
  const c = getComparison(params.slug);
  if (!c) notFound();
  const url = `${SITE.url}/compare/${c.slug}/`;
  const others = COMPARISONS.filter((x) => x.slug !== c.slug);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Article',
              headline: c.title,
              description: c.description,
              url,
              dateModified: c.checked,
              author: { '@id': `${SITE.url}/#org` },
              publisher: { '@id': `${SITE.url}/#org` },
              about: [
                { '@type': 'SoftwareApplication', name: SITE.name, url: SITE.url, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any (web browser)' },
                { '@type': 'SoftwareApplication', name: c.competitor, url: c.sources[0][1], applicationCategory: 'UtilitiesApplication' },
              ],
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
                { '@type': 'ListItem', position: 2, name: 'Compare', item: `${SITE.url}/compare/` },
                { '@type': 'ListItem', position: 3, name: `${c.competitor} alternative`, item: url },
              ],
            },
          ],
        }}
      />
      <article className="mx-auto max-w-4xl px-4 pt-6">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <Link href="/" className="hover:text-brand-600">Home</Link> <span aria-hidden>›</span>{' '}
          <Link href="/compare/" className="hover:text-brand-600">Compare</Link> <span aria-hidden>›</span>{' '}
          <span className="text-slate-700 dark:text-slate-300">{c.competitor} alternative</span>
        </nav>

        <h1 className="mt-8 text-4xl font-semibold sm:text-5xl">{c.title}</h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">{c.intro}</p>
        <p className="mt-3 text-sm text-slate-500">
          Written by the {SITE.name} team — this is our own product. {c.competitor} facts checked on{' '}
          <time dateTime={c.checked}>{fmt(c.checked)}</time> from {c.competitor}’s own pages (sources below).
        </p>

        <section className="mt-10 rounded-2xl border border-brand-200 bg-brand-50/60 p-6 dark:border-brand-500/30 dark:bg-brand-500/10">
          <h2 className="text-2xl font-semibold">Which one should you use?</h2>
          <p className="mt-3 text-slate-700 dark:text-slate-300">{c.verdict}</p>
          <Link href="/" className="btn-primary mt-5 inline-flex">Try {SITE.name} free</Link>
        </section>

        <h2 className="mt-14 text-3xl font-semibold">{SITE.name} vs {c.competitor} at a glance</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">{SITE.name} compared with {c.competitor}</caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th scope="col" className="px-4 py-3 font-medium text-slate-500" />
                <th scope="col" className="px-4 py-3 font-semibold">{SITE.name}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{c.competitor}</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map(([label, ours, theirs]) => (
                <tr key={label} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800/60">
                  <th scope="row" className="px-4 py-3 font-medium text-slate-500">{label}</th>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{ours}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{theirs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">{c.competitor} prices and limits as published on {fmt(c.checked)}; they may have changed since.</p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl card p-6">
            <h2 className="text-xl font-semibold">Where {c.competitor} is stronger</h2>
            <ul className="mt-4 space-y-3">
              {c.theirStrengths.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{s}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl card p-6">
            <h2 className="text-xl font-semibold">Why people switch to {SITE.name}</h2>
            <ul className="mt-4 space-y-3">
              {c.ourStrengths.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{s}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold">Popular tools</h2>
          <ul className="mt-4 flex flex-wrap gap-2 text-sm">
            {[['merge-pdf', 'Merge PDF'], ['compress-pdf', 'Compress PDF'], ['sign-pdf', 'Sign PDF'], ['pdf-to-jpg', 'PDF to JPG'], ['convert-image', 'Convert images'], ['png-to-jpg', 'PNG to JPG']].map(([s, n]) => (
              <li key={s}><Link href={`/${s}/`} className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900">{n}</Link></li>
            ))}
          </ul>
        </section>

        {others.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-semibold">Other comparisons</h2>
            <ul className="mt-4 space-y-2">
              {others.map((o) => (
                <li key={o.slug}><Link href={`/compare/${o.slug}/`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">{o.competitor} alternative</Link></li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-14 border-t border-slate-200 pt-6 dark:border-slate-800">
          <h2 className="text-lg font-semibold">Sources</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {c.sources.map(([name, href]) => (
              <li key={href}><a href={href} rel="nofollow noopener" target="_blank" className="text-brand-700 hover:underline dark:text-brand-300">{name}</a> — checked {fmt(c.checked)}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">{c.competitor} is a trademark of its owner. {SITE.name} is not affiliated with {c.competitor}. Spotted something out of date? <Link href="/contact/" className="underline">Tell us</Link> and we will correct it.</p>
        </section>
      </article>
    </>
  );
}

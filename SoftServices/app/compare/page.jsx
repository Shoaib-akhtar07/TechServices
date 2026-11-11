import Link from 'next/link';
import { COMPARISONS } from '@/lib/comparisons';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Compare PDF Tools',
  description: `How ${SITE.name} compares with other online PDF tools: where files are processed, limits, price and apps.`,
  alternates: { canonical: '/compare/' },
};

export default function Compare() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-14">
      <h1 className="text-5xl font-semibold">Compare {SITE.name}</h1>
      <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
        Fair, sourced comparisons with other online PDF tools. The biggest difference: {SITE.name}’s standard tools work inside your browser, so your files are not uploaded.
      </p>
      <div className="mt-10 space-y-5">
        {COMPARISONS.map((c) => (
          <Link key={c.slug} href={`/compare/${c.slug}/`} className="card card-hover block rounded-2xl p-6">
            <h2 className="text-2xl font-semibold">{c.competitor} alternative</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

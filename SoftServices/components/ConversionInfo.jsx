import Link from 'next/link';
import { FORMATS, INPUTS, OUTPUTS } from '@/lib/image-formats';

// Server-rendered content for the image converter pages: a comparison table of the two formats,
// why people convert, and links to the neighbouring conversions (plain HTML, readable without JS).

const ROWS = [
  ['Full name', 'full'],
  ['Introduced', 'year'],
  ['Compression', 'compression'],
  ['Transparency', 'transparency'],
  ['Animation', 'animation'],
  ['Best for', 'bestFor'],
];

/** "JPG vs PNG" table + what each format is. */
export function FormatComparison({ from, to, reason }) {
  const F = FORMATS[from], T = FORMATS[to];
  return (
    <section className="mt-16">
      <h2 className="text-3xl font-semibold">
        {F.name} vs {T.name}: what is the difference?
      </h2>
      {reason && <p className="mt-4 text-slate-700 dark:text-slate-300">{reason}</p>}
      <div className="mt-6 overflow-x-auto rounded-2xl card">
        <table className="w-full min-w-[480px] text-left text-sm">
          <caption className="sr-only">Comparison of {F.name} and {T.name}</caption>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th scope="col" className="px-4 py-3 font-medium text-slate-500" />
              <th scope="col" className="px-4 py-3 font-semibold">{F.name}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{T.name}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, key]) => (
              <tr key={key} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                <th scope="row" className="px-4 py-3 font-medium text-slate-500">{label}</th>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{F[key]}</td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{T[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[F, T].map((x) => (
          <div key={x.name} className="rounded-2xl card p-5">
            <h3 className="font-semibold">What is {x.name}?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{x.about}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const pill =
  'rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-700 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-brand-300';

/** Links to the other conversions from the same format and into the same format. */
export function RelatedConversions({ from, to, visible }) {
  const groups = [
    { title: `Convert ${FORMATS[from].name} to another format`, items: OUTPUTS.filter((o) => o !== from && o !== to).map((o) => `${from}-to-${o}`) },
    { title: `Convert other images to ${FORMATS[to].name}`, items: INPUTS.filter((i) => i !== to && i !== from).map((i) => `${i}-to-${to}`) },
  ];
  return (
    <section className="mt-16">
      <h2 className="text-3xl font-semibold">More image conversions</h2>
      {groups.map((g) => {
        const items = g.items.filter((s) => visible.has(s));
        if (!items.length) return null;
        return (
          <div key={g.title} className="mt-6">
            <h3 className="font-semibold">{g.title}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {items.map((s) => {
                const [a, , b] = s.split('-');
                return (
                  <li key={s}>
                    <Link href={`/${s}/`} className={pill}>
                      {FORMATS[a].name} to {FORMATS[b].name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="mt-6 text-sm">
        <Link href="/convert-image/" className="font-medium text-brand-700 hover:underline dark:text-brand-300">
          See every image format conversion →
        </Link>
      </p>
    </section>
  );
}

/** Every from → to pair as a grid of links (on the Convert Image hub page). */
export function ConversionMatrix({ visible }) {
  return (
    <section className="mt-16">
      <h2 className="text-3xl font-semibold">All image format conversions</h2>
      <p className="mt-3 text-slate-600 dark:text-slate-400">
        Pick the format you have (row) and the format you need (column). Every converter runs in your browser and is free.
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl card">
        <table className="w-full min-w-[560px] text-sm">
          <caption className="sr-only">Image converters by input and output format</caption>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th scope="col" className="px-3 py-3 text-left font-medium text-slate-500">From ↓ / To →</th>
              {OUTPUTS.map((o) => (
                <th key={o} scope="col" className="px-3 py-3 font-semibold">{FORMATS[o].name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INPUTS.map((i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                <th scope="row" className="px-3 py-2.5 text-left font-semibold">{FORMATS[i].name}</th>
                {OUTPUTS.map((o) => {
                  const slug = `${i}-to-${o}`;
                  return (
                    <td key={o} className="px-3 py-2.5 text-center">
                      {i === o || !visible.has(slug) ? (
                        <span className="text-slate-300 dark:text-slate-700" aria-label="Not applicable">—</span>
                      ) : (
                        <Link href={`/${slug}/`} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                          {FORMATS[i].name} → {FORMATS[o].name}
                        </Link>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

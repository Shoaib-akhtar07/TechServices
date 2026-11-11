import Link from 'next/link';
import { Search } from 'lucide-react';
import { listPosts, listTools } from '@/lib/server/content';
import { searchPosts, searchTools } from '@/lib/search';
import ToolIcon from '@/components/ToolIcon';

export const metadata = {
  title: 'Search',
  description: 'Search every SoftServices tool and guide.',
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }) {
  const q = String(searchParams?.q || '').trim().slice(0, 100);
  const [tools, posts] = q ? await Promise.all([listTools(), listPosts()]) : [[], []];
  const toolHits = searchTools(tools, q);
  const postHits = searchPosts(posts, q);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-14">
      <h1 className="text-4xl font-semibold sm:text-5xl">Search</h1>
      <form action="/search/" className="relative mt-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus={!q}
          placeholder="Search tools and guides… e.g. png to jpg"
          aria-label="Search"
          className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-base outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-500/20"
        />
      </form>

      {q && (
        <p className="mt-4 text-sm text-slate-500">
          {toolHits.length + postHits.length} result{toolHits.length + postHits.length === 1 ? '' : 's'} for “{q}”
        </p>
      )}

      {toolHits.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Tools</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {toolHits.map((t) => (
              <li key={t.slug}>
                <Link href={`/${t.slug}/`} className="card card-hover flex items-start gap-3 rounded-2xl p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900/5 dark:bg-white/10">
                    <ToolIcon name={t.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{t.name}</span>
                    <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">{t.short}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {postHits.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Guides</h2>
          <div className="mt-4 space-y-3">
            {postHits.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}/`} className="card card-hover block rounded-2xl p-5">
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {q && !toolHits.length && !postHits.length && (
        <p className="mt-10 text-slate-600 dark:text-slate-400">
          Nothing found. Try a shorter word such as “pdf”, “image” or “compress”, or <Link href="/" className="underline">browse all tools</Link>.
        </p>
      )}
    </div>
  );
}

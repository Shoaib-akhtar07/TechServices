import Link from 'next/link';
import { CATEGORIES, toolsByCategory } from '@/lib/tools';
import { addressLine, hasOffice, telHref } from '@/lib/business';
import { SITE } from '@/lib/site';
import Logo from './Logo';
import { getSite, listTools } from '@/lib/server/content';

const linkCls = 'text-sm text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300';

export default async function Footer() {
  const [site, allTools] = await Promise.all([getSite(), listTools()]);
  // The many "X to Y" image pages are linked from the Convert Image hub instead.
  const tools = allTools.filter((t) => !t.variant);
  return (
    <footer className="mt-24 px-3 pb-6 sm:px-4">
      <div className="card mx-auto max-w-7xl rounded-3xl bg-gradient-to-br from-white/90 to-cream-200/90 dark:from-slate-900/80 dark:to-slate-900/80">
        <div className="grid gap-10 px-6 py-12 sm:grid-cols-2 sm:px-10 lg:grid-cols-7">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo className="h-7 w-7" />
              <span className="font-serif text-2xl font-medium leading-none text-slate-900 dark:text-white">
                Soft<em className="bg-gradient-to-r from-brand-500 to-brand-300 bg-clip-text font-semibold text-transparent">Services</em>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Free, private PDF and image tools that run entirely in your browser. No uploads, no sign-up, no watermarks.
            </p>
            {hasOffice(site.business) && (
              <address className="mt-4 text-sm not-italic leading-relaxed text-slate-600 dark:text-slate-400">
                {site.business.name || SITE.name}, {addressLine(site.business)}
                {site.business.phone && (
                  <>
                    <br />
                    <a href={telHref(site.business.phone)} className="hover:text-brand-600">{site.business.phone}</a>
                  </>
                )}
              </address>
            )}
            <ul className="mt-6 space-y-2">
              <li><Link href="/about/" className={linkCls}>About</Link></li>
              <li><Link href="/blog/" className={linkCls}>Blog &amp; guides</Link></li>
              {!site.freeMode && <li><Link href="/pricing/" className={linkCls}>Pricing</Link></li>}
              <li><Link href="/compare/" className={linkCls}>Compare</Link></li>
              <li><Link href="/contact/" className={linkCls}>Contact</Link></li>
              <li><Link href="/privacy/" className={linkCls}>Privacy policy</Link></li>
              <li><Link href="/terms/" className={linkCls}>Terms of use</Link></li>
            </ul>
          </div>
          {CATEGORIES.filter((c) => toolsByCategory(c.id, tools).length).map((c) => (
            <div key={c.id}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-900 dark:text-white">{c.name}</p>
              <ul className="space-y-2">
                {toolsByCategory(c.id, tools).map((t) => (
                  <li key={t.slug}>
                    <Link href={`/${t.slug}/`} className={linkCls}>
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cream-300 px-6 py-5 text-sm text-slate-500 dark:border-white/10 sm:px-10">
          <span>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</span>
          <span>
            Designed &amp; developed by{' '}
            {site.developerUrl ? (
              <a href={site.developerUrl} target="_blank" rel="noopener" className="font-semibold text-slate-700 hover:text-brand-600 dark:text-slate-200">
                {site.developer}
              </a>
            ) : (
              <strong className="font-semibold text-slate-700 dark:text-slate-200">{site.developer}</strong>
            )}
          </span>
          <span className="font-serif text-base italic text-brand-600 dark:text-brand-300">Free, fast &amp; private.</span>
        </div>
      </div>
    </footer>
  );
}

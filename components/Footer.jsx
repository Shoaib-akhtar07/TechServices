import Link from 'next/link';
import { CATEGORIES, toolsByCategory } from '@/lib/tools';
import { SITE } from '@/lib/site';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2 text-xl font-extrabold">
            <Logo />
            <span>
              Nex<span className="text-brand-600">PDF</span>
            </span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Free, private PDF and image tools that run entirely in your browser. No uploads, no sign-up, no watermarks.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li><Link href="/about/" className="hover:text-brand-600">About</Link></li>
            <li><Link href="/blog/" className="hover:text-brand-600">Blog &amp; guides</Link></li>
            <li><Link href="/contact/" className="hover:text-brand-600">Contact</Link></li>
            <li><Link href="/privacy/" className="hover:text-brand-600">Privacy policy</Link></li>
            <li><Link href="/terms/" className="hover:text-brand-600">Terms of use</Link></li>
          </ul>
        </div>
        {CATEGORIES.map((c) => (
          <div key={c.id}>
            <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">{c.name}</p>
            <ul className="space-y-2">
              {toolsByCategory(c.id).map((t) => (
                <li key={t.slug}>
                  <Link href={`/${t.slug}/`} className="text-sm text-slate-600 hover:text-brand-600 dark:text-slate-400">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-800">
        © {new Date().getFullYear()} {SITE.name}. All rights reserved.
      </div>
    </footer>
  );
}

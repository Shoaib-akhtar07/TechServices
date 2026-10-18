'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Menu, X, Moon, Sun, ChevronDown, Crown, User } from 'lucide-react';
import { CATEGORIES, toolsByCategory } from '@/lib/tools';
import { SITE } from '@/lib/site';
import Logo from './Logo';
import ProBadge from './ProBadge';

function AccountButton({ onClick }) {
  const { data: session, status } = useSession();
  if (status === 'loading') return <span className="h-9 w-20" />;
  if (!session)
    return (
      <>
        <Link href="/login/" onClick={onClick} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:inline-block">
          Log in
        </Link>
        <Link href="/pricing/" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-2 text-sm font-semibold text-white shadow hover:opacity-90">
          <Crown className="h-4 w-4" /> Go Pro
        </Link>
      </>
    );
  return (
    <Link href="/account/" onClick={onClick} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
      <User className="h-4 w-4" />
      <span className="hidden max-w-[120px] truncate sm:inline">{session.user.name || session.user.email}</span>
      {session.user.pro && <ProBadge />}
    </Link>
  );
}

const QUICK = [
  { href: '/merge-pdf/', label: 'Merge PDF' },
  { href: '/split-pdf/', label: 'Split PDF' },
  { href: '/compress-pdf/', label: 'Compress PDF' },
  { href: '/jpg-to-pdf/', label: 'JPG to PDF' },
  { href: '/sign-pdf/', label: 'Sign PDF' },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {}
  };
  return (
    <button onClick={toggle} aria-label="Toggle dark mode" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

const linkCls = 'rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight" aria-label={`${SITE.name} home`}>
          <Logo />
          <span>
            Nex<span className="text-brand-600">PDF</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 xl:flex" aria-label="Main">
          {QUICK.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>
              {l.label}
            </Link>
          ))}
          <div className="relative" onMouseLeave={() => setMega(false)}>
            <button onClick={() => setMega((v) => !v)} onMouseEnter={() => setMega(true)} aria-expanded={mega} className={`flex items-center gap-1 ${linkCls}`}>
              All tools <ChevronDown className="h-4 w-4" />
            </button>
            {mega && (
              <div className="absolute left-1/2 top-full w-[1180px] -translate-x-1/3 pt-2">
                <div className="grid grid-cols-7 gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  {CATEGORIES.map((c) => (
                    <div key={c.id}>
                      <p className={`mb-3 text-xs font-bold uppercase tracking-wide ${c.text}`}>{c.name}</p>
                      <ul className="space-y-2">
                        {toolsByCategory(c.id).map((t) => (
                          <li key={t.slug}>
                            <Link href={`/${t.slug}/`} onClick={() => setMega(false)} className="text-sm text-slate-700 hover:text-brand-600 dark:text-slate-300">
                              {t.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link href="/pricing/" className={linkCls}>
            Pricing
          </Link>
          <Link href="/blog/" className={linkCls}>
            Blog
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <AccountButton />
          <button className="rounded-lg p-2 xl:hidden" onClick={() => setOpen((v) => !v)} aria-label="Open menu" aria-expanded={open}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="max-h-[75vh] overflow-y-auto border-t border-slate-200 px-4 py-4 dark:border-slate-800 xl:hidden" aria-label="Mobile">
          {CATEGORIES.map((c) => (
            <div key={c.id} className="mb-4">
              <p className={`mb-2 text-xs font-bold uppercase tracking-wide ${c.text}`}>{c.name}</p>
              <div className="grid grid-cols-2 gap-2">
                {toolsByCategory(c.id).map((t) => (
                  <Link key={t.slug} href={`/${t.slug}/`} onClick={() => setOpen(false)} className="text-sm text-slate-700 dark:text-slate-300">
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-6 border-t border-slate-200 pt-4 text-sm font-semibold dark:border-slate-800">
            <Link href="/pricing/" onClick={() => setOpen(false)}>Pricing</Link>
            <Link href="/blog/" onClick={() => setOpen(false)}>Blog</Link>
            <Link href="/login/" onClick={() => setOpen(false)}>Log in</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

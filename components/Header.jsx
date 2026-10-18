'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Menu, X, Moon, Sun, ChevronDown, Crown, User } from 'lucide-react';
import { CATEGORIES, toolsByCategory } from '@/lib/tools';
import { SITE } from '@/lib/site';
import Logo from './Logo';

// Account icon and the dark call-to-action at the end of the nav pill.
function AccountButtons({ onClick }) {
  const { data: session, status } = useSession();
  if (status === 'loading') return <span className="h-11 w-32" />;
  const pro = session?.user?.pro;
  return (
    <>
      <Link
        href={session ? '/account/' : '/login/'}
        onClick={onClick}
        aria-label={session ? 'My account' : 'Log in'}
        title={session ? session.user.name || session.user.email : 'Log in'}
        className="relative rounded-full p-2.5 text-slate-800 transition hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10"
      >
        <User className="h-5 w-5" />
        {pro && <Crown className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 text-amber-500" />}
      </Link>
      <Link
        href={pro ? '/create-word/' : '/pricing/'}
        onClick={onClick}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-slate-900 via-slate-900 to-bronze-900 px-4 py-2.5 text-[15px] font-medium text-white sm:px-5 shadow-lg shadow-slate-900/20 transition hover:to-bronze-600 dark:from-white dark:via-white dark:to-bronze-300 dark:text-slate-900"
      >
        {pro ? 'New document' : <><Crown className="h-4 w-4 text-amber-300 dark:text-bronze-600" /> Go Pro</>}
      </Link>
    </>
  );
}

const QUICK = [
  { href: '/merge-pdf/', label: 'Merge PDF' },
  { href: '/compress-pdf/', label: 'Compress PDF' },
  { href: '/sign-pdf/', label: 'Sign PDF' },
  { href: '/pricing/', label: 'Pricing' },
  { href: '/blog/', label: 'Blog' },
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
    <button onClick={toggle} aria-label="Toggle dark mode" className="rounded-full p-2.5 text-slate-800 transition hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10">
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

const linkCls = 'rounded-full px-3.5 py-2 text-[15px] text-slate-800 transition hover:text-bronze-600 dark:text-slate-200 dark:hover:text-bronze-300';
const glass =
  'border border-white/80 bg-gradient-to-br from-white/95 to-[#f6efe3]/95 shadow-[0_10px_35px_-15px_rgba(61,42,23,0.35)] backdrop-blur-md dark:border-white/10 dark:from-slate-900/90 dark:to-slate-900/90';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);
  const close = () => setOpen(false);
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 font-display sm:px-4 sm:pt-4">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link href="/" className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 sm:px-6 sm:py-3 ${glass}`} aria-label={`${SITE.name} home`}>
          <Logo className="h-6 w-6 sm:h-7 sm:w-7" />
          <span className="font-serif text-xl font-medium leading-none sm:text-2xl text-slate-900 dark:text-white">
            Nex<em className="bg-gradient-to-r from-bronze-500 to-bronze-300 bg-clip-text font-semibold text-transparent">PDF</em>
          </span>
        </Link>

        <div className={`flex items-center gap-0.5 rounded-full py-1.5 pl-1.5 pr-1.5 xl:pl-4 ${glass}`}>
          <nav className="hidden items-center xl:flex" aria-label="Main">
            <div onMouseLeave={() => setMega(false)}>
              <button onClick={() => setMega((v) => !v)} onMouseEnter={() => setMega(true)} aria-expanded={mega} className={`flex items-center gap-1 ${linkCls}`}>
                All tools <ChevronDown className={`h-4 w-4 transition ${mega ? 'rotate-180' : ''}`} />
              </button>
              {mega && (
                <div className="absolute inset-x-0 top-full pt-3">
                  <div className={`grid grid-cols-7 gap-5 rounded-3xl p-7 ${glass}`}>
                    {CATEGORIES.map((c) => (
                      <div key={c.id}>
                        <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.15em] ${c.text}`}>{c.name}</p>
                        <ul className="space-y-2">
                          {toolsByCategory(c.id).map((t) => (
                            <li key={t.slug}>
                              <Link href={`/${t.slug}/`} onClick={() => setMega(false)} className="text-sm text-slate-700 hover:text-bronze-600 dark:text-slate-300 dark:hover:text-bronze-300">
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
            {QUICK.map((l) => (
              <Link key={l.href} href={l.href} className={linkCls}>
                {l.label}
              </Link>
            ))}
          </nav>
          <span className="hidden sm:contents">
            <ThemeToggle />
          </span>
          <AccountButtons onClick={close} />
          <button className="rounded-full p-2.5 text-slate-800 dark:text-slate-200 xl:hidden" onClick={() => setOpen((v) => !v)} aria-label="Open menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <nav className={`absolute inset-x-0 top-full mt-3 max-h-[75vh] overflow-y-auto rounded-3xl p-5 xl:hidden ${glass}`} aria-label="Mobile">
            {CATEGORIES.map((c) => (
              <div key={c.id} className="mb-4">
                <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.15em] ${c.text}`}>{c.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  {toolsByCategory(c.id).map((t) => (
                    <Link key={t.slug} href={`/${t.slug}/`} onClick={close} className="text-sm text-slate-700 dark:text-slate-300">
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-6 border-t border-slate-900/10 pt-4 text-sm font-medium dark:border-white/10">
              <Link href="/pricing/" onClick={close}>Pricing</Link>
              <Link href="/blog/" onClick={close}>Blog</Link>
              <Link href="/login/" onClick={close}>Log in</Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

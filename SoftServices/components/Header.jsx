'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Menu, X, Moon, Sun, ChevronDown, Crown, User, Home } from 'lucide-react';
import { CATEGORIES, toolsByCategory } from '@/lib/tools';
import { SITE } from '@/lib/site';
import Logo from './Logo';
import SiteSearch from './SiteSearch';
import { useFreeMode, useTools } from './Providers';

// Account icon and the dark call-to-action at the end of the nav pill.
function AccountButtons({ onClick }) {
  const { data: session, status } = useSession();
  const freeMode = useFreeMode(); // before the early return: hooks must run in the same order every render
  if (status === 'loading') return <span className="h-11 w-32" />;
  const pro = session?.user?.pro;
  return (
    <>
      <Link
        href={session ? '/account/' : '/login/'}
        onClick={onClick}
        aria-label={session ? 'My account' : 'Log in'}
        title={session ? session.user.name || session.user.email : 'Log in'}
        className="relative hidden rounded-full p-2.5 text-slate-800 transition sm:block hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10"
      >
        <User className="h-5 w-5" />
        {pro && !freeMode && <Crown className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 text-amber-500" />}
      </Link>
      <Link
        href={pro || freeMode ? '/create-word/' : '/pricing/'}
        onClick={onClick}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-slate-900 via-slate-900 to-bronze-900 px-4 py-2.5 text-[15px] font-medium text-white shadow-btn transition duration-200 hover:-translate-y-px hover:shadow-btn-hover hover:to-bronze-600 sm:px-5 dark:from-white dark:via-white dark:to-bronze-300 dark:text-slate-900"
      >
        {pro || freeMode ? 'New document' : <><Crown className="h-4 w-4 text-amber-300 dark:text-bronze-600" /> Go Pro</>}
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
  'border border-white/80 bg-gradient-to-br from-white/95 to-[#f6efe3]/95 shadow-card dark:shadow-card-dark backdrop-blur-md dark:border-white/10 dark:from-slate-900/90 dark:to-slate-900/90';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [mega, setMega] = useState(false);
  const close = () => setOpen(false);
  const { data: session } = useSession();
  const freeMode = useFreeMode();
  // The many "X to Y" image pages stay out of the menus (found through search and the Convert Image hub).
  const tools = useTools().filter((t) => !t.variant);
  const menu = CATEGORIES.map((c) => ({ ...c, tools: toolsByCategory(c.id, tools) })).filter((c) => c.tools.length);
  const quick = freeMode ? QUICK.filter((l) => l.href !== '/pricing/') : QUICK;
  const onHome = usePathname() === '/';
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 font-display sm:px-4 sm:pt-4">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link href="/" className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 sm:px-6 sm:py-3 ${glass}`} aria-label={`${SITE.name} home`}>
          <Logo className="h-6 w-6 sm:h-7 sm:w-7" />
          <span className="font-serif text-xl font-medium leading-none sm:text-2xl text-slate-900 dark:text-white">
            Soft<em className="bg-gradient-to-r from-bronze-500 to-bronze-300 bg-clip-text font-semibold text-transparent">Services</em>
          </span>
        </Link>

        <div className={`flex items-center gap-0.5 rounded-full p-1.5 ${glass}`}>
          <Link
            href="/"
            aria-label="Home"
            aria-current={onHome ? 'page' : undefined}
            className={`group mr-1 hidden items-center gap-2 rounded-full py-2.5 pl-3 pr-3 text-[15px] font-medium transition duration-200 hover:-translate-y-px sm:inline-flex xl:pr-4 ${
              onHome
                ? 'bg-gradient-to-br from-brand-100 to-brand-200 text-brand-800 shadow-btn-light dark:from-brand-500/25 dark:to-brand-700/25 dark:text-brand-200 dark:shadow-none'
                : 'text-slate-800 hover:bg-white hover:text-brand-700 hover:shadow-btn-light dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-brand-200 dark:hover:shadow-none'
            }`}
          >
            <Home className="h-[18px] w-[18px] transition duration-200 group-hover:scale-110" />
            <span className="hidden xl:inline">Home</span>
          </Link>
          <nav className="hidden items-center xl:flex" aria-label="Main">
            <div onMouseLeave={() => setMega(false)}>
              <button onClick={() => setMega((v) => !v)} onMouseEnter={() => setMega(true)} aria-expanded={mega} className={`flex items-center gap-1 ${linkCls}`}>
                All tools <ChevronDown className={`h-4 w-4 transition ${mega ? 'rotate-180' : ''}`} />
              </button>
              {mega && (
                <div className="absolute inset-x-0 top-full pt-3">
                  <div className={`grid grid-cols-7 gap-5 rounded-3xl p-7 ${glass}`}>
                    {menu.map((c) => (
                      <div key={c.id}>
                        <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.15em] ${c.text}`}>{c.name}</p>
                        <ul className="space-y-2">
                          {c.tools.map((t) => (
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
            {quick.map((l) => (
              <Link key={l.href} href={l.href} className={linkCls}>
                {l.label}
              </Link>
            ))}
          </nav>
          <SiteSearch />
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
            {menu.map((c) => (
              <div key={c.id} className="mb-4">
                <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.15em] ${c.text}`}>{c.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  {c.tools.map((t) => (
                    <Link key={t.slug} href={`/${t.slug}/`} onClick={close} className="text-sm text-slate-700 dark:text-slate-300">
                      {t.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-6 border-t border-slate-900/10 pt-4 text-sm font-medium dark:border-white/10">
              <Link href="/" onClick={close} className="inline-flex items-center gap-1.5 text-brand-700 dark:text-brand-300">
                <Home className="h-4 w-4" /> Home
              </Link>
              {!freeMode && <Link href="/pricing/" onClick={close}>Pricing</Link>}
              <Link href="/blog/" onClick={close}>Blog</Link>
              {session ? <Link href="/account/" onClick={close}>My account</Link> : <Link href="/login/" onClick={close}>Log in</Link>}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

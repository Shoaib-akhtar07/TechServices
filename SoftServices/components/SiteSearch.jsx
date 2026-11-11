'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Search, X, ArrowRight, Crown } from 'lucide-react';
import { searchTools } from '@/lib/search';
import { useTools } from './Providers';
import ToolIcon from './ToolIcon';

const POPULAR = ['merge-pdf', 'compress-pdf', 'convert-image', 'png-to-jpg', 'pdf-to-jpg', 'sign-pdf'];

/** Search button for the header. Opens a dialog that finds tools as you type (also Ctrl+K or "/"). */
export default function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();
  const tools = useTools();

  const results = useMemo(() => {
    if (q.trim()) return searchTools(tools, q, 8);
    return POPULAR.map((s) => tools.find((t) => t.slug === s)).filter(Boolean);
  }, [q, tools]);

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => setActive(0), [q]);

  const close = () => {
    setOpen(false);
    setQ('');
  };
  const goAll = () => {
    router.push(`/search/?q=${encodeURIComponent(q.trim())}`);
    close();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const t = results[active];
      if (t) {
        router.push(`/${t.slug}/`);
        close();
      } else if (q.trim()) goAll();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search tools and guides"
        title="Search (Ctrl+K)"
        className="rounded-full p-2.5 text-slate-800 transition hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 px-4 pt-[12vh] font-sans backdrop-blur-sm" onMouseDown={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-700">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                enterKeyHint="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search tools and guides… e.g. png to jpg, compress"
                aria-label="Search"
                role="combobox"
                aria-expanded="true"
                aria-controls="site-search-results"
                aria-activedescendant={results[active] ? `ss-${results[active].slug}` : undefined}
                className="h-14 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
              <button onClick={close} aria-label="Close search" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul id="site-search-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {!q.trim() && results.length > 0 && <li className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Popular</li>}
              {results.map((t, i) => (
                <li key={t.slug} id={`ss-${t.slug}`} role="option" aria-selected={i === active}>
                  <Link
                    href={`/${t.slug}/`}
                    onClick={close}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900/5 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                      <ToolIcon name={t.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-white">
                        {t.name} {t.premium && <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Pro" />}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{t.short}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {q.trim() && !results.length && <li className="px-3 py-6 text-center text-sm text-slate-500">No tools match “{q.trim()}”.</li>}
              {q.trim() && (
                <li role="option" aria-selected={active === results.length}>
                  <button
                    onClick={goAll}
                    onMouseEnter={() => setActive(results.length)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-brand-700 dark:text-brand-300 ${active === results.length ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                  >
                    See all results for “{q.trim()}”, including guides <ArrowRight className="h-4 w-4" />
                  </button>
                </li>
              )}
            </ul>
            <p className="hidden border-t border-slate-200 px-4 py-2 text-xs text-slate-400 sm:block dark:border-slate-700">↑ ↓ to move · Enter to open · Esc to close</p>
          </div>
        </div>,
        // Rendered on <body>: the header's backdrop blur would otherwise trap this overlay inside it.
        document.body,
      )}
    </>
  );
}

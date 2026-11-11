'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Crown } from 'lucide-react';
import { CATEGORIES } from '@/lib/tools';
import ToolCard from './ToolCard';
import ToolIcon from './ToolIcon';
import { useFreeMode, useTools } from './Providers';
import { searchTools } from '@/lib/search';

// Free tools get their own cards; every Pro tool and editor is grouped into one card at the end.
const PRO_TAB = { id: 'pro-all', name: 'Pro' };

function ProCard({ tools }) {
  const freeMode = useFreeMode();
  return (
    <div className="col-span-full rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 p-6 text-white shadow-[0_2px_4px_rgba(20,26,36,0.15),0_20px_40px_-14px_rgba(20,26,36,0.45),0_40px_70px_-30px_rgba(92,65,40,0.5)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-300">
            <Crown className="h-4 w-4" /> {freeMode ? 'Office & advanced tools' : 'SoftServices Pro'}
          </p>
          <h3 className="mt-3 text-xl font-bold sm:text-2xl">{freeMode ? 'Free with a SoftServices account' : 'All Pro services in one plan'}</h3>
          <p className="mt-1 text-sm text-slate-300">Word, Excel, PowerPoint & PDF editors, Office conversions, OCR and PDF passwords.</p>
        </div>
        {!freeMode && (
          <Link href="/pricing/" className="btn-gold px-5 py-2.5 text-sm">
            <Crown className="h-4 w-4" /> See plans
          </Link>
        )}
      </div>
      <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((t) => (
          <li key={t.slug}>
            <Link href={`/${t.slug}/`} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-sm font-medium ring-1 ring-white/10 transition hover:bg-white/10">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600">
                <ToolIcon name={t.icon} className="h-4 w-4" />
              </span>
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ToolGrid() {
  const [active, setActive] = useState('all');
  const [q, setQ] = useState('');
  const freeMode = useFreeMode();
  const TOOLS = useTools();
  const hits = q.trim() ? new Set(searchTools(TOOLS, q).map((t) => t.slug)) : null;
  // Without a search, the many "X to Y" image pages are left out (the Convert Image page links them all).
  const matches = (t) => (hits ? hits.has(t.slug) : !t.variant);
  const free = TOOLS.filter((t) => !t.premium && (active === 'all' || t.category === active) && matches(t));
  const pro = TOOLS.filter((t) => t.premium && (active === 'all' || active === PRO_TAB.id) && matches(t));
  const tabs = [{ id: 'all', name: 'All tools' }, ...CATEGORIES.filter((c) => TOOLS.some((t) => t.category === c.id && !t.premium)), freeMode ? { ...PRO_TAB, name: 'Office & more' } : PRO_TAB];
  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tools… e.g. compress, sign, jpg"
          aria-label="Search tools"
          className="w-full max-w-md rounded-full border border-cream-300 bg-white/90 px-5 py-3 text-sm shadow-card outline-none transition focus:border-brand-400 focus:shadow-card-hover focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-500/20"
        />
        <div className="flex flex-wrap justify-center gap-2" role="tablist">
          {tabs.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={active === c.id}
              onClick={() => setActive(c.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition duration-200 ${
                active === c.id
                  ? 'bg-gradient-to-r from-ink to-[#3a2c1d] text-white shadow-btn dark:from-white dark:to-brand-200 dark:text-slate-900'
                  : 'bg-white/80 text-slate-700 shadow-btn-light hover:-translate-y-px hover:bg-white hover:shadow-btn-light-hover dark:bg-slate-900 dark:text-slate-300 dark:shadow-none dark:hover:bg-slate-800'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {free.map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}
        {pro.length > 0 && <ProCard tools={pro} />}
      </div>
      {!free.length && !pro.length && <p className="py-10 text-center text-slate-500">No tool matches “{q}”.</p>}
    </div>
  );
}

'use client';
import { useState } from 'react';
import { CATEGORIES, TOOLS } from '@/lib/tools';
import ToolCard from './ToolCard';

export default function ToolGrid() {
  const [active, setActive] = useState('all');
  const [q, setQ] = useState('');
  const list = TOOLS.filter(
    (t) => (active === 'all' || t.category === active) && (t.name + ' ' + t.short).toLowerCase().includes(q.toLowerCase())
  );
  const tabs = [{ id: 'all', name: 'All tools' }, ...CATEGORIES];
  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tools… e.g. compress, sign, jpg"
          aria-label="Search tools"
          className="w-full max-w-md rounded-full border border-slate-300 bg-white px-5 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:ring-brand-500/20"
        />
        <div className="flex flex-wrap justify-center gap-2" role="tablist">
          {tabs.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={active === c.id}
              onClick={() => setActive(c.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active === c.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}
      </div>
      {!list.length && <p className="py-10 text-center text-slate-500">No tool matches “{q}”.</p>}
    </div>
  );
}

'use client';
import { useMemo, useState } from 'react';
import { X, Search, Keyboard, SquareFunction } from 'lucide-react';
import { FUNCTION_INFO, FUNCTION_CATEGORIES } from '@/lib/editors/functions';

function Modal({ title, icon: Icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-slate-900" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Icon className="h-5 w-5 text-brand-600" /> {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

export const SHORTCUTS = [
  ['Move & select', [
    ['Arrow keys', 'Move one cell'],
    ['Shift + Arrow', 'Extend the selection'],
    ['Ctrl + Arrow', 'Jump to the edge of the data'],
    ['Ctrl + Shift + Arrow', 'Select to the edge of the data'],
    ['Tab / Shift + Tab', 'Move right / left'],
    ['Enter / Shift + Enter', 'Move down / up'],
    ['Home / Ctrl + Home', 'Start of row / cell A1'],
    ['Ctrl + End', 'Last used cell'],
    ['Page Up / Page Down', 'Move one screen up / down'],
    ['Ctrl + A', 'Select all'],
    ['Ctrl + Space / Shift + Space', 'Select column / row'],
    ['Alt + Page Up / Page Down', 'Previous / next sheet'],
  ]],
  ['Edit', [
    ['F2 or double-click', 'Edit the cell'],
    ['Esc', 'Cancel editing'],
    ['Delete', 'Clear the selected cells'],
    ['Backspace', 'Clear the cell and start typing'],
    ['Ctrl + Enter', 'Fill the whole selection with what you typed'],
    ['Ctrl + D / Ctrl + R', 'Fill down / fill right'],
    ['Ctrl + C / X / V', 'Copy / cut / paste (works with Excel & Google Sheets)'],
    ['Ctrl + Z / Ctrl + Y', 'Undo / redo'],
    ['Ctrl + ; / Ctrl + Shift + ;', 'Insert today’s date / the current time'],
    ['Alt + =', 'AutoSum'],
    ['F4 (while editing)', 'Toggle $ in the reference: A1 → $A$1 → A$1 → $A1'],
    ['Ctrl + F / Ctrl + H', 'Find / replace'],
    ['Ctrl + + / Ctrl + -', 'Insert / delete rows (or columns when whole columns are selected)'],
  ]],
  ['Format', [
    ['Ctrl + B / I / U', 'Bold / italic / underline'],
    ['Ctrl + Shift + 1', 'Number format (1,234.00)'],
    ['Ctrl + Shift + 3', 'Date format'],
    ['Ctrl + Shift + 4', 'Currency format'],
    ['Ctrl + Shift + 5', 'Percent format'],
    ['Ctrl + Shift + `', 'General format'],
  ]],
  ['Formulas', [
    ['=', 'Start a formula, e.g. =SUM(B2:B10)'],
    ['Click / drag cells', 'While typing a formula, insert a reference'],
    ['Tab', 'Accept the suggested function'],
    ['Sheet2!A1', 'Refer to another sheet'],
    ['$A$1', 'Absolute reference (does not move when copied)'],
  ]],
];

export function ShortcutsDialog({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" icon={Keyboard} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-500">On a Mac, use ⌘ instead of Ctrl.</p>
      <div className="grid gap-6 md:grid-cols-2">
        {SHORTCUTS.map(([group, items]) => (
          <section key={group}>
            <h3 className="mb-2 font-semibold">{group}</h3>
            <dl className="space-y-1.5 text-sm">
              {items.map(([k, d]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt><kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs dark:border-slate-600 dark:bg-slate-800">{k}</kbd></dt>
                  <dd className="text-right text-slate-600 dark:text-slate-400">{d}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}

export function FunctionsDialog({ onClose, onInsert }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return FUNCTION_INFO.filter((f) => (cat === 'All' || f.category === cat) && (!s || f.name.toLowerCase().includes(s) || f.desc.toLowerCase().includes(s)));
  }, [q, cat]);
  return (
    <Modal title={`Functions (${FUNCTION_INFO.length})`} icon={SquareFunction} onClose={onClose}>
      <div className="sticky -top-4 z-10 -mx-6 -mt-4 mb-3 bg-white px-6 pb-3 pt-4 dark:bg-slate-900">
        <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 focus-within:border-brand-500 dark:border-slate-700">
          <Search className="h-4 w-4 text-slate-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search functions, e.g. lookup, date, round" aria-label="Search functions" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['All', ...FUNCTION_CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`rounded-full px-3 py-1 text-xs font-medium ${cat === c ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {list.map((f) => (
          <li key={f.name}>
            <button onClick={() => onInsert(f)} className="w-full rounded-lg px-2 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <span className="font-mono text-sm font-semibold">
                {f.name}<span className="font-normal text-slate-500">({f.args})</span>
              </span>
              <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">{f.desc}</span>
            </button>
          </li>
        ))}
        {!list.length && <li className="py-8 text-center text-sm text-slate-500">No functions match “{q}”.</li>}
      </ul>
    </Modal>
  );
}

export function FindBar({ onFind, onReplace, onReplaceAll, onClose, message, withReplace }) {
  const [find, setFind] = useState('');
  const [repl, setRepl] = useState('');
  const [mc, setMc] = useState(false);
  const field = 'min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950';
  const btn = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800';
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/50" role="search">
      <input
        autoFocus
        value={find}
        onChange={(e) => setFind(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onFind(find, mc, e.shiftKey ? -1 : 1);
          if (e.key === 'Escape') onClose();
        }}
        placeholder="Find"
        aria-label="Find"
        className={field}
      />
      {withReplace && <input value={repl} onChange={(e) => setRepl(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && onClose()} placeholder="Replace with" aria-label="Replace with" className={field} />}
      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
        <input type="checkbox" checked={mc} onChange={(e) => setMc(e.target.checked)} className="accent-brand-600" /> Match case
      </label>
      <button className={btn} disabled={!find} onClick={() => onFind(find, mc, 1)}>Find next</button>
      {withReplace && (
        <>
          <button className={btn} disabled={!find} onClick={() => onReplace(find, repl, mc)}>Replace</button>
          <button className={btn} disabled={!find} onClick={() => onReplaceAll(find, repl, mc)}>Replace all</button>
        </>
      )}
      <span className="text-xs text-slate-500" aria-live="polite">{message}</span>
      <button onClick={onClose} aria-label="Close find" className="ml-auto rounded-lg p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

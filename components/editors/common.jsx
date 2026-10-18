'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { X, Lock, Loader2, LayoutTemplate, Check } from 'lucide-react';
import { TEMPLATE_CATALOG } from '@/lib/templates/catalog';
import { FREE_TEMPLATES } from '@/lib/templates/free';
import ProBadge from '../ProBadge';

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Files are generated on the server, which checks the Pro subscription first. */
export async function serverExport(kind, payload) {
  const res = await fetch('/api/editor/export/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, ...payload }),
  });
  if (!res.ok) {
    let msg = 'Sorry, the file could not be created. Please try again.';
    try {
      msg = (await res.json()).error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.blob();
}

export const safeName =(s, fallback) => (String(s || '').trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80) || fallback);

// Drafts live only in this browser (per-viewer convenience); every access can fail in private mode.
export const draft = {
  load(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  },
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
};

export function ToolBtn({ onClick, label, active, children, disabled }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the text selection in the editor
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm transition disabled:opacity-40 ${
        active ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-100' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

export const Sep = () => <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />;

export function TopBar({ name, setName, status, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="File name"
        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold outline-none hover:border-slate-200 focus:border-brand-500 dark:hover:border-slate-700"
      />
      <span className="flex items-center gap-1 text-xs text-slate-500" aria-live="polite">
        <Check className="h-3.5 w-3.5 text-emerald-500" /> {status}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** Template gallery. Free templates load locally; Pro ones come from the server (subscribers only). */
export function TemplatePicker({ kind, onPick, onClose }) {
  const { data: session } = useSession();
  const pro = !!session?.user?.pro;
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const list = TEMPLATE_CATALOG.filter((t) => t.kind === kind);

  const pick = async (t) => {
    setError('');
    if (!t.pro) return onPick(FREE_TEMPLATES[t.id]);
    if (!pro) return;
    setLoading(t.id);
    try {
      const res = await fetch(`/api/templates/${t.id}/`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      onPick(j);
    } catch (e) {
      setError(e.message || 'Could not load the template.');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Templates" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <LayoutTemplate className="h-5 w-5 text-brand-600" /> Templates
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">Choosing a template replaces what is currently in the editor.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((t) => {
            const locked = t.pro && !pro;
            return (
              <button
                key={t.id}
                onClick={() => pick(t)}
                disabled={!!loading}
                className={`relative rounded-2xl border p-4 text-left transition ${
                  locked ? 'border-dashed border-amber-300 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-500/5' : 'border-slate-200 hover:border-brand-500 dark:border-slate-700'
                }`}
              >
                {t.pro && <ProBadge className="absolute right-3 top-3" />}
                <p className="flex items-center gap-2 pr-16 font-semibold">
                  {locked && <Lock className="h-4 w-4 text-amber-500" />}
                  {loading === t.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">{t.desc}</p>
              </button>
            );
          })}
        </div>
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        {!pro && (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            Pro templates are included with NexPDF Pro.{' '}
            <Link href="/pricing/" className="font-semibold underline">
              See plans
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export function EditorSkeleton() {
  return <div className="h-[640px] animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />;
}

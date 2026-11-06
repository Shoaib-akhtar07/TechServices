'use client';
import Link from 'next/link';
import { Lock, Crown, Check } from 'lucide-react';
import { PRO_FEATURES } from '@/lib/plans';
import { useFreeMode } from './Providers';

/** Lock screen shown in place of a Pro tool or editor. The server enforces access separately. */
export default function ProGate({ name, slug, loggedIn }) {
  const freeMode = useFreeMode();
  if (freeMode) {
    return (
      <div className="rounded-3xl card p-8 text-center sm:p-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <Lock className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-3xl font-semibold">Log in to use {name}</h2>
        <p className="mx-auto mt-2 max-w-lg text-slate-600 dark:text-slate-400">It’s completely free — just create an account or log in to continue.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={`/signup/?next=/${slug}/`} className="btn-primary">Create free account</Link>
          <Link href={`/login/?next=/${slug}/`} className="btn-secondary">Log in</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-8 text-center dark:border-amber-500/40 dark:from-amber-500/10 dark:via-slate-900 dark:to-orange-500/10 sm:p-12">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-btn-gold">
        <Lock className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-3xl font-semibold">{name} is a Pro tool</h2>
      <p className="mx-auto mt-2 max-w-lg text-slate-600 dark:text-slate-400">
        {loggedIn
          ? 'Upgrade to SoftServices Pro to unlock this tool and every other Pro feature.'
          : 'Log in with a SoftServices Pro account to use this tool, or create one in under a minute.'}
      </p>
      <ul className="mx-auto mt-6 grid max-w-lg gap-2 text-left text-sm sm:grid-cols-2">
        {PRO_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/pricing/" className="btn-gold">
          <Crown className="h-5 w-5" /> See Pro plans — from $4/month
        </Link>
        {!loggedIn && (
          <Link href={`/login/?next=/${slug}/`} className="btn-secondary">
            I already have Pro — Log in
          </Link>
        )}
      </div>
    </div>
  );
}

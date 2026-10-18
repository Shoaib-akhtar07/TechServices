'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Check, Crown, Loader2 } from 'lucide-react';
import { PLANS, PRO_FEATURES, FREE_FEATURES } from '@/lib/plans';

export default function PricingClient({ testBilling }) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [period, setPeriod] = useState('yearly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const plan = PLANS[period];
  const isPro = !!session?.user?.pro;

  const subscribe = async () => {
    setError('');
    if (!session) {
      router.push(`/signup/?next=/pricing/`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/stripe/checkout/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: period }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.code === 'stripe_not_configured' && testBilling ? 'Stripe keys are not set yet — use “Activate test subscription” below for local testing.' : j.error);
      window.location.href = j.url;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const activateTest = async () => {
    setBusy(true);
    const res = await fetch('/api/test-billing/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: period }) });
    if (res.ok) {
      await update();
      router.push('/account/');
    } else {
      setError((await res.json()).error);
      setBusy(false);
    }
  };

  return (
    <div className="mt-10">
      <div className="mx-auto flex w-fit rounded-full bg-slate-200 p-1 dark:bg-slate-800" role="tablist" aria-label="Billing period">
        {['monthly', 'yearly'].map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={period === p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${period === p ? 'bg-white shadow dark:bg-slate-950' : 'text-slate-600 dark:text-slate-400'}`}
          >
            {PLANS[p].label}
            {p === 'yearly' && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">−33%</span>}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-bold">Free</h2>
          <p className="mt-4 text-4xl font-extrabold">$0</p>
          <p className="mt-1 text-sm text-slate-500">Forever. No account needed.</p>
          <ul className="mt-8 space-y-3 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="h-5 w-5 shrink-0 text-emerald-500" /> {f}
              </li>
            ))}
          </ul>
          <Link href="/" className="btn-secondary mt-8 w-full justify-center">Use free tools</Link>
        </div>

        <div className="relative rounded-3xl border-2 border-amber-400 bg-white p-8 shadow-xl shadow-amber-500/10 dark:bg-slate-900">
          <span className="absolute -top-3 left-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-bold uppercase text-white">Most popular</span>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Crown className="h-5 w-5 text-amber-500" /> Pro
          </h2>
          <p className="mt-4 text-4xl font-extrabold">
            ${period === 'yearly' ? plan.perMonth.toFixed(2) : plan.price}
            <span className="text-base font-medium text-slate-500">/month</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">{period === 'yearly' ? `$${plan.price} billed yearly. ` : ''}{plan.note}</p>
          <ul className="mt-8 space-y-3 text-sm">
            <li className="flex gap-2 font-medium">
              <Check className="h-5 w-5 shrink-0 text-emerald-500" /> Everything in Free, plus:
            </li>
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="h-5 w-5 shrink-0 text-emerald-500" /> {f}
              </li>
            ))}
          </ul>
          {isPro ? (
            <Link href="/account/" className="btn-secondary mt-8 w-full justify-center">You’re Pro — manage account</Link>
          ) : (
            <button onClick={subscribe} disabled={busy} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-5 w-5" />}
              {session ? `Subscribe ${plan.label.toLowerCase()}` : 'Create account & subscribe'}
            </button>
          )}
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          {testBilling && session && !isPro && (
            <button onClick={activateTest} disabled={busy} className="mt-3 w-full rounded-xl border border-dashed border-slate-400 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
              Activate test subscription (local dev only)
            </button>
          )}
          <p className="mt-4 text-center text-xs text-slate-500">Secure payment by Stripe · Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}

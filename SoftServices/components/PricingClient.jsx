'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Check, Crown, Loader2, CreditCard, Landmark } from 'lucide-react';
import { PRO_FEATURES, FREE_FEATURES, fmtPrice } from '@/lib/plans';

const CHECKOUT = { stripe: '/api/backend/billing/stripe/checkout/', paypal: '/api/backend/billing/paypal/checkout/' };

export default function PricingClient({ plans, currency, methods, canRenew, testBilling }) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [period, setPeriod] = useState('yearly');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const plan = plans[period];
  const isPro = !!session?.user?.pro;
  const money = (n) => fmtPrice(n, currency);
  const anyMethod = methods.stripe || methods.paypal || methods.manual;

  const subscribe = async (method) => {
    setError('');
    if (!session) {
      router.push(`/signup/?next=/pricing/`);
      return;
    }
    if (method === 'manual') {
      router.push(`/pricing/manual/?plan=${period}`);
      return;
    }
    setBusy(method);
    try {
      const res = await fetch(CHECKOUT[method], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: period }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      window.location.href = j.url;
    } catch (e) {
      setError(e.message);
      setBusy('');
    }
  };

  const activateTest = async () => {
    setBusy('test');
    const res = await fetch('/api/backend/billing/test-activate/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: period }) });
    if (res.ok) {
      await update();
      router.push('/account/');
    } else {
      setError((await res.json()).error);
      setBusy('');
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
            {plans[p].label}
            {p === 'yearly' && plans.yearly.save > 0 && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">−{plans.yearly.save}%</span>
            )}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="rounded-3xl card p-8">
          <h2 className="text-2xl font-semibold">Free</h2>
          <p className="mt-4 text-4xl font-extrabold">{money(0)}</p>
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

        <div className="relative rounded-3xl border-2 border-amber-400 bg-white p-8 shadow-[0_2px_4px_rgba(234,88,12,0.05),0_18px_40px_-12px_rgba(234,88,12,0.2),0_40px_70px_-30px_rgba(61,42,23,0.3)] dark:bg-slate-900 dark:shadow-card-dark">
          <span className="absolute -top-3 left-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-bold uppercase text-white">Most popular</span>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Crown className="h-5 w-5 text-amber-500" /> Pro
          </h2>
          <p className="mt-4 text-4xl font-extrabold">
            {money(period === 'yearly' ? plan.perMonth : plan.price)}
            <span className="text-base font-medium text-slate-500">/month</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">{period === 'yearly' ? `${money(plan.price)} billed yearly. ` : ''}{plan.note}</p>
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
          {isPro && !(canRenew && methods.manual) ? (
            <Link href="/account/" className="btn-secondary mt-8 w-full justify-center">You’re Pro — manage account</Link>
          ) : !session ? (
            <button onClick={() => subscribe()} className="btn-gold mt-8 w-full">
              <Crown className="h-5 w-5" /> Create account & subscribe
            </button>
          ) : !anyMethod ? (
            <p className="mt-8 rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">Online payments are coming soon.</p>
          ) : (
            <div className="mt-8 space-y-3">
              {methods.stripe && !isPro && (
                <button onClick={() => subscribe('stripe')} disabled={!!busy} className="btn-gold w-full">
                  {busy === 'stripe' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />} Pay with card
                </button>
              )}
              {methods.paypal && !isPro && (
                <button onClick={() => subscribe('paypal')} disabled={!!busy} className={`${methods.stripe ? 'btn-secondary' : 'btn-gold'} w-full`}>
                  {busy === 'paypal' ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="font-bold italic">P</span>} Pay with PayPal
                </button>
              )}
              {methods.manual && (
                <button onClick={() => subscribe('manual')} disabled={!!busy} className={`${methods.stripe || methods.paypal ? 'btn-secondary' : 'btn-gold'} w-full`}>
                  <Landmark className="h-5 w-5" /> {isPro ? 'Renew with ' : ''}{methods.manualLabel}
                </button>
              )}
            </div>
          )}
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          {testBilling && session && !isPro && (
            <button onClick={activateTest} disabled={!!busy} className="mt-3 w-full rounded-xl border border-dashed border-slate-400 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
              Activate test subscription (local dev only)
            </button>
          )}
          <p className="mt-4 text-center text-xs text-slate-500">Secure payment · Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}

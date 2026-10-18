import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Crown } from 'lucide-react';
import { getAccess, testBillingEnabled } from '@/lib/server/auth';
import { syncCheckoutSession } from '@/lib/server/stripe';
import { DAILY_LIMIT, usageToday } from '@/lib/server/usage';
import { PLANS } from '@/lib/plans';
import { TOOLS } from '@/lib/tools';
import AccountActions from '@/components/AccountActions';
import ToolCard from '@/components/ToolCard';

export const metadata = { title: 'My account', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export default async function Account({ searchParams }) {
  let { user, sub, pro } = await getAccess();
  if (!user) redirect('/login/?next=/account/');
  // Back from Stripe Checkout: activate Pro now instead of waiting for the webhook.
  if (!pro && searchParams?.checkout === 'success' && (await syncCheckoutSession(searchParams.session_id, user.id))) {
    ({ user, sub, pro } = await getAccess());
  }
  const used = pro ? await usageToday(user.id) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-14">
      <h1 className="text-4xl font-semibold">My account</h1>
      {searchParams?.checkout === 'success' && (
        <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          Payment received — welcome to Pro! It can take a few seconds for your plan to show as active.
        </p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl card p-6">
          <h2 className="font-display font-semibold text-slate-500">Profile</h2>
          <p className="mt-3 text-lg font-semibold">{user.name || '—'}</p>
          <p className="text-slate-600 dark:text-slate-400">{user.email}</p>
          <p className="mt-2 text-sm text-slate-500">Member since {fmtDate(user.createdAt)}</p>
        </section>

        <section className={`rounded-3xl border p-6 ${pro ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-500/40 dark:from-amber-500/10 dark:to-orange-500/10' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
          <h2 className="font-display font-semibold text-slate-500">Subscription</h2>
          {pro ? (
            <>
              <p className="mt-3 flex items-center gap-2 text-lg font-bold">
                <Crown className="h-5 w-5 text-amber-500" /> SoftServices Pro · {PLANS[sub.plan]?.label}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {sub.cancelAtPeriodEnd ? `Cancelled — Pro access ends on ${fmtDate(sub.currentPeriodEnd)}.` : `Renews on ${fmtDate(sub.currentPeriodEnd)}.`}
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Pro files today</span>
                  <span>
                    {used} / {DAILY_LIMIT}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${Math.min(100, (used / DAILY_LIMIT) * 100)}%` }} />
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-lg font-bold">Free plan</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {sub ? `Your Pro subscription is ${sub.status.replace('_', ' ')}.` : 'Upgrade to unlock Office conversions, OCR and PDF passwords.'}
              </p>
            </>
          )}
          <AccountActions pro={pro} hasBilling={!!user.stripeCustomerId} isTestSub={pro && !sub.stripeSubscriptionId && testBillingEnabled()} />
        </section>
      </div>

      <h2 className="mt-14 text-3xl font-semibold">{pro ? 'Your Pro tools' : 'Unlock these Pro tools'}</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.filter((t) => t.premium).map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}
      </div>
      {!pro && (
        <div className="mt-8 text-center">
          <Link href="/pricing/" className="btn-gold">
            <Crown className="h-5 w-5" /> See Pro plans
          </Link>
        </div>
      )}
    </div>
  );
}

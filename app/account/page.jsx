import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Crown, Clock, ShieldCheck } from 'lucide-react';
import { getAccess, testBillingEnabled } from '@/lib/server/auth';
import { api } from '@/lib/server/api';
import { PLANS } from '@/lib/plans';
import { listTools } from '@/lib/server/content';
import AccountActions from '@/components/AccountActions';
import ToolCard from '@/components/ToolCard';

export const metadata = { title: 'My account', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export default async function Account({ searchParams }) {
  let { user, sub, pro, paid, admin, usage } = await getAccess();
  if (!user) redirect('/login/?next=/account/');
  // Back from Stripe Checkout / PayPal: activate Pro now instead of waiting for the webhook.
  // The API re-reads the payment from the provider and checks it belongs to this user.
  let synced = false;
  if (!paid && searchParams?.checkout === 'success' && /^cs_\w+$/.test(searchParams.session_id || '')) {
    synced = await api('/billing/stripe/sync', { method: 'POST', body: { sessionId: searchParams.session_id } }).then(() => true, () => false);
  }
  if (!paid && searchParams?.paypal === 'success' && /^I-[A-Z0-9]+$/.test(searchParams.subscription_id || '')) {
    synced = await api('/billing/paypal/sync', { method: 'POST', body: { subscriptionId: searchParams.subscription_id } }).then(() => true, () => false);
  }
  if (synced) {
    const fresh = await api('/auth/me');
    ({ pro, paid } = fresh);
    sub = fresh.subscription;
    usage = fresh.usage;
  }
  const [manualPayments, TOOLS] = await Promise.all([api('/billing/manual').catch(() => []), listTools()]);
  const lastManual = manualPayments[0];
  const used = pro ? usage.today : 0;
  const limit = usage.limit;
  const pending = lastManual?.status === 'pending' ? lastManual : null;
  const rejected = lastManual?.status === 'rejected' && new Date(lastManual.reviewedAt) > new Date(Date.now() - 14 * 864e5) ? lastManual : null;
  // Manual and admin-granted Pro does not renew by itself.
  const prepaid = paid && ['manual', 'admin'].includes(sub.provider);
  const paidBack = searchParams?.checkout === 'success' || searchParams?.paypal === 'success';

  return (
    <div className="mx-auto max-w-5xl px-4 pt-14">
      <h1 className="text-4xl font-semibold">My account</h1>
      {paidBack && (
        <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          Payment received — welcome to Pro! It can take a few seconds for your plan to show as active.
        </p>
      )}
      {rejected && (
        <p className="mt-4 rounded-xl bg-rose-50 p-4 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          We could not confirm your {rejected.method} payment (transaction ID <strong>{rejected.reference}</strong>){rejected.adminNote ? `: ${rejected.adminNote}` : '.'} Please check the
          details and <Link href="/pricing/" className="font-semibold underline">try again</Link>, or contact support.
        </p>
      )}
      {pending && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            We received your {pending.method} payment details (transaction ID <strong>{pending.reference}</strong>) on {fmtDate(pending.createdAt)}. Pro will be
            activated as soon as we have checked the payment — usually within a few hours.
          </span>
        </p>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl card p-6">
          <h2 className="font-display font-semibold text-slate-500">Profile</h2>
          <p className="mt-3 text-lg font-semibold">{user.name || '—'}</p>
          <p className="text-slate-600 dark:text-slate-400">{user.email}</p>
          <p className="mt-2 text-sm text-slate-500">Member since {fmtDate(user.createdAt)}</p>
          {admin && (
            <Link href="/admin/" className="btn-secondary mt-5 !px-4 !py-2 text-sm">
              <ShieldCheck className="h-4 w-4" /> Admin panel
            </Link>
          )}
        </section>

        <section className={`rounded-3xl border p-6 ${pro ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-500/40 dark:from-amber-500/10 dark:to-orange-500/10' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
          <h2 className="font-display font-semibold text-slate-500">Subscription</h2>
          {pro && !paid ? (
            <>
              <p className="mt-3 text-lg font-bold">Free plan · everything unlocked</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Every tool, editor and template is free. You can process up to {limit} server files a day (used today: {used}).
              </p>
            </>
          ) : paid ? (
            <>
              <p className="mt-3 flex items-center gap-2 text-lg font-bold">
                <Crown className="h-5 w-5 text-amber-500" /> SoftServices Pro · {PLANS[sub.plan]?.label}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {prepaid
                  ? `Paid until ${fmtDate(sub.currentPeriodEnd)}. Renew any time from the pricing page.`
                  : sub.cancelAtPeriodEnd
                    ? `Cancelled — Pro access ends on ${fmtDate(sub.currentPeriodEnd)}.`
                    : `Renews on ${fmtDate(sub.currentPeriodEnd)}${sub.provider === 'paypal' ? ' via PayPal' : ''}.`}
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Pro files today</span>
                  <span>
                    {used} / {limit}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
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
          <AccountActions
            pro={pro}
            hasBilling={user.hasStripeBilling && (!sub || sub.provider === 'stripe')}
            canCancelPaypal={paid && sub.provider === 'paypal' && !sub.cancelAtPeriodEnd}
            canRenew={prepaid}
            isTestSub={paid && sub.provider === 'admin' && testBillingEnabled()}
          />
        </section>
      </div>

      <h2 className="mt-14 text-3xl font-semibold">{pro && !paid ? 'Office & advanced tools' : pro ? 'Your Pro tools' : 'Unlock these Pro tools'}</h2>
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

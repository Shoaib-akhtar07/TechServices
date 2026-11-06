import Link from 'next/link';
import { api } from '@/lib/server/api';
import { requireAdmin } from '@/lib/server/admin';
import { getPlans, paymentMethods, isFreeMode } from '@/lib/server/settings';
import { fmtPrice } from '@/lib/plans';
import { Badge, PageTitle, fmtDate } from '@/components/admin/ui';

const PROVIDER_LABEL = { stripe: 'Card (Stripe)', paypal: 'PayPal', manual: 'Manual payment', admin: 'Granted by admin' };

function Stat({ label, value, href }) {
  const body = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-2xl card card-hover p-5">{body}</Link>
  ) : (
    <div className="rounded-2xl card p-5">{body}</div>
  );
}

export default async function AdminDashboard() {
  await requireAdmin();
  const [stats, { plans, currency }, methods, freeMode] = await Promise.all([api('/admin/stats'), getPlans(), paymentMethods(), isFreeMode()]);
  const { users, newUsers7d: newUsers, activeSubscriptions, byProvider, pendingManualPayments: pending, recentUsers: recent } = stats;
  // Rough monthly recurring revenue at today's list prices (manual and admin grants excluded).
  const mrr = stats.activeByPlan
    .filter((s) => ['stripe', 'paypal'].includes(s.provider))
    .reduce((sum, s) => sum + s.count * (s.plan === 'yearly' ? plans.yearly.price / 12 : plans.monthly.price), 0);

  return (
    <>
      <PageTitle sub="An overview of your users, subscriptions and payments.">Dashboard</PageTitle>
      <p className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl card p-4 text-sm">
        <Badge tone={freeMode ? 'green' : 'slate'}>{freeMode ? 'Free mode on' : 'Free mode off'}</Badge>
        {freeMode ? 'Every signed-in user has all Pro features for free.' : 'Pro features need a paid plan.'}
        <Link href="/admin/settings/" className="font-semibold underline">Change</Link>
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Users" value={users} href="/admin/users/" />
        <Stat label="New this week" value={newUsers} />
        <Stat label="Active Pro" value={activeSubscriptions} href="/admin/users/?filter=pro" />
        <Stat label="Payments to review" value={pending} href="/admin/payments/" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl card p-5">
          <h2 className="font-semibold">Active Pro by payment method</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.keys(PROVIDER_LABEL).map((p) => (
              <li key={p} className="flex justify-between">
                <span>{PROVIDER_LABEL[p]}</span>
                <strong>{byProvider.find((r) => r.provider === p)?.count || 0}</strong>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-slate-900/10 pt-3 text-sm text-slate-600 dark:border-white/10 dark:text-slate-400">
            Estimated recurring revenue: <strong className="text-slate-900 dark:text-white">{fmtPrice(Math.round(mrr * 100) / 100, currency)}/month</strong>
          </p>
        </section>

        <section className="rounded-2xl card p-5">
          <h2 className="font-semibold">Checkout options</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ['Card (Stripe)', methods.stripe],
              ['PayPal', methods.paypal],
              [methods.manualLabel, methods.manual],
            ].map(([label, on]) => (
              <li key={label} className="flex items-center justify-between">
                <span>{label}</span>
                <Badge tone={on ? 'green' : 'slate'}>{on ? 'Live on pricing page' : 'Off / not set up'}</Badge>
              </li>
            ))}
          </ul>
          <Link href="/admin/settings/" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">Payment settings →</Link>
        </section>
      </div>

      <section className="mt-6 rounded-2xl card p-5">
        <h2 className="font-semibold">Newest users</h2>
        <ul className="mt-3 divide-y divide-slate-900/5 text-sm dark:divide-white/10">
          {recent.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-2">
              <span className="truncate">{u.email}</span>
              <span className="flex shrink-0 items-center gap-2 text-slate-500">
                {u.pro && <Badge tone="amber">Pro</Badge>}
                {fmtDate(u.createdAt)}
              </span>
            </li>
          ))}
          {!recent.length && <li className="py-2 text-slate-500">No users yet.</li>}
        </ul>
      </section>
    </>
  );
}

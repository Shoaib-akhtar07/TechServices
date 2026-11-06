import Link from 'next/link';
import { Users, UserPlus, Crown, Wallet, Banknote, Newspaper, Settings, Plus, ArrowRight, CreditCard, Landmark } from 'lucide-react';
import { api } from '@/lib/server/api';
import { requireAdmin } from '@/lib/server/admin';
import { getPlans, paymentMethods, isFreeMode } from '@/lib/server/settings';
import { fmtPrice } from '@/lib/plans';
import { Avatar, Badge, Card, PageTitle, StatCard, fmtDate, panel, primaryBtn, smallBtn, timeAgo } from '@/components/admin/ui';

const PROVIDER_LABEL = { stripe: 'Card (Stripe)', paypal: 'PayPal', manual: 'Manual payment', admin: 'Granted by admin' };
const PROVIDER_COLOR = { stripe: 'bg-violet-500', paypal: 'bg-sky-500', manual: 'bg-emerald-500', admin: 'bg-slate-400' };

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Karachi' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default async function AdminDashboard() {
  const { user } = await requireAdmin();
  const [stats, pendingList, { plans, currency }, methods, freeMode] = await Promise.all([
    api('/admin/stats'),
    api('/admin/payments/manual?status=pending&pageSize=5'),
    getPlans(),
    paymentMethods(),
    isFreeMode(),
  ]);

  // Rough monthly recurring revenue at today's list prices (manual and admin grants excluded).
  const mrr = stats.activeByPlan
    .filter((s) => ['stripe', 'paypal'].includes(s.provider))
    .reduce((sum, s) => sum + s.count * (s.plan === 'yearly' ? plans.yearly.price / 12 : plans.monthly.price), 0);
  const revenue = stats.revenueThisMonth.length
    ? stats.revenueThisMonth.map((r) => fmtPrice(r.amount, r.currency)).join(' + ')
    : fmtPrice(0, currency);
  const paymentsThisMonth = stats.revenueThisMonth.reduce((n, r) => n + r.count, 0);
  const activeTotal = stats.activeSubscriptions;
  const providers = Object.keys(PROVIDER_LABEL).map((p) => ({ p, count: stats.byProvider.find((r) => r.provider === p)?.count || 0 }));

  return (
    <>
      <PageTitle
        eyebrow={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        sub="Here is what is happening with SoftServices today."
        actions={
          <>
            <Link href="/admin/blog/new/" className={smallBtn}>
              <Plus className="h-4 w-4" /> New post
            </Link>
            <Link href="/admin/payments/" className={primaryBtn}>
              <Banknote className="h-4 w-4" /> Review payments
            </Link>
          </>
        }
      >
        {greeting()}, {user.name?.split(' ')[0] || 'Admin'}
      </PageTitle>

      <div className={`${panel} mb-6 flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm`}>
        <Badge tone={freeMode ? 'green' : 'blue'} dot>
          {freeMode ? 'Free mode' : 'Paid mode'}
        </Badge>
        <span className="text-slate-600 dark:text-slate-300">
          {freeMode ? 'Every signed-in user has all Pro features for free.' : 'Pro features need a paid plan.'}
        </span>
        <Link href="/admin/settings/" className="ml-auto text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
          Change
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={stats.users} hint={`+${stats.newUsers30d} in the last 30 days`} icon={Users} href="/admin/users/" />
        <StatCard label="New this week" value={stats.newUsers7d} hint="Sign-ups in the last 7 days" icon={UserPlus} tone="blue" />
        <StatCard label="Active Pro" value={activeTotal} hint={`≈ ${fmtPrice(Math.round(mrr * 100) / 100, currency)}/month recurring`} icon={Crown} tone="amber" href="/admin/users/?filter=pro" />
        <StatCard label="Revenue this month" value={revenue} hint={`${paymentsThisMonth} payment${paymentsThisMonth === 1 ? '' : 's'} recorded`} icon={Wallet} tone="green" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title={
            <span className="flex items-center gap-2">
              Payments to review {stats.pendingManualPayments > 0 && <Badge tone="amber">{stats.pendingManualPayments}</Badge>}
            </span>
          }
          action={
            <Link href="/admin/payments/" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          bodyClass=""
        >
          {pendingList.items.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-white/10">
              {pendingList.items.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <Avatar name={p.user.name || p.user.email} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{p.user.email}</span>
                    <span className="text-xs text-slate-500">
                      {p.method} · <span className="font-mono">{p.reference}</span> · {timeAgo(p.createdAt)}
                    </span>
                  </span>
                  <span className="text-right text-sm">
                    <span className="block font-semibold text-slate-900 dark:text-white">{p.amount || '—'}</span>
                    <span className="text-xs capitalize text-slate-500">{p.plan}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate-500">All caught up — no payments waiting for review.</p>
          )}
        </Card>

        <Card title="Active Pro by payment method">
          <ul className="space-y-3 text-sm">
            {providers.map(({ p, count }) => (
              <li key={p}>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">{PROVIDER_LABEL[p]}</span>
                  <strong className="text-slate-900 dark:text-white">{count}</strong>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-full rounded-full ${PROVIDER_COLOR[p]}`} style={{ width: `${activeTotal ? (count / activeTotal) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Newest users"
          action={
            <Link href="/admin/users/" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
              All users <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          bodyClass=""
        >
          {stats.recentUsers.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2.5 font-medium">User</th>
                  <th className="px-5 py-2.5 font-medium">Plan</th>
                  <th className="hidden px-5 py-2.5 text-right font-medium sm:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {stats.recentUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar name={u.email} size="h-8 w-8 text-[11px]" />
                        <span className="truncate font-medium text-slate-900 dark:text-white">{u.email}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3">{u.pro ? <Badge tone="amber" dot>Pro</Badge> : <Badge>Free</Badge>}</td>
                    <td className="hidden px-5 py-3 text-right text-slate-500 sm:table-cell">{fmtDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate-500">No users yet.</p>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Checkout options" action={<Link href="/admin/settings/" className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">Settings</Link>}>
            <ul className="space-y-3 text-sm">
              {[
                ['Card (Stripe)', methods.stripe, CreditCard],
                ['PayPal', methods.paypal, Wallet],
                [methods.manualLabel, methods.manual, Landmark],
              ].map(([label, on, Icon]) => (
                <li key={label} className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-slate-400" />
                  <span className="flex-1 text-slate-700 dark:text-slate-200">{label}</span>
                  <Badge tone={on ? 'green' : 'slate'} dot>{on ? 'Live' : 'Off'}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Content">
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Published', stats.posts.published],
                ['Drafts', stats.posts.drafts],
                ['Total', stats.posts.total],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 py-3 dark:bg-slate-800/60">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="mt-0.5 font-display text-xl font-semibold text-slate-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex gap-2">
              <Link href="/admin/blog/new/" className={`${smallBtn} flex-1 justify-center`}>
                <Plus className="h-4 w-4" /> Write post
              </Link>
              <Link href="/admin/blog/" className={`${smallBtn} flex-1 justify-center`}>
                <Newspaper className="h-4 w-4" /> All posts
              </Link>
            </div>
          </Card>

          <Link href="/admin/settings/" className={`${panel} flex items-center gap-3 p-4 text-sm transition hover:border-slate-300`}>
            <Settings className="h-4 w-4 text-slate-400" />
            <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">Prices, payments &amp; site settings</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </>
  );
}

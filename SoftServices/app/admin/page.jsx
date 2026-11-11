import Link from 'next/link';
import {
  Users, UserPlus, Crown, Wallet, Banknote, Newspaper, Settings, Plus, ArrowRight, CreditCard, Landmark,
  Zap, Receipt, ArrowUpRight, ArrowDownRight, Minus, Ban, Clock,
} from 'lucide-react';
import { api } from '@/lib/server/api';
import { requireAdmin } from '@/lib/server/admin';
import { getPlans, paymentMethods, isFreeMode } from '@/lib/server/settings';
import { fmtPrice } from '@/lib/plans';
import BarChart from '@/components/admin/BarChart';
import { Avatar, Badge, Card, PageTitle, fmtDate, panel, primaryBtn, smallBtn, timeAgo } from '@/components/admin/ui';

const PROVIDER_LABEL = { stripe: 'Card (Stripe)', paypal: 'PayPal', manual: 'Manual payment', admin: 'Granted by admin' };
const PROVIDER_COLOR = { stripe: 'bg-violet-500', paypal: 'bg-sky-500', manual: 'bg-emerald-500', admin: 'bg-slate-400' };
const RANGES = { 7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days' };

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Karachi' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const sum = (o) => Object.values(o || {}).reduce((a, b) => a + Number(b), 0);
const money = (byCurrency, fallback) => {
  const parts = Object.entries(byCurrency || {}).filter(([, v]) => Number(v) > 0);
  return parts.length ? parts.map(([c, v]) => fmtPrice(Math.round(Number(v) * 100) / 100, c)).join(' + ') : fmtPrice(0, fallback);
};

/** "↑ 25% vs previous 30 days" — an arrow and words, so it never relies on colour alone. */
function Change({ now, before, days }) {
  const span = `previous ${days} days`;
  if (!before && !now) return <span className="text-slate-500">No change vs {span}</span>;
  if (!before) return <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><ArrowUpRight className="h-3.5 w-3.5" /> New vs {span}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="inline-flex items-center gap-1 text-slate-500"><Minus className="h-3.5 w-3.5" /> Same as {span}</span>;
  const up = pct > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 ${up ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
      <Icon className="h-3.5 w-3.5" /> {up ? 'Up' : 'Down'} {Math.abs(pct)}% vs {span}
    </span>
  );
}

function Tile({ label, value, icon: Icon, children, href }) {
  const body = (
    <div className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs">{children}</p>
    </div>
  );
  return href ? (
    <Link href={href} className={`${panel} block transition hover:border-slate-300 dark:hover:border-white/20`}>{body}</Link>
  ) : (
    <div className={panel}>{body}</div>
  );
}

/** A small all-time fact for the strip at the top. */
function Fact({ icon: Icon, label, value, href, tone }) {
  const inner = (
    <>
      <Icon className={`h-4 w-4 ${tone || 'text-slate-400'}`} />
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <strong className="font-semibold text-slate-900 dark:text-white">{value}</strong>
    </>
  );
  return href ? (
    <Link href={href} className="inline-flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50 dark:hover:bg-white/5">{inner}</Link>
  ) : (
    <span className="inline-flex items-center gap-2 px-2 py-1">{inner}</span>
  );
}

export default async function AdminDashboard({ searchParams }) {
  const { user } = await requireAdmin();
  const days = RANGES[searchParams?.range] ? Number(searchParams.range) : 30;
  const [stats, activity, pendingList, { plans, currency }, methods, freeMode] = await Promise.all([
    api('/admin/stats'),
    api(`/admin/stats/activity?days=${days}`),
    api('/admin/payments/manual?status=pending&pageSize=5'),
    getPlans(),
    paymentMethods(),
    isFreeMode(),
  ]);

  // Rough monthly recurring revenue at today's list prices (manual and admin grants excluded).
  const mrr = stats.activeByPlan
    .filter((s) => ['stripe', 'paypal'].includes(s.provider))
    .reduce((total, s) => total + s.count * (s.plan === 'yearly' ? plans.yearly.price / 12 : plans.monthly.price), 0);
  const activeTotal = stats.activeSubscriptions;
  const providers = Object.keys(PROVIDER_LABEL).map((p) => ({ p, count: stats.byProvider.find((r) => r.provider === p)?.count || 0 }));

  const { current: now, previous: before, series } = activity;
  // The revenue chart uses one currency: the site's, or the one most money came in with.
  const currencies = [...new Set(series.flatMap((d) => Object.keys(d.revenue)))];
  const chartCurrency = currencies.includes(currency) || !currencies.length ? currency : currencies.sort((a, b) => (now.revenue[b] || 0) - (now.revenue[a] || 0))[0];
  const otherCurrencies = currencies.filter((c) => c !== chartCurrency);

  return (
    <>
      <PageTitle
        eyebrow={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        sub="Here is what is happening with SoftServices."
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

      {/* All-time facts: not affected by the date range below. */}
      <div className={`${panel} mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 text-sm`}>
        <Badge tone={freeMode ? 'green' : 'blue'} dot>{freeMode ? 'Free mode' : 'Paid mode'}</Badge>
        <span className="mx-1 hidden h-4 w-px bg-slate-200 sm:block dark:bg-white/10" />
        <Fact icon={Users} label="Users" value={stats.users} href="/admin/users/" />
        <Fact icon={Crown} label="Active Pro" value={activeTotal} href="/admin/users/?filter=pro" tone="text-amber-500" />
        {!freeMode && <Fact icon={Wallet} label="≈ MRR" value={fmtPrice(Math.round(mrr * 100) / 100, currency)} />}
        <Fact icon={Clock} label="To review" value={stats.pendingManualPayments} href="/admin/payments/" tone={stats.pendingManualPayments ? 'text-amber-500' : undefined} />
        <Fact icon={Ban} label="Suspended" value={activity.suspended} href="/admin/users/?filter=suspended" />
        <Link href="/admin/settings/" className="ml-auto px-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
          Settings
        </Link>
      </div>

      {/* Date range: scopes every tile and chart in this section. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Activity</h2>
        <nav aria-label="Date range" className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-slate-900">
          {Object.entries(RANGES).map(([k, label]) => (
            <Link
              key={k}
              href={`/admin/?range=${k}`}
              aria-current={Number(k) === days ? 'true' : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                Number(k) === days ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <span className="text-xs text-slate-500">Days are counted in UTC.</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="New sign-ups" value={now.signups} icon={UserPlus} href="/admin/users/">
          <Change now={now.signups} before={before.signups} days={days} />
        </Tile>
        <Tile label="Pro jobs run" value={now.jobs} icon={Zap}>
          <Change now={now.jobs} before={before.jobs} days={days} />
        </Tile>
        <Tile label="Revenue" value={money(now.revenue, currency)} icon={Wallet}>
          <Change now={sum(now.revenue)} before={sum(before.revenue)} days={days} />
        </Tile>
        <Tile label="Payments" value={now.payments} icon={Receipt} href="/admin/payments/">
          <Change now={now.payments} before={before.payments} days={days} />
        </Tile>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0" title="Sign-ups per day">
          <BarChart label="Sign-ups" data={series.map((d) => ({ date: d.date, value: d.signups }))} emptyText="No sign-ups in this period." />
        </Card>
        <Card className="min-w-0" title="Pro jobs per day">
          <BarChart label="Pro jobs" data={series.map((d) => ({ date: d.date, value: d.jobs }))} emptyText="No Pro jobs in this period." />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2" title={`Revenue per day (${chartCurrency})`}>
          <BarChart
            label={`Revenue (${chartCurrency})`}
            data={series.map((d) => ({ date: d.date, value: Number(d.revenue[chartCurrency] || 0) }))}
            currency={chartCurrency}
            emptyText="No payments in this period."
          />
          {otherCurrencies.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">Also received in {otherCurrencies.join(', ')}: {money(Object.fromEntries(otherCurrencies.map((c) => [c, now.revenue[c]])), currency)}.</p>
          )}
        </Card>
        <Card title="Top Pro users" bodyClass="">
          {activity.topUsers.length ? (
            <ol className="divide-y divide-slate-100 dark:divide-white/10">
              {activity.topUsers.map((u, i) => (
                <li key={u.userId} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-4 text-xs tabular-nums text-slate-400">{i + 1}</span>
                  <Avatar name={u.name || u.email || '?'} size="h-8 w-8 text-[11px]" />
                  <Link href={`/admin/users/?q=${encodeURIComponent(u.email || '')}`} className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 hover:underline dark:text-white">
                    {u.email || 'Deleted user'}
                  </Link>
                  <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">{u.jobs} jobs</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate-500">Nobody has run a Pro job in this period.</p>
          )}
        </Card>
      </div>

      {/* Right now: lists that do not depend on the date range. */}
      <h2 className="mb-4 mt-10 font-display text-lg font-semibold text-slate-900 dark:text-white">Right now</h2>

      <div className="grid gap-4 lg:grid-cols-3">
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

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          title="Latest payments"
          action={
            <Link href="/admin/payments/" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          bodyClass=""
        >
          {activity.recentPayments.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-white/10">
              {activity.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{p.email || 'Deleted user'}</span>
                    <span className="text-xs text-slate-500">
                      {PROVIDER_LABEL[p.provider] || p.provider} · <span className="capitalize">{p.plan}</span> · {timeAgo(p.createdAt)}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{fmtPrice(Number(p.amount), p.currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate-500">No payments yet.</p>
          )}
        </Card>

        <Card
          title="Newest users"
          action={
            <Link href="/admin/users/" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          bodyClass=""
        >
          {stats.recentUsers.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-white/10">
              {stats.recentUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={u.email} size="h-8 w-8 text-[11px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{u.email}</span>
                    <span className="text-xs text-slate-500">Joined {fmtDate(u.createdAt)}</span>
                  </span>
                  {u.pro ? <Badge tone="amber" dot>Pro</Badge> : <Badge>Free</Badge>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate-500">No users yet.</p>
          )}
        </Card>

        <div className="space-y-4">
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
                <Plus className="h-4 w-4" /> Write
              </Link>
              <Link href="/admin/blog/" className={`${smallBtn} flex-1 justify-center`}>
                <Newspaper className="h-4 w-4" /> Posts
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

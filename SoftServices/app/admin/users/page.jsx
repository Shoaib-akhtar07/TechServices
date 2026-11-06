import Link from 'next/link';
import { api } from '@/lib/server/api';
import { requireAdmin } from '@/lib/server/admin';
import { grantProAction, revokeProAction, setRoleAction, deleteUserAction } from '../actions';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Badge, Flash, PageTitle, dangerBtn, fmtDate, input, smallBtn } from '@/components/admin/ui';

const PER_PAGE = 25;
const FILTERS = { all: 'All', pro: 'Pro', free: 'Free', admin: 'Admins', author: 'Authors' };
const PROVIDER = { stripe: 'Card', paypal: 'PayPal', manual: 'Manual', admin: 'Admin grant' };

export default async function AdminUsers({ searchParams }) {
  const { user: me } = await requireAdmin();
  const q = String(searchParams?.q || '').trim().slice(0, 100);
  const filter = FILTERS[searchParams?.filter] ? searchParams.filter : 'all';
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const { total, items: users } = await api(`/admin/users?${new URLSearchParams({ q, filter, page: String(page), pageSize: String(PER_PAGE) })}`);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (o) => '?' + new URLSearchParams({ ...(q && { q }), filter, page: String(page), ...o }).toString();
  const backUrl = `/admin/users/${qs({})}`;

  return (
    <>
      <PageTitle sub={`${total} user${total === 1 ? '' : 's'}`}>Users</PageTitle>
      <Flash searchParams={searchParams} />

      <form className="mb-4 flex flex-wrap gap-2" action="/admin/users/">
        <input name="q" defaultValue={q} placeholder="Search email or name" className={`${input} max-w-xs`} />
        <input type="hidden" name="filter" value={filter} />
        <button className={smallBtn}>Search</button>
        <div className="ml-auto flex flex-wrap gap-1">
          {Object.entries(FILTERS).map(([k, label]) => (
            <Link key={k} href={`/admin/users/?${new URLSearchParams({ ...(q && { q }), filter: k })}`} className={`rounded-full px-3 py-1.5 text-sm ${filter === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10'}`}>
              {label}
            </Link>
          ))}
        </div>
      </form>

      <div className="space-y-3">
        {users.map((u) => {
          const pro = !!u.subscription?.active;
          const admin = u.admin;
          const envAdmin = admin && u.role !== 'admin';
          const sub = u.subscription;
          return (
            <details key={u.id} className="rounded-2xl card p-4">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{u.email}</span>
                  <span className="text-xs text-slate-500">
                    {u.name || 'No name'} · joined {fmtDate(u.createdAt)}
                  </span>
                </span>
                {admin && <Badge tone="blue">Admin</Badge>}
                {u.role === 'author' && <Badge tone="green">Author</Badge>}
                {pro ? (
                  <Badge tone="amber">
                    Pro · {PROVIDER[sub.provider] || sub.provider} · until {fmtDate(sub.currentPeriodEnd)}
                  </Badge>
                ) : (
                  <Badge>{sub ? `Free (was ${sub.status})` : 'Free'}</Badge>
                )}
              </summary>

              <div className="mt-4 grid gap-4 border-t border-slate-900/10 pt-4 md:grid-cols-2 dark:border-white/10">
                <form action={grantProAction} className="space-y-2">
                  <p className="text-sm font-semibold">{pro ? 'Add Pro time' : 'Give Pro'}</p>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="back" value={backUrl} />
                  <div className="flex gap-2">
                    <select name="plan" className={input} defaultValue="monthly">
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <input name="days" type="number" min="1" max="3660" placeholder="Days (30 / 365)" className={input} />
                  </div>
                  {pro && ['stripe', 'paypal'].includes(sub.provider) && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">This replaces their {PROVIDER[sub.provider]} subscription record. Cancel it with “Remove Pro” first if they should not be charged.</p>
                  )}
                  <ConfirmButton className={smallBtn}>Give Pro</ConfirmButton>
                </form>

                <div className="space-y-3">
                  <p className="text-sm font-semibold">Account</p>
                  <div className="flex flex-wrap gap-2">
                    {sub && pro && (
                      <form action={revokeProAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="back" value={backUrl} />
                        <ConfirmButton confirm={`Remove Pro from ${u.email}?${['stripe', 'paypal'].includes(sub.provider) ? ` Their ${PROVIDER[sub.provider]} subscription will be cancelled too.` : ''}`} className={smallBtn}>
                          Remove Pro
                        </ConfirmButton>
                      </form>
                    )}
                    {!envAdmin && u.id !== me.id && (
                      <form action={setRoleAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="role" value={admin ? 'user' : 'admin'} />
                        <input type="hidden" name="back" value={backUrl} />
                        <ConfirmButton confirm={admin ? `Remove admin access from ${u.email}?` : `Make ${u.email} an admin? They will be able to change payments and users.`} className={smallBtn}>
                          {admin ? 'Remove admin' : 'Make admin'}
                        </ConfirmButton>
                      </form>
                    )}
                    {!admin && (
                      <form action={setRoleAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="role" value={u.role === 'author' ? 'user' : 'author'} />
                        <input type="hidden" name="back" value={backUrl} />
                        <ConfirmButton confirm={u.role === 'author' ? `Remove author access from ${u.email}?` : `Let ${u.email} write and publish blog posts?`} className={smallBtn}>
                          {u.role === 'author' ? 'Remove author' : 'Make author'}
                        </ConfirmButton>
                      </form>
                    )}
                    {u.id !== me.id && (
                      <form action={deleteUserAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="back" value={backUrl} />
                        <ConfirmButton confirm={`Delete ${u.email} permanently? This cannot be undone.`} className={dangerBtn}>
                          Delete user
                        </ConfirmButton>
                      </form>
                    )}
                  </div>
                  {envAdmin && <p className="text-xs text-slate-500">Admin through ADMIN_EMAILS in .env (development only).</p>}
                  {sub?.stripeSubscriptionId && <p className="break-all text-xs text-slate-500">Stripe: {sub.stripeSubscriptionId}</p>}
                  {sub?.paypalSubscriptionId && <p className="break-all text-xs text-slate-500">PayPal: {sub.paypalSubscriptionId}</p>}
                </div>
              </div>
            </details>
          );
        })}
        {!users.length && <p className="rounded-2xl card p-6 text-center text-slate-500">No users found.</p>}
      </div>

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={`/admin/users/${qs({ page: String(page - 1) })}`} className={smallBtn}>← Previous</Link>}
          <span className="text-slate-500">Page {page} of {pages}</span>
          {page < pages && <Link href={`/admin/users/${qs({ page: String(page + 1) })}`} className={smallBtn}>Next →</Link>}
        </div>
      )}
    </>
  );
}

import Link from 'next/link';
import { Search, ChevronDown, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { api } from '@/lib/server/api';
import { requireAdmin } from '@/lib/server/admin';
import { grantProAction, revokeProAction, setRoleAction, deleteUserAction, createUserAction, updateUserAction, setPasswordAction, suspendUserAction } from '../actions';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Avatar, Badge, EmptyState, Field, Flash, PageTitle, Tabs, dangerBtn, fmtDate, input, panel, primaryBtn, smallBtn } from '@/components/admin/ui';

const PER_PAGE = 25;
const FILTERS = { all: 'All users', pro: 'Pro', free: 'Free', admin: 'Admins', author: 'Authors', suspended: 'Suspended' };
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
      <PageTitle eyebrow="Customers" sub="Everyone with an account. Open a row to edit details, reset the password, give or remove Pro, change the role, suspend or delete the account.">
        Users
      </PageTitle>
      <Flash searchParams={searchParams} />

      <details className={`${panel} group mb-6`}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 text-sm font-semibold text-slate-900 dark:text-white">
          <UserPlus className="h-4 w-4 text-brand-600 dark:text-brand-300" /> Add a user
          <ChevronDown className="ml-auto h-4 w-4 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <form action={createUserAction} className="grid gap-4 border-t border-slate-100 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/10">
          <input type="hidden" name="back" value={backUrl} />
          <Field label="Email">
            <input name="email" type="email" required maxLength={254} className={input} placeholder="name@example.com" />
          </Field>
          <Field label="Name (optional)">
            <input name="name" maxLength={80} className={input} />
          </Field>
          <Field label="Password" hint="8 to 72 characters. Share it with the user privately.">
            <input name="password" type="text" required minLength={8} maxLength={72} autoComplete="new-password" className={input} />
          </Field>
          <Field label="Role">
            <select name="role" defaultValue="user" className={input}>
              <option value="user">User</option>
              <option value="author">Author (writes blog posts)</option>
              <option value="admin">Admin (full access)</option>
            </select>
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <ConfirmButton className={primaryBtn}>Create account</ConfirmButton>
          </div>
        </form>
      </details>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs items={Object.entries(FILTERS).map(([k, label]) => ({ href: `/admin/users/?${new URLSearchParams({ ...(q && { q }), filter: k })}`, label, active: filter === k }))} />
        <form className="relative ml-auto w-full sm:w-72" action="/admin/users/">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Search email or name…" className={`${input} pl-9`} />
          <input type="hidden" name="filter" value={filter} />
        </form>
      </div>

      {users.length ? (
        <div className={`${panel} overflow-hidden`}>
          <div className="hidden grid-cols-[minmax(0,1fr)_140px_200px_110px_24px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-500 md:grid dark:border-white/10 dark:bg-white/5">
            <span>User</span>
            <span>Role</span>
            <span>Plan</span>
            <span>Joined</span>
            <span />
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {users.map((u) => {
              const sub = u.subscription;
              const pro = !!sub?.active;
              const admin = u.admin;
              const envAdmin = admin && u.role !== 'admin';
              const isMe = u.id === me.id;
              const suspended = !!u.suspendedAt;
              return (
                <li key={u.id}>
                  <details className="group">
                    <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_140px_200px_110px_24px] dark:hover:bg-white/5">
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar name={u.name || u.email} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                            {u.name || u.email.split('@')[0]} {isMe && <span className="text-xs font-normal text-slate-400">(you)</span>}
                          </span>
                          <span className="block truncate text-xs text-slate-500">{u.email}</span>
                        </span>
                      </span>
                      <span className="hidden flex-wrap gap-1 md:flex">
                        {admin ? <Badge tone="violet">Admin</Badge> : u.role === 'author' ? <Badge tone="blue">Author</Badge> : <span className="text-sm text-slate-500">User</span>}
                        {suspended && <Badge tone="red" dot>Suspended</Badge>}
                      </span>
                      <span className="hidden min-w-0 md:block">
                        {pro ? (
                          <span className="block">
                            <Badge tone="amber" dot>Pro · {PROVIDER[sub.provider] || sub.provider}</Badge>
                            <span className="mt-0.5 block text-xs text-slate-500">until {fmtDate(sub.currentPeriodEnd)}</span>
                          </span>
                        ) : (
                          <Badge>{sub ? `Free · was ${sub.status.replace('_', ' ')}` : 'Free'}</Badge>
                        )}
                      </span>
                      <span className="hidden text-sm text-slate-500 md:block">{fmtDate(u.createdAt)}</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                    </summary>

                    <div className="grid gap-6 border-t border-slate-100 bg-slate-50/60 px-5 py-5 md:grid-cols-2 dark:border-white/10 dark:bg-white/[0.03]">
                      <form action={updateUserAction} className="space-y-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Details</p>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="back" value={backUrl} />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input name="name" defaultValue={u.name || ''} maxLength={80} placeholder="Name" aria-label="Name" className={input} />
                          <input name="email" type="email" required defaultValue={u.email} maxLength={254} aria-label="Email" className={input} />
                        </div>
                        <ConfirmButton className={smallBtn}>Save details</ConfirmButton>
                      </form>

                      <form action={setPasswordAction} className="space-y-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Reset password</p>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="back" value={backUrl} />
                        <input name="password" type="text" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="New password (8+ characters)" aria-label="New password" className={input} />
                        <ConfirmButton confirm={`Set a new password for ${u.email}? Their old password stops working.`} className={smallBtn}>
                          Set password
                        </ConfirmButton>
                      </form>

                      <form action={grantProAction} className="space-y-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{pro ? 'Add Pro time' : 'Give Pro'}</p>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="back" value={backUrl} />
                        <div className="flex gap-2">
                          <select name="plan" className={input} defaultValue="monthly">
                            <option value="monthly">Monthly (30 days)</option>
                            <option value="yearly">Yearly (365 days)</option>
                          </select>
                          <input name="days" type="number" min="1" max="3660" placeholder="Custom days" className={`${input} w-36`} />
                        </div>
                        {pro && ['stripe', 'paypal'].includes(sub.provider) && (
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            This replaces their {PROVIDER[sub.provider]} subscription record. Use “Remove Pro” first if they should not be charged again.
                          </p>
                        )}
                        <ConfirmButton className={primaryBtn}>Give Pro</ConfirmButton>
                      </form>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Account</p>
                        <div className="flex flex-wrap gap-2">
                          {sub && pro && (
                            <form action={revokeProAction}>
                              <input type="hidden" name="userId" value={u.id} />
                              <input type="hidden" name="back" value={backUrl} />
                              <ConfirmButton
                                confirm={`Remove Pro from ${u.email}?${['stripe', 'paypal'].includes(sub.provider) ? ` Their ${PROVIDER[sub.provider]} subscription will be cancelled too.` : ''}`}
                                className={smallBtn}
                              >
                                Remove Pro
                              </ConfirmButton>
                            </form>
                          )}
                          {!envAdmin && !isMe && (
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
                          {!isMe && (
                            <form action={suspendUserAction}>
                              <input type="hidden" name="userId" value={u.id} />
                              <input type="hidden" name="suspended" value={suspended ? '0' : '1'} />
                              <input type="hidden" name="back" value={backUrl} />
                              <ConfirmButton
                                confirm={suspended ? `Let ${u.email} log in again?` : `Suspend ${u.email}? They are logged out and cannot log in until you unsuspend them.`}
                                className={suspended ? smallBtn : dangerBtn}
                              >
                                {suspended ? 'Unsuspend' : 'Suspend'}
                              </ConfirmButton>
                            </form>
                          )}
                          {!isMe && (
                            <form action={deleteUserAction}>
                              <input type="hidden" name="userId" value={u.id} />
                              <input type="hidden" name="back" value={backUrl} />
                              <ConfirmButton confirm={`Delete ${u.email} permanently? This cannot be undone.`} className={dangerBtn}>
                                Delete user
                              </ConfirmButton>
                            </form>
                          )}
                        </div>
                        <dl className="space-y-1 text-xs text-slate-500">
                          {envAdmin && <dd>Admin through DevAdminEmails (development only).</dd>}
                          {suspended && <dd className="text-rose-600 dark:text-rose-300">Suspended on {fmtDate(u.suspendedAt)}.</dd>}
                          <dd>Pro jobs: {u.usage?.today ?? 0} today · {u.usage?.total ?? 0} in total</dd>
                          {sub?.stripeSubscriptionId && <dd className="break-all">Stripe: <span className="font-mono">{sub.stripeSubscriptionId}</span></dd>}
                          {sub?.paypalSubscriptionId && <dd className="break-all">PayPal: <span className="font-mono">{sub.paypalSubscriptionId}</span></dd>}
                          <dd className="break-all">User ID: <span className="font-mono">{u.id}</span></dd>
                        </dl>
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <EmptyState title="No users found">{q ? `Nobody matches “${q}”.` : 'Try another filter.'}</EmptyState>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          {total} user{total === 1 ? '' : 's'}
          {pages > 1 && ` · page ${page} of ${pages}`}
        </span>
        {pages > 1 && (
          <span className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/users/${qs({ page: String(page - 1) })}`} className={smallBtn}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            )}
            {page < pages && (
              <Link href={`/admin/users/${qs({ page: String(page + 1) })}`} className={smallBtn}>
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </span>
        )}
      </div>
    </>
  );
}

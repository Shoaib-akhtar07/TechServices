import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/lib/server/api';
import { requireAdmin } from '@/lib/server/admin';
import { approvePaymentAction, rejectPaymentAction } from '../actions';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Avatar, Badge, EmptyState, Flash, PageTitle, Tabs, fmtDateTime, input, panel, smallBtn, timeAgo } from '@/components/admin/ui';

const TABS = { pending: 'Waiting for review', approved: 'Approved', rejected: 'Rejected' };
const TONE = { pending: 'amber', approved: 'green', rejected: 'red' };

export default async function AdminPayments({ searchParams }) {
  await requireAdmin();
  const status = TABS[searchParams?.status] ? searchParams.status : 'pending';
  const { items: payments, counts } = await api(`/admin/payments/manual?status=${status}&pageSize=100`);
  const count = (s) => counts[s] || 0;
  const backUrl = `/admin/payments/?status=${status}`;

  return (
    <>
      <PageTitle eyebrow="Customers" sub="Bank transfer, JazzCash and Easypaisa payments sent by customers. Check the money arrived in your account, then approve to switch on Pro.">
        Manual payments
      </PageTitle>
      <Flash searchParams={searchParams} />

      <div className="mb-4">
        <Tabs items={Object.entries(TABS).map(([k, label]) => ({ href: `/admin/payments/?status=${k}`, label, count: count(k), active: status === k }))} />
      </div>

      {payments.length ? (
        <div className="space-y-3">
          {payments.map((p) => (
            <article key={p.id} className={panel}>
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10">
                <Avatar name={p.user.name || p.user.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{p.user.email}</p>
                  <p className="text-xs text-slate-500">
                    {p.user.name || 'No name'} · sent {timeAgo(p.createdAt)} ({fmtDateTime(p.createdAt)})
                  </p>
                </div>
                <Badge tone={TONE[p.status]} dot>{TABS[p.status]}</Badge>
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 text-sm sm:grid-cols-4">
                {[
                  ['Amount', <span key="a" className="font-display text-lg font-semibold">{p.amount || '—'}</span>],
                  ['Plan', <span key="p" className="capitalize">{p.plan}</span>],
                  ['Method', p.method],
                  ['Transaction ID', <span key="r" className="break-all font-mono">{p.reference}</span>],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">{k}</dt>
                    <dd className="mt-1 font-medium text-slate-900 dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              {p.note && (
                <p className="mx-5 mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-300">
                  <span className="font-medium">Customer note:</span> {p.note}
                </p>
              )}

              {p.status === 'pending' ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-white/10 dark:bg-white/[0.03]">
                  <form action={approvePaymentAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="back" value={backUrl} />
                    <ConfirmButton
                      confirm={`Approve ${p.reference} and give ${p.user.email} ${p.plan} Pro?`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve &amp; activate Pro
                    </ConfirmButton>
                  </form>
                  <form action={rejectPaymentAction} className="flex min-w-[260px] flex-1 gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="back" value={backUrl} />
                    <input name="adminNote" maxLength={300} placeholder="Reason shown to the customer (optional)" className={`${input} flex-1`} />
                    <ConfirmButton confirm="Reject this payment?" className={smallBtn}>
                      <XCircle className="h-4 w-4" /> Reject
                    </ConfirmButton>
                  </form>
                </div>
              ) : (
                <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-white/10">
                  {TABS[p.status]} by {p.reviewedBy} on {fmtDateTime(p.reviewedAt)}
                  {p.adminNote && ` — “${p.adminNote}”`}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={status === 'pending' ? 'All caught up' : 'Nothing here'}>
          {status === 'pending' ? 'No payments are waiting for review.' : `No ${TABS[status].toLowerCase()} payments yet.`}
        </EmptyState>
      )}
    </>
  );
}

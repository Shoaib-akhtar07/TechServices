import Link from 'next/link';
import { api } from '@/lib/server/api';
import { requireAdmin } from '@/lib/server/admin';
import { approvePaymentAction, rejectPaymentAction } from '../actions';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { Badge, Flash, PageTitle, fmtDateTime, input, smallBtn } from '@/components/admin/ui';

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
      <PageTitle sub="Bank transfer / JazzCash / Easypaisa payments sent by customers. Check the money arrived, then approve to switch on Pro.">Manual payments</PageTitle>
      <Flash searchParams={searchParams} />

      <div className="mb-4 flex flex-wrap gap-1">
        {Object.entries(TABS).map(([k, label]) => (
          <Link key={k} href={`/admin/payments/?status=${k}`} className={`rounded-full px-3 py-1.5 text-sm ${status === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10'}`}>
            {label} ({count(k)})
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {payments.map((p) => (
          <div key={p.id} className="rounded-2xl card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.user.email}</p>
                <p className="text-sm text-slate-500">
                  {p.user.name || 'No name'} · sent {fmtDateTime(p.createdAt)}
                </p>
              </div>
              <Badge tone={TONE[p.status]}>{TABS[p.status]}</Badge>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-slate-500">Plan</dt>
                <dd className="font-medium capitalize">{p.plan}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Amount</dt>
                <dd className="font-medium">{p.amount || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Method</dt>
                <dd className="font-medium">{p.method}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Transaction ID</dt>
                <dd className="break-all font-mono font-medium">{p.reference}</dd>
              </div>
            </dl>
            {p.note && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">{p.note}</p>}

            {p.status === 'pending' ? (
              <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-slate-900/10 pt-4 dark:border-white/10">
                <form action={approvePaymentAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="back" value={backUrl} />
                  <ConfirmButton confirm={`Approve ${p.reference} and give ${p.user.email} ${p.plan} Pro?`} className="btn-gold !px-4 !py-2 text-sm">
                    Approve & activate Pro
                  </ConfirmButton>
                </form>
                <form action={rejectPaymentAction} className="flex flex-1 flex-wrap gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="back" value={backUrl} />
                  <input name="adminNote" maxLength={300} placeholder="Reason shown to the customer (optional)" className={`${input} min-w-[200px] flex-1`} />
                  <ConfirmButton confirm="Reject this payment?" className={smallBtn}>Reject</ConfirmButton>
                </form>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                {TABS[p.status]} by {p.reviewedBy} on {fmtDateTime(p.reviewedAt)}
                {p.adminNote && ` — “${p.adminNote}”`}
              </p>
            )}
          </div>
        ))}
        {!payments.length && <p className="rounded-2xl card p-6 text-center text-slate-500">Nothing here.</p>}
      </div>
    </>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { api } from '@/lib/server/api';
import { getAccess } from '@/lib/server/auth';
import { getPlans, manualPaymentInfo, isFreeMode } from '@/lib/server/settings';
import { fmtPrice } from '@/lib/plans';
import ManualPaymentForm from '@/components/ManualPaymentForm';

export const metadata = { title: 'Pay by bank transfer', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ManualPayment({ searchParams }) {
  if (await isFreeMode()) redirect('/');
  const plan = searchParams?.plan === 'monthly' ? 'monthly' : 'yearly';
  const { user, sub, paid } = await getAccess();
  if (!user) redirect(`/login/?next=${encodeURIComponent(`/pricing/manual/?plan=${plan}`)}`);
  const manual = await manualPaymentInfo();
  if (!manual || (paid && !['manual', 'admin'].includes(sub.provider))) redirect('/pricing/');

  const [{ plans, currency }, mine] = await Promise.all([getPlans(), api('/billing/manual').catch(() => [])]);
  const pending = mine.find((p) => p.status === 'pending');
  const amount = manual.prices[plan] || fmtPrice(plans[plan].price, currency);
  const methods = manual.methods;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-14">
      <Link href="/pricing/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:underline dark:text-slate-400">
        <ArrowLeft className="h-4 w-4" /> Back to pricing
      </Link>
      <h1 className="mt-4 text-4xl font-semibold">{manual.label}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        SoftServices Pro · {plans[plan].label} — <strong className="text-slate-900 dark:text-white">{amount}</strong>
      </p>

      {pending ? (
        <p className="mt-8 flex items-start gap-2 rounded-2xl bg-amber-50 p-5 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <Clock className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            Your payment (transaction ID <strong>{pending.reference}</strong>) is waiting for review. Pro will be activated as soon as it is checked.{' '}
            <Link href="/account/" className="font-semibold underline">Go to my account</Link>
          </span>
        </p>
      ) : (
        <>
          <section className="mt-8 rounded-3xl card p-6">
            <h2 className="font-display font-semibold text-slate-500">1. Send the payment</h2>
            <div className="mt-3 whitespace-pre-line text-slate-800 dark:text-slate-200">{manual.instructions}</div>
          </section>
          <section className="mt-6 rounded-3xl card p-6">
            <h2 className="font-display font-semibold text-slate-500">2. Tell us the transaction ID</h2>
            <ManualPaymentForm plan={plan} methods={methods} />
          </section>
        </>
      )}
    </div>
  );
}

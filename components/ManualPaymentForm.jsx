'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';

const input = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-brand-500/20';

export default function ManualPaymentForm({ plan, methods }) {
  const router = useRouter();
  const [form, setForm] = useState({ method: methods[0] || '', reference: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/backend/billing/manual/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, ...form }) });
    if (res.ok) {
      router.push('/account/');
      router.refresh();
    } else {
      setError((await res.json()).error);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      {methods.length > 1 && (
        <div>
          <label htmlFor="method" className="mb-1.5 block text-sm font-medium">Paid with</label>
          <select id="method" value={form.method} onChange={set('method')} className={input}>
            {methods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="reference" className="mb-1.5 block text-sm font-medium">Transaction ID</label>
        <input id="reference" required minLength={4} maxLength={100} value={form.reference} onChange={set('reference')} className={input} placeholder="e.g. 0123456789" />
      </div>
      <div>
        <label htmlFor="note" className="mb-1.5 block text-sm font-medium">Sender name / account number (optional)</label>
        <textarea id="note" rows={2} maxLength={500} value={form.note} onChange={set('note')} className={input} />
      </div>
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      <button type="submit" disabled={busy} className="btn-gold w-full">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />} Submit payment
      </button>
      <p className="text-center text-xs text-slate-500">We check every payment by hand and activate Pro as soon as it is confirmed.</p>
    </form>
  );
}

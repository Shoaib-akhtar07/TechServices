'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { CreditCard, LogOut, Crown, Loader2 } from 'lucide-react';

export default function AccountActions({ pro, hasBilling, isTestSub }) {
  const router = useRouter();
  const { update } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const portal = async () => {
    setBusy(true);
    setError('');
    const res = await fetch('/api/stripe/portal/', { method: 'POST' });
    const j = await res.json();
    if (res.ok) window.location.href = j.url;
    else {
      setError(j.error);
      setBusy(false);
    }
  };

  const cancelTest = async () => {
    setBusy(true);
    await fetch('/api/test-billing/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel' }) });
    await update();
    router.refresh();
    setBusy(false);
  };

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {!pro && (
        <Link href="/pricing/" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-white">
          <Crown className="h-4 w-4" /> Upgrade to Pro
        </Link>
      )}
      {hasBilling && (
        <button onClick={portal} disabled={busy} className="btn-secondary !px-4 !py-2 text-sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Manage billing
        </button>
      )}
      {isTestSub && (
        <button onClick={cancelTest} disabled={busy} className="rounded-xl border border-dashed border-slate-400 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">
          Cancel test subscription
        </button>
      )}
      <button onClick={() => signOut({ callbackUrl: '/' })} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
        <LogOut className="h-4 w-4" /> Log out
      </button>
      {error && <p className="w-full text-sm text-rose-600">{error}</p>}
    </div>
  );
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import Logo from './Logo';

const input = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-brand-500/20';

// Only allow relative redirects to avoid open-redirect abuse.
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/account/');

export default function AuthForm({ mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const signup = mode === 'signup';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (signup) {
        const res = await fetch('/api/signup/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
      }
      const r = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (!r || r.error) throw new Error('Incorrect email or password.');
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-16">
      <div className="rounded-3xl card p-8">
        <Logo className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-center text-3xl font-semibold">{signup ? 'Create your SoftServices account' : 'Welcome back'}</h1>
        <p className="mt-1 text-center text-sm text-slate-500">{signup ? 'It takes less than a minute.' : 'Log in to use your Pro tools.'}</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          {signup && (
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Name</label>
              <input id="name" autoComplete="name" value={form.name} onChange={set('name')} className={input} />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
            <input id="email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} className={input} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
            <input id="password" type="password" required minLength={signup ? 8 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} value={form.password} onChange={set('password')} className={input} />
            {signup && <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>}
          </div>
          {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full justify-center">
            {busy && <Loader2 className="h-5 w-5 animate-spin" />} {signup ? 'Create account' : 'Log in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          {signup ? 'Already have an account? ' : 'New to SoftServices? '}
          <Link href={`/${signup ? 'login' : 'signup'}/?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-600 hover:underline">
            {signup ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  );
}

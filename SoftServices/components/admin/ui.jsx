// Building blocks shared by the admin pages (server components): a clean, neutral look with the
// site's bronze accent, so the console reads as a tool rather than a marketing page.
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Inbox } from 'lucide-react';

export const input =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20';
export const smallBtn =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
export const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2a2f3a] dark:bg-white dark:text-ink dark:hover:bg-slate-200';
export const dangerBtn =
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10';

/** White panel used for every admin section. */
export const panel = 'rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-white/10 dark:bg-slate-900';

export function Flash({ searchParams }) {
  const err = searchParams?.err;
  const msg = searchParams?.msg;
  if (!err && !msg) return null;
  const Icon = err ? AlertTriangle : CheckCircle2;
  return (
    <div
      role={err ? 'alert' : 'status'}
      className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
        err
          ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{err || msg}</span>
    </div>
  );
}

/** Page heading: optional small label above, description below and buttons on the right. */
export function PageTitle({ children, sub, eyebrow, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600 dark:text-brand-300">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">{children}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30',
  red: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
};
const DOTS = { slate: 'bg-slate-400', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-rose-500', blue: 'bg-sky-500', violet: 'bg-violet-500' };

export function Badge({ tone = 'slate', dot = false, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} />}
      {children}
    </span>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

/** "3 hours ago", "2 days ago"… */
export function timeAgo(d) {
  if (!d) return '—';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, n] of units) if (s >= n) return `${Math.floor(s / n)} ${u}${Math.floor(s / n) > 1 ? 's' : ''} ago`;
  return 'just now';
}

/** A titled settings / content block. */
export function Section({ title, status, children, help, id }) {
  return (
    <section id={id} className={`${panel} scroll-mt-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-white/10">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          {help && <div className="mt-1 max-w-3xl space-y-1 text-sm text-slate-500 dark:text-slate-400">{help}</div>}
        </div>
        {status}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

/** Panel with a header row (title + optional link) and free content. */
export function Card({ title, action, children, className = '', bodyClass = 'p-5' }) {
  return (
    <section className={`${panel} ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-white/10">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          {action}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/** Dashboard number with an icon. */
export function StatCard({ label, value, hint, icon: Icon, href, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  };
  const body = (
    <div className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</p>
        {hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
      </div>
      {Icon && (
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className={`${panel} block transition hover:border-slate-300 hover:shadow-md dark:hover:border-white/20`}>
      {body}
    </Link>
  ) : (
    <div className={panel}>{body}</div>
  );
}

/** Round initials avatar. */
export function Avatar({ name, size = 'h-9 w-9 text-xs' }) {
  const text = (name || '?').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
  return <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-300 font-semibold text-brand-900 ${size}`}>{text}</span>;
}

export function EmptyState({ title = 'Nothing here yet', children }) {
  return (
    <div className={`${panel} flex flex-col items-center px-6 py-14 text-center`}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Inbox className="h-6 w-6" />
      </span>
      <p className="mt-4 font-medium text-slate-900 dark:text-white">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
    </div>
  );
}

/** Pill tabs (filters). `items`: [{ href, label, count, active }]. */
export function Tabs({ items }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            t.active ? 'bg-ink text-white shadow-sm dark:bg-white dark:text-ink' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className={`rounded-full px-1.5 text-xs ${t.active ? 'bg-white/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}

/** Checkbox that always submits a value: a hidden "0", then "1" when ticked (the last value wins). */
export function Toggle({ name, on, label }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <input type="hidden" name={name} value="0" />
      <input type="checkbox" name={name} value="1" defaultChecked={on} className="peer sr-only" />
      <span className="relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:bg-emerald-500 peer-checked:after:translate-x-4 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100 dark:bg-slate-700" />
      {label}
    </label>
  );
}

/** Secret inputs never show the saved value — leave empty to keep it. */
export function Secret({ name, label, value, hint }) {
  return (
    <Field label={label} hint={hint}>
      <input name={name} type="password" autoComplete="off" placeholder={value ? 'Saved — leave empty to keep' : 'Not set'} className={input} />
    </Field>
  );
}

/** Where a server action redirects back to (with its message) after it runs. */
export function BackField({ to }) {
  return <input type="hidden" name="back" value={to} />;
}

export function Code({ children }) {
  return <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{children}</code>;
}

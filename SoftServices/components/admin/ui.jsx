// Small building blocks shared by the admin pages (server components).
export const input =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-brand-500/20';
export const smallBtn = 'btn-secondary !px-3 !py-1.5 text-sm';

export function Flash({ searchParams }) {
  if (searchParams?.err) return <p className="mb-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">{searchParams.err}</p>;
  if (searchParams?.msg) return <p className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">{searchParams.msg}</p>;
  return null;
}

export function PageTitle({ children, sub }) {
  return (
    <div className="mb-6">
      <h1 className="text-4xl font-semibold">{children}</h1>
      {sub && <p className="mt-1 text-slate-600 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

export function Badge({ tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200',
    red: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
    blue: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export function Section({ title, status, children, help }) {
  return (
    <section className="rounded-2xl card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {status}
      </div>
      {help && <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-400">{help}</div>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Checkbox that always submits a value: a hidden "0", then "1" when ticked (the last value wins). */
export function Toggle({ name, on, label }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input type="hidden" name={name} value="0" />
      <input type="checkbox" name={name} value="1" defaultChecked={on} className="h-4 w-4 accent-amber-500" />
      {label}
    </label>
  );
}

/** Secret inputs never show the saved value — leave empty to keep it. */
export function Secret({ name, label, value, hint }) {
  return (
    <Field label={label} hint={hint}>
      <input name={name} type="password" autoComplete="off" placeholder={value ? `Saved (…${value.slice(-4)}) — leave empty to keep` : 'Not set'} className={input} />
    </Field>
  );
}

/** Where a server action redirects back to (with its message) after it runs. */
export function BackField({ to }) {
  return <input type="hidden" name="back" value={to} />;
}

export function Code({ children }) {
  return <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{children}</code>;
}

export const dangerBtn = 'rounded-xl px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10';

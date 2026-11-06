'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Users, Banknote, Wrench, Newspaper, Settings, ExternalLink, LogOut } from 'lucide-react';

const GROUPS = [
  { label: 'Overview', items: [{ href: '/admin/', label: 'Dashboard', icon: LayoutDashboard, exact: true }] },
  {
    label: 'Customers',
    items: [
      { href: '/admin/users/', label: 'Users', icon: Users },
      { href: '/admin/payments/', label: 'Payments', icon: Banknote, badge: 'pending' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/blog/', label: 'Blog', icon: Newspaper },
      { href: '/admin/tools/', label: 'Tools', icon: Wrench },
    ],
  },
  { label: 'System', items: [{ href: '/admin/settings/', label: 'Settings', icon: Settings }] },
];

const initials = (s = '') => s.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

/** Sidebar of the admin panel. `pending` = manual payments waiting for review. */
export default function AdminNav({ user, pending = 0 }) {
  const pathname = usePathname() || '';
  const active = (item) => (item.exact ? pathname === item.href || pathname === item.href.slice(0, -1) : pathname.startsWith(item.href));

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:gap-6 lg:overflow-visible lg:pb-0">
        {GROUPS.map((g) => (
          <div key={g.label} className="flex gap-1 lg:block">
            <p className="mb-1.5 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 lg:block">{g.label}</p>
            <ul className="flex gap-1 lg:block lg:space-y-0.5">
              {g.items.map((item) => {
                const on = active(item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={on ? 'page' : undefined}
                      className={`group relative flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                        on ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                      }`}
                    >
                      {on && <span className="absolute inset-y-1.5 left-0 hidden w-0.5 rounded-full bg-brand-300 lg:block" />}
                      <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge === 'pending' && pending > 0 && (
                        <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-bold leading-none text-ink">{pending}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto hidden border-t border-white/10 p-3 lg:block">
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-100">
          <ExternalLink className="h-4 w-4 text-slate-500" /> View website
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-300 to-brand-600 text-xs font-bold text-ink">{initials(user.name || user.email)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{user.name || 'Admin'}</span>
            <span className="block truncate text-xs text-slate-400" title={user.email}>{user.email}</span>
          </span>
          <button onClick={() => signOut({ callbackUrl: '/' })} title="Log out" aria-label="Log out" className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

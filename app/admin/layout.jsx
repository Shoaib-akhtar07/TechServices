import Link from 'next/link';
import { LayoutDashboard, Users, Banknote, Wrench, Newspaper, Settings } from 'lucide-react';
import { requireAdmin } from '@/lib/server/admin';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/admin/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users/', label: 'Users', icon: Users },
  { href: '/admin/payments/', label: 'Manual payments', icon: Banknote },
  { href: '/admin/tools/', label: 'Tools', icon: Wrench },
  { href: '/admin/blog/', label: 'Blog', icon: Newspaper },
  { href: '/admin/settings/', label: 'Settings', icon: Settings },
];

export default async function AdminLayout({ children }) {
  const { user } = await requireAdmin();
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Admin</p>
          <nav className="mt-2 flex gap-1 overflow-x-auto lg:flex-col" aria-label="Admin">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-btn-light dark:text-slate-300 dark:hover:bg-white/10">
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 hidden truncate px-3 text-xs text-slate-500 lg:block" title={user.email}>
            {user.email}
          </p>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

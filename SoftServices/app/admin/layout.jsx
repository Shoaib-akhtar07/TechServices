import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { requireAdmin } from '@/lib/server/admin';
import { api } from '@/lib/server/api';
import Logo from '@/components/Logo';
import AdminNav from '@/components/admin/AdminNav';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  const { user } = await requireAdmin();
  const pending = await api('/admin/payments/manual?status=pending&pageSize=1')
    .then((r) => r.total)
    .catch(() => 0);

  return (
    <div className="min-h-screen bg-[#f6f4f0] dark:bg-slate-950 lg:flex">
      {/* Sidebar (top bar on small screens) */}
      <aside className="bg-ink lg:fixed lg:inset-y-0 lg:left-0 lg:w-64">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 px-6 py-5">
            <Link href="/admin/" className="flex items-center gap-3">
              <Logo className="h-9 w-9" />
              <span>
                <span className="block font-display text-[15px] font-semibold leading-tight text-white">SoftServices</span>
                <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-brand-300">Admin console</span>
              </span>
            </Link>
            <Link href="/" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="View website">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          <AdminNav user={user} pending={pending} />
        </div>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </div>
    </div>
  );
}

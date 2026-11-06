import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/server/admin';
import { listPosts } from '@/lib/server/content';
import { Badge, Flash, PageTitle, fmtDate } from '@/components/admin/ui';

export default async function AdminBlog({ searchParams }) {
  await requireAdmin();
  const posts = await listPosts({ all: true });
  const now = new Date();
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle sub={`${posts.length} post${posts.length === 1 ? '' : 's'}`}>Blog</PageTitle>
        <Link href="/admin/blog/new/" className="btn-primary !px-4 !py-2 text-sm">
          <Plus className="h-4 w-4" /> New post
        </Link>
      </div>
      <Flash searchParams={searchParams} />
      <div className="space-y-2">
        {posts.map((p) => {
          const scheduled = p.published && new Date(p.publishedAt) > now;
          return (
            <Link key={p.id} href={`/admin/blog/${p.id}/`} className="flex flex-wrap items-center gap-3 rounded-2xl card card-hover p-4">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.title}</span>
                <span className="text-xs text-slate-500">
                  /blog/{p.slug}/ · {fmtDate(p.publishedAt)}
                </span>
              </span>
              {!p.published ? <Badge>Draft</Badge> : scheduled ? <Badge tone="amber">Scheduled</Badge> : <Badge tone="green">Published</Badge>}
            </Link>
          );
        })}
        {!posts.length && <p className="rounded-2xl card p-6 text-center text-slate-500">No posts yet.</p>}
      </div>
    </>
  );
}

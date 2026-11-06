import Link from 'next/link';
import { Plus, Search, Eye, ExternalLink, PenSquare } from 'lucide-react';
import { api } from '@/lib/server/api';
import { requireAdmin } from '@/lib/server/admin';
import { Badge, EmptyState, Flash, PageTitle, Tabs, fmtDate, input, panel, primaryBtn } from '@/components/admin/ui';

const STATUS = { all: 'All posts', published: 'Published', draft: 'Drafts', scheduled: 'Scheduled' };

function postStatus(p) {
  if (!p.published) return ['Draft', 'slate'];
  if (new Date(p.publishedAt) > new Date()) return ['Scheduled', 'blue'];
  return ['Published', 'green'];
}

export default async function AdminBlog({ searchParams }) {
  await requireAdmin();
  const status = STATUS[searchParams?.status] ? searchParams.status : 'all';
  const q = String(searchParams?.q || '').trim().toLowerCase().slice(0, 100);

  // One call per tab gives the counts; the posts list itself is small (≤ 100 per page).
  const [list, ...counts] = await Promise.all([
    api(`/posts/manage?pageSize=100${status === 'all' ? '' : `&status=${status}`}`),
    ...Object.keys(STATUS).map((k) => api(`/posts/manage?pageSize=1${k === 'all' ? '' : `&status=${k}`}`).then((r) => r.total)),
  ]);
  const posts = q ? list.items.filter((p) => `${p.title} ${p.slug} ${(p.tags || []).join(' ')}`.toLowerCase().includes(q)) : list.items;
  const countOf = Object.fromEntries(Object.keys(STATUS).map((k, i) => [k, counts[i]]));

  return (
    <>
      <PageTitle
        eyebrow="Content"
        sub="Write guides and news for the blog. Drafts stay hidden; a future publish date schedules the post."
        actions={
          <Link href="/admin/blog/new/" className={primaryBtn}>
            <Plus className="h-4 w-4" /> New post
          </Link>
        }
      >
        Blog
      </PageTitle>
      <Flash searchParams={searchParams} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs items={Object.entries(STATUS).map(([k, label]) => ({ href: `/admin/blog/?status=${k}`, label, count: countOf[k], active: status === k }))} />
        <form className="relative ml-auto w-full sm:w-72" action="/admin/blog/">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Search title or tag…" className={`${input} pl-9`} />
          <input type="hidden" name="status" value={status} />
        </form>
      </div>

      {posts.length ? (
        <div className={`${panel} overflow-hidden`}>
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_140px_80px_96px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-500 md:grid dark:border-white/10 dark:bg-white/5">
            <span>Post</span>
            <span>Status</span>
            <span>Date</span>
            <span className="text-right">Views</span>
            <span />
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-white/10">
            {posts.map((p) => {
              const [label, tone] = postStatus(p);
              return (
                <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_110px_140px_80px_96px] dark:hover:bg-white/5">
                  <Link href={`/admin/blog/${p.id}/`} className="flex min-w-0 items-center gap-3">
                    {p.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.coverImageUrl} alt="" className="h-11 w-16 shrink-0 rounded-md object-cover ring-1 ring-slate-200 dark:ring-white/10" />
                    ) : (
                      <span className="grid h-11 w-16 shrink-0 place-items-center rounded-md bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-brand-100 dark:from-brand-500/10 dark:to-brand-500/20 dark:ring-white/10">
                        <PenSquare className="h-4 w-4" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900 hover:text-brand-700 dark:text-white">{p.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        /blog/{p.slug}/{p.author?.name ? ` · by ${p.author.name}` : ''}
                        {p.readingMinutes ? ` · ${p.readingMinutes} min read` : ''}
                      </span>
                      {p.tags?.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {p.tags.slice(0, 4).map((t) => (
                            <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">#{t}</span>
                          ))}
                        </span>
                      )}
                    </span>
                  </Link>
                  <span className="md:block">
                    <Badge tone={tone} dot>{label}</Badge>
                  </span>
                  <span className="hidden text-sm text-slate-500 md:block">{fmtDate(p.publishedAt)}</span>
                  <span className="hidden items-center justify-end gap-1 text-sm text-slate-500 md:flex">
                    <Eye className="h-3.5 w-3.5" /> {p.views}
                  </span>
                  <span className="hidden justify-end gap-1 md:flex">
                    <Link href={`/admin/blog/${p.id}/`} className="rounded-md px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-white/10">
                      Edit
                    </Link>
                    {label === 'Published' && (
                      <Link href={`/blog/${p.slug}/`} target="_blank" title="View on site" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <EmptyState title={q ? 'No posts match your search' : 'No posts here yet'}>
          {q ? 'Try another word.' : <Link href="/admin/blog/new/" className="font-medium text-brand-700 underline">Write your first post</Link>}
        </EmptyState>
      )}
    </>
  );
}

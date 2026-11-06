import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';
import { requireAdmin } from '@/lib/server/admin';
import { getPostById } from '@/lib/server/content';
import { deletePostAction } from '../../actions';
import ConfirmButton from '@/components/admin/ConfirmButton';
import PostForm from '@/components/admin/PostForm';
import { Badge, Flash, PageTitle, dangerBtn, smallBtn } from '@/components/admin/ui';

// /admin/blog/new/ creates a post; /admin/blog/<id>/ edits one.
export default async function AdminPost({ params, searchParams }) {
  await requireAdmin();
  const isNew = params.id === 'new';
  const post = isNew ? undefined : await getPostById(params.id);
  if (!isNew && !post) notFound();
  const back = isNew ? '/admin/blog/new/' : `/admin/blog/${post.id}/`;
  const live = post?.published && new Date(post.publishedAt) <= new Date();
  const scheduled = post?.published && !live;

  return (
    <>
      <Link href="/admin/blog/" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
        <ArrowLeft className="h-4 w-4" /> All posts
      </Link>
      <PageTitle
        eyebrow="Blog"
        actions={
          post && (
            <>
              {live && (
                <Link href={`/blog/${post.slug}/`} target="_blank" className={smallBtn}>
                  <ExternalLink className="h-4 w-4" /> View on site
                </Link>
              )}
              <form action={deletePostAction}>
                <input type="hidden" name="id" value={post.id} />
                <ConfirmButton confirm={`Delete “${post.title}” permanently?`} className={dangerBtn}>
                  <Trash2 className="h-4 w-4" /> Delete
                </ConfirmButton>
              </form>
            </>
          )
        }
      >
        <span className="flex flex-wrap items-center gap-3">
          {isNew ? 'New post' : 'Edit post'}
          {post && (live ? <Badge tone="green" dot>Published</Badge> : scheduled ? <Badge tone="blue" dot>Scheduled</Badge> : <Badge dot>Draft</Badge>)}
        </span>
      </PageTitle>
      <Flash searchParams={searchParams} />
      <PostForm post={post} back={back} />
    </>
  );
}

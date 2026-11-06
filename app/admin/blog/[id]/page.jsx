import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/server/admin';
import { getPostById } from '@/lib/server/content';
import { deletePostAction } from '../../actions';
import ConfirmButton from '@/components/admin/ConfirmButton';
import PostForm from '@/components/admin/PostForm';
import { Flash, PageTitle, dangerBtn } from '@/components/admin/ui';

// /admin/blog/new/ creates a post; /admin/blog/<id>/ edits one.
export default async function AdminPost({ params, searchParams }) {
  await requireAdmin();
  const isNew = params.id === 'new';
  const post = isNew ? undefined : await getPostById(params.id);
  if (!isNew && !post) notFound();
  const back = isNew ? '/admin/blog/new/' : `/admin/blog/${post.id}/`;

  return (
    <>
      <Link href="/admin/blog/" className="text-sm text-slate-500 hover:text-brand-600">
        ← All posts
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <PageTitle>{isNew ? 'New post' : 'Edit post'}</PageTitle>
        {post?.published && (
          <Link href={`/blog/${post.slug}/`} target="_blank" className="text-sm font-medium text-brand-700 underline dark:text-brand-300">
            View on site
          </Link>
        )}
      </div>
      <Flash searchParams={searchParams} />
      <PostForm post={post} back={back} />
      {post && (
        <form action={deletePostAction} className="mt-4">
          <input type="hidden" name="id" value={post.id} />
          <ConfirmButton confirm={`Delete “${post.title}” permanently?`} className={dangerBtn}>
            Delete post
          </ConfirmButton>
        </form>
      )}
    </>
  );
}

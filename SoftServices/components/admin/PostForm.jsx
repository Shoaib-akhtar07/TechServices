import { savePostAction } from '@/app/admin/actions';
import { blocksToText } from '@/lib/blocks';
import { TOOLS } from '@/lib/tools';
import ConfirmButton from './ConfirmButton';
import CoverPicker from './CoverPicker';
import PostBodyEditor from './PostBodyEditor';
import { BackField, Field, Toggle, input, panel, primaryBtn } from './ui';

function SideCard({ title, children }) {
  return (
    <section className={panel}>
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:border-white/10 dark:text-white">{title}</h2>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

/** Create / edit form for a blog post. `post` is empty for a new one. */
export default function PostForm({ post = {}, back }) {
  const isNew = !post.id;
  return (
    <form action={savePostAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <BackField to={back} />
      {post.id && <input type="hidden" name="id" value={post.id} />}

      {/* Main column: the article itself */}
      <div className="min-w-0 space-y-5">
        <div className={`${panel} space-y-5 p-5`}>
          <Field label="Title" hint="The headline, also used in Google — best under 60 characters.">
            <input name="title" required maxLength={120} defaultValue={post.title} placeholder="e.g. How to merge PDF files for free" className={`${input} text-base font-medium`} />
          </Field>
          <Field label="Summary" hint="One or two sentences for Google and the blog list (120–160 characters).">
            <textarea name="description" required rows={2} maxLength={200} defaultValue={post.description} className={input} />
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">Article</p>
          <PostBodyEditor defaultValue={blocksToText(post.body)} />
          <p className="mt-2 text-xs text-slate-500">
            <code>## Heading</code> · <code>- bullet</code> · <code>1. step</code> · empty line between paragraphs · <code>[link text](/merge-pdf/)</code>
          </p>
        </div>
      </div>

      {/* Sidebar: publishing and metadata */}
      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <SideCard title="Publish">
          <Toggle name="published" on={post.published ?? true} label="Visible on the site" />
          <Field label="Publish date" hint="A future date schedules the post.">
            <input name="date" type="date" defaultValue={post.date || new Date().toISOString().slice(0, 10)} className={input} />
          </Field>
          <ConfirmButton className={`${primaryBtn} w-full justify-center`}>{isNew ? 'Create post' : 'Save changes'}</ConfirmButton>
          {!isNew && post.views !== undefined && (
            <p className="text-center text-xs text-slate-500">
              {post.views} view{post.views === 1 ? '' : 's'} · last saved {new Date(post.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </SideCard>

        <SideCard title="Cover image">
          <CoverPicker defaultUrl={post.coverImageUrl || ''} />
        </SideCard>

        <SideCard title="Details">
          <Field label="Address" hint="Leave empty to make one from the title.">
            <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 text-sm shadow-sm focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 dark:border-slate-700 dark:bg-slate-900">
              <span className="pl-3 text-slate-500">/blog/</span>
              <input name="slug" defaultValue={post.slug} placeholder="how-to-…" className="min-w-0 flex-1 bg-transparent px-1 py-2 outline-none" />
            </div>
          </Field>
          <Field label="Tags" hint="Comma-separated, e.g. pdf, guides">
            <input name="tags" defaultValue={(post.tags || []).join(', ')} maxLength={300} className={input} />
          </Field>
          <Field label="Promote a tool" hint="Adds a “Try it now” box at the end.">
            <select name="tool" defaultValue={post.tool || ''} className={input}>
              <option value="">None</option>
              {TOOLS.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </SideCard>
      </aside>
    </form>
  );
}

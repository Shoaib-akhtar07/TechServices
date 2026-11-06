import { savePostAction } from '@/app/admin/actions';
import { blocksToText } from '@/lib/blocks';
import { TOOLS } from '@/lib/tools';
import ConfirmButton from './ConfirmButton';
import { BackField, Field, Toggle, input } from './ui';

const HELP = 'Write in plain text: “## Heading”, “- bullet”, “1. step”, an empty line between paragraphs, and [link text](/merge-pdf/) for links.';

/** Create / edit form for a blog post. `post` is empty for a new one. */
export default function PostForm({ post = {}, back }) {
  return (
    <form action={savePostAction} className="grid gap-4 rounded-2xl card p-6 sm:grid-cols-2">
      <BackField to={back} />
      {post.id && <input type="hidden" name="id" value={post.id} />}
      <div className="sm:col-span-2">
        <Field label="Title" hint="Shown as the headline and in Google — best under 60 characters.">
          <input name="title" required maxLength={120} defaultValue={post.title} className={input} />
        </Field>
      </div>
      <Field label="Address" hint="Leave empty to make one from the title.">
        <div className="flex items-center gap-1 text-sm text-slate-500">
          /blog/<input name="slug" defaultValue={post.slug} placeholder="how-to-…" className={input} />/
        </div>
      </Field>
      <Field label="Publish date">
        <input name="date" type="date" defaultValue={post.date || new Date().toISOString().slice(0, 10)} className={input} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description" hint="One or two sentences for Google and the blog list (120–160 characters).">
          <textarea name="description" required rows={2} maxLength={200} defaultValue={post.description} className={input} />
        </Field>
      </div>
      <Field label="Promote a tool" hint="A “Try it now” box at the end of the post.">
        <select name="tool" defaultValue={post.tool || ''} className={input}>
          <option value="">None</option>
          {TOOLS.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tags" hint="Comma-separated, e.g. pdf, guides">
        <input name="tags" defaultValue={(post.tags || []).join(', ')} maxLength={300} className={input} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Cover image URL" hint="Optional — https://… image shown at the top of the post and in link previews.">
          <input name="coverImageUrl" type="url" defaultValue={post.coverImageUrl || ''} placeholder="https://…" className={input} />
        </Field>
      </div>
      <div className="flex items-end pb-2">
        <Toggle name="published" on={post.published ?? true} label="Published (visible on the site)" />
      </div>
      <div className="sm:col-span-2">
        <Field label="Text" hint={HELP}>
          <textarea name="body" required rows={20} defaultValue={blocksToText(post.body)} className={`${input} font-mono`} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <ConfirmButton className="btn-primary !px-5 !py-2 text-sm">{post.id ? 'Save post' : 'Create post'}</ConfirmButton>
      </div>
    </form>
  );
}

import Link from 'next/link';
import { requireAdmin } from '@/lib/server/admin';
import { getToolOverrides, listAllTools } from '@/lib/server/content';
import { CATEGORIES, getTool } from '@/lib/tools';
import { saveToolAction, resetToolAction } from '../actions';
import ConfirmButton from '@/components/admin/ConfirmButton';
import ToolIcon from '@/components/ToolIcon';
import { Badge, BackField, Field, Flash, PageTitle, Toggle, input, panel, primaryBtn, smallBtn } from '@/components/admin/ui';

const BACK = '/admin/tools/';
const FIELDS = [
  { key: 'name', label: 'Name', hint: 'Menus, cards and the page heading' },
  { key: 'short', label: 'Short description', hint: 'Under the name on tool cards' },
  { key: 'title', label: 'Google title', hint: 'Best under 50 characters (“| SoftServices” is added)' },
  { key: 'description', label: 'Google description', hint: 'Best 120–160 characters', textarea: true },
];

export default async function AdminTools({ searchParams }) {
  await requireAdmin();
  const [tools, overrides] = await Promise.all([listAllTools(), getToolOverrides()]);
  const hidden = tools.filter((t) => t.hidden).length;
  const edited = Object.keys(overrides).length;

  return (
    <>
      <PageTitle eyebrow="Content" sub={`${tools.length} tools · ${tools.length - hidden} shown · ${hidden} hidden · ${edited} with changes`}>Tools</PageTitle>
      <Flash searchParams={searchParams} />
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
        Hide a tool to remove it from menus, the home page and the sitemap (its page then shows “not found”). Text left empty uses the original wording.
      </p>

      <div className="space-y-8">
        {CATEGORIES.map((g) => {
          const list = tools.filter((t) => t.category === g.id);
          if (!list.length) return null;
          return (
            <section key={g.id}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{g.name}</h2>
              <div className="space-y-2">
                {list.map((t) => {
                  const original = getTool(t.slug);
                  const o = overrides[t.slug] || {};
                  return (
                    <details key={t.slug} className={`${panel} p-4`}>
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                        <ToolIcon name={t.icon} className={`h-5 w-5 ${t.hidden ? 'text-slate-400' : 'text-brand-600'}`} />
                        <span className="min-w-0 flex-1">
                          <span className={`block font-semibold ${t.hidden ? 'text-slate-400 line-through' : ''}`}>{t.name}</span>
                          <span className="text-xs text-slate-500">/{t.slug}/</span>
                        </span>
                        {t.premium && <Badge tone="amber">Server</Badge>}
                        {t.hidden && <Badge tone="red">Hidden</Badge>}
                        {Object.keys(o).some((k) => k !== 'hidden') && <Badge tone="blue">Edited</Badge>}
                      </summary>

                      <form action={saveToolAction} className="mt-4 grid gap-4 border-t border-slate-900/10 pt-4 sm:grid-cols-2 dark:border-white/10">
                        <BackField to={BACK} />
                        <input type="hidden" name="slug" value={t.slug} />
                        {FIELDS.map((f) => (
                          <div key={f.key} className={f.textarea ? 'sm:col-span-2' : ''}>
                            <Field label={f.label} hint={`${f.hint}. Now ${t[f.key].length} characters.`}>
                              {f.textarea ? (
                                <textarea name={f.key} rows={3} defaultValue={o[f.key] || ''} placeholder={original[f.key]} className={input} />
                              ) : (
                                <input name={f.key} defaultValue={o[f.key] || ''} placeholder={original[f.key]} className={input} />
                              )}
                            </Field>
                          </div>
                        ))}
                        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                          <Toggle name="hidden" on={t.hidden} label="Hide this tool from the site" />
                          <ConfirmButton className={primaryBtn}>Save</ConfirmButton>
                          {!t.hidden && (
                            <Link href={`/${t.slug}/`} target="_blank" className="text-sm font-medium text-brand-700 underline dark:text-brand-300">
                              Open page
                            </Link>
                          )}
                        </div>
                      </form>
                      {overrides[t.slug] && (
                        <form action={resetToolAction} className="mt-3">
                          <BackField to={BACK} />
                          <input type="hidden" name="slug" value={t.slug} />
                          <ConfirmButton confirm={`Reset ${t.name} to its original text and show it on the site?`} className={smallBtn}>
                            Reset to original
                          </ConfirmButton>
                        </form>
                      )}
                    </details>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

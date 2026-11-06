'use client';
import { useMemo, useRef, useState } from 'react';
import { Heading2, List, ListOrdered, Link2, Eye, PenLine } from 'lucide-react';
import RichText from '@/components/RichText';
import { textToBlocks } from '@/lib/blocks';

const TOOLS = [
  { icon: Heading2, label: 'Heading', prefix: '## ', placeholder: 'Section heading' },
  { icon: List, label: 'Bullet list', prefix: '- ', placeholder: 'List item' },
  { icon: ListOrdered, label: 'Numbered list', prefix: '1. ', placeholder: 'Step' },
];

/** Article text with a small formatting toolbar, live preview and word count. Submits as `body`. */
export default function PostBodyEditor({ defaultValue = '' }) {
  const [text, setText] = useState(defaultValue);
  const [tab, setTab] = useState('write');
  const ref = useRef(null);
  const blocks = useMemo(() => textToBlocks(text), [text]);
  const words = (text.match(/[\p{L}\p{N}’']+/gu) || []).length;

  // Put `before` + selection (or placeholder) + `after` at the cursor, starting a new line for line formats.
  const insert = (before, placeholder, after = '', lineStart = true) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e) || placeholder;
    const needsBreak = lineStart && s > 0 && value[s - 1] !== '\n';
    const piece = `${needsBreak ? '\n' : ''}${before}${selected}${after}`;
    const next = value.slice(0, s) + piece + value.slice(e);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const start = s + piece.length - after.length - selected.length;
      el.setSelectionRange(start, start + selected.length);
    });
  };

  const btn = 'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-800';

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:ring-brand-500/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
        {[
          ['write', 'Write', PenLine],
          ['preview', 'Preview', Eye],
        ].map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${tab === k ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
        {tab === 'write' && (
          <>
            <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            {TOOLS.map(({ icon: Icon, label, prefix, placeholder }) => (
              <button key={label} type="button" title={label} onClick={() => insert(prefix, placeholder)} className={btn}>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            <button type="button" title="Link" onClick={() => insert('[', 'link text', '](/merge-pdf/)', false)} className={btn}>
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Link</span>
            </button>
          </>
        )}
        <span className="ml-auto pr-1 text-xs text-slate-500">
          {words} words · {Math.max(1, Math.ceil(words / 200))} min read
        </span>
      </div>

      {/* The textarea stays in the form (hidden while previewing) so the text is always submitted. */}
      <textarea
        ref={ref}
        name="body"
        required
        rows={22}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Start with a short intro paragraph…\n\n## First heading\nA paragraph explaining the step.\n\n1. First step\n2. Second step\n\n- A tip\n- Another tip'}
        className={`block w-full resize-y bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-slate-900 outline-none dark:text-slate-100 ${tab === 'write' ? '' : 'hidden'}`}
      />
      {tab === 'preview' && (
        <div className="min-h-[420px] px-6 py-5">
          {blocks.length ? <RichText blocks={blocks} /> : <p className="text-sm text-slate-500">Nothing to preview yet.</p>}
        </div>
      )}
    </div>
  );
}

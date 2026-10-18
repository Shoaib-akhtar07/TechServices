'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo2, Redo2, Minus, RemoveFormatting, LayoutTemplate, FilePlus2, Download, Loader2,
} from 'lucide-react';
import { FREE_TEMPLATES } from '@/lib/templates/free';
import { parseBlocks } from '@/lib/editors/export-doc';
import { ToolBtn, Sep, TopBar, TemplatePicker, downloadBlob, draft, safeName, serverExport } from './common';

const BLOCKS = [
  { tag: 'p', label: 'Normal text' },
  { tag: 'h1', label: 'Heading 1' },
  { tag: 'h2', label: 'Heading 2' },
  { tag: 'h3', label: 'Heading 3' },
];

// mode: 'doc' (Word first) or 'pdf' (PDF first)
export default function DocEditor({ mode = 'doc' }) {
  const key = `nexpdf-draft-${mode}`;
  const ref = useRef(null);
  const timer = useRef(null);
  const [name, setName] = useState(mode === 'pdf' ? 'My PDF' : 'Untitled document');
  const [pageSize, setPageSize] = useState('a4');
  const [status, setStatus] = useState('Draft saved in this browser');
  const [words, setWords] = useState(0);
  const [block, setBlock] = useState('p');
  const [marks, setMarks] = useState({});
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState('');

  const countWords = () => setWords((ref.current?.innerText.match(/\S+/g) || []).length);

  const save = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const ok = draft.save(key, { name, html: ref.current?.innerHTML || '' });
      setStatus(ok ? 'Draft saved in this browser' : 'Draft could not be saved (private mode?)');
    }, 400);
  }, [key, name]);

  useEffect(() => {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch {}
    const d = draft.load(key);
    ref.current.innerHTML = d?.html || FREE_TEMPLATES['doc-blank'].html;
    if (d?.name) setName(d.name);
    countWords();
  }, [key]);

  useEffect(() => save(), [name, save]);

  // Reflect the current selection's formatting in the toolbar.
  useEffect(() => {
    const onSel = () => {
      const sel = document.getSelection();
      if (!sel?.anchorNode || !ref.current?.contains(sel.anchorNode)) return;
      let el = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
      while (el && el.parentElement !== ref.current && el !== ref.current) el = el.parentElement;
      setBlock(['H1', 'H2', 'H3'].includes(el?.tagName) ? el.tagName.toLowerCase() : 'p');
      const q = (c) => { try { return document.queryCommandState(c); } catch { return false; } };
      setMarks({ bold: q('bold'), italic: q('italic'), underline: q('underline'), strike: q('strikeThrough'), ul: q('insertUnorderedList'), ol: q('insertOrderedList') });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  const exec = (cmd, arg) => {
    ref.current.focus();
    document.execCommand(cmd, false, arg);
    save();
    countWords();
  };

  const onPaste = (e) => {
    // Paste as plain text: keeps documents clean and avoids foreign HTML/scripts.
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
  };

  const loadTemplate = (tpl) => {
    ref.current.innerHTML = tpl.html;
    setPicker(false);
    countWords();
    save();
  };

  const newDoc = () => {
    if (!confirm('Start a new blank document? The current draft will be cleared.')) return;
    loadTemplate(FREE_TEMPLATES['doc-blank']);
  };

  const exportAs = async (fmt) => {
    setBusy(fmt);
    try {
      const blocks = parseBlocks(ref.current);
      const file = safeName(name, 'document');
      if (fmt === 'docx') downloadBlob(await serverExport('docx', { blocks, title: name }), `${file}.docx`);
      else downloadBlob(await serverExport('doc-pdf', { blocks, pageSize, title: name }), `${file}.pdf`);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy('');
    }
  };

  const primary = mode === 'pdf' ? 'pdf' : 'docx';
  const DlBtn = ({ fmt, main }) => (
    <button
      onClick={() => exportAs(fmt)}
      disabled={!!busy}
      className={main ? 'btn-primary !px-4 !py-2 text-sm' : 'btn-secondary !px-4 !py-2 text-sm'}
    >
      {busy === fmt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {fmt === 'pdf' ? 'Download PDF' : 'Download Word'}
    </button>
  );

  return (
    // overflow-clip (not hidden) so the sticky toolbar keeps working while scrolling long documents.
    <div className="overflow-clip rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <TopBar name={name} setName={setName} status={status}>
        <button onClick={() => setPicker(true)} className="btn-secondary !px-4 !py-2 text-sm">
          <LayoutTemplate className="h-4 w-4" /> Templates
        </button>
        <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} aria-label="Page size" className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
        </select>
        <DlBtn fmt={primary} main />
        <DlBtn fmt={primary === 'pdf' ? 'docx' : 'pdf'} />
      </TopBar>

      <div className="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95" role="toolbar" aria-label="Formatting">
        <ToolBtn label="New document" onClick={newDoc}><FilePlus2 className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Undo" onClick={() => exec('undo')}><Undo2 className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Redo" onClick={() => exec('redo')}><Redo2 className="h-4 w-4" /></ToolBtn>
        <Sep />
        <select
          value={block}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { setBlock(e.target.value); exec('formatBlock', `<${e.target.value}>`); }}
          aria-label="Text style"
          className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
        >
          {BLOCKS.map((b) => <option key={b.tag} value={b.tag}>{b.label}</option>)}
        </select>
        <Sep />
        <ToolBtn label="Bold (Ctrl+B)" active={marks.bold} onClick={() => exec('bold')}><Bold className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Italic (Ctrl+I)" active={marks.italic} onClick={() => exec('italic')}><Italic className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Underline (Ctrl+U)" active={marks.underline} onClick={() => exec('underline')}><Underline className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Strikethrough" active={marks.strike} onClick={() => exec('strikeThrough')}><Strikethrough className="h-4 w-4" /></ToolBtn>
        <Sep />
        <ToolBtn label="Bulleted list" active={marks.ul} onClick={() => exec('insertUnorderedList')}><List className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Numbered list" active={marks.ol} onClick={() => exec('insertOrderedList')}><ListOrdered className="h-4 w-4" /></ToolBtn>
        <Sep />
        <ToolBtn label="Align left" onClick={() => exec('justifyLeft')}><AlignLeft className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Align centre" onClick={() => exec('justifyCenter')}><AlignCenter className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Align right" onClick={() => exec('justifyRight')}><AlignRight className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Justify" onClick={() => exec('justifyFull')}><AlignJustify className="h-4 w-4" /></ToolBtn>
        <Sep />
        <ToolBtn label="Horizontal line" onClick={() => exec('insertHorizontalRule')}><Minus className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Clear formatting" onClick={() => exec('removeFormat')}><RemoveFormatting className="h-4 w-4" /></ToolBtn>
      </div>

      <div className="bg-slate-100 px-2 py-8 dark:bg-slate-950 sm:px-8">
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          role="textbox"
          aria-multiline="true"
          aria-label="Document"
          onInput={() => { save(); countWords(); }}
          onPaste={onPaste}
          className={`doc-page mx-auto min-h-[900px] w-full bg-white px-8 py-12 text-slate-900 shadow-lg outline-none sm:px-16 ${pageSize === 'letter' ? 'max-w-[816px]' : 'max-w-[794px]'}`}
        />
      </div>
      <div className="flex justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
        <span>{words.toLocaleString()} words</span>
        <span>Nothing is uploaded — everything stays in your browser</span>
      </div>
      {picker && <TemplatePicker kind="doc" onPick={loadTemplate} onClose={() => setPicker(false)} />}
    </div>
  );
}

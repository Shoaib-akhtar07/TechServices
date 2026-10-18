'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bold, Rows3, Columns3, Eraser, FolderOpen, LayoutTemplate, Download, Loader2 } from 'lucide-react';
import { computeAll, colName, display, isErr } from '@/lib/editors/formula';
import { toXlsx, toCsv, toSheetPdf, fromXlsx, fromCsv, usedRange } from '@/lib/editors/export-sheet';
import { ToolBtn, Sep, TopBar, TemplatePicker, downloadBlob, draft, safeName } from './common';

const KEY = 'nexpdf-draft-sheet';
const MIN_ROWS = 40;
const MIN_COLS = 10;

export default function SheetEditor() {
  const [name, setName] = useState('Untitled spreadsheet');
  const [cells, setCells] = useState({});
  const [rows, setRows] = useState(MIN_ROWS);
  const [cols, setCols] = useState(MIN_COLS);
  const [sel, setSel] = useState({ r: 0, c: 0 });
  const [editing, setEditing] = useState(null); // null | 'cell' | 'bar'
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Draft saved in this browser');
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState('');
  const gridRef = useRef(null);
  const fileRef = useRef(null);
  const loaded = useRef(false);

  const values = useMemo(() => computeAll(cells).values, [cells]);
  const ref = colName(sel.c) + (sel.r + 1);
  const raw = cells[ref]?.v ?? '';

  const fit = (cs) => {
    const u = usedRange(cs);
    setRows(Math.max(MIN_ROWS, u.rows + 10));
    setCols(Math.max(MIN_COLS, u.cols + 2));
  };

  useEffect(() => {
    const d = draft.load(KEY);
    if (d?.cells) { setCells(d.cells); fit(d.cells); }
    if (d?.name) setName(d.name);
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => setStatus(draft.save(KEY, { name, cells }) ? 'Draft saved in this browser' : 'Draft could not be saved'), 400);
    return () => clearTimeout(t);
  }, [name, cells]);

  const setCell = (r, v) =>
    setCells((prev) => {
      const next = { ...prev };
      const cur = { ...(prev[r] || {}), v };
      if (cur.v === '' && !cur.b) delete next[r];
      else next[r] = cur;
      return next;
    });

  const move = (dr, dc) => setSel((s) => ({ r: Math.min(rows - 1, Math.max(0, s.r + dr)), c: Math.min(cols - 1, Math.max(0, s.c + dc)) }));
  const startEdit = (initial) => { setInput(initial); setEditing('cell'); };
  const commit = (dr = 0, dc = 0) => {
    setCell(ref, input);
    setEditing(null);
    move(dr, dc);
    gridRef.current?.focus();
  };
  const cancel = () => { setEditing(null); gridRef.current?.focus(); };
  const toggleBold = () => setCells((prev) => ({ ...prev, [ref]: { ...(prev[ref] || { v: '' }), b: !prev[ref]?.b } }));

  const onGridKey = (e) => {
    if (editing) return;
    const k = e.key;
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'b') { e.preventDefault(); toggleBold(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Tab: [0, e.shiftKey ? -1 : 1] };
    if (moves[k]) { e.preventDefault(); move(...moves[k]); }
    else if (k === 'Enter' || k === 'F2') { e.preventDefault(); startEdit(raw); }
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); setCell(ref, ''); }
    else if (k.length === 1) { e.preventDefault(); startEdit(k); }
  };

  const onEditKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(e.shiftKey ? -1 : 1, 0); }
    else if (e.key === 'Tab') { e.preventDefault(); commit(0, e.shiftKey ? -1 : 1); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  const loadCells = (cs, newName) => {
    setCells(cs);
    fit(cs);
    setSel({ r: 0, c: 0 });
    if (newName) setName(newName);
  };

  const openFile = async (file) => {
    if (!file) return;
    try {
      const cs = /\.csv$/i.test(file.name) ? await fromCsv(file) : await fromXlsx(file);
      loadCells(cs, file.name.replace(/\.[^.]+$/, ''));
    } catch (e) {
      console.error(e);
      alert('This file could not be opened. Please use an .xlsx or .csv file.');
    }
  };

  const exportAs = async (fmt) => {
    setBusy(fmt);
    try {
      const file = safeName(name, 'spreadsheet');
      if (fmt === 'xlsx') downloadBlob(await toXlsx(cells, values, name), `${file}.xlsx`);
      if (fmt === 'csv') downloadBlob(toCsv(cells, values), `${file}.csv`);
      if (fmt === 'pdf') downloadBlob(await toSheetPdf(cells, values, name), `${file}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Sorry, the file could not be created. Please try again.');
    } finally {
      setBusy('');
    }
  };

  // Keep the selected cell visible when moving with the keyboard.
  useEffect(() => {
    gridRef.current?.querySelector(`[data-ref="${ref}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [ref]);

  const Dl = ({ fmt, label, main }) => (
    <button onClick={() => exportAs(fmt)} disabled={!!busy} className={main ? 'btn-primary !px-4 !py-2 text-sm' : 'btn-secondary !px-3 !py-2 text-sm'}>
      {busy === fmt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <TopBar name={name} setName={setName} status={status}>
        <button onClick={() => setPicker(true)} className="btn-secondary !px-3 !py-2 text-sm"><LayoutTemplate className="h-4 w-4" /> Templates</button>
        <button onClick={() => fileRef.current?.click()} className="btn-secondary !px-3 !py-2 text-sm"><FolderOpen className="h-4 w-4" /> Open</button>
        <input ref={fileRef} type="file" accept=".xlsx,.csv" className="sr-only" onChange={(e) => { openFile(e.target.files[0]); e.target.value = ''; }} />
        <Dl fmt="xlsx" label="Download Excel" main />
        <Dl fmt="csv" label="CSV" />
        <Dl fmt="pdf" label="PDF" />
      </TopBar>

      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-3 py-2 dark:border-slate-800" role="toolbar" aria-label="Sheet tools">
        <ToolBtn label="Bold (Ctrl+B)" active={!!cells[ref]?.b} onClick={toggleBold}><Bold className="h-4 w-4" /></ToolBtn>
        <Sep />
        <ToolBtn label="Add 10 rows" onClick={() => setRows((r) => r + 10)}><Rows3 className="h-4 w-4" /><span className="ml-1 text-xs">+10</span></ToolBtn>
        <ToolBtn label="Add a column" onClick={() => setCols((c) => c + 1)}><Columns3 className="h-4 w-4" /><span className="ml-1 text-xs">+1</span></ToolBtn>
        <ToolBtn label="Clear sheet" onClick={() => confirm('Clear the whole sheet?') && loadCells({}, null)}><Eraser className="h-4 w-4" /></ToolBtn>
        <Sep />
        <span className="w-14 text-center font-mono text-sm font-semibold text-slate-600 dark:text-slate-300">{ref}</span>
        <input
          aria-label="Formula bar"
          value={editing ? input : raw}
          onFocus={() => { setInput(raw); setEditing('bar'); }}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onEditKey}
          onBlur={() => editing === 'bar' && commit()}
          placeholder="Type a value or a formula, e.g. =SUM(B2:B10)"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950"
        />
      </div>

      <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey} className="max-h-[620px] overflow-auto outline-none" aria-label="Spreadsheet grid" role="grid">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-20 w-12 border-b border-r border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} className={`sticky top-0 z-10 w-28 min-w-28 border-b border-r border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 ${c === sel.c ? 'text-brand-600' : ''}`}>
                  {colName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <th className={`sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-100 px-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 ${r === sel.r ? 'text-brand-600' : ''}`}>{r + 1}</th>
                {Array.from({ length: cols }, (_, c) => {
                  const cr = colName(c) + (r + 1);
                  const v = values[cr];
                  const selected = r === sel.r && c === sel.c;
                  return (
                    <td
                      key={c}
                      data-ref={cr}
                      onMouseDown={() => { if (editing) commit(); setSel({ r, c }); }}
                      onDoubleClick={() => startEdit(cells[cr]?.v ?? '')}
                      className={`relative h-7 max-w-28 truncate border-b border-r border-slate-200 px-2 dark:border-slate-800 ${
                        selected ? 'outline outline-2 -outline-offset-2 outline-brand-500' : ''
                      } ${cells[cr]?.b ? 'font-semibold' : ''} ${typeof v === 'number' ? 'text-right' : ''} ${isErr(v) ? 'text-rose-600' : ''}`}
                    >
                      {selected && editing === 'cell' ? (
                        <input
                          autoFocus
                          aria-label={`Edit ${cr}`}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={onEditKey}
                          onBlur={() => editing === 'cell' && commit()}
                          className="absolute inset-0 w-full bg-white px-2 font-mono text-sm outline-none dark:bg-slate-950"
                        />
                      ) : (
                        display(v)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
        <span>Formulas: SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS, IF · Enter to edit · arrows to move</span>
        <span>Nothing is uploaded — everything stays in your browser</span>
      </div>
      {picker && <TemplatePicker kind="sheet" onPick={(t) => { loadCells(t.cells, null); setPicker(false); }} onClose={() => setPicker(false)} />}
    </div>
  );
}

'use client';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, PaintBucket, Baseline, Percent, Sigma,
  SquareFunction, ArrowDownAZ, ArrowDownZA, Search, Keyboard, FolderOpen, LayoutTemplate, Download, Loader2, Plus, X,
  BetweenHorizontalStart, BetweenVerticalStart, Eraser, Scissors, Copy, ClipboardPaste, Trash2, ChevronDown,
} from 'lucide-react';
import { computeWorkbook, colName, parseRef, refName, isErr } from '@/lib/editors/formula';
import { formatValue, parseInput, changeDecimals, NUMBER_FORMATS, todaySerial, nowSerial, DATE_NF } from '@/lib/editors/numfmt';
import * as M from '@/lib/editors/sheet-model';
import { fromXlsx, fromCsv } from '@/lib/editors/export-sheet';
import { ToolBtn, Sep, TopBar, TemplatePicker, downloadBlob, draft, safeName, serverExport } from './common';
import FormulaInput from './sheet/FormulaInput';
import { ShortcutsDialog, FunctionsDialog, FindBar } from './sheet/Panels';

const KEY = 'nexpdf-draft-sheet-v2';
const OLD_KEY = 'nexpdf-draft-sheet';
const ROW_H = 26;
const HEAD_H = 28;
const HEAD_W = 52;
const VIEW_H = 560;
const COL_NAMES = Array.from({ length: M.MAX_COLS }, (_, i) => colName(i));
const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };
const PALETTE = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
  '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#16a34a', '#059669',
  '#0891b2', '#2563eb', '#4f46e5', '#7c3aed', '#c026d3', '#db2777',
  '#fee2e2', '#ffedd5', '#fef9c3', '#dcfce7', '#dbeafe', '#ede9fe',
];

const norm = (s) => ({ r1: Math.min(s.r, s.r2), r2: Math.max(s.r, s.r2), c1: Math.min(s.c, s.c2), c2: Math.max(s.c, s.c2) });
const clampR = (r) => Math.max(0, Math.min(M.MAX_ROWS - 1, r));
const clampC = (c) => Math.max(0, Math.min(M.MAX_COLS - 1, c));
const rangeLabel = (R) => (R.r1 === R.r2 && R.c1 === R.c2 ? refName(R.r1, R.c1) : `${refName(R.r1, R.c1)}:${refName(R.r2, R.c2)}`);

const Row = memo(function Row({ r, cols, cells, vals, selC1, selC2, selTop, selBot, activeC, handleC, fillC1, fillC2, mC1, mC2, mTop, mBot, editC, editor, editText, rowSel }) {
  const tds = [];
  for (let c = 0; c < cols; c++) {
    const ref = COL_NAMES[c] + (r + 1);
    const cell = cells[ref];
    const v = vals[ref];
    const editingHere = c === editC;
    const text = editingHere && !editor ? editText : v == null ? '' : formatValue(v, M.effectiveFormat(cell));
    const align = cell?.al || (typeof v === 'number' ? 'right' : typeof v === 'boolean' || isErr(v) ? 'center' : 'left');
    const nextRef = c + 1 < cols ? COL_NAMES[c + 1] + (r + 1) : null;
    const spill = !editingHere && align === 'left' && typeof v === 'string' && text && nextRef && !cells[nextRef]?.v;

    const style = {};
    if (cell?.fg) style.color = cell.fg;
    if (cell?.bg) style.backgroundColor = cell.bg;
    const shadows = [];
    const inSel = c >= selC1 && c <= selC2;
    if (inSel) {
      if (selTop) shadows.push('inset 0 2px 0 0 #3b52f0');
      if (selBot) shadows.push('inset 0 -2px 0 0 #3b52f0');
      if (c === selC1) shadows.push('inset 2px 0 0 0 #3b52f0');
      if (c === selC2) shadows.push('inset -2px 0 0 0 #3b52f0');
    }
    if (c >= mC1 && c <= mC2) {
      if (mTop) shadows.push('inset 0 3px 0 -1px #10b981');
      if (mBot) shadows.push('inset 0 -3px 0 -1px #10b981');
      if (c === mC1) shadows.push('inset 3px 0 0 -1px #10b981');
      if (c === mC2) shadows.push('inset -3px 0 0 -1px #10b981');
    }
    if (shadows.length) style.boxShadow = shadows.join(',');
    const tint = inSel && c !== activeC ? 'rgba(59,82,240,0.10)' : c >= fillC1 && c <= fillC2 ? 'rgba(59,82,240,0.18)' : null;
    if (tint) style.backgroundImage = `linear-gradient(${tint},${tint})`;

    tds.push(
      <td
        key={c}
        data-r={r}
        data-c={c}
        style={style}
        className={`relative whitespace-nowrap border-b border-r border-slate-200 ${editingHere && editor ? 'z-30 overflow-visible p-0' : spill ? 'overflow-visible px-1.5' : 'overflow-hidden px-1.5'} ${ALIGN[align]} ${cell?.b ? 'font-bold' : ''} ${cell?.i ? 'italic' : ''} ${cell?.u ? 'underline' : ''} ${isErr(v) && !editingHere ? 'text-rose-600' : ''}`}
      >
        {editingHere && editor ? editor : text}
        {c === handleC && <span data-fill="1" className="absolute bottom-0 right-0 z-10 h-[7px] w-[7px] cursor-crosshair border border-white bg-[#3b52f0]" />}
      </td>
    );
  }
  return (
    <tr style={{ height: ROW_H }}>
      <th data-row={r} className={`sticky left-0 z-10 cursor-e-resize select-none border-b border-r border-slate-300 text-[11px] font-semibold ${rowSel ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
        {r + 1}
      </th>
      {tds}
    </tr>
  );
});

function ColorButton({ label, icon: Icon, value, onPick }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ToolBtn label={label} onClick={() => setOpen((o) => !o)}>
        <span className="flex flex-col items-center">
          <Icon className="h-4 w-4" />
          <span className="mt-0.5 h-1 w-4 rounded-sm" style={{ background: value || 'transparent', outline: value ? 'none' : '1px solid #cbd5e1' }} />
        </span>
      </ToolBtn>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(undefined); setOpen(false); }} className="mb-2 w-full rounded-lg px-2 py-1 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800">
              None / automatic
            </button>
            <div className="grid grid-cols-6 gap-1.5">
              {PALETTE.map((c) => (
                <button key={c} title={c} aria-label={c} onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(c); setOpen(false); }} className="h-6 w-6 rounded border border-slate-200" style={{ background: c }} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Menu({ x, y, items, onClose }) {
  useEffect(() => {
    const close = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    window.addEventListener('scroll', onClose, true);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);
  const left = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 230);
  const top = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 800) - items.length * 32 - 16);
  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <ul role="menu" className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-2xl dark:border-slate-700 dark:bg-slate-900" style={{ left, top: Math.max(8, top) }}>
        {items.map((it, i) =>
          it === '-' ? (
            <li key={i} className="my-1 border-t border-slate-100 dark:border-slate-800" />
          ) : (
            <li key={i}>
              <button role="menuitem" onMouseDown={(e) => e.preventDefault()} onClick={() => { onClose(); it.run(); }} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800">
                {it.icon && <it.icon className="h-4 w-4 text-slate-500" />}
                <span className="flex-1">{it.label}</span>
                {it.hint && <span className="text-xs text-slate-400">{it.hint}</span>}
              </button>
            </li>
          )
        )}
      </ul>
    </>
  );
}

export default function SheetEditor() {
  const [name, setName] = useState('Untitled spreadsheet');
  const [wb, setWbState] = useState(() => M.toWorkbook(null));
  const [sel, setSelState] = useState({ r: 0, c: 0, r2: 0, c2: 0 });
  const [edit, setEditState] = useState(null); // { text, where: 'cell' | 'bar', mode: 'enter' | 'edit' }
  const [dims, setDims] = useState({ rows: 200, cols: 26 });
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollReq, setScrollReq] = useState(0);
  const [status, setStatus] = useState('Draft saved in this browser');
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState('');
  const [panel, setPanel] = useState(null); // 'functions' | 'shortcuts'
  const [find, setFind] = useState(null); // 'find' | 'replace'
  const [findMsg, setFindMsg] = useState('');
  const [menu, setMenu] = useState(null); // { x, y, items }
  const [fillTo, setFillTo] = useState(null); // { dir, n }
  const [marquee, setMarquee] = useState(null); // { si, R }
  const [resize, setResize] = useState(null); // { c, w }
  const [renaming, setRenaming] = useState(null); // { i, text }
  const [nameBox, setNameBox] = useState('A1');

  const wbRef = useRef(wb);
  const selRef = useRef(sel);
  const editRef = useRef(edit);
  const past = useRef([]);
  const future = useRef([]);
  const gridRef = useRef(null);
  const fileRef = useRef(null);
  const cellApi = useRef(null);
  const barApi = useRef(null);
  const drag = useRef(null);
  const point = useRef(null);
  const clip = useRef(null);
  const selBySheet = useRef({});
  const loaded = useRef(false);
  const live = useRef({});

  const si = wb.active;
  const sheet = wb.sheets[si];
  const values = useMemo(() => computeWorkbook(wb), [wb]);
  const vals = values[si];
  const R = norm(sel);
  const activeRef = refName(sel.r, sel.c);
  const activeCell = sheet.cells[activeRef];
  const used = useMemo(() => M.usedRange(sheet.cells), [sheet.cells]);
  const colW = (c) => (resize?.c === c ? resize.w : sheet.colW?.[c] ?? M.DEFAULT_COL_W);
  const display = (ref) => formatValue(vals[ref], M.effectiveFormat(sheet.cells[ref]));

  // ---------- state helpers (refs stay in sync so event handlers never see stale state) ----------
  const setWb = useCallback((next, record = true) => {
    const cur = wbRef.current;
    if (next === cur) return;
    if (record) {
      past.current.push(cur);
      if (past.current.length > 200) past.current.shift();
      future.current = [];
    }
    wbRef.current = next;
    setWbState(next);
  }, []);
  const mutateSheet = (fn) => {
    const w = wbRef.current;
    setWb(M.updateSheet(w, w.active, fn));
  };
  const applyChanges = (changes) => mutateSheet((s) => M.setCells(s, changes));
  const setSel = (next) => {
    const v = typeof next === 'function' ? next(selRef.current) : next;
    selRef.current = v;
    setSelState(v);
  };
  const setEdit = (next) => {
    editRef.current = next;
    setEditState(next);
  };
  const undo = () => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(wbRef.current);
    wbRef.current = p;
    setWbState(p);
  };
  const redo = () => {
    const n = future.current.pop();
    if (!n) return;
    past.current.push(wbRef.current);
    wbRef.current = n;
    setWbState(n);
  };
  const go = (next) => {
    setSel(next);
    setScrollReq((n) => n + 1);
  };

  /** Large selections (whole columns / rows) are trimmed to the used area for edits. */
  const effRange = (rg = norm(selRef.current)) => {
    const u = M.usedRange(wbRef.current.sheets[wbRef.current.active].cells);
    return {
      r1: rg.r1, c1: rg.c1,
      r2: rg.r2 - rg.r1 > 500 ? Math.max(rg.r1, u.rows - 1) : rg.r2,
      c2: rg.c2 - rg.c1 > 50 ? Math.max(rg.c1, u.cols - 1) : rg.c2,
    };
  };
  const isFullCols = (rg) => rg.r1 === 0 && rg.r2 >= M.MAX_ROWS - 1;
  const isFullRows = (rg) => rg.c1 === 0 && rg.c2 >= M.MAX_COLS - 1;

  // ---------- draft ----------
  useEffect(() => {
    const d = draft.load(KEY) || draft.load(OLD_KEY);
    if (d) {
      const w = M.toWorkbook(d.wb || d);
      wbRef.current = w;
      setWbState(w);
      if (d.name) setName(d.name);
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => setStatus(draft.save(KEY, { name, wb }) ? 'Draft saved in this browser' : 'Draft too large to auto-save — download to keep it'), 500);
    return () => clearTimeout(t);
  }, [name, wb]);

  // Grow the grid as the user moves towards its edge, and to fit loaded data.
  useEffect(() => {
    setDims((d) => {
      const rows = Math.min(M.MAX_ROWS, Math.max(d.rows, used.rows + 50, (sel.r2 < M.MAX_ROWS - 1 ? sel.r2 : 0) + 50, sel.r + 50));
      const cols = Math.min(M.MAX_COLS, Math.max(d.cols, used.cols + 3, (sel.c2 < M.MAX_COLS - 1 ? sel.c2 : 0) + 3, sel.c + 3));
      return rows === d.rows && cols === d.cols ? d : { rows, cols };
    });
  }, [sel, used]);

  useEffect(() => setNameBox(rangeLabel(R)), [R.r1, R.r2, R.c1, R.c2]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the moving end of the selection visible after keyboard navigation.
  useEffect(() => {
    const g = gridRef.current;
    if (!g || !scrollReq) return;
    const { r2, c2 } = selRef.current;
    if (r2 < M.MAX_ROWS - 1) {
      const top = r2 * ROW_H;
      if (top < g.scrollTop) g.scrollTop = top;
      else if (HEAD_H + top + ROW_H > g.scrollTop + g.clientHeight) g.scrollTop = HEAD_H + top + ROW_H - g.clientHeight;
    }
    if (c2 < M.MAX_COLS - 1) {
      let left = 0;
      for (let c = 0; c < c2; c++) left += colW(c);
      const right = left + colW(c2);
      if (left < g.scrollLeft) g.scrollLeft = left;
      else if (HEAD_W + right > g.scrollLeft + g.clientWidth) g.scrollLeft = HEAD_W + right - g.clientWidth;
    }
  }, [scrollReq]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- editing ----------
  const startEdit = (text, mode = 'enter', where = 'cell') => {
    point.current = null;
    setEdit({ text, mode, where });
  };

  const commitEdit = (move = null, fillSelection = false) => {
    const e = editRef.current;
    if (!e) return;
    editRef.current = null; // before focus moves, so the input's blur doesn't commit twice
    point.current = null;
    const s = selRef.current;
    const w = wbRef.current;
    const sh = w.sheets[w.active];
    const v = M.normalizeFormula(e.text);
    const changes = {};
    const make = (ref, text) => {
      const cur = sh.cells[ref];
      const cell = { ...(cur || {}), v: text };
      if (!cur?.nf && text && text[0] !== '=') {
        const p = parseInput(text);
        if (p.nf) cell.nf = p.nf;
      }
      return cell;
    };
    if (fillSelection) M.forRange(effRange(norm(s)), (r, c, ref) => (changes[ref] = make(ref, M.shiftFormula(v, r - s.r, c - s.c))));
    else changes[refName(s.r, s.c)] = make(refName(s.r, s.c), v);
    applyChanges(changes);
    setEdit(null);
    if (move) go({ r: clampR(s.r + move[0]), c: clampC(s.c + move[1]), r2: clampR(s.r + move[0]), c2: clampC(s.c + move[1]) });
    gridRef.current?.focus({ preventScroll: true });
  };

  const cancelEdit = () => {
    editRef.current = null;
    point.current = null;
    setEdit(null);
    gridRef.current?.focus({ preventScroll: true });
  };

  const editApi = () => (editRef.current?.where === 'bar' ? barApi.current : cellApi.current);

  const onEditChange = (text) => {
    point.current = null;
    setEdit({ ...editRef.current, text });
  };

  /** While typing a formula, clicking a cell (or arrows in Enter mode) inserts a reference. */
  const pointable = () => {
    const e = editRef.current;
    if (!e || !e.text.startsWith('=')) return false;
    if (point.current) return true;
    const pos = editApi()?.caret() ?? e.text.length;
    const before = e.text.slice(0, pos).trimEnd();
    return /[=(,+\-*/^&<>:;]$/.test(before);
  };

  const setPointRange = (r1, c1, r2, c2) => {
    const e = editRef.current;
    const p = point.current;
    const label = rangeLabel(norm({ r: r1, c: c1, r2, c2 }));
    const text = e.text.slice(0, p.start) + label + e.text.slice(p.end);
    p.end = p.start + label.length;
    p.cur = { r: r2, c: c2 };
    editRef.current = { ...e, text };
    setEditState(editRef.current);
    const end = p.end;
    requestAnimationFrame(() => editApi()?.setCaret(end));
  };

  const beginPoint = (r, c) => {
    const pos = editApi()?.caret() ?? editRef.current.text.length;
    point.current = { start: pos, end: pos, anchor: { r, c } };
    setPointRange(r, c, r, c);
  };

  const toggleAbsolute = () => {
    const api = editApi();
    const e = editRef.current;
    if (!api || !e) return;
    const pos = api.caret();
    const re = /(?<![A-Za-z0-9_.])(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![A-Za-z0-9_(])/g;
    let m;
    while ((m = re.exec(e.text))) {
      if (pos >= m.index && pos <= m.index + m[0].length) {
        const state = (m[1] ? 1 : 0) + (m[3] ? 2 : 0); // 0: A1, 3: $A$1, 2: A$1, 1: $A1
        const nextState = { 0: 3, 3: 2, 2: 1, 1: 0 }[state];
        const rep = `${nextState & 1 ? '$' : ''}${m[2]}${nextState & 2 ? '$' : ''}${m[4]}`;
        const text = e.text.slice(0, m.index) + rep + e.text.slice(m.index + m[0].length);
        setEdit({ ...e, text });
        const end = m.index + rep.length;
        requestAnimationFrame(() => api.setCaret(end));
        return;
      }
    }
  };

  const onEditKey = (e) => {
    const k = e.key;
    if (k === 'Enter' && !e.altKey) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) commitEdit(null, true);
      else commitEdit([e.shiftKey ? -1 : 1, 0]);
    } else if (k === 'Tab') {
      e.preventDefault();
      commitEdit([0, e.shiftKey ? -1 : 1]);
    } else if (k === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (k === 'F4') {
      e.preventDefault();
      toggleAbsolute();
    } else if (k.startsWith('Arrow') && editRef.current?.mode === 'enter' && editRef.current?.where === 'cell') {
      const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
      e.preventDefault();
      if (pointable()) {
        const s = selRef.current;
        const base = point.current?.cur ?? { r: s.r, c: s.c };
        const nr = clampR(base.r + d[0]), nc = clampC(base.c + d[1]);
        if (!point.current) {
          const pos = editApi()?.caret() ?? editRef.current.text.length;
          point.current = { start: pos, end: pos, anchor: { r: nr, c: nc } };
        }
        if (e.shiftKey) setPointRange(point.current.anchor.r, point.current.anchor.c, nr, nc);
        else {
          point.current.anchor = { r: nr, c: nc };
          setPointRange(nr, nc, nr, nc);
        }
      } else commitEdit(d);
    }
  };

  const onEditBlur = (e) => {
    const to = e.relatedTarget;
    if (to && (to.dataset?.role === 'cell-editor' || to.dataset?.role === 'formula-bar')) return;
    if (editRef.current) commitEdit(null);
  };

  // ---------- commands ----------
  const formatRange = (patch) => {
    const rg = effRange();
    mutateSheet((s) => {
      const ch = {};
      M.forRange(rg, (r, c, ref) => (ch[ref] = patch({ ...(s.cells[ref] || { v: '' }) })));
      return M.setCells(s, ch);
    });
  };
  const toggleStyle = (key) => {
    const on = !activeCell?.[key];
    formatRange((cell) => ({ ...cell, [key]: on || undefined }));
  };
  const setStyle = (key, value) => formatRange((cell) => ({ ...cell, [key]: value }));
  const setFormat = (nf) => setStyle('nf', nf === 'General' ? undefined : nf);
  const stepDecimals = (d) => {
    const base = M.effectiveFormat(activeCell) || 'General';
    setFormat(changeDecimals(base, d));
  };

  const clearRange = (formats = false) => {
    const rg = effRange();
    mutateSheet((s) => {
      const ch = {};
      M.forRange(rg, (r, c, ref) => {
        const cur = s.cells[ref];
        if (cur) ch[ref] = formats ? null : { ...cur, v: '' };
      });
      return M.setCells(s, ch);
    });
  };
  const clearFormats = () => {
    const rg = effRange();
    mutateSheet((s) => {
      const ch = {};
      M.forRange(rg, (r, c, ref) => {
        const cur = s.cells[ref];
        if (cur) ch[ref] = { v: cur.v };
      });
      return M.setCells(s, ch);
    });
  };

  const fill = (dir) => {
    const rg = effRange();
    const vertical = dir === 'down';
    if ((vertical ? rg.r2 - rg.r1 : rg.c2 - rg.c1) === 0) {
      // Single row/column selected: copy from the cell above / to the left.
      const src = vertical ? { ...rg, r1: rg.r1 - 1, r2: rg.r1 - 1 } : { ...rg, c1: rg.c1 - 1, c2: rg.c1 - 1 };
      if (src.r1 < 0 || src.c1 < 0) return;
      const s = wbRef.current.sheets[wbRef.current.active];
      const ch = {};
      M.forRange(rg, (r, c, ref) => {
        const from = s.cells[refName(vertical ? src.r1 : r, vertical ? c : src.c1)];
        ch[ref] = from ? { ...from, v: M.shiftFormula(from.v, vertical ? r - src.r1 : 0, vertical ? 0 : c - src.c1) } : null;
      });
      applyChanges(ch);
      return;
    }
    const s = wbRef.current.sheets[wbRef.current.active];
    const src = vertical ? { ...rg, r2: rg.r1 } : { ...rg, c2: rg.c1 };
    const ch = {};
    M.forRange(rg, (r, c, ref) => {
      if (vertical ? r === rg.r1 : c === rg.c1) return;
      const from = s.cells[refName(vertical ? src.r1 : r, vertical ? c : src.c1)];
      ch[ref] = from ? { ...from, v: M.shiftFormula(from.v, vertical ? r - src.r1 : 0, vertical ? 0 : c - src.c1) } : null;
    });
    applyChanges(ch);
  };

  const applyFill = (f) => {
    const rg = norm(selRef.current);
    const s = wbRef.current.sheets[wbRef.current.active];
    applyChanges(M.fillChanges(s, rg, f.dir, f.n));
    const next = { ...rg };
    if (f.dir === 'down') next.r2 += f.n;
    if (f.dir === 'up') next.r1 -= f.n;
    if (f.dir === 'right') next.c2 += f.n;
    if (f.dir === 'left') next.c1 -= f.n;
    setSel({ r: next.r1, c: next.c1, r2: next.r2, c2: next.c2 });
  };

  const autoSum = () => {
    const s = selRef.current;
    const rg = norm(s);
    const isNum = (r, c) => typeof vals[refName(r, c)] === 'number';
    if (rg.r1 !== rg.r2 || rg.c1 !== rg.c2) {
      const er = effRange(rg);
      const ch = {};
      for (let c = er.c1; c <= er.c2; c++) ch[refName(er.r2 + 1, c)] = { ...(sheet.cells[refName(er.r2 + 1, c)] || {}), v: `=SUM(${refName(er.r1, c)}:${refName(er.r2, c)})` };
      applyChanges(ch);
      return;
    }
    let r0 = s.r - 1;
    while (r0 >= 0 && isNum(r0, s.c)) r0--;
    let text = '=SUM()';
    if (r0 < s.r - 1) text = `=SUM(${refName(r0 + 1, s.c)}:${refName(s.r - 1, s.c)})`;
    else {
      let c0 = s.c - 1;
      while (c0 >= 0 && isNum(s.r, c0)) c0--;
      if (c0 < s.c - 1) text = `=SUM(${refName(s.r, c0 + 1)}:${refName(s.r, s.c - 1)})`;
    }
    startEdit(text, 'edit');
  };

  const insertNow = (time) => {
    const s = selRef.current;
    const ref = refName(s.r, s.c);
    const v = time ? nowSerial() - todaySerial() : todaySerial();
    applyChanges({ [ref]: { ...(sheet.cells[ref] || {}), v: String(Math.round(v * 1e8) / 1e8), nf: time ? 'h:mm AM/PM' : DATE_NF } });
  };

  const insertRowsCols = (axis, before) => {
    const rg = norm(selRef.current);
    const n = axis === 'r' ? (isFullCols(rg) ? 1 : rg.r2 - rg.r1 + 1) : isFullRows(rg) ? 1 : rg.c2 - rg.c1 + 1;
    const at = axis === 'r' ? (before ? rg.r1 : rg.r2 + 1) : before ? rg.c1 : rg.c2 + 1;
    const w = wbRef.current;
    setWb(M.insertDelete(w, w.active, axis, at, n));
  };
  const deleteRowsCols = (axis) => {
    const rg = effRange();
    const n = axis === 'r' ? rg.r2 - rg.r1 + 1 : rg.c2 - rg.c1 + 1;
    const w = wbRef.current;
    setWb(M.insertDelete(w, w.active, axis, axis === 'r' ? rg.r1 : rg.c1, -n));
    setSel({ r: rg.r1, c: rg.c1, r2: rg.r1, c2: rg.c1 });
  };

  const sortBy = (asc) => {
    const s = selRef.current;
    let rg = effRange();
    if (rg.r1 === rg.r2 && rg.c1 === rg.c2) {
      // One cell selected: sort the whole table under the header row by this column.
      rg = { r1: 1, c1: 0, r2: used.rows - 1, c2: Math.max(0, used.cols - 1) };
    }
    if (rg.r2 <= rg.r1) return;
    applyChanges(M.sortChanges(sheet, vals, rg, Math.min(Math.max(s.c, rg.c1), rg.c2), asc));
  };

  // ---------- clipboard ----------
  const copy = (cut) => {
    const rg = effRange();
    const block = M.copyBlock(sheet, rg, display);
    clip.current = { ...block, cut, si: wbRef.current.active };
    setMarquee({ si: wbRef.current.active, R: rg });
    return block.tsv;
  };

  const paste = (text) => {
    const s = selRef.current;
    const rg = norm(s);
    const c = clip.current;
    const w = wbRef.current;
    if (c && (text == null || text.replace(/\r\n/g, '\n') === c.tsv.replace(/\r\n/g, '\n'))) {
      const changes = M.pasteBlock(c, rg.r1, rg.c1, { cut: c.cut, fit: { h: rg.r2 - rg.r1 + 1, w: rg.c2 - rg.c1 + 1 } });
      let next = w;
      if (c.cut) {
        const clear = {};
        for (let i = 0; i < c.rows.length; i++)
          for (let j = 0; j < c.rows[0].length; j++) {
            const ref = refName(c.r1 + i, c.c1 + j);
            if (c.si !== w.active || !(ref in changes)) clear[ref] = null;
          }
        next = M.updateSheet(next, c.si, (sh) => M.setCells(sh, clear));
        clip.current = null;
        setMarquee(null);
      }
      next = M.updateSheet(next, next.active, (sh) => M.setCells(sh, changes));
      setWb(next);
      const h = c.rows.length, wd = c.rows[0]?.length || 1;
      setSel({ r: rg.r1, c: rg.c1, r2: rg.r1 + Math.max(h, rg.r2 - rg.r1 + 1) - 1, c2: rg.c1 + Math.max(wd, rg.c2 - rg.c1 + 1) - 1 });
      return;
    }
    if (!text) return;
    const rows = M.parseTsv(text);
    const sh = w.sheets[w.active];
    const changes = {};
    rows.forEach((row, i) =>
      row.forEach((val, j) => {
        const r = rg.r1 + i, cc = rg.c1 + j;
        if (r >= M.MAX_ROWS || cc >= M.MAX_COLS) return;
        const ref = refName(r, cc);
        const cur = sh.cells[ref];
        const cell = { ...(cur || {}), v: val };
        const p = parseInput(val);
        if (!cur?.nf && p.nf) cell.nf = p.nf;
        changes[ref] = cell;
      })
    );
    applyChanges(changes);
    setSel({ r: rg.r1, c: rg.c1, r2: rg.r1 + rows.length - 1, c2: rg.c1 + Math.max(...rows.map((r) => r.length)) - 1 });
  };

  const gridFocused = () => typeof document !== 'undefined' && document.activeElement === gridRef.current;
  live.current.copy = (e) => {
    if (!gridFocused()) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', copy(false));
  };
  live.current.cut = (e) => {
    if (!gridFocused()) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', copy(true));
  };
  live.current.paste = (e) => {
    if (!gridFocused()) return;
    e.preventDefault();
    paste(e.clipboardData.getData('text/plain'));
  };
  useEffect(() => {
    const on = (type) => (e) => live.current[type]?.(e);
    const handlers = { copy: on('copy'), cut: on('cut'), paste: on('paste') };
    for (const [t, h] of Object.entries(handlers)) document.addEventListener(t, h);
    return () => {
      for (const [t, h] of Object.entries(handlers)) document.removeEventListener(t, h);
    };
  }, []);

  const menuCopy = (cut) => {
    const tsv = copy(cut);
    navigator.clipboard?.writeText(tsv).catch(() => {});
  };
  const menuPaste = () => {
    if (navigator.clipboard?.readText) navigator.clipboard.readText().then((t) => paste(t), () => paste(null));
    else paste(null);
  };

  // ---------- navigation ----------
  const hasValue = (r, c) => {
    const v = sheet.cells[refName(r, c)]?.v;
    return v != null && v !== '';
  };
  const jump = (dr, dc, extend) => {
    const s = selRef.current;
    const from = extend ? { r: s.r2, c: s.c2 } : { r: s.r, c: s.c };
    const limR = Math.max(dims.rows, used.rows), limC = Math.max(dims.cols, used.cols);
    const inside = (r, c) => r >= 0 && c >= 0 && r < limR && c < limC;
    let { r, c } = from;
    if (!inside(r + dr, c + dc)) return;
    if (hasValue(r, c) && hasValue(r + dr, c + dc)) {
      while (inside(r + dr, c + dc) && hasValue(r + dr, c + dc)) { r += dr; c += dc; }
    } else {
      r += dr; c += dc;
      while (!hasValue(r, c) && inside(r + dr, c + dc)) { r += dr; c += dc; }
    }
    go(extend ? { ...s, r2: r, c2: c } : { r, c, r2: r, c2: c });
  };
  const move = (dr, dc, extend) => {
    const s = selRef.current;
    if (extend) go({ ...s, r2: clampR((s.r2 >= M.MAX_ROWS - 1 ? s.r : s.r2) + dr), c2: clampC((s.c2 >= M.MAX_COLS - 1 ? s.c : s.c2) + dc) });
    else {
      const r = clampR(s.r + dr), c = clampC(s.c + dc);
      go({ r, c, r2: r, c2: c });
    }
  };

  const switchSheet = (i) => {
    if (editRef.current) commitEdit(null);
    const w = wbRef.current;
    if (i === w.active || i < 0 || i >= w.sheets.length) return;
    selBySheet.current[w.active] = selRef.current;
    setWb({ ...w, active: i }, false);
    setSel(selBySheet.current[i] || { r: 0, c: 0, r2: 0, c2: 0 });
    if (gridRef.current) gridRef.current.scrollTop = 0;
  };

  const onGridKey = (e) => {
    if (e.target !== e.currentTarget || editRef.current) return;
    const k = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const stop = () => e.preventDefault();

    if (e.altKey && (k === '=' || e.code === 'Equal')) { stop(); autoSum(); return; }
    // Browsers keep Ctrl+PageUp/PageDown for their own tabs, so Alt works too.
    if (e.altKey && (k === 'PageUp' || k === 'PageDown')) { stop(); switchSheet(wbRef.current.active + (k === 'PageUp' ? -1 : 1)); return; }
    if (ctrl && !e.altKey) {
      if (arrows[k]) { stop(); jump(...arrows[k], shift); return; }
      if (k === 'PageUp' || k === 'PageDown') { stop(); switchSheet(wbRef.current.active + (k === 'PageUp' ? -1 : 1)); return; }
      if (shift) {
        const fmt = { Digit1: '#,##0.00', Digit3: DATE_NF, Digit4: '"Rs "#,##0.00', Digit5: '0%', Backquote: 'General' }[e.code];
        if (fmt) { stop(); setFormat(fmt); return; }
        if (e.code === 'Semicolon') { stop(); insertNow(true); return; }
        if (e.code === 'Equal') { stop(); isFullCols(norm(selRef.current)) ? insertRowsCols('c', true) : insertRowsCols('r', true); return; }
      }
      switch (k.toLowerCase()) {
        case 'z': stop(); shift ? redo() : undo(); return;
        case 'y': stop(); redo(); return;
        case 'b': stop(); toggleStyle('b'); return;
        case 'i': stop(); toggleStyle('i'); return;
        case 'u': stop(); toggleStyle('u'); return;
        case 'a': stop(); setSel({ r: 0, c: 0, r2: M.MAX_ROWS - 1, c2: M.MAX_COLS - 1 }); return;
        case 'd': stop(); fill('down'); return;
        case 'r': stop(); fill('right'); return;
        case 'f': stop(); setFind('find'); return;
        case 'h': stop(); setFind('replace'); return;
        case ';': stop(); insertNow(false); return;
        case '/': stop(); setPanel('shortcuts'); return;
        case ' ': stop(); setSel((s) => ({ r: 0, c: s.c, r2: M.MAX_ROWS - 1, c2: s.c })); return;
        case 'home': stop(); go({ r: 0, c: 0, r2: 0, c2: 0 }); return;
        case 'end': stop(); { const r = Math.max(0, used.rows - 1), c = Math.max(0, used.cols - 1); go({ r, c, r2: r, c2: c }); } return;
        case '+': case '=': stop(); isFullCols(norm(selRef.current)) ? insertRowsCols('c', true) : insertRowsCols('r', true); return;
        case '-': stop(); isFullCols(norm(selRef.current)) ? deleteRowsCols('c') : deleteRowsCols('r'); return;
        case 'enter': stop(); startEdit(activeCell?.v ?? '', 'edit'); return;
        default: return; // let Ctrl+C / X / V reach the clipboard events
      }
    }
    if (shift && k === ' ') { stop(); setSel((s) => ({ r: s.r, c: 0, r2: s.r, c2: M.MAX_COLS - 1 })); return; }
    if (arrows[k]) { stop(); move(...arrows[k], shift); return; }
    switch (k) {
      case 'Tab': stop(); move(0, shift ? -1 : 1); return;
      case 'Enter': stop(); move(shift ? -1 : 1, 0); return;
      case 'Home': stop(); go({ r: selRef.current.r, c: 0, r2: selRef.current.r, c2: 0 }); return;
      case 'PageDown': stop(); move(Math.floor(VIEW_H / ROW_H), 0, shift); return;
      case 'PageUp': stop(); move(-Math.floor(VIEW_H / ROW_H), 0, shift); return;
      case 'F2': stop(); startEdit(activeCell?.v ?? '', 'edit'); return;
      case 'Delete': stop(); clearRange(false); return;
      case 'Backspace': stop(); applyChanges({ [activeRef]: activeCell ? { ...activeCell, v: '' } : null }); startEdit('', 'enter'); return;
      case 'Escape': stop(); clip.current = null; setMarquee(null); return;
      default:
        if (k.length === 1 && !e.altKey) { stop(); startEdit(k, 'enter'); }
    }
  };

  // ---------- mouse ----------
  const colAt = (c) => +c;
  const onGridMouseDown = (e) => {
    const t = e.target;
    if (t.closest('[data-role="cell-editor"]') || t.closest('[role="listbox"]')) return;
    const rz = t.closest('[data-resize]');
    if (rz) {
      e.preventDefault();
      const c = +rz.dataset.resize;
      drag.current = { type: 'resize', c, x0: e.clientX, w0: colW(c) };
      setResize({ c, w: colW(c) });
      return;
    }
    if (t.closest('[data-fill]')) {
      e.preventDefault();
      drag.current = { type: 'fill' };
      return;
    }
    const td = t.closest('[data-r]');
    const th = t.closest('[data-col],[data-row],[data-corner]');
    if (td) {
      const r = +td.dataset.r, c = +td.dataset.c;
      if (editRef.current && e.button === 0 && pointable()) {
        e.preventDefault();
        beginPoint(r, c);
        drag.current = { type: 'point' };
        return;
      }
      if (editRef.current) commitEdit(null);
      e.preventDefault();
      gridRef.current?.focus({ preventScroll: true });
      const rg = norm(selRef.current);
      if (e.button === 2 && r >= rg.r1 && r <= rg.r2 && c >= rg.c1 && c <= rg.c2) return;
      if (e.shiftKey) setSel((s) => ({ ...s, r2: r, c2: c }));
      else setSel({ r, c, r2: r, c2: c });
      drag.current = e.button === 0 ? { type: 'sel' } : null;
      return;
    }
    if (th) {
      if (editRef.current) commitEdit(null);
      e.preventDefault();
      gridRef.current?.focus({ preventScroll: true });
      if (th.dataset.corner) { setSel({ r: 0, c: 0, r2: M.MAX_ROWS - 1, c2: M.MAX_COLS - 1 }); return; }
      if (th.dataset.col != null) {
        const c = colAt(th.dataset.col);
        const rg = norm(selRef.current);
        if (e.button === 2 && isFullCols(rg) && c >= rg.c1 && c <= rg.c2) return;
        if (e.shiftKey) setSel((s) => ({ r: 0, c: s.c, r2: M.MAX_ROWS - 1, c2: c }));
        else setSel({ r: 0, c, r2: M.MAX_ROWS - 1, c2: c });
        drag.current = e.button === 0 ? { type: 'col' } : null;
      } else {
        const r = +th.dataset.row;
        const rg = norm(selRef.current);
        if (e.button === 2 && isFullRows(rg) && r >= rg.r1 && r <= rg.r2) return;
        if (e.shiftKey) setSel((s) => ({ r: s.r, c: 0, r2: r, c2: M.MAX_COLS - 1 }));
        else setSel({ r, c: 0, r2: r, c2: M.MAX_COLS - 1 });
        drag.current = e.button === 0 ? { type: 'row' } : null;
      }
    }
  };

  const onGridMouseOver = (e) => {
    const d = drag.current;
    if (!d) return;
    const td = e.target.closest('[data-r]');
    if (d.type === 'sel' && td) setSel((s) => ({ ...s, r2: +td.dataset.r, c2: +td.dataset.c }));
    else if (d.type === 'point' && td && point.current) {
      const a = point.current.anchor;
      setPointRange(a.r, a.c, +td.dataset.r, +td.dataset.c);
    } else if (d.type === 'fill' && td) {
      const r = +td.dataset.r, c = +td.dataset.c;
      const rg = norm(selRef.current);
      const v = r > rg.r2 ? ['down', r - rg.r2] : r < rg.r1 ? ['up', rg.r1 - r] : null;
      const h = c > rg.c2 ? ['right', c - rg.c2] : c < rg.c1 ? ['left', rg.c1 - c] : null;
      const pick = v && h ? (v[1] >= h[1] ? v : h) : v || h;
      setFillTo(pick ? { dir: pick[0], n: pick[1] } : null);
    } else if (d.type === 'col') {
      const th = e.target.closest('[data-col]');
      if (th) setSel((s) => ({ ...s, c2: +th.dataset.col }));
    } else if (d.type === 'row') {
      const th = e.target.closest('[data-row]');
      if (th) setSel((s) => ({ ...s, r2: +th.dataset.row }));
    }
  };

  live.current.mousemove = (e) => {
    const d = drag.current;
    if (d?.type === 'resize') setResize({ c: d.c, w: Math.max(24, Math.min(800, d.w0 + e.clientX - d.x0)) });
  };
  live.current.mouseup = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.type === 'resize') {
      setResize((rz) => {
        if (rz) mutateSheet((s) => ({ ...s, colW: { ...(s.colW || {}), [rz.c]: Math.round(rz.w) } }));
        return null;
      });
    }
    if (d.type === 'fill') {
      setFillTo((f) => {
        if (f) applyFill(f);
        return null;
      });
    }
  };
  useEffect(() => {
    const mm = (e) => live.current.mousemove?.(e);
    const mu = (e) => live.current.mouseup?.(e);
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => {
      window.removeEventListener('mousemove', mm);
      window.removeEventListener('mouseup', mu);
    };
  }, []);

  const onDoubleClick = (e) => {
    const td = e.target.closest('[data-r]');
    if (td && !editRef.current) startEdit(sheet.cells[refName(+td.dataset.r, +td.dataset.c)]?.v ?? '', 'edit');
    const rz = e.target.closest('[data-resize]');
    if (rz) {
      // Double-click a column edge: fit the widest value.
      const c = +rz.dataset.resize;
      let w = 40;
      for (const ref of Object.keys(sheet.cells)) {
        const p = parseRef(ref);
        if (p?.c === c) w = Math.max(w, display(ref).length * 7.5 + 16);
      }
      mutateSheet((s) => ({ ...s, colW: { ...(s.colW || {}), [c]: Math.min(500, Math.round(w)) } }));
    }
  };

  const rowColItems = () => [
    { label: 'Insert row above', icon: BetweenHorizontalStart, run: () => insertRowsCols('r', true) },
    { label: 'Insert row below', icon: BetweenHorizontalStart, run: () => insertRowsCols('r', false) },
    { label: 'Delete row(s)', icon: Trash2, run: () => deleteRowsCols('r') },
    '-',
    { label: 'Insert column left', icon: BetweenVerticalStart, run: () => insertRowsCols('c', true) },
    { label: 'Insert column right', icon: BetweenVerticalStart, run: () => insertRowsCols('c', false) },
    { label: 'Delete column(s)', icon: Trash2, run: () => deleteRowsCols('c') },
  ];

  const onContextMenu = (e) => {
    if (e.target.closest('[data-role="cell-editor"]')) return;
    e.preventDefault();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: 'Cut', icon: Scissors, hint: 'Ctrl+X', run: () => menuCopy(true) },
        { label: 'Copy', icon: Copy, hint: 'Ctrl+C', run: () => menuCopy(false) },
        { label: 'Paste', icon: ClipboardPaste, hint: 'Ctrl+V', run: menuPaste },
        '-',
        ...rowColItems(),
        '-',
        { label: 'Clear contents', icon: Eraser, hint: 'Del', run: () => clearRange(false) },
        { label: 'Clear formatting', icon: Eraser, run: clearFormats },
        '-',
        { label: 'Sort A → Z', icon: ArrowDownAZ, run: () => sortBy(true) },
        { label: 'Sort Z → A', icon: ArrowDownZA, run: () => sortBy(false) },
      ],
    });
  };

  // ---------- find & replace ----------
  const findMatches = (q, mc) => {
    const needle = mc ? q : q.toLowerCase();
    const n = (s) => (mc ? String(s) : String(s).toLowerCase());
    return Object.keys(sheet.cells)
      .map((ref) => ({ ref, p: parseRef(ref) }))
      .filter(({ ref, p }) => p && (n(sheet.cells[ref].v ?? '').includes(needle) || n(display(ref)).includes(needle)))
      .sort((a, b) => a.p.r - b.p.r || a.p.c - b.p.c);
  };
  const findNext = (q, mc, dir = 1) => {
    const list = findMatches(q, mc);
    if (!list.length) { setFindMsg('No matches'); return; }
    const s = selRef.current;
    let i = list.findIndex(({ p }) => (dir > 0 ? p.r > s.r || (p.r === s.r && p.c > s.c) : false));
    if (dir < 0) {
      i = -1;
      list.forEach(({ p }, k) => { if (p.r < s.r || (p.r === s.r && p.c < s.c)) i = k; });
      if (i < 0) i = list.length - 1;
    } else if (i < 0) i = 0;
    const { p } = list[i];
    go({ r: p.r, c: p.c, r2: p.r, c2: p.c });
    setFindMsg(`${i + 1} of ${list.length}`);
  };
  const replaceIn = (text, q, rep, mc, all) => String(text).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), (mc ? '' : 'i') + (all ? 'g' : '')), () => rep);
  const replaceOne = (q, rep, mc) => {
    const s = selRef.current;
    const ref = refName(s.r, s.c);
    const cell = sheet.cells[ref];
    const has = cell && (mc ? String(cell.v) : String(cell.v).toLowerCase()).includes(mc ? q : q.toLowerCase());
    if (has) applyChanges({ [ref]: { ...cell, v: replaceIn(cell.v, q, rep, mc, false) } });
    findNext(q, mc, 1);
  };
  const replaceAll = (q, rep, mc) => {
    const ch = {};
    for (const [ref, cell] of Object.entries(sheet.cells)) {
      const nv = replaceIn(cell.v ?? '', q, rep, mc, true);
      if (nv !== String(cell.v ?? '')) ch[ref] = { ...cell, v: nv };
    }
    const n = Object.keys(ch).length;
    if (n) applyChanges(ch);
    setFindMsg(n ? `Replaced in ${n} cell${n > 1 ? 's' : ''}` : 'No matches');
  };

  // ---------- sheets ----------
  const addSheet = () => {
    if (editRef.current) commitEdit(null);
    const w = wbRef.current;
    selBySheet.current[w.active] = selRef.current;
    const sheets = [...w.sheets, M.newSheet(M.nextSheetName(w.sheets))];
    setWb({ ...w, sheets, active: sheets.length - 1 });
    setSel({ r: 0, c: 0, r2: 0, c2: 0 });
  };
  const finishRename = () => {
    if (!renaming) return;
    const w = wbRef.current;
    const problem = M.validSheetName(renaming.text, w.sheets, renaming.i);
    if (problem) {
      if (renaming.text.trim() !== w.sheets[renaming.i].name) alert(problem);
    } else if (renaming.text.trim() !== w.sheets[renaming.i].name) setWb(M.renameSheet(w, renaming.i, renaming.text.trim()));
    setRenaming(null);
  };
  const removeSheet = (i) => {
    const w = wbRef.current;
    if (w.sheets.length === 1) return;
    if (!confirm(`Delete “${w.sheets[i].name}”? Formulas that use it will show #REF!.`)) return;
    setWb(M.deleteSheet(w, i));
    setSel({ r: 0, c: 0, r2: 0, c2: 0 });
    selBySheet.current = {};
  };

  // ---------- files ----------
  const loadWorkbook = (w, newName) => {
    setWb(M.toWorkbook(w));
    setSel({ r: 0, c: 0, r2: 0, c2: 0 });
    selBySheet.current = {};
    if (newName) setName(newName);
  };
  const openFile = async (file) => {
    if (!file) return;
    try {
      const w = /\.csv$/i.test(file.name) ? await fromCsv(file) : await fromXlsx(file);
      loadWorkbook(w, file.name.replace(/\.[^.]+$/, ''));
    } catch (e) {
      console.error(e);
      alert('This file could not be opened. Please use an .xlsx or .csv file.');
    }
  };
  const exportAs = async (fmt) => {
    if (editRef.current) commitEdit(null);
    setBusy(fmt);
    try {
      const w = wbRef.current;
      const file = safeName(name, 'spreadsheet');
      const kind = { xlsx: 'xlsx', csv: 'csv', pdf: 'sheet-pdf' }[fmt];
      const blob = await serverExport(kind, { wb: w, title: name, sheet: w.active });
      downloadBlob(blob, fmt === 'csv' && w.sheets.length > 1 ? `${file} - ${safeName(w.sheets[w.active].name, 'sheet')}.csv` : `${file}.${fmt}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy('');
    }
  };

  // ---------- render ----------
  const editor =
    edit?.where === 'cell' ? (
      <div className="absolute left-0 top-0 flex h-full min-w-full bg-white shadow-[0_0_0_2px_#3b52f0]" style={{ width: Math.max(colW(sel.c), 220) }}>
        <FormulaInput
          ref={cellApi}
          dataRole="cell-editor"
          label={`Edit ${activeRef}`}
          value={edit.text}
          onChange={onEditChange}
          onKeyDown={onEditKey}
          onBlur={onEditBlur}
          autoFocus
          className="h-full w-full bg-white px-1.5 font-mono text-[13px] text-slate-900 outline-none"
        />
      </div>
    ) : null;

  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - 8);
  const last = Math.min(dims.rows - 1, first + Math.ceil(VIEW_H / ROW_H) + 16);
  const cols = dims.cols;
  const totalW = Array.from({ length: cols }, (_, c) => colW(c)).reduce((a, b) => a + b, HEAD_W);
  const fullCols = isFullCols(R);
  const fullRows = isFullRows(R);
  const fillR = fillTo && {
    r1: fillTo.dir === 'down' ? R.r2 + 1 : fillTo.dir === 'up' ? R.r1 - fillTo.n : R.r1,
    r2: fillTo.dir === 'down' ? R.r2 + fillTo.n : fillTo.dir === 'up' ? R.r1 - 1 : R.r2,
    c1: fillTo.dir === 'right' ? R.c2 + 1 : fillTo.dir === 'left' ? R.c1 - fillTo.n : R.c1,
    c2: fillTo.dir === 'right' ? R.c2 + fillTo.n : fillTo.dir === 'left' ? R.c1 - 1 : R.c2,
  };
  const mq = marquee && marquee.si === si ? marquee.R : null;

  const rows = [];
  for (let r = first; r <= last; r++) {
    const inR = r >= R.r1 && r <= R.r2;
    const inF = fillR && r >= fillR.r1 && r <= fillR.r2;
    const inM = mq && r >= mq.r1 && r <= mq.r2;
    rows.push(
      <Row
        key={r}
        r={r}
        cols={cols}
        cells={sheet.cells}
        vals={vals}
        selC1={inR ? R.c1 : -1}
        selC2={inR ? R.c2 : -2}
        selTop={inR && r === R.r1}
        selBot={inR && r === R.r2}
        activeC={r === sel.r ? sel.c : -1}
        handleC={!edit && !fullCols && !fullRows && r === R.r2 ? R.c2 : -1}
        fillC1={inF ? fillR.c1 : -1}
        fillC2={inF ? fillR.c2 : -2}
        mC1={inM ? mq.c1 : -1}
        mC2={inM ? mq.c2 : -2}
        mTop={inM && r === mq.r1}
        mBot={inM && r === mq.r2}
        editC={edit && r === sel.r ? sel.c : -1}
        editor={edit && r === sel.r ? editor : null}
        editText={edit && r === sel.r ? edit.text : ''}
        rowSel={inR}
      />
    );
  }

  // Selection statistics for the status bar.
  const stats = useMemo(() => {
    if (R.r1 === R.r2 && R.c1 === R.c2) return null;
    let count = 0, n = 0, sum = 0;
    for (const ref of Object.keys(sheet.cells)) {
      const p = parseRef(ref);
      if (!p || p.r < R.r1 || p.r > R.r2 || p.c < R.c1 || p.c > R.c2) continue;
      const v = vals[ref];
      if (v == null || v === '') continue;
      count++;
      if (typeof v === 'number') { n++; sum += v; }
    }
    return { count, n, sum };
  }, [R.r1, R.r2, R.c1, R.c2, sheet.cells, vals]);

  const currentNf = activeCell?.nf || M.effectiveFormat(activeCell) || 'General';
  const nfKnown = NUMBER_FORMATS.some((f) => f.id === currentNf);
  const Dl = ({ fmt, label, main }) => (
    <button onClick={() => exportAs(fmt)} disabled={!!busy} className={main ? 'btn-primary !px-4 !py-2 text-sm' : 'btn-secondary !px-3 !py-2 text-sm'}>
      {busy === fmt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {label}
    </button>
  );
  const sel1 = 'h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950';

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

      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-3 py-2 dark:border-slate-800" role="toolbar" aria-label="Sheet tools">
        <ToolBtn label="Undo (Ctrl+Z)" disabled={!past.current.length} onClick={undo}><Undo2 className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Redo (Ctrl+Y)" disabled={!future.current.length} onClick={redo}><Redo2 className="h-4 w-4" /></ToolBtn>
        <Sep />
        <select value={nfKnown ? currentNf : 'custom'} onChange={(e) => e.target.value !== 'custom' && setFormat(e.target.value)} aria-label="Number format" className={`${sel1} w-36`}>
          {NUMBER_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          {!nfKnown && <option value="custom">Custom ({currentNf})</option>}
        </select>
        <ToolBtn label="Percent (Ctrl+Shift+5)" onClick={() => setFormat('0%')}><Percent className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Thousands separator" onClick={() => setFormat('#,##0.00')}><span className="text-sm font-bold">,</span></ToolBtn>
        <ToolBtn label="Decrease decimals" onClick={() => stepDecimals(-1)}><span className="text-[11px] font-semibold">.0←</span></ToolBtn>
        <ToolBtn label="Increase decimals" onClick={() => stepDecimals(1)}><span className="text-[11px] font-semibold">.00→</span></ToolBtn>
        <Sep />
        <ToolBtn label="Bold (Ctrl+B)" active={!!activeCell?.b} onClick={() => toggleStyle('b')}><Bold className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Italic (Ctrl+I)" active={!!activeCell?.i} onClick={() => toggleStyle('i')}><Italic className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Underline (Ctrl+U)" active={!!activeCell?.u} onClick={() => toggleStyle('u')}><Underline className="h-4 w-4" /></ToolBtn>
        <ColorButton label="Text colour" icon={Baseline} value={activeCell?.fg} onPick={(c) => setStyle('fg', c)} />
        <ColorButton label="Fill colour" icon={PaintBucket} value={activeCell?.bg} onPick={(c) => setStyle('bg', c)} />
        <Sep />
        <ToolBtn label="Align left" active={activeCell?.al === 'left'} onClick={() => setStyle('al', activeCell?.al === 'left' ? undefined : 'left')}><AlignLeft className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Align centre" active={activeCell?.al === 'center'} onClick={() => setStyle('al', activeCell?.al === 'center' ? undefined : 'center')}><AlignCenter className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Align right" active={activeCell?.al === 'right'} onClick={() => setStyle('al', activeCell?.al === 'right' ? undefined : 'right')}><AlignRight className="h-4 w-4" /></ToolBtn>
        <Sep />
        <ToolBtn
          label="Rows & columns"
          onClick={(e) => {
            const b = e.currentTarget.getBoundingClientRect();
            setMenu({ x: b.left, y: b.bottom + 4, items: rowColItems() });
          }}
        >
          <BetweenHorizontalStart className="h-4 w-4" /><ChevronDown className="h-3 w-3" />
        </ToolBtn>
        <ToolBtn label="Sort A → Z" onClick={() => sortBy(true)}><ArrowDownAZ className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Sort Z → A" onClick={() => sortBy(false)}><ArrowDownZA className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Clear formatting" onClick={clearFormats}><Eraser className="h-4 w-4" /></ToolBtn>
        <Sep />
        <ToolBtn label="AutoSum (Alt+=)" onClick={autoSum}><Sigma className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Functions" onClick={() => setPanel('functions')}><SquareFunction className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Find & replace (Ctrl+F)" active={!!find} onClick={() => setFind(find ? null : 'replace')}><Search className="h-4 w-4" /></ToolBtn>
        <ToolBtn label="Keyboard shortcuts (Ctrl+/)" onClick={() => setPanel('shortcuts')}><Keyboard className="h-4 w-4" /></ToolBtn>
      </div>

      {find && (
        <FindBar
          key={find}
          withReplace={find === 'replace'}
          message={findMsg}
          onFind={findNext}
          onReplace={replaceOne}
          onReplaceAll={replaceAll}
          onClose={() => { setFind(null); setFindMsg(''); gridRef.current?.focus({ preventScroll: true }); }}
        />
      )}

      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <input
          aria-label="Name box — type a cell like B7 or a range like A1:C10 and press Enter"
          value={nameBox}
          onChange={(e) => setNameBox(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setNameBox(rangeLabel(R)); gridRef.current?.focus(); }
            if (e.key !== 'Enter') return;
            const [a, b] = nameBox.trim().toUpperCase().split(':');
            const pa = parseRef(a || ''), pb = b ? parseRef(b) : pa;
            if (!pa || !pb) { setNameBox(rangeLabel(R)); return; }
            go({ r: clampR(pa.r), c: clampC(pa.c), r2: clampR(pb.r), c2: clampC(pb.c) });
            gridRef.current?.focus({ preventScroll: true });
          }}
          className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center font-mono text-sm font-semibold outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950"
        />
        <span className="select-none font-serif text-sm italic text-slate-500">fx</span>
        <FormulaInput
          ref={barApi}
          dataRole="formula-bar"
          label="Formula bar"
          placeholder="Type a value or a formula, e.g. =SUM(B2:B10)"
          value={edit ? edit.text : String(activeCell?.v ?? '')}
          onFocus={() => {
            if (!editRef.current) startEdit(String(activeCell?.v ?? ''), 'edit', 'bar');
            else if (editRef.current.where !== 'bar') setEdit({ ...editRef.current, where: 'bar', mode: 'edit' });
          }}
          onChange={onEditChange}
          onKeyDown={onEditKey}
          onBlur={onEditBlur}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950"
        />
      </div>

      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label={`Spreadsheet ${sheet.name}, selected ${rangeLabel(R)}`}
        aria-multiselectable="true"
        onKeyDown={onGridKey}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="relative overflow-auto bg-white text-[13px] text-slate-900 outline-none"
        style={{ height: VIEW_H }}
      >
        <table
          className="border-separate border-spacing-0 select-none"
          style={{ tableLayout: 'fixed', width: totalW }}
          onMouseDown={onGridMouseDown}
          onMouseOver={onGridMouseOver}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        >
          <colgroup>
            <col style={{ width: HEAD_W }} />
            {Array.from({ length: cols }, (_, c) => <col key={c} style={{ width: colW(c) }} />)}
          </colgroup>
          <thead>
            <tr style={{ height: HEAD_H }}>
              <th data-corner="1" title="Select all" className="sticky left-0 top-0 z-30 border-b border-r border-slate-300 bg-slate-100" />
              {Array.from({ length: cols }, (_, c) => {
                const on = c >= R.c1 && c <= R.c2;
                return (
                  <th key={c} data-col={c} className={`sticky top-0 z-20 cursor-s-resize select-none border-b border-r border-slate-300 text-[11px] font-semibold ${on ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                    {COL_NAMES[c]}
                    <span data-resize={c} title="Drag to resize, double-click to fit" className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-500/40" />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {first > 0 && <tr style={{ height: first * ROW_H }}><td colSpan={cols + 1} /></tr>}
            {rows}
            {last < dims.rows - 1 && <tr style={{ height: (dims.rows - 1 - last) * ROW_H }}><td colSpan={cols + 1} /></tr>}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950/50" role="tablist" aria-label="Sheets">
        <button onClick={addSheet} title="Add sheet" aria-label="Add sheet" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800">
          <Plus className="h-4 w-4" />
        </button>
        {wb.sheets.map((s, i) =>
          renaming?.i === i ? (
            <input
              key={i}
              autoFocus
              value={renaming.text}
              onChange={(e) => setRenaming({ i, text: e.target.value })}
              onBlur={finishRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishRename();
                if (e.key === 'Escape') setRenaming(null);
              }}
              aria-label="Sheet name"
              className="w-32 rounded-md border border-brand-500 bg-white px-2 py-1 text-sm outline-none dark:bg-slate-900"
            />
          ) : (
            <div key={i} className={`group flex shrink-0 items-center rounded-md text-sm ${i === si ? 'bg-white font-semibold text-brand-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-brand-100 dark:ring-slate-700' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
              <button
                role="tab"
                aria-selected={i === si}
                onClick={() => switchSheet(i)}
                onDoubleClick={() => setRenaming({ i, text: s.name })}
                title="Double-click to rename"
                className="px-3 py-1"
              >
                {s.name}
              </button>
              {wb.sheets.length > 1 && i === si && (
                <button onClick={() => removeSheet(i)} aria-label={`Delete ${s.name}`} title="Delete sheet" className="mr-1 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-rose-600 dark:hover:bg-slate-800">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800">
        <span>
          {stats
            ? stats.n
              ? `Sum: ${formatValue(stats.sum, 'General')} · Average: ${formatValue(stats.sum / stats.n, 'General')} · Count: ${stats.count}`
              : `Count: ${stats.count}`
            : 'Type = to start a formula · drag the blue square to fill · right-click for more'}
        </span>
        <button onClick={() => setPanel('shortcuts')} className="hover:text-brand-600">Keyboard shortcuts (Ctrl+/)</button>
      </div>

      {menu && <Menu {...menu} onClose={() => setMenu(null)} />}
      {panel === 'shortcuts' && <ShortcutsDialog onClose={() => { setPanel(null); gridRef.current?.focus({ preventScroll: true }); }} />}
      {panel === 'functions' && (
        <FunctionsDialog
          onClose={() => setPanel(null)}
          onInsert={(f) => {
            setPanel(null);
            const e = editRef.current;
            if (e && e.text.startsWith('=')) {
              const pos = editApi()?.caret() ?? e.text.length;
              const text = e.text.slice(0, pos) + f.name + '(' + e.text.slice(pos);
              setEdit({ ...e, text });
              requestAnimationFrame(() => editApi()?.setCaret(pos + f.name.length + 1));
            } else startEdit(`=${f.name}(`, 'edit');
          }}
        />
      )}
      {picker && <TemplatePicker kind="sheet" onPick={(t) => { loadWorkbook(t, null); setPicker(false); }} onClose={() => setPicker(false)} />}
    </div>
  );
}

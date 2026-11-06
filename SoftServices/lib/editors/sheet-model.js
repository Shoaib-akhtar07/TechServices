// Workbook model and editing operations for the spreadsheet editor (pure functions, no DOM).
//
// Workbook: { sheets: [{ name, cells: { A1: Cell }, colW: { 0: 120 } }], active: 0 }
// Cell:     { v: 'typed text or =FORMULA', b?, i?, u?, al?: 'left'|'center'|'right', nf?: 'format code', fg?: '#hex', bg?: '#hex' }
import { colName, parseRef, refName } from './formula';
import { parseInput, DATE_NF, MONTHS, WEEKDAYS } from './numfmt';

export const DEFAULT_COL_W = 100;
export const MAX_ROWS = 10000;
export const MAX_COLS = 260;
export const STYLE_KEYS = ['b', 'i', 'u', 'al', 'nf', 'fg', 'bg'];

export const newSheet = (name, cells = {}) => ({ name, cells, colW: {} });

/** Accepts a saved draft, a template ({ cells } or { sheets }) or nothing, and returns a workbook. */
export function toWorkbook(d) {
  if (d?.sheets?.length) {
    return {
      sheets: d.sheets.map((s, i) => ({ name: String(s.name || `Sheet${i + 1}`), cells: { ...(s.cells || {}) }, colW: { ...(s.colW || {}) } })),
      active: Math.min(Math.max(0, d.active | 0), d.sheets.length - 1),
    };
  }
  return { sheets: [newSheet('Sheet1', { ...(d?.cells || {}) })], active: 0 };
}

export const isEmptyCell = (cell) => !cell || ((cell.v == null || cell.v === '') && !STYLE_KEYS.some((k) => cell[k]));

/** Bounding box of cells that hold a value. */
export function usedRange(cells) {
  let rows = 0, cols = 0;
  for (const [ref, cell] of Object.entries(cells)) {
    if (cell?.v == null || cell.v === '') continue;
    const p = parseRef(ref);
    if (!p) continue;
    rows = Math.max(rows, p.r + 1);
    cols = Math.max(cols, p.c + 1);
  }
  return { rows, cols };
}

const AUTO_FORMATS = [
  [/^=\s*NOW\s*\(/i, 'dd-mmm-yyyy h:mm'],
  [/^=\s*(TODAY|DATE|EDATE|EOMONTH|WORKDAY|DATEVALUE)\s*\(/i, DATE_NF],
  [/^=\s*TIME\s*\(/i, 'h:mm AM/PM'],
];

/**
 * The number format to display a cell with: its own, one implied by its formula (=TODAY() → date)
 * or by how the value was typed ("12%", "18/10/2026", "$1,200").
 */
export function effectiveFormat(cell) {
  if (!cell) return undefined;
  if (cell.nf) return cell.nf;
  if (typeof cell.v !== 'string' || !cell.v) return undefined;
  if (cell.v[0] === '=') {
    for (const [re, nf] of AUTO_FORMATS) if (re.test(cell.v)) return nf;
    return undefined;
  }
  return parseInput(cell.v).nf;
}

// ---------- sheet names ----------
export const quoteSheet = (name) => (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(name) && !/^[A-Za-z]{1,3}\d+$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`);
const unquoteSheet = (s) => (s[0] === "'" ? s.slice(1, -1).replace(/''/g, "'") : s);

export function validSheetName(name, sheets, except = -1) {
  const n = name.trim();
  if (!n) return 'Sheet name cannot be empty.';
  if (n.length > 31) return 'Sheet names can be at most 31 characters.';
  if (/[\\/?*[\]:]/.test(n)) return 'Sheet names cannot contain \\ / ? * [ ] :';
  if (sheets.some((s, i) => i !== except && s.name.toLowerCase() === n.toLowerCase())) return 'A sheet with this name already exists.';
  return null;
}

// ---------- formula reference rewriting ----------
// Matches [Sheet!]A1 or [Sheet!]A1:B2 outside string literals. Not followed by "(" so LOG10( stays a function.
const REF_TOKEN = /(?<![A-Za-z0-9_.$'])((?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!)?(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?::(\$?)([A-Za-z]{1,3})(\$?)(\d+))?(?![A-Za-z0-9_(!])/g;

function mapOutsideStrings(f, fn) {
  return f
    .split(/("(?:[^"]|"")*")/)
    .map((part, i) => (i % 2 ? part : fn(part)))
    .join('');
}

function rewriteRefs(formula, fn) {
  if (typeof formula !== 'string' || formula[0] !== '=') return formula;
  return mapOutsideStrings(formula, (part) =>
    part.replace(REF_TOKEN, (all, sheet, ac1, c1, ar1, r1, ac2, c2, ar2, r2) => {
      const a = parseRef(`${c1}${r1}`);
      if (!a) return all;
      const p1 = { r: a.r, c: a.c, ar: !!ar1, ac: !!ac1 };
      let p2 = null;
      if (c2) {
        const b = parseRef(`${c2}${r2}`);
        if (!b) return all;
        p2 = { r: b.r, c: b.c, ar: !!ar2, ac: !!ac2 };
      }
      const res = fn({ sheet: sheet ? unquoteSheet(sheet.slice(0, -1)) : null, p1, p2, sheetText: sheet || '' });
      if (res == null) return all;
      if (res === '#REF!') return '#REF!';
      const fmt = (p) => `${p.ac ? '$' : ''}${colName(p.c)}${p.ar ? '$' : ''}${p.r + 1}`;
      return (res.sheetText ?? sheet ?? '') + fmt(res.p1) + (res.p2 ? ':' + fmt(res.p2) : '');
    })
  );
}

const inBounds = (p) => p.r >= 0 && p.c >= 0 && p.r < 1048576 && p.c < 16384;

/** Shift relative references when a formula is copied dr rows / dc columns away. */
export function shiftFormula(formula, dr, dc) {
  if (!dr && !dc) return formula;
  return rewriteRefs(formula, ({ p1, p2 }) => {
    const mv = (p) => ({ ...p, r: p.ar ? p.r : p.r + dr, c: p.ac ? p.c : p.c + dc });
    const a = mv(p1), b = p2 && mv(p2);
    if (!inBounds(a) || (b && !inBounds(b))) return '#REF!';
    return { p1: a, p2: b };
  });
}

/**
 * Update references after inserting (n > 0) or deleting (n < 0) rows/columns at `at`
 * in sheet `target`. `own` is the name of the sheet the formula lives on.
 */
export function adjustFormula(formula, { target, own, axis, at, n }) {
  return rewriteRefs(formula, ({ sheet, p1, p2 }) => {
    if ((sheet ?? own).toLowerCase() !== target.toLowerCase()) return null;
    const k = axis === 'r' ? 'r' : 'c';
    if (n > 0) {
      const mv = (p) => (p[k] >= at ? { ...p, [k]: p[k] + n } : p);
      return { p1: mv(p1), p2: p2 && mv(p2) };
    }
    const del = -n, last = at + del - 1;
    if (!p2) {
      if (p1[k] >= at && p1[k] <= last) return '#REF!';
      return { p1: p1[k] > last ? { ...p1, [k]: p1[k] - del } : p1 };
    }
    let s = p1[k], e = p2[k];
    if (s >= at && e <= last) return '#REF!';
    s = s > last ? s - del : s >= at ? at : s;
    e = e > last ? e - del : e >= at ? at - 1 : e;
    return { p1: { ...p1, [k]: s }, p2: { ...p2, [k]: e } };
  });
}

export function renameInFormula(formula, oldName, newName) {
  return rewriteRefs(formula, ({ sheet, p1, p2 }) =>
    sheet && sheet.toLowerCase() === oldName.toLowerCase() ? { p1, p2, sheetText: quoteSheet(newName) + '!' } : null
  );
}

export function dropSheetInFormula(formula, name) {
  return rewriteRefs(formula, ({ sheet }) => (sheet && sheet.toLowerCase() === name.toLowerCase() ? '#REF!' : null));
}

const isFormula = (v) => typeof v === 'string' && v[0] === '=' && v.length > 1;

const mapFormulas = (wb, fn) => ({
  ...wb,
  sheets: wb.sheets.map((s) => {
    let changed = false;
    const cells = {};
    for (const [ref, cell] of Object.entries(s.cells)) {
      if (isFormula(cell.v)) {
        const v = fn(cell.v, s);
        if (v !== cell.v) { cells[ref] = { ...cell, v }; changed = true; continue; }
      }
      cells[ref] = cell;
    }
    return changed ? { ...s, cells } : s;
  }),
});

/** Normalise typed formulas like Excel: upper-case functions and references, close open brackets. */
export function normalizeFormula(f) {
  if (!isFormula(f)) return f;
  let out = mapOutsideStrings(f, (part) =>
    part
      .replace(/(?<![A-Za-z0-9_.$'!])([A-Za-z_][A-Za-z0-9_.]*)(?=\s*\()/g, (m) => m.toUpperCase())
      .replace(REF_TOKEN, (m, sheet) => (sheet || '') + m.slice((sheet || '').length).toUpperCase())
  );
  let depth = 0, q = false;
  for (const ch of out) {
    if (ch === '"') q = !q;
    else if (!q && ch === '(') depth++;
    else if (!q && ch === ')') depth--;
  }
  if (q) out += '"';
  if (depth > 0) out += ')'.repeat(depth);
  return out;
}

// ---------- workbook operations ----------
export function updateSheet(wb, si, fn) {
  return { ...wb, sheets: wb.sheets.map((s, i) => (i === si ? fn(s) : s)) };
}

/** Apply { ref: cell | null } to a sheet; empty cells are removed. */
export function setCells(sheet, changes) {
  const cells = { ...sheet.cells };
  for (const [ref, cell] of Object.entries(changes)) {
    if (isEmptyCell(cell)) delete cells[ref];
    else cells[ref] = cell;
  }
  return { ...sheet, cells };
}

export function forRange(rng, fn) {
  for (let r = rng.r1; r <= rng.r2; r++) for (let c = rng.c1; c <= rng.c2; c++) fn(r, c, refName(r, c));
}

/** Insert (n > 0) or delete (n < 0) rows/columns at index `at` of sheet `si`. */
export function insertDelete(wb, si, axis, at, n) {
  const target = wb.sheets[si].name;
  let next = mapFormulas(wb, (f, s) => adjustFormula(f, { target, own: s.name, axis, at, n }));
  next = updateSheet(next, si, (s) => {
    const cells = {};
    for (const [ref, cell] of Object.entries(s.cells)) {
      const p = parseRef(ref);
      if (!p) continue;
      let { r, c } = p;
      const k = axis === 'r' ? r : c;
      if (n > 0 && k >= at) axis === 'r' ? (r += n) : (c += n);
      if (n < 0) {
        if (k >= at && k < at - n) continue;
        if (k >= at - n) axis === 'r' ? (r += n) : (c += n);
      }
      cells[refName(r, c)] = cell;
    }
    let colW = s.colW;
    if (axis === 'c') {
      colW = {};
      for (const [c, w] of Object.entries(s.colW || {})) {
        const ci = +c;
        if (n > 0) colW[ci >= at ? ci + n : ci] = w;
        else if (ci < at) colW[ci] = w;
        else if (ci >= at - n) colW[ci + n] = w;
      }
    }
    return { ...s, cells, colW };
  });
  return next;
}

export function renameSheet(wb, si, name) {
  const old = wb.sheets[si].name;
  const next = mapFormulas(wb, (f) => renameInFormula(f, old, name));
  return updateSheet(next, si, (s) => ({ ...s, name }));
}

export function deleteSheet(wb, si) {
  const name = wb.sheets[si].name;
  const sheets = wb.sheets.filter((_, i) => i !== si);
  const next = mapFormulas({ ...wb, sheets }, (f) => dropSheetInFormula(f, name));
  return { ...next, active: Math.min(wb.active >= si ? Math.max(0, wb.active - 1) : wb.active, sheets.length - 1) };
}

export function nextSheetName(sheets) {
  for (let i = sheets.length + 1; ; i++) {
    const n = `Sheet${i}`;
    if (!sheets.some((s) => s.name.toLowerCase() === n.toLowerCase())) return n;
  }
}

// ---------- copy / paste ----------
/** Copy a block: cells (2-D, may contain undefined) and tab-separated display text for other apps. */
export function copyBlock(sheet, rng, displayOf) {
  const rows = [], lines = [];
  for (let r = rng.r1; r <= rng.r2; r++) {
    const row = [], txt = [];
    for (let c = rng.c1; c <= rng.c2; c++) {
      const ref = refName(r, c);
      row.push(sheet.cells[ref]);
      const t = displayOf(ref);
      txt.push(/[\t\n"]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
    }
    rows.push(row);
    lines.push(txt.join('\t'));
  }
  return { rows, tsv: lines.join('\r\n'), r1: rng.r1, c1: rng.c1 };
}

/** Changes for pasting a copied block at (r, c). Formulas move relatively unless `cut`. */
export function pasteBlock(block, r, c, { cut = false, fit } = {}) {
  const h = block.rows.length, w = block.rows[0]?.length || 0;
  // Tile the block over a larger selection that is an exact multiple of its size.
  const th = fit && fit.h % h === 0 ? fit.h : h;
  const tw = fit && fit.w % w === 0 ? fit.w : w;
  const changes = {};
  for (let i = 0; i < th; i++) {
    for (let j = 0; j < tw; j++) {
      const src = block.rows[i % h][j % w];
      const dr = r + i - (block.r1 + (i % h)), dc = c + j - (block.c1 + (j % w));
      const tr = r + i, tc = c + j;
      if (tr >= MAX_ROWS || tc >= MAX_COLS) continue;
      if (!src) { changes[refName(tr, tc)] = null; continue; }
      changes[refName(tr, tc)] = { ...src, v: cut ? src.v : shiftFormula(src.v, dr, dc) };
    }
  }
  return changes;
}

/** Parse tab-separated text (from Excel, Google Sheets…) into a 2-D array. */
export function parseTsv(text) {
  const rows = [[]];
  let field = '', q = false, i = 0;
  text = text.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  for (; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"' && field === '') q = true;
    else if (ch === '\t') { rows[rows.length - 1].push(field); field = ''; }
    else if (ch === '\n') { rows[rows.length - 1].push(field); field = ''; rows.push([]); }
    else field += ch;
  }
  rows[rows.length - 1].push(field);
  return rows;
}

// ---------- fill (drag handle, Ctrl+D, Ctrl+R) ----------
const SERIES_LISTS = [
  MONTHS.map((m) => m.slice(0, 3)),
  MONTHS,
  WEEKDAYS.map((d) => d.slice(0, 3)),
  WEEKDAYS,
];

function listSeries(values) {
  for (const list of SERIES_LISTS) {
    const idx = values.map((v) => list.findIndex((x) => x.toLowerCase() === String(v ?? '').toLowerCase()));
    if (idx.length && idx.every((i) => i >= 0)) {
      const step = idx.length > 1 ? idx[1] - idx[0] : 1;
      const upper = values.every((v) => v === String(v).toUpperCase());
      return (k) => {
        const s = list[(((idx[idx.length - 1] + step * k) % list.length) + list.length) % list.length];
        return upper ? s.toUpperCase() : s;
      };
    }
  }
  return null;
}

/**
 * Fill outward from the source range. dir: 'down' | 'up' | 'right' | 'left'; count: cells to add.
 * Numbers with 2+ cells continue the series, "Item 1" counts up, Jan/Mon continue, dates step by a day,
 * formulas shift their relative references; anything else is copied.
 */
export function fillChanges(sheet, rng, dir, count) {
  const changes = {};
  const vertical = dir === 'down' || dir === 'up';
  const forward = dir === 'down' || dir === 'right';
  const lines = vertical ? [rng.c1, rng.c2] : [rng.r1, rng.r2];
  for (let line = lines[0]; line <= lines[1]; line++) {
    const pos = [];
    if (vertical) for (let r = rng.r1; r <= rng.r2; r++) pos.push([r, line]);
    else for (let c = rng.c1; c <= rng.c2; c++) pos.push([line, c]);
    if (!forward) pos.reverse();
    const src = pos.map(([r, c]) => sheet.cells[refName(r, c)]);
    const n = src.length;
    const raws = src.map((s) => s?.v ?? '');
    const parsed = raws.map((v) => (isFormula(v) ? null : parseInput(v).value));
    const allNum = n > 0 && parsed.every((v) => typeof v === 'number');
    const isDate = allNum && src.every((s) => s?.nf && /[dy]/i.test(s.nf.replace(/"[^"]*"/g, '')));
    let seq = null;
    if (allNum && (n > 1 || isDate)) {
      const step = n > 1 ? (parsed[n - 1] - parsed[0]) / (n - 1) : 1;
      seq = (k) => String(Number((parsed[n - 1] + step * k).toPrecision(15)));
    } else if (!allNum) {
      const list = listSeries(raws);
      if (list) seq = list;
      else if (n === 1 && /^(.*?)(\d+)$/.test(raws[0]) && !isFormula(raws[0])) {
        const [, pre, digits] = /^(.*?)(\d+)$/.exec(raws[0]);
        seq = (k) => pre + String(Math.max(0, +digits + k)).padStart(digits.length, '0');
      }
    }
    const [lr, lc] = pos[n - 1];
    for (let k = 1; k <= count; k++) {
      const d = forward ? k : -k;
      const tr = vertical ? lr + d : lr;
      const tc = vertical ? lc : lc + d;
      if (tr < 0 || tc < 0 || tr >= MAX_ROWS || tc >= MAX_COLS) continue;
      const si = (k - 1) % n;
      const base = src[si];
      const ref = refName(tr, tc);
      if (seq) { changes[ref] = { ...(src[n - 1] || {}), v: seq(k) }; continue; }
      if (!base) { changes[ref] = null; continue; }
      const [sr, sc] = pos[si];
      changes[ref] = { ...base, v: shiftFormula(base.v, tr - sr, tc - sc) };
    }
  }
  return changes;
}

// ---------- sort ----------
/** Sort the rows of `rng` by column `byCol`. Numbers < text < booleans, blanks last. */
export function sortChanges(sheet, values, rng, byCol, asc) {
  const rows = [];
  for (let r = rng.r1; r <= rng.r2; r++) {
    const row = [];
    for (let c = rng.c1; c <= rng.c2; c++) row.push(sheet.cells[refName(r, c)]);
    rows.push({ r, row, key: values[refName(r, byCol)] });
  }
  const rk = (v) => (v == null || v === '' ? 3 : typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : 4);
  rows.sort((a, b) => {
    const ra = rk(a.key), rb = rk(b.key);
    if (ra !== rb) return ra - rb; // blanks stay last either way
    if (ra === 3) return 0;
    let cmp = ra === 1 ? String(a.key).localeCompare(String(b.key), undefined, { sensitivity: 'base', numeric: true }) : a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    return asc ? cmp : -cmp;
  });
  const changes = {};
  rows.forEach((item, i) => {
    const tr = rng.r1 + i;
    item.row.forEach((cell, j) => {
      const ref = refName(tr, rng.c1 + j);
      changes[ref] = cell ? { ...cell, v: shiftFormula(cell.v, tr - item.r, 0) } : null;
    });
  });
  return changes;
}

/** Keep only known keys/types so drafts, imports and server input are safe and small. */
export function cleanWorkbook(input, { maxSheets = 50, maxCells = 200000 } = {}) {
  if (!input || !Array.isArray(input.sheets) || !input.sheets.length) throw new Error('Invalid workbook.');
  let total = 0;
  const sheets = input.sheets.slice(0, maxSheets).map((s, i) => {
    const cells = {};
    for (const [ref, cell] of Object.entries(s?.cells || {})) {
      if (!parseRef(ref) || !cell || typeof cell !== 'object') continue;
      if (++total > maxCells) throw new Error('This workbook is too large.');
      const c = { v: cell.v == null ? '' : String(cell.v).slice(0, 32767) };
      if (cell.b) c.b = true;
      if (cell.i) c.i = true;
      if (cell.u) c.u = true;
      if (['left', 'center', 'right'].includes(cell.al)) c.al = cell.al;
      if (typeof cell.nf === 'string' && cell.nf.length < 100) c.nf = cell.nf;
      if (/^#[0-9a-f]{6}$/i.test(cell.fg || '')) c.fg = cell.fg;
      if (/^#[0-9a-f]{6}$/i.test(cell.bg || '')) c.bg = cell.bg;
      cells[ref.toUpperCase()] = c;
    }
    const colW = {};
    for (const [c, w] of Object.entries(s?.colW || {})) if (Number.isInteger(+c) && +c >= 0 && +c < MAX_COLS && Number.isFinite(+w)) colW[+c] = Math.min(800, Math.max(24, +w));
    return { name: String(s?.name || `Sheet${i + 1}`).slice(0, 31) || `Sheet${i + 1}`, cells, colW };
  });
  return { sheets, active: 0 };
}

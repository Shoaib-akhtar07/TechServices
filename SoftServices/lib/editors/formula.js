// Spreadsheet formula engine (no eval). Excel syntax: A1 / $A$1 refs, ranges, whole columns (A:A),
// sheet refs (Sheet2!A1, 'My sheet'!A1:B5), operators + - * / ^ & % and comparisons, ~140 functions.
import { toSerial, fromSerial, todaySerial, nowSerial, daysInMonth, parseInput, general, formatValue } from './numfmt';

export const colName = (i) => {
  let s = '';
  for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

const REF_RE = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/;

export function parseRef(ref) {
  const m = REF_RE.exec(ref);
  if (!m) return null;
  let c = 0;
  for (const ch of m[2].toUpperCase()) c = c * 26 + (ch.charCodeAt(0) - 64);
  const r = +m[4] - 1;
  if (r < 0 || r > 1048575 || c > 16384) return null;
  return { c: c - 1, r, ac: !!m[1], ar: !!m[3] };
}

export const refName = (r, c) => colName(c) + (r + 1);

const colIndex = (letters) => {
  let c = 0;
  for (const ch of letters.replace(/\$/g, '').toUpperCase()) c = c * 26 + (ch.charCodeAt(0) - 64);
  return c - 1;
};

export const err = (code) => ({ error: code });
export const isErr = (v) => v != null && typeof v === 'object' && 'error' in v;
const E = { VALUE: '#VALUE!', DIV0: '#DIV/0!', NAME: '#NAME?', REF: '#REF!', NA: '#N/A', NUM: '#NUM!', CYCLE: '#CYCLE!' };
export const ERRORS = E;

export class Range {
  constructor(rows, top = 0, left = 0) {
    this.rows = rows;
    this.top = top;
    this.left = left;
  }
  get h() { return this.rows.length; }
  get w() { return this.rows[0]?.length || 0; }
  flat() { return this.rows.flat(); }
}
const isRange = (v) => v instanceof Range;

// ---------- tokenizer ----------
function tokenize(src) {
  const out = [];
  const n = src.length;
  let i = 0;
  const identAt = (k) => /^[$A-Za-z_][$A-Za-z0-9_.]*/.exec(src.slice(k));
  while (i < n) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw err(E.VALUE);
      out.push({ t: 'num', v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (ch === '"') {
      let j = i + 1, s = '';
      for (;;) {
        if (j >= n) throw err(E.VALUE);
        if (src[j] === '"') {
          if (src[j + 1] === '"') { s += '"'; j += 2; continue; }
          break;
        }
        s += src[j++];
      }
      out.push({ t: 'str', v: s });
      i = j + 1;
      continue;
    }
    if (ch === '#') {
      const m = /^#(N\/A|REF!|VALUE!|DIV\/0!|NAME\?|NUM!|NULL!)/i.exec(src.slice(i));
      if (!m) throw err(E.VALUE);
      out.push({ t: 'err', v: m[0].toUpperCase() });
      i += m[0].length;
      continue;
    }
    let sheet = null;
    if (ch === "'") {
      let j = i + 1, s = '';
      for (;;) {
        if (j >= n) throw err(E.REF);
        if (src[j] === "'") {
          if (src[j + 1] === "'") { s += "'"; j += 2; continue; }
          break;
        }
        s += src[j++];
      }
      if (src[j + 1] !== '!') throw err(E.VALUE);
      sheet = s;
      i = j + 2;
    }
    let m = identAt(i);
    if (m) {
      let id = m[0];
      let j = i + id.length;
      if (!sheet && src[j] === '!') {
        sheet = id;
        i = j + 1;
        m = identAt(i);
        if (!m) throw err(E.REF);
        id = m[0];
        j = i + id.length;
      }
      i = j;
      let k = j;
      while (k < n && /\s/.test(src[k])) k++;
      if (!sheet && src[k] === '(') { out.push({ t: 'fn', v: id.toUpperCase().replace(/^_XLFN\.|^_XLWS\./, '') }); continue; }
      if (REF_RE.test(id)) { out.push({ t: 'ref', sheet, ref: id }); continue; }
      if (/^\$?[A-Za-z]{1,3}$/.test(id) && src[j] === ':') { out.push({ t: 'col', sheet, ref: id }); continue; }
      if (sheet) throw err(E.REF);
      const up = id.toUpperCase();
      if (up === 'TRUE' || up === 'FALSE') { out.push({ t: 'bool', v: up === 'TRUE' }); continue; }
      out.push({ t: 'name', v: up });
      continue;
    }
    if (sheet) throw err(E.REF);
    const two = src.slice(i, i + 2);
    if (['<=', '>=', '<>'].includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue; }
    if ('+-*/^&()=<>,:%;'.includes(ch)) { out.push({ t: 'op', v: ch === ';' ? ',' : ch }); i++; continue; }
    throw err(E.VALUE);
  }
  return out;
}

// ---------- parser (formula text -> AST) ----------
function parse(src) {
  const tokens = tokenize(src);
  let p = 0;
  const isOp = (v) => tokens[p]?.t === 'op' && tokens[p].v === v;
  const take = (v) => (isOp(v) ? (p++, true) : false);
  const expect = (v) => { if (!take(v)) throw err(E.VALUE); };

  const comparison = () => {
    let a = concat();
    while (['=', '<>', '<', '>', '<=', '>='].some(isOp)) {
      const op = tokens[p++].v;
      a = { k: 'bin', op, a, b: concat() };
    }
    return a;
  };
  const concat = () => {
    let a = additive();
    while (take('&')) a = { k: 'bin', op: '&', a, b: additive() };
    return a;
  };
  const additive = () => {
    let a = term();
    while (isOp('+') || isOp('-')) {
      const op = tokens[p++].v;
      a = { k: 'bin', op, a, b: term() };
    }
    return a;
  };
  const term = () => {
    let a = power();
    while (isOp('*') || isOp('/')) {
      const op = tokens[p++].v;
      a = { k: 'bin', op, a, b: power() };
    }
    return a;
  };
  const power = () => {
    let a = unary();
    while (take('^')) a = { k: 'bin', op: '^', a, b: unary() };
    return a;
  };
  const unary = () => {
    if (take('-')) return { k: 'neg', a: unary() };
    if (take('+')) return unary();
    return postfix();
  };
  const postfix = () => {
    let a = primary();
    while (take('%')) a = { k: 'pct', a };
    return a;
  };
  const primary = () => {
    const tk = tokens[p++];
    if (!tk) throw err(E.VALUE);
    if (tk.t === 'num' || tk.t === 'str' || tk.t === 'bool') return { k: 'lit', v: tk.v };
    if (tk.t === 'err') return { k: 'lit', v: err(tk.v) };
    if (tk.t === 'op' && tk.v === '(') {
      const a = comparison();
      expect(')');
      return a;
    }
    if (tk.t === 'fn') {
      expect('(');
      const args = [];
      if (!take(')')) {
        for (;;) {
          args.push(isOp(',') || isOp(')') ? null : comparison());
          if (take(',')) continue;
          expect(')');
          break;
        }
      }
      return { k: 'fn', name: tk.v, args };
    }
    if (tk.t === 'ref') {
      const a = parseRef(tk.ref);
      if (!a) throw err(E.REF);
      if (take(':')) {
        const nt = tokens[p++];
        if (nt?.t !== 'ref' || (nt.sheet && nt.sheet !== tk.sheet)) throw err(E.REF);
        const b = parseRef(nt.ref);
        if (!b) throw err(E.REF);
        return { k: 'range', sheet: tk.sheet, r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) };
      }
      return { k: 'ref', sheet: tk.sheet, r: a.r, c: a.c };
    }
    if (tk.t === 'col') {
      expect(':');
      const nt = tokens[p++];
      if (nt?.t !== 'col' && !(nt?.t === 'name' && /^[A-Z]{1,3}$/.test(nt.v))) throw err(E.REF);
      const a = colIndex(tk.ref), b = colIndex(nt.ref || nt.v);
      return { k: 'col', sheet: tk.sheet, c1: Math.min(a, b), c2: Math.max(a, b) };
    }
    if (tk.t === 'name') throw err(E.NAME);
    throw err(E.VALUE);
  };

  const ast = comparison();
  if (p < tokens.length) throw err(E.VALUE);
  return ast;
}

const astCache = new Map();
function parseCached(src) {
  let ast = astCache.get(src);
  if (ast === undefined) {
    try {
      ast = parse(src);
    } catch (e) {
      ast = isErr(e) ? { k: 'lit', v: e } : { k: 'lit', v: err(E.VALUE) };
    }
    if (astCache.size > 5000) astCache.clear();
    astCache.set(src, ast);
  }
  return ast;
}

// ---------- coercion helpers ----------
function scalar(v) {
  if (isRange(v)) {
    if (v.h === 1 && v.w === 1) v = v.rows[0][0];
    else throw err(E.VALUE);
  }
  if (isErr(v)) throw v;
  return v;
}

export function num(v) {
  v = scalar(v);
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const p = parseInput(v).value;
  if (typeof p === 'number') return p;
  throw err(E.VALUE);
}

function text(v) {
  v = scalar(v);
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return general(v);
  return String(v);
}

function bool(v) {
  v = scalar(v);
  if (v == null || v === '') return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (/^true$/i.test(v)) return true;
  if (/^false$/i.test(v)) return false;
  throw err(E.VALUE);
}

const rank = (v) => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2);

// Excel ordering: numbers < text < booleans; blanks act like 0 / "" / FALSE.
export function compare(a, b) {
  if (a == null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b == null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (ra === 1) {
    const x = a.toLowerCase(), y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

const finite = (x) => {
  if (!Number.isFinite(x)) throw err(E.NUM);
  return x;
};

function binary(op, a, b) {
  switch (op) {
    case '+': return finite(num(a) + num(b));
    case '-': return finite(num(a) - num(b));
    case '*': return finite(num(a) * num(b));
    case '/': {
      const x = num(a), y = num(b);
      if (y === 0) throw err(E.DIV0);
      return finite(x / y);
    }
    case '^': return finite(num(a) ** num(b));
    case '&': return text(a) + text(b);
    default: {
      const c = compare(scalar(a), scalar(b));
      return { '=': c === 0, '<>': c !== 0, '<': c < 0, '>': c > 0, '<=': c <= 0, '>=': c >= 0 }[op];
    }
  }
}

// ---------- evaluation ----------
function makeEvaluator(ctx) {
  const sheetOf = (name) => {
    if (name == null) return ctx.sheet;
    const s = ctx.sheetIndex(name);
    if (s < 0) throw err(E.REF);
    return s;
  };
  const block = (s, r1, c1, r2, c2) => {
    if ((r2 - r1 + 1) * (c2 - c1 + 1) > 2e6) throw err(E.REF);
    const rows = [];
    for (let r = r1; r <= r2; r++) {
      const row = [];
      for (let c = c1; c <= c2; c++) row.push(ctx.cell(s, r, c));
      rows.push(row);
    }
    return new Range(rows, r1, c1);
  };
  const ev = (node) => {
    switch (node.k) {
      case 'lit': return node.v;
      case 'ref': return block(sheetOf(node.sheet), node.r, node.c, node.r, node.c);
      case 'range': return block(sheetOf(node.sheet), node.r1, node.c1, node.r2, node.c2);
      case 'col': {
        const s = sheetOf(node.sheet);
        return block(s, 0, node.c1, Math.max(0, ctx.rows(s) - 1), node.c2);
      }
      case 'neg': return -num(ev(node.a));
      case 'pct': return num(ev(node.a)) / 100;
      case 'bin': return binary(node.op, ev(node.a), ev(node.b));
      case 'fn': {
        const f = FUNCS[node.name];
        if (!f) throw err(E.NAME);
        // Each argument is evaluated on its own; an error becomes a value the function can inspect (IFERROR, IF…).
        const args = node.args.map((a) => {
          if (a == null) return undefined;
          try {
            return ev(a);
          } catch (e) {
            if (isErr(e)) return e;
            throw e;
          }
        });
        return f(args, ctx);
      }
      default: throw err(E.VALUE);
    }
  };
  return ev;
}

/** Evaluate one formula (without the leading "="). */
export function evaluate(src, ctx) {
  const ast = parseCached(src);
  try {
    let v = makeEvaluator(ctx)(ast);
    if (isRange(v)) v = v.h && v.w ? v.rows[0][0] : null;
    if (v == null) return 0;
    if (typeof v === 'number' && !Number.isFinite(v)) return err(E.NUM);
    if (typeof v === 'number' && Object.is(v, -0)) return 0;
    return v;
  } catch (e) {
    if (isErr(e)) return e;
    return err(E.VALUE);
  }
}

/** Check a formula for syntax errors without evaluating it. */
export function syntaxError(src) {
  try {
    parse(src);
    return null;
  } catch (e) {
    return isErr(e) ? e.error : E.VALUE;
  }
}

function usedRows(cells) {
  let max = 0;
  for (const ref of Object.keys(cells)) {
    const m = /(\d+)$/.exec(ref);
    if (m) max = Math.max(max, +m[1]);
  }
  return max;
}

/**
 * Compute every cell of a workbook.
 * wb: { sheets: [{ name, cells: { A1: { v: '=SUM(B1:B3)', nf? } } }] } → values[sheetIndex][ref]
 */
export function computeWorkbook(wb) {
  const sheets = wb.sheets;
  const names = new Map(sheets.map((s, i) => [s.name.toLowerCase(), i]));
  const values = sheets.map(() => ({}));
  const rowsUsed = sheets.map((s) => usedRows(s.cells));
  const visiting = new Set();
  const sheetIndex = (n) => names.get(String(n).toLowerCase()) ?? -1;
  const rows = (s) => rowsUsed[s];

  const cell = (si, r, c) => {
    const ref = refName(r, c);
    const store = values[si];
    if (ref in store) return store[ref];
    const raw = sheets[si].cells[ref];
    if (!raw || raw.v == null || raw.v === '') return null;
    let v;
    if (raw.nf === '@') v = String(raw.v);
    else if (typeof raw.v === 'string' && raw.v.length > 1 && raw.v[0] === '=') {
      const key = `${si}!${ref}`;
      if (visiting.has(key)) return err(E.CYCLE);
      visiting.add(key);
      v = evaluate(raw.v.slice(1), { cell, sheet: si, r, c, sheetIndex, rows });
      visiting.delete(key);
    } else v = parseInput(raw.v).value;
    store[ref] = v;
    return v;
  };

  sheets.forEach((s, si) => {
    for (const ref of Object.keys(s.cells)) {
      const p = parseRef(ref);
      if (p) cell(si, p.r, p.c);
    }
  });
  return values;
}

// ====================================================================================
// Functions
// ====================================================================================

const MISSING = undefined;
const opt = (v, d) => (v === MISSING ? d : v);
const optNum = (v, d) => (v === MISSING ? d : num(v));
const first = (v) => (isRange(v) ? v.rows[0]?.[0] ?? null : v);
const toRange = (v) => (isRange(v) ? v : new Range([[isErr(v) ? v : v ?? null]]));
const flatAll = (args) => args.flatMap((a) => (a === MISSING ? [] : isRange(a) ? a.flat() : [a]));
const int = (v) => Math.trunc(num(v));

/** Numbers for SUM/AVERAGE/…: cells ignore text and booleans; typed arguments are coerced. */
function numbers(args) {
  const out = [];
  for (const a of args) {
    if (a === MISSING) continue;
    if (isRange(a)) {
      for (const v of a.flat()) {
        if (isErr(v)) throw v;
        if (typeof v === 'number') out.push(v);
      }
    } else {
      if (isErr(a)) throw a;
      if (a == null) continue;
      out.push(num(a));
    }
  }
  return out;
}

function wildcard(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '~' && i + 1 < pattern.length) re += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    else if (ch === '*') re += '[\\s\\S]*';
    else if (ch === '?') re += '[\\s\\S]';
    else re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`, 'i');
}

/** Build a predicate from a COUNTIF-style criterion: 5, ">5", "<>x", "a*", "". */
function criterion(c) {
  c = first(c);
  if (isErr(c)) throw c;
  if (typeof c === 'number' || typeof c === 'boolean') return (v) => typeof v === typeof c && v === c;
  const s = c == null ? '' : String(c);
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(s);
  const op = m[1] || '=';
  const rhs = m[2];
  if (rhs === '') {
    if (op === '=') return (v) => v == null || v === '';
    if (op === '<>') return (v) => !(v == null || v === '');
  }
  const parsed = parseInput(rhs).value;
  if (typeof parsed === 'number' || typeof parsed === 'boolean') {
    return (v) => {
      if (typeof v === 'string' && typeof parsed === 'number') {
        const pv = parseInput(v).value;
        if (op === '=' && typeof pv === 'number') return pv === parsed;
      }
      if (typeof v !== typeof parsed) return op === '<>';
      const r = compare(v, parsed);
      return { '=': r === 0, '<>': r !== 0, '<': r < 0, '>': r > 0, '<=': r <= 0, '>=': r >= 0 }[op];
    };
  }
  if (op === '=' || op === '<>') {
    const re = wildcard(rhs);
    return (v) => (v != null && typeof v !== 'object' && re.test(typeof v === 'number' ? general(v) : String(v))) === (op === '=');
  }
  return (v) => {
    if (typeof v !== 'string') return false;
    const r = compare(v, rhs);
    return { '<': r < 0, '>': r > 0, '<=': r <= 0, '>=': r >= 0 }[op];
  };
}

/** Indexes (into the flattened first range) where every range/criterion pair matches. */
function matchIndexes(pairs) {
  const ranges = pairs.map(([r]) => toRange(r).flat());
  const preds = pairs.map(([, c]) => criterion(c));
  const n = ranges[0].length;
  if (ranges.some((r) => r.length !== n)) throw err(E.VALUE);
  const out = [];
  for (let i = 0; i < n; i++) if (preds.every((p, k) => p(ranges[k][i]))) out.push(i);
  return out;
}

const pairsFrom = (args, start) => {
  const pairs = [];
  for (let i = start; i < args.length; i += 2) {
    if (args[i + 1] === MISSING && i + 1 >= args.length) throw err(E.VALUE);
    pairs.push([args[i], args[i + 1]]);
  }
  if (!pairs.length) throw err(E.VALUE);
  return pairs;
};

function roundDigits(x, d, mode) {
  const f = 10 ** d;
  const scaled = Number((Math.abs(x) * f).toPrecision(15));
  const r = mode === 'up' ? Math.ceil(scaled) : mode === 'down' ? Math.floor(scaled) : Math.round(scaled);
  return (Math.sign(x) * r) / f;
}

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
function variance(a, sample) {
  if (a.length < (sample ? 2 : 1)) throw err(E.DIV0);
  const m = mean(a);
  return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - (sample ? 1 : 0));
}

function lookupEq(a, b) {
  if (typeof b === 'string' && typeof a === 'string') return /[*?~]/.test(b) ? wildcard(b).test(a) : a.toLowerCase() === b.toLowerCase();
  return a === b || (a == null && b === '');
}

/** Position in a 1-D list. mode: 0 exact, 1 largest <= (sorted asc), -1 smallest >= (sorted desc). */
function findIndex(list, key, mode) {
  if (mode === 0) return list.findIndex((v) => lookupEq(v, key));
  let best = -1;
  for (let i = 0; i < list.length; i++) {
    const v = list[i];
    if (v == null || rank(v) !== rank(key)) continue;
    const c = compare(v, key);
    if (mode === 1) {
      if (c <= 0) best = i;
      else break;
    } else {
      if (c >= 0) best = i;
      else break;
    }
  }
  return best;
}

const dateOf = (v) => {
  const n = num(v);
  if (n < 0) throw err(E.NUM);
  return fromSerial(n);
};
const serialOf = (v) => Math.floor(num(v));

function addMonths(serial, months, endOfMonth) {
  const p = fromSerial(serial);
  let y = p.y, m = p.m + months;
  y += Math.floor((m - 1) / 12);
  m = ((((m - 1) % 12) + 12) % 12) + 1;
  const d = endOfMonth ? daysInMonth(y, m) : Math.min(p.d, daysInMonth(y, m));
  return toSerial(y, m, d);
}

const holidaysOf = (v) => new Set(v === MISSING ? [] : toRange(v).flat().filter((x) => typeof x === 'number').map(Math.floor));
const isWeekend = (s) => {
  const wd = fromSerial(s).wd;
  return wd === 0 || wd === 6;
};

const truthy = (args) => {
  const vals = [];
  for (const a of args) {
    if (a === MISSING) continue;
    if (isRange(a)) {
      for (const v of a.flat()) {
        if (isErr(v)) throw v;
        if (typeof v === 'number' || typeof v === 'boolean') vals.push(!!v);
      }
    } else vals.push(bool(a));
  }
  if (!vals.length) throw err(E.VALUE);
  return vals;
};

const SUBTOTAL_FN = { 1: 'AVERAGE', 2: 'COUNT', 3: 'COUNTA', 4: 'MAX', 5: 'MIN', 6: 'PRODUCT', 7: 'STDEV', 8: 'STDEVP', 9: 'SUM', 10: 'VAR', 11: 'VARP' };

export const FUNCS = {
  // ----- math -----
  SUM: (a) => numbers(a).reduce((s, v) => s + v, 0),
  PRODUCT: (a) => numbers(a).reduce((s, v) => s * v, 1),
  SUMSQ: (a) => numbers(a).reduce((s, v) => s + v * v, 0),
  SUMPRODUCT: (a) => {
    const rs = a.map((x) => toRange(x).flat());
    const n = rs[0].length;
    if (rs.some((r) => r.length !== n)) throw err(E.VALUE);
    let s = 0;
    for (let i = 0; i < n; i++) {
      let p = 1;
      for (const r of rs) {
        if (isErr(r[i])) throw r[i];
        p *= typeof r[i] === 'number' ? r[i] : 0;
      }
      s += p;
    }
    return s;
  },
  SUMIF: ([range, crit, sumRange]) => {
    const r = toRange(range).flat();
    const s = sumRange === MISSING ? r : toRange(sumRange).flat();
    const pred = criterion(crit);
    return r.reduce((acc, v, i) => (pred(v) && typeof s[i] === 'number' ? acc + s[i] : acc), 0);
  },
  SUMIFS: (a) => {
    const s = toRange(a[0]).flat();
    return matchIndexes(pairsFrom(a, 1)).reduce((acc, i) => (typeof s[i] === 'number' ? acc + s[i] : acc), 0);
  },
  AVERAGE: (a) => {
    const n = numbers(a);
    if (!n.length) throw err(E.DIV0);
    return mean(n);
  },
  AVERAGEA: (a) => {
    const n = flatAll(a).filter((v) => v != null && !isErr(v)).map((v) => (typeof v === 'number' ? v : typeof v === 'boolean' ? +v : 0));
    if (!n.length) throw err(E.DIV0);
    return mean(n);
  },
  AVERAGEIF: ([range, crit, avgRange]) => {
    const r = toRange(range).flat();
    const s = avgRange === MISSING ? r : toRange(avgRange).flat();
    const pred = criterion(crit);
    const n = r.map((v, i) => (pred(v) && typeof s[i] === 'number' ? s[i] : null)).filter((v) => v != null);
    if (!n.length) throw err(E.DIV0);
    return mean(n);
  },
  AVERAGEIFS: (a) => {
    const s = toRange(a[0]).flat();
    const n = matchIndexes(pairsFrom(a, 1)).map((i) => s[i]).filter((v) => typeof v === 'number');
    if (!n.length) throw err(E.DIV0);
    return mean(n);
  },
  COUNT: (a) => flatAll(a).filter((v) => typeof v === 'number').length,
  COUNTA: (a) => flatAll(a).filter((v) => v != null && v !== '').length,
  COUNTBLANK: (a) => flatAll(a).filter((v) => v == null || v === '').length,
  COUNTIF: ([range, crit]) => {
    const pred = criterion(crit);
    return toRange(range).flat().filter(pred).length;
  },
  COUNTIFS: (a) => matchIndexes(pairsFrom(a, 0)).length,
  MAX: (a) => { const n = numbers(a); return n.length ? Math.max(...n) : 0; },
  MIN: (a) => { const n = numbers(a); return n.length ? Math.min(...n) : 0; },
  MAXIFS: (a) => {
    const s = toRange(a[0]).flat();
    const n = matchIndexes(pairsFrom(a, 1)).map((i) => s[i]).filter((v) => typeof v === 'number');
    return n.length ? Math.max(...n) : 0;
  },
  MINIFS: (a) => {
    const s = toRange(a[0]).flat();
    const n = matchIndexes(pairsFrom(a, 1)).map((i) => s[i]).filter((v) => typeof v === 'number');
    return n.length ? Math.min(...n) : 0;
  },
  MEDIAN: (a) => {
    const n = numbers(a).sort((x, y) => x - y);
    if (!n.length) throw err(E.NUM);
    const h = n.length >> 1;
    return n.length % 2 ? n[h] : (n[h - 1] + n[h]) / 2;
  },
  MODE: (a) => {
    const n = numbers(a);
    const counts = new Map();
    let best = null, bestN = 1;
    for (const v of n) {
      const c = (counts.get(v) || 0) + 1;
      counts.set(v, c);
      if (c > bestN) { best = v; bestN = c; }
    }
    if (best == null) throw err(E.NA);
    return best;
  },
  STDEV: (a) => Math.sqrt(variance(numbers(a), true)),
  STDEVP: (a) => Math.sqrt(variance(numbers(a), false)),
  VAR: (a) => variance(numbers(a), true),
  VARP: (a) => variance(numbers(a), false),
  LARGE: ([r, k]) => {
    const n = numbers([r]).sort((x, y) => y - x);
    const i = int(k) - 1;
    if (i < 0 || i >= n.length) throw err(E.NUM);
    return n[i];
  },
  SMALL: ([r, k]) => {
    const n = numbers([r]).sort((x, y) => x - y);
    const i = int(k) - 1;
    if (i < 0 || i >= n.length) throw err(E.NUM);
    return n[i];
  },
  RANK: ([x, r, order]) => {
    const v = num(x);
    const n = numbers([r]);
    if (!n.includes(v)) throw err(E.NA);
    const asc = optNum(order, 0) !== 0;
    return n.filter((y) => (asc ? y < v : y > v)).length + 1;
  },
  PERCENTILE: ([r, k]) => {
    const n = numbers([r]).sort((x, y) => x - y);
    const p = num(k);
    if (!n.length || p < 0 || p > 1) throw err(E.NUM);
    const pos = (n.length - 1) * p;
    const lo = Math.floor(pos);
    return n[lo] + (n[Math.min(lo + 1, n.length - 1)] - n[lo]) * (pos - lo);
  },
  QUARTILE: ([r, q]) => FUNCS.PERCENTILE([r, int(q) / 4]),
  ROUND: ([x, d]) => roundDigits(num(x), int(opt(d, 0)), 'half'),
  ROUNDUP: ([x, d]) => roundDigits(num(x), int(opt(d, 0)), 'up'),
  ROUNDDOWN: ([x, d]) => roundDigits(num(x), int(opt(d, 0)), 'down'),
  TRUNC: ([x, d]) => roundDigits(num(x), int(opt(d, 0)), 'down'),
  INT: ([x]) => Math.floor(num(x)),
  MOD: ([x, d]) => {
    const n = num(x), m = num(d);
    if (m === 0) throw err(E.DIV0);
    return n - m * Math.floor(n / m);
  },
  QUOTIENT: ([x, d]) => {
    const m = num(d);
    if (m === 0) throw err(E.DIV0);
    return Math.trunc(num(x) / m);
  },
  POWER: ([x, y]) => finite(num(x) ** num(y)),
  SQRT: ([x]) => {
    const n = num(x);
    if (n < 0) throw err(E.NUM);
    return Math.sqrt(n);
  },
  ABS: ([x]) => Math.abs(num(x)),
  SIGN: ([x]) => Math.sign(num(x)),
  CEILING: ([x, s]) => {
    const n = num(x), sig = optNum(s, 1);
    if (sig === 0) return 0;
    return Number((Math.ceil(Number((n / sig).toPrecision(15))) * sig).toPrecision(15));
  },
  FLOOR: ([x, s]) => {
    const n = num(x), sig = optNum(s, 1);
    if (sig === 0) throw err(E.DIV0);
    return Number((Math.floor(Number((n / sig).toPrecision(15))) * sig).toPrecision(15));
  },
  MROUND: ([x, m]) => {
    const n = num(x), mul = num(m);
    if (mul === 0) return 0;
    if (Math.sign(n) * Math.sign(mul) < 0) throw err(E.NUM);
    return Number((Math.round(Number((n / mul).toPrecision(15))) * mul).toPrecision(15));
  },
  EVEN: ([x]) => {
    const n = num(x);
    const r = Math.ceil(Math.abs(n) / 2) * 2;
    return n < 0 ? -r : r;
  },
  ODD: ([x]) => {
    const n = num(x);
    let r = Math.ceil(Math.abs(n));
    if (r % 2 === 0) r += 1;
    return n < 0 ? -r : r;
  },
  EXP: ([x]) => finite(Math.exp(num(x))),
  LN: ([x]) => {
    const n = num(x);
    if (n <= 0) throw err(E.NUM);
    return Math.log(n);
  },
  LOG: ([x, b]) => {
    const n = num(x), base = optNum(b, 10);
    if (n <= 0 || base <= 0 || base === 1) throw err(E.NUM);
    return Math.log(n) / Math.log(base);
  },
  LOG10: ([x]) => {
    const n = num(x);
    if (n <= 0) throw err(E.NUM);
    return Math.log10(n);
  },
  PI: () => Math.PI,
  RAND: () => Math.random(),
  RANDBETWEEN: ([a, b]) => {
    const lo = Math.ceil(num(a)), hi = Math.floor(num(b));
    if (lo > hi) throw err(E.NUM);
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  },
  FACT: ([x]) => {
    const n = Math.floor(num(x));
    if (n < 0) throw err(E.NUM);
    let f = 1;
    for (let i = 2; i <= n; i++) f *= i;
    return finite(f);
  },
  GCD: (a) => {
    const g = (x, y) => (y ? g(y, x % y) : x);
    return numbers(a).map(Math.floor).reduce((s, v) => g(s, v), 0);
  },
  LCM: (a) => {
    const g = (x, y) => (y ? g(y, x % y) : x);
    return numbers(a).map(Math.floor).reduce((s, v) => (s && v ? (s * v) / g(s, v) : 0), 1);
  },
  SIN: ([x]) => Math.sin(num(x)),
  COS: ([x]) => Math.cos(num(x)),
  TAN: ([x]) => Math.tan(num(x)),
  RADIANS: ([x]) => (num(x) * Math.PI) / 180,
  DEGREES: ([x]) => (num(x) * 180) / Math.PI,
  SUBTOTAL: ([f, ...rest]) => {
    const name = SUBTOTAL_FN[int(f) % 100];
    if (!name) throw err(E.VALUE);
    return FUNCS[name](rest);
  },

  // ----- logical -----
  IF: (a) => {
    const c = bool(a[0]);
    if (c) return a.length > 1 ? opt(a[1], 0) : true;
    return a.length > 2 ? opt(a[2], 0) : false;
  },
  IFS: (a) => {
    for (let i = 0; i + 1 < a.length; i += 2) if (bool(a[i])) return opt(a[i + 1], 0);
    throw err(E.NA);
  },
  AND: (a) => truthy(a).every(Boolean),
  OR: (a) => truthy(a).some(Boolean),
  XOR: (a) => truthy(a).filter(Boolean).length % 2 === 1,
  NOT: ([x]) => !bool(x),
  TRUE: () => true,
  FALSE: () => false,
  IFERROR: ([v, alt]) => {
    try {
      return scalar(v) ?? 0;
    } catch {
      return opt(alt, 0);
    }
  },
  IFNA: ([v, alt]) => {
    const s = first(v);
    return isErr(s) && s.error === E.NA ? opt(alt, 0) : v;
  },
  SWITCH: (a) => {
    const key = scalar(a[0]);
    let i = 1;
    for (; i + 1 < a.length; i += 2) if (compare(key, scalar(a[i])) === 0 && rank(key) === rank(scalar(a[i]))) return a[i + 1];
    if (i < a.length) return a[i];
    throw err(E.NA);
  },

  // ----- information -----
  ISBLANK: ([v]) => first(v) == null,
  ISNUMBER: ([v]) => typeof first(v) === 'number',
  ISTEXT: ([v]) => typeof first(v) === 'string',
  ISNONTEXT: ([v]) => typeof first(v) !== 'string',
  ISLOGICAL: ([v]) => typeof first(v) === 'boolean',
  ISERROR: ([v]) => isErr(first(v)),
  ISERR: ([v]) => isErr(first(v)) && first(v).error !== E.NA,
  ISNA: ([v]) => isErr(first(v)) && first(v).error === E.NA,
  ISEVEN: ([v]) => Math.floor(Math.abs(num(v))) % 2 === 0,
  ISODD: ([v]) => Math.floor(Math.abs(num(v))) % 2 === 1,
  NA: () => err(E.NA),
  N: ([v]) => {
    const s = first(v);
    if (isErr(s)) throw s;
    return typeof s === 'number' ? s : s === true ? 1 : 0;
  },

  // ----- text -----
  CONCAT: (a) => flatAll(a).map((v) => text(v)).join(''),
  CONCATENATE: (a) => a.map((v) => text(opt(v, ''))).join(''),
  TEXTJOIN: ([d, ignore, ...rest]) => {
    const skip = bool(ignore);
    return flatAll(rest).map((v) => text(v)).filter((s) => !(skip && s === '')).join(text(d));
  },
  LEFT: ([t, n]) => {
    const k = optNum(n, 1);
    if (k < 0) throw err(E.VALUE);
    return text(t).slice(0, k);
  },
  RIGHT: ([t, n]) => {
    const k = optNum(n, 1);
    if (k < 0) throw err(E.VALUE);
    const s = text(t);
    return k ? s.slice(-k) : '';
  },
  MID: ([t, start, n]) => {
    const st = int(start), k = int(n);
    if (st < 1 || k < 0) throw err(E.VALUE);
    return text(t).substr(st - 1, k);
  },
  LEN: ([t]) => text(t).length,
  UPPER: ([t]) => text(t).toUpperCase(),
  LOWER: ([t]) => text(t).toLowerCase(),
  PROPER: ([t]) => text(t).toLowerCase().replace(/(^|[^a-zÀ-ɏ])([a-zÀ-ɏ])/g, (_, a, b) => a + b.toUpperCase()),
  TRIM: ([t]) => text(t).trim().replace(/ {2,}/g, ' '),
  CLEAN: ([t]) => text(t).replace(/[\x00-\x1F]/g, ''),
  SUBSTITUTE: ([t, oldT, newT, inst]) => {
    const s = text(t), o = text(oldT), nw = text(newT);
    if (!o) return s;
    if (inst === MISSING) return s.split(o).join(nw);
    const k = int(inst);
    if (k < 1) throw err(E.VALUE);
    let idx = -1;
    for (let i = 0; i < k; i++) {
      idx = s.indexOf(o, idx + 1);
      if (idx < 0) return s;
    }
    return s.slice(0, idx) + nw + s.slice(idx + o.length);
  },
  REPLACE: ([t, start, n, nw]) => {
    const s = text(t), st = int(start), k = int(n);
    if (st < 1 || k < 0) throw err(E.VALUE);
    return s.slice(0, st - 1) + text(nw) + s.slice(st - 1 + k);
  },
  FIND: ([f, within, start]) => {
    const st = optNum(start, 1);
    const i = text(within).indexOf(text(f), st - 1);
    if (st < 1 || i < 0) throw err(E.VALUE);
    return i + 1;
  },
  SEARCH: ([f, within, start]) => {
    const st = optNum(start, 1);
    const s = text(within);
    const pat = text(f);
    if (st < 1) throw err(E.VALUE);
    const re = new RegExp(wildcard(pat).source.slice(1, -1), 'i');
    const m = re.exec(s.slice(st - 1));
    if (!m) throw err(E.VALUE);
    return m.index + st;
  },
  REPT: ([t, n]) => {
    const k = int(n);
    if (k < 0 || k * text(t).length > 32767) throw err(E.VALUE);
    return text(t).repeat(k);
  },
  TEXT: ([v, f]) => {
    const s = scalar(v);
    const code = text(f);
    const val = typeof s === 'string' && typeof parseInput(s).value === 'number' ? parseInput(s).value : s;
    return formatValue(val ?? 0, code);
  },
  FIXED: ([v, d, noCommas]) => {
    const dec = int(opt(d, 2));
    const r = roundDigits(num(v), dec, 'half');
    const s = r.toFixed(Math.max(0, dec));
    return bool(opt(noCommas, false)) ? s : s.replace(/\B(?=(\d{3})+(?!\d))/g, ',').replace(/(\.\d*?),/g, '$1');
  },
  VALUE: ([t]) => {
    const s = scalar(t);
    if (typeof s === 'number') return s;
    const p = parseInput(text(s)).value;
    if (typeof p !== 'number') throw err(E.VALUE);
    return p;
  },
  EXACT: ([a, b]) => text(a) === text(b),
  CHAR: ([n]) => {
    const k = int(n);
    if (k < 1 || k > 65535) throw err(E.VALUE);
    return String.fromCharCode(k);
  },
  CODE: ([t]) => {
    const s = text(t);
    if (!s) throw err(E.VALUE);
    return s.charCodeAt(0);
  },
  TEXTBEFORE: ([t, d, inst]) => {
    const s = text(t), del = text(d), k = int(opt(inst, 1));
    const parts = s.split(del);
    if (k < 1 || parts.length <= k) throw err(E.NA);
    return parts.slice(0, k).join(del);
  },
  TEXTAFTER: ([t, d, inst]) => {
    const s = text(t), del = text(d), k = int(opt(inst, 1));
    const parts = s.split(del);
    if (k < 1 || parts.length <= k) throw err(E.NA);
    return parts.slice(k).join(del);
  },

  // ----- lookup & reference -----
  VLOOKUP: ([key, table, col, approx]) => {
    const k = scalar(key);
    const t = toRange(table);
    const ci = int(col) - 1;
    if (ci < 0) throw err(E.VALUE);
    if (ci >= t.w) throw err(E.REF);
    const i = findIndex(t.rows.map((r) => r[0]), k, bool(opt(approx, true)) ? 1 : 0);
    if (i < 0) throw err(E.NA);
    return t.rows[i][ci];
  },
  HLOOKUP: ([key, table, row, approx]) => {
    const k = scalar(key);
    const t = toRange(table);
    const ri = int(row) - 1;
    if (ri < 0) throw err(E.VALUE);
    if (ri >= t.h) throw err(E.REF);
    const i = findIndex(t.rows[0], k, bool(opt(approx, true)) ? 1 : 0);
    if (i < 0) throw err(E.NA);
    return t.rows[ri][i];
  },
  XLOOKUP: ([key, look, ret, notFound, matchMode, searchMode]) => {
    const k = scalar(key);
    const L = toRange(look), R = toRange(ret);
    const vertical = L.w === 1;
    const list = vertical ? L.rows.map((r) => r[0]) : L.rows[0];
    const mm = int(opt(matchMode, 0));
    const reverse = int(opt(searchMode, 1)) < 0;
    const order = list.map((_, i) => i);
    if (reverse) order.reverse();
    let found = -1;
    if (mm === 0 || mm === 2) {
      found = order.find((i) => (mm === 2 ? lookupEq(list[i], k) : list[i] != null && rank(list[i]) === rank(k) && compare(list[i], k) === 0)) ?? -1;
    } else {
      let bestDiff = null;
      for (const i of order) {
        const v = list[i];
        if (v == null || rank(v) !== rank(k)) continue;
        const c = compare(v, k);
        if (c === 0) { found = i; break; }
        if ((mm === -1 && c < 0) || (mm === 1 && c > 0)) {
          const better = bestDiff == null || (mm === -1 ? compare(v, list[bestDiff]) > 0 : compare(v, list[bestDiff]) < 0);
          if (better) bestDiff = i;
        }
      }
      if (found < 0 && bestDiff != null) found = bestDiff;
    }
    if (found < 0) {
      if (notFound !== MISSING) return notFound;
      throw err(E.NA);
    }
    if (vertical) {
      if (found >= R.h) throw err(E.VALUE);
      return R.w === 1 ? R.rows[found][0] : new Range([R.rows[found]], R.top + found, R.left);
    }
    if (found >= R.w) throw err(E.VALUE);
    return R.h === 1 ? R.rows[0][found] : new Range(R.rows.map((r) => [r[found]]), R.top, R.left + found);
  },
  INDEX: ([range, row, col]) => {
    const t = toRange(range);
    let r = int(opt(row, 0)), c = int(opt(col, 0));
    if (t.h === 1 && col === MISSING) { c = r; r = 1; }
    if (r < 0 || c < 0 || r > t.h || c > t.w) throw err(E.REF);
    if (r === 0 && c === 0) return t;
    if (r === 0) return new Range(t.rows.map((x) => [x[c - 1]]), t.top, t.left + c - 1);
    if (c === 0) {
      if (t.w === 1) return t.rows[r - 1][0];
      return new Range([t.rows[r - 1]], t.top + r - 1, t.left);
    }
    return t.rows[r - 1][c - 1];
  },
  MATCH: ([key, range, type]) => {
    const k = scalar(key);
    const t = toRange(range);
    if (t.h > 1 && t.w > 1) throw err(E.NA);
    const list = t.w === 1 ? t.rows.map((r) => r[0]) : t.rows[0];
    const i = findIndex(list, k, Math.sign(optNum(type, 1)));
    if (i < 0) throw err(E.NA);
    return i + 1;
  },
  CHOOSE: ([i, ...opts]) => {
    const k = int(i);
    if (k < 1 || k > opts.length) throw err(E.VALUE);
    return opt(opts[k - 1], 0);
  },
  ROW: ([ref], ctx) => (ref === MISSING ? ctx.r + 1 : toRange(ref).top + 1),
  COLUMN: ([ref], ctx) => (ref === MISSING ? ctx.c + 1 : toRange(ref).left + 1),
  ROWS: ([ref]) => toRange(ref).h,
  COLUMNS: ([ref]) => toRange(ref).w,

  // ----- date & time -----
  TODAY: () => todaySerial(),
  NOW: () => nowSerial(),
  DATE: ([y, m, d]) => {
    let yy = int(y);
    if (yy < 1900) yy += 1900;
    const s = toSerial(yy, int(m), int(d));
    if (s < 0) throw err(E.NUM);
    return s;
  },
  TIME: ([h, m, s]) => {
    const t = (int(h) * 3600 + int(m) * 60 + int(s)) / 86400;
    if (t < 0) throw err(E.NUM);
    return t - Math.floor(t);
  },
  YEAR: ([v]) => dateOf(v).y,
  MONTH: ([v]) => dateOf(v).m,
  DAY: ([v]) => dateOf(v).d,
  HOUR: ([v]) => dateOf(v).h,
  MINUTE: ([v]) => dateOf(v).mi,
  SECOND: ([v]) => dateOf(v).s,
  WEEKDAY: ([v, type]) => {
    const wd = dateOf(v).wd;
    const t = int(opt(type, 1));
    if (t === 1) return wd + 1;
    if (t === 2) return ((wd + 6) % 7) + 1;
    if (t === 3) return (wd + 6) % 7;
    throw err(E.NUM);
  },
  WEEKNUM: ([v, type]) => {
    const s = serialOf(v);
    const p = fromSerial(s);
    const jan1 = toSerial(p.y, 1, 1);
    const startDay = int(opt(type, 1)) === 2 ? 1 : 0;
    const offset = (fromSerial(jan1).wd - startDay + 7) % 7;
    return Math.floor((s - jan1 + offset) / 7) + 1;
  },
  DATEDIF: ([s, e, unit]) => {
    const a = serialOf(s), b = serialOf(e);
    if (a > b) throw err(E.NUM);
    const p = fromSerial(a), q = fromSerial(b);
    const months = (q.y - p.y) * 12 + (q.m - p.m) - (q.d < p.d ? 1 : 0);
    switch (text(unit).toUpperCase()) {
      case 'D': return b - a;
      case 'M': return months;
      case 'Y': return Math.floor(months / 12);
      case 'YM': return months % 12;
      case 'MD': return q.d >= p.d ? q.d - p.d : daysInMonth(q.m === 1 ? q.y - 1 : q.y, q.m === 1 ? 12 : q.m - 1) - p.d + q.d;
      case 'YD': {
        let start = toSerial(q.y, p.m, Math.min(p.d, daysInMonth(q.y, p.m)));
        if (start > b) start = toSerial(q.y - 1, p.m, Math.min(p.d, daysInMonth(q.y - 1, p.m)));
        return b - start;
      }
      default: throw err(E.NUM);
    }
  },
  DAYS: ([e, s]) => serialOf(e) - serialOf(s),
  EDATE: ([s, m]) => addMonths(serialOf(s), int(m), false),
  EOMONTH: ([s, m]) => addMonths(serialOf(s), int(m), true),
  NETWORKDAYS: ([s, e, hol]) => {
    let a = serialOf(s), b = serialOf(e);
    const sign = a <= b ? 1 : -1;
    if (sign < 0) [a, b] = [b, a];
    if (b - a > 100000) throw err(E.NUM);
    const h = holidaysOf(hol);
    let n = 0;
    for (let d = a; d <= b; d++) if (!isWeekend(d) && !h.has(d)) n++;
    return n * sign;
  },
  WORKDAY: ([s, days, hol]) => {
    let d = serialOf(s);
    let left = int(days);
    const step = left >= 0 ? 1 : -1;
    const h = holidaysOf(hol);
    if (Math.abs(left) > 100000) throw err(E.NUM);
    while (left !== 0) {
      d += step;
      if (!isWeekend(d) && !h.has(d)) left -= step;
    }
    return d;
  },
  DATEVALUE: ([t]) => {
    const p = parseInput(text(t)).value;
    if (typeof p !== 'number') throw err(E.VALUE);
    return Math.floor(p);
  },

  // ----- financial -----
  PMT: ([rate, nper, pv, fv, type]) => {
    const r = num(rate), n = num(nper), p = num(pv), f = optNum(fv, 0), t = optNum(type, 0) ? 1 : 0;
    if (n === 0) throw err(E.NUM);
    if (r === 0) return -(p + f) / n;
    const k = (1 + r) ** n;
    return -(r * (f + p * k)) / ((1 + r * t) * (k - 1));
  },
  FV: ([rate, nper, pmt, pv, type]) => {
    const r = num(rate), n = num(nper), m = num(pmt), p = optNum(pv, 0), t = optNum(type, 0) ? 1 : 0;
    if (r === 0) return -(p + m * n);
    const k = (1 + r) ** n;
    return -(p * k + (m * (1 + r * t) * (k - 1)) / r);
  },
  PV: ([rate, nper, pmt, fv, type]) => {
    const r = num(rate), n = num(nper), m = num(pmt), f = optNum(fv, 0), t = optNum(type, 0) ? 1 : 0;
    if (r === 0) return -(f + m * n);
    const k = (1 + r) ** n;
    return -(f + (m * (1 + r * t) * (k - 1)) / r) / k;
  },
  NPV: ([rate, ...vals]) => {
    const r = num(rate);
    return numbers(vals).reduce((s, v, i) => s + v / (1 + r) ** (i + 1), 0);
  },
};

// Excel aliases
Object.assign(FUNCS, {
  'STDEV.S': FUNCS.STDEV,
  'STDEV.P': FUNCS.STDEVP,
  'VAR.S': FUNCS.VAR,
  'VAR.P': FUNCS.VARP,
  'MODE.SNGL': FUNCS.MODE,
  'RANK.EQ': FUNCS.RANK,
  'PERCENTILE.INC': FUNCS.PERCENTILE,
  'QUARTILE.INC': FUNCS.QUARTILE,
  'CEILING.MATH': FUNCS.CEILING,
  'FLOOR.MATH': FUNCS.FLOOR,
});

export { isRange };

// Small, safe spreadsheet formula engine (no eval).
// Supports: numbers, "text", A1 refs, A1:B5 ranges, + - * / ^ &, comparisons,
// SUM AVERAGE MIN MAX COUNT ROUND ABS IF.

export const colName = (i) => {
  let s = '';
  for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

export function parseRef(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(ref.toUpperCase());
  if (!m) return null;
  let c = 0;
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
  return { c: c - 1, r: +m[2] - 1 };
}

const err = (code) => ({ error: code });
const isErr = (v) => v && typeof v === 'object' && 'error' in v;

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw err('#VALUE!');
      tokens.push({ t: 'num', v: parseFloat(m[0]) });
      i += m[0].length;
    } else if (ch === '"') {
      const end = src.indexOf('"', i + 1);
      if (end < 0) throw err('#VALUE!');
      tokens.push({ t: 'str', v: src.slice(i + 1, end) });
      i = end + 1;
    } else if (/[A-Za-z]/.test(ch)) {
      const m = /^[A-Za-z]+\d*/.exec(src.slice(i));
      tokens.push({ t: 'id', v: m[0].toUpperCase() });
      i += m[0].length;
    } else {
      const two = src.slice(i, i + 2);
      if (['<=', '>=', '<>'].includes(two)) { tokens.push({ t: 'op', v: two }); i += 2; }
      else if ('+-*/^&()=<>,:'.includes(ch)) { tokens.push({ t: 'op', v: ch }); i++; }
      else throw err('#VALUE!');
    }
  }
  return tokens;
}

const num = (v) => {
  if (isErr(v)) throw v;
  if (v === '' || v == null) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  if (Number.isNaN(n)) throw err('#VALUE!');
  return n;
};

// Like Excel: SUM/AVERAGE/MIN/MAX propagate an error found in their range; COUNT skips errors.
const numbers = (a) => {
  const flat = a.flat();
  const e = flat.find(isErr);
  if (e) throw e;
  return flat.filter((v) => typeof v === 'number');
};

const FUNCS = {
  SUM: (a) => numbers(a).reduce((s, v) => s + v, 0),
  AVERAGE: (a) => {
    const n = numbers(a);
    if (!n.length) throw err('#DIV/0!');
    return n.reduce((s, v) => s + v, 0) / n.length;
  },
  MIN: (a) => { const n = numbers(a); return n.length ? Math.min(...n) : 0; },
  MAX: (a) => { const n = numbers(a); return n.length ? Math.max(...n) : 0; },
  COUNT: (a) => a.flat().filter((v) => typeof v === 'number').length,
  ROUND: ([x, d = 0]) => { const p = 10 ** num(d); return Math.round(num(x) * p) / p; },
  ABS: ([x]) => Math.abs(num(x)),
  IF: ([c, a = true, b = false]) => (num(c) ? a : b),
};

/** Evaluate one formula (without the leading "="). getCell(ref) returns a cell's computed value. */
export function evaluate(src, getCell) {
  let tokens;
  try {
    tokens = tokenize(src);
  } catch (e) {
    return isErr(e) ? e : err('#VALUE!');
  }
  let p = 0;
  const peek = () => tokens[p];
  const take = (v) => (peek()?.v === v ? (p++, true) : false);
  const expect = (v) => { if (!take(v)) throw err('#VALUE!'); };

  const range = (a, b) => {
    const A = parseRef(a), B = parseRef(b);
    if (!A || !B) throw err('#REF!');
    const out = [];
    for (let r = Math.min(A.r, B.r); r <= Math.max(A.r, B.r); r++)
      for (let c = Math.min(A.c, B.c); c <= Math.max(A.c, B.c); c++) out.push(getCell(colName(c) + (r + 1)));
    return out;
  };

  const primary = () => {
    const tk = tokens[p++];
    if (!tk) throw err('#VALUE!');
    if (tk.t === 'num' || tk.t === 'str') return tk.v;
    if (tk.v === '(') { const v = comparison(); expect(')'); return v; }
    if (tk.t === 'id') {
      if (tk.v === 'TRUE' || tk.v === 'FALSE') return tk.v === 'TRUE';
      if (peek()?.v === '(') {
        p++;
        const fn = FUNCS[tk.v];
        if (!fn) throw err('#NAME?');
        const args = [];
        if (!take(')')) {
          do args.push(arg()); while (take(','));
          expect(')');
        }
        return fn(args);
      }
      if (!parseRef(tk.v)) throw err('#NAME?');
      const v = getCell(tk.v);
      if (isErr(v)) throw v;
      return v;
    }
    throw err('#VALUE!');
  };
  // Function arguments may be ranges.
  const arg = () => {
    if (peek()?.t === 'id' && tokens[p + 1]?.v === ':') {
      const a = tokens[p].v;
      p += 2;
      const b = tokens[p++]?.v;
      return range(a, b);
    }
    return comparison();
  };
  const unary = () => (take('-') ? -num(unary()) : take('+') ? num(unary()) : primary());
  const power = () => { const b = unary(); return take('^') ? num(b) ** num(power()) : b; };
  const term = () => {
    let v = power();
    for (;;) {
      if (take('*')) v = num(v) * num(power());
      else if (take('/')) { const d = num(power()); if (d === 0) throw err('#DIV/0!'); v = num(v) / d; }
      else return v;
    }
  };
  const additive = () => {
    let v = term();
    for (;;) {
      if (take('+')) v = num(v) + num(term());
      else if (take('-')) v = num(v) - num(term());
      else return v;
    }
  };
  const concat = () => {
    let v = additive();
    while (take('&')) v = `${v ?? ''}${additive() ?? ''}`;
    return v;
  };
  const comparison = () => {
    const a = concat();
    const op = peek()?.v;
    if (!['=', '<>', '<', '>', '<=', '>='].includes(op)) return a;
    p++;
    const b = concat();
    const [x, y] = typeof a === 'number' || typeof b === 'number' ? [num(a), num(b)] : [String(a), String(b)];
    return { '=': x === y, '<>': x !== y, '<': x < y, '>': x > y, '<=': x <= y, '>=': x >= y }[op];
  };

  try {
    const v = comparison();
    if (p < tokens.length) return err('#VALUE!');
    return v;
  } catch (e) {
    return isErr(e) ? e : err('#VALUE!');
  }
}

/** Compute every cell. cells: { A1: { v: '=SUM(B1:B3)' }, ... } → { A1: value | {error} } */
export function computeAll(cells) {
  const cache = {};
  const visiting = new Set();
  const get = (ref) => {
    if (ref in cache) return cache[ref];
    const raw = cells[ref]?.v ?? '';
    let val;
    if (typeof raw === 'string' && raw.startsWith('=')) {
      if (visiting.has(ref)) return err('#CYCLE!');
      visiting.add(ref);
      val = evaluate(raw.slice(1), get);
      visiting.delete(ref);
    } else if (raw !== '' && !Number.isNaN(Number(raw)) && /^\s*-?[\d.]+(e[+-]?\d+)?\s*$/i.test(raw)) {
      val = Number(raw);
    } else {
      val = raw;
    }
    cache[ref] = val;
    return val;
  };
  for (const ref of Object.keys(cells)) get(ref);
  return { values: cache, get };
}

export function display(v) {
  if (isErr(v)) return v.error;
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e10) / 1e10);
  return v ?? '';
}

export { isErr };

// Spreadsheet values: input parsing (numbers, %, currency, dates, times), Excel date serials
// and a formatter for the common subset of Excel number-format codes.

const DAY = 86400000;
const EPOCH = Date.UTC(1899, 11, 30); // Excel serial 0 (1900 date system; the 1900 leap-year bug is ignored)

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const toSerial = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - EPOCH) / DAY);

export function fromSerial(s) {
  const whole = Math.floor(s);
  const dt = new Date(EPOCH + whole * DAY);
  const secs = Math.round((s - whole) * 86400);
  return {
    y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay(),
    h: Math.floor(secs / 3600) % 24, mi: Math.floor((secs % 3600) / 60), s: secs % 60,
  };
}

export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function todaySerial() {
  const n = new Date();
  return toSerial(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

export function nowSerial() {
  const n = new Date();
  return todaySerial() + (n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()) / 86400;
}

// Presets offered in the toolbar (values are Excel format codes, exported as-is to .xlsx).
export const DATE_NF = 'dd-mmm-yyyy';
export const NUMBER_FORMATS = [
  { id: 'General', label: 'General' },
  { id: '#,##0.00', label: 'Number' },
  { id: '#,##0', label: 'Whole number' },
  { id: '"$"#,##0.00', label: 'Currency ($)' },
  { id: '"Rs "#,##0.00', label: 'Currency (Rs)' },
  { id: '0.00%', label: 'Percent' },
  { id: DATE_NF, label: 'Date' },
  { id: 'dd/mm/yyyy', label: 'Date (dd/mm/yyyy)' },
  { id: 'h:mm AM/PM', label: 'Time' },
  { id: 'dd-mmm-yyyy h:mm', label: 'Date & time' },
  { id: '0.00E+00', label: 'Scientific' },
  { id: '@', label: 'Text' },
];

// ---------- input parsing ----------

const monthIndex = (name) => {
  const n = name.toLowerCase();
  if (n.length < 3) return -1;
  return MONTHS.findIndex((m) => m.toLowerCase().startsWith(n) && (n.length === 3 || m.toLowerCase() === n || n === 'sept'));
};

const fullYear = (y) => (y.length === 2 ? (+y < 30 ? 2000 + +y : 1900 + +y) : +y);

function validDate(y, m, d) {
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m) && y >= 1900 && y <= 9999;
}

function parseTime(s) {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|a|p)?$/i.exec(s);
  if (!m) return null;
  let h = +m[1];
  const mi = +m[2], sec = +(m[3] || 0);
  if (m[4]) {
    if (h < 1 || h > 12) return null;
    const pm = /^p/i.test(m[4]);
    h = (h % 12) + (pm ? 12 : 0);
  }
  if (h > 23 || mi > 59 || sec > 59) return null;
  return { value: (h * 3600 + mi * 60 + sec) / 86400, ampm: !!m[4], secs: !!m[3] };
}

/** Parse a date (optionally with a time). Day-first for numeric dates (18/10/2026). */
export function parseDate(s) {
  s = s.trim();
  let m, y, mo, d, rest = '';
  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](.+))?$/.exec(s))) [y, mo, d, rest] = [+m[1], +m[2], +m[3], m[4] || ''];
  else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?:\s+(.+))?$/.exec(s))) [d, mo, y, rest] = [+m[1], +m[2], fullYear(m[3]), m[4] || ''];
  else if ((m = /^(\d{1,2})[\s-]([A-Za-z]{3,9})\.?[\s,-]+(\d{4}|\d{2})(?:\s+(.+))?$/.exec(s))) [d, mo, y, rest] = [+m[1], monthIndex(m[2]) + 1, fullYear(m[3]), m[4] || ''];
  else if ((m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})(?:\s+(.+))?$/.exec(s))) [mo, d, y, rest] = [monthIndex(m[1]) + 1, +m[2], +m[3], m[4] || ''];
  else return null;
  if (!validDate(y, mo, d)) return null;
  let t = 0;
  if (rest) {
    const tm = parseTime(rest);
    if (!tm) return null;
    t = tm.value;
  }
  return { value: toSerial(y, mo, d) + t, nf: t ? 'dd-mmm-yyyy h:mm' : DATE_NF };
}

const decimalsOf = (s) => (s.includes('.') ? s.split('.')[1].length : 0);
const zeros = (n) => (n ? '.' + '0'.repeat(n) : '');

/**
 * Interpret what a user typed into a cell.
 * Returns { value } where value is number | boolean | string | null, plus an `nf`
 * (number format) when the input implies one (e.g. "12%", "$1,200", "18/10/2026").
 */
export function parseInput(raw) {
  if (raw == null) return { value: null };
  const str = String(raw);
  if (str === '') return { value: null };
  if (str[0] === "'") return { value: str.slice(1) }; // leading apostrophe forces text
  const s = str.trim();
  let m;
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return { value: Number(s) };
  if ((m = /^([+-]?)(\d{1,3}(?:,\d{3})+)(\.\d+)?$/.exec(s))) return { value: Number(m[1] + m[2].replace(/,/g, '') + (m[3] || '')), nf: '#,##0' + zeros(decimalsOf(m[3] || '')) };
  if ((m = /^([+-]?(?:\d+\.?\d*|\.\d+))\s*%$/.exec(s))) return { value: Number(m[1]) / 100, nf: '0' + zeros(Math.min(decimalsOf(m[1]), 4)) + '%' };
  if ((m = /^([+-]?)\s*(\$|Rs\.?|PKR|€|£)\s?(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)$/i.exec(s))) {
    const sym = m[2].toUpperCase().startsWith('R') || m[2].toUpperCase() === 'PKR' ? 'Rs ' : m[2];
    return { value: Number(m[1] + m[3].replace(/,/g, '')), nf: `"${sym}"#,##0.00` };
  }
  if (/^(true|false)$/i.test(s)) return { value: /^true$/i.test(s) };
  const dt = parseDate(s);
  if (dt) return dt;
  const tm = parseTime(s);
  if (tm) return { value: tm.value, nf: (tm.secs ? 'h:mm:ss' : 'h:mm') + (tm.ampm ? ' AM/PM' : '') };
  return { value: str };
}

// ---------- formatting ----------

export function general(v) {
  if (!Number.isFinite(v)) return '#NUM!';
  if (Number.isInteger(v) && Math.abs(v) < 1e15) return String(v);
  const a = Math.abs(v);
  if (a >= 1e11 || (a < 1e-9 && a !== 0)) {
    const [mant, exp] = v.toExponential(5).split('e');
    return `${mant.replace(/\.?0+$/, '')}E${exp[0] === '-' ? '-' : '+'}${exp.replace(/[+-]/, '').padStart(2, '0')}`;
  }
  return String(Number(v.toPrecision(10)));
}

function splitSections(code) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '"') q = !q;
    if (ch === '\\' && !q) { cur += ch + (code[++i] ?? ''); continue; }
    if (ch === ';' && !q) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

// Drop colour/condition tags, padding (_x) and fill (*x) directives we don't render.
const cleanSection = (sec) => sec.replace(/\[[^\]]*\]/g, '').replace(/_./g, ' ').replace(/\*./g, '');

const unquote = (s) => s.replace(/"([^"]*)"|\\(.)/g, (_, a, b) => a ?? b);

export function isDateFormat(code) {
  if (!code || /^general$/i.test(code)) return false;
  const s = cleanSection(splitSections(code)[0]).replace(/"[^"]*"|\\./g, '');
  return /[dmyhs]/i.test(s) && !/[0#?]/.test(s);
}

function roundTo(x, d) {
  const r = Math.round(Number(Number(`${x}e${d}`).toPrecision(15)));
  return Number(`${r}e-${d}`);
}

function formatNumber(val, sec, neg) {
  const numRe = /[0#?][0#?,]*(?:\.[0#?]*)?|\.[0#?]+/;
  const m = numRe.exec(sec.replace(/"[^"]*"|\\./g, (x) => '\u0000'.repeat(x.length)));
  if (!m) return (neg ? '-' : '') + unquote(sec);
  const pre = unquote(sec.slice(0, m.index));
  let post = sec.slice(m.index + m[0].length);
  const pat = m[0];
  if ((pre + post).includes('%')) val *= 100 ** ((pre + post).match(/%/g) || []).length;

  const [intPat, decPat = ''] = pat.split('.');
  const minDec = (decPat.match(/0/g) || []).length;
  const maxDec = (decPat.match(/[0#?]/g) || []).length;

  // Scientific: 0.00E+00
  const sci = /^E([+-])(0+)/i.exec(post);
  if (sci) {
    post = post.slice(sci[0].length);
    let [mant, exp] = val.toExponential(maxDec).split('e');
    const e = Number(exp);
    return `${neg ? '-' : ''}${pre}${mant}E${e < 0 ? '-' : sci[1] === '+' ? '+' : ''}${String(Math.abs(e)).padStart(sci[2].length, '0')}${unquote(post)}`;
  }

  let s = roundTo(val, maxDec).toFixed(maxDec);
  if (maxDec > minDec) s = s.replace(new RegExp(`0{1,${maxDec - minDec}}$`), '').replace(/\.$/, minDec ? '.' : '');
  let [ip, dp] = s.split('.');
  const minInt = (intPat.match(/0/g) || []).length;
  if (ip === '0' && minInt === 0) ip = '';
  ip = ip.padStart(minInt, '0');
  if (/[0#?],[0#?]/.test(intPat)) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = ip + (dp !== undefined && dp !== '' ? '.' + dp : maxDec && minDec ? '' : '');
  return `${neg ? '-' : ''}${pre}${body || '0'}${unquote(post)}`;
}

function formatDate(serial, sec) {
  const p = fromSerial(serial);
  const tokens = sec.match(/"[^"]*"|\\.|yyyy|yy|mmmmm|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|AM\/PM|am\/pm|A\/P|a\/p|./gi) || [];
  const ampm = tokens.some((t) => /^(am\/pm|a\/p)$/i.test(t));
  const isH = (t) => /^h+$/i.test(t);
  const isS = (t) => /^s+$/i.test(t);
  const isCode = (t) => /^(y+|m+|d+|h+|s+)$/i.test(t);
  const out = tokens.map((t, i) => {
    const lt = t.toLowerCase();
    if (t[0] === '"') return t.slice(1, -1);
    if (t[0] === '\\') return t[1];
    if (lt === 'yyyy') return String(p.y);
    if (lt === 'yy') return String(p.y).slice(-2);
    if (lt === 'm' || lt === 'mm') {
      // minutes when right after hours or right before seconds
      let prev = i - 1;
      while (prev >= 0 && !isCode(tokens[prev])) prev--;
      let next = i + 1;
      while (next < tokens.length && !isCode(tokens[next])) next++;
      if ((prev >= 0 && isH(tokens[prev])) || (next < tokens.length && isS(tokens[next]))) return lt === 'mm' ? String(p.mi).padStart(2, '0') : String(p.mi);
      return lt === 'mm' ? String(p.m).padStart(2, '0') : String(p.m);
    }
    if (lt === 'mmm') return MONTHS[p.m - 1].slice(0, 3);
    if (lt === 'mmmm') return MONTHS[p.m - 1];
    if (lt === 'mmmmm') return MONTHS[p.m - 1][0];
    if (lt === 'd') return String(p.d);
    if (lt === 'dd') return String(p.d).padStart(2, '0');
    if (lt === 'ddd') return WEEKDAYS[p.wd].slice(0, 3);
    if (lt === 'dddd') return WEEKDAYS[p.wd];
    if (lt === 'h' || lt === 'hh') {
      const h = ampm ? p.h % 12 || 12 : p.h;
      return lt === 'hh' ? String(h).padStart(2, '0') : String(h);
    }
    if (lt === 's') return String(p.s);
    if (lt === 'ss') return String(p.s).padStart(2, '0');
    if (lt === 'am/pm') return p.h < 12 ? 'AM' : 'PM';
    if (lt === 'a/p') return p.h < 12 ? 'A' : 'P';
    return t;
  });
  return out.join('');
}

/** Format a computed value with an Excel number-format code. */
export function formatValue(v, code) {
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'object' && 'error' in v) return v.error;
  if (typeof v !== 'number') {
    const sections = code ? splitSections(code) : [];
    const textSec = sections.find((s) => s.includes('@'));
    return textSec ? unquote(cleanSection(textSec)).replace('@', v) : String(v);
  }
  if (!code || /^general$/i.test(code) || code === '@') return general(v);
  const sections = splitSections(code);
  let sec = sections[0];
  let val = v;
  let neg = v < 0;
  if (v < 0 && sections[1] != null && sections[1] !== '') { sec = sections[1]; val = -v; neg = false; }
  else if (v === 0 && sections[2] != null && sections[2] !== '') sec = sections[2];
  else if (v < 0) val = -v;
  sec = cleanSection(sec);
  if (/^general$/i.test(sec.trim())) return (neg ? '-' : '') + general(val);
  try {
    if (isDateFormat(sec)) return val < 0 || val > 2958465 ? '#VALUE!' : formatDate(val, sec);
    return formatNumber(val, sec, neg);
  } catch {
    return general(v);
  }
}

/** Add (+1) or remove (-1) a decimal place from a number format. */
export function changeDecimals(code, delta) {
  if (!code || /^general$/i.test(code) || code === '@' || isDateFormat(code)) return delta > 0 ? '0.0' : '0';
  return splitSections(code)
    .map((sec) =>
      sec.replace(/([0#?][0#?,]*)(\.([0#?]*))?/, (all, ip, _d, dp = '') => {
        const n = Math.max(0, dp.length + delta);
        return ip + (n ? '.' + '0'.repeat(n) : '');
      })
    )
    .join(';');
}

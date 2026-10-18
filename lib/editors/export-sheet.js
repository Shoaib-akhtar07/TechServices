// Spreadsheet import/export. Exports run on the server (app/api/editor/export); imports run in the browser.
import { computeWorkbook, colName, parseRef, refName, isErr, ERRORS } from './formula';
import { formatValue, toSerial, NUMBER_FORMATS } from './numfmt';
import { effectiveFormat, usedRange, newSheet, DEFAULT_COL_W } from './sheet-model';

// Functions newer than Excel 2007 must be stored with the _xlfn. prefix or Excel shows #NAME?.
const XLFN = ['XLOOKUP', 'IFS', 'SWITCH', 'CONCAT', 'TEXTJOIN', 'MAXIFS', 'MINIFS', 'XOR', 'IFNA', 'DAYS', 'STDEV.S', 'STDEV.P', 'VAR.S', 'VAR.P', 'MODE.SNGL', 'RANK.EQ', 'PERCENTILE.INC', 'QUARTILE.INC', 'CEILING.MATH', 'FLOOR.MATH', 'TEXTBEFORE', 'TEXTAFTER'];
const XLFN_RE = new RegExp(`(?<![A-Za-z0-9_.])(${XLFN.map((f) => f.replace('.', '\\.')).join('|')})(?=\\s*\\()`, 'gi');
const EXCEL_ERRORS = new Set(['#N/A', '#REF!', '#VALUE!', '#DIV/0!', '#NAME?', '#NUM!', '#NULL!']);

const toExcelFormula = (f) => f.split(/("(?:[^"]|"")*")/).map((p, i) => (i % 2 ? p : p.replace(XLFN_RE, (m) => `_xlfn.${m.toUpperCase()}`))).join('');
const fromExcelFormula = (f) => f.replace(/_xlfn\.|_xlws\./gi, '');
const argb = (hex) => 'FF' + hex.slice(1).toUpperCase();
const hexOf = (c) => (c?.argb && /^[0-9A-F]{8}$/i.test(c.argb) ? '#' + c.argb.slice(2).toLowerCase() : undefined);

export async function toXlsx(wb, title = 'Workbook') {
  const ExcelJS = (await import('exceljs')).default;
  const values = computeWorkbook(wb);
  const book = new ExcelJS.Workbook();
  book.creator = 'NexPDF';
  book.title = title;
  wb.sheets.forEach((sheet, si) => {
    const ws = book.addWorksheet(sheet.name.slice(0, 31) || `Sheet${si + 1}`);
    for (const [ref, cell] of Object.entries(sheet.cells)) {
      const xc = ws.getCell(ref);
      const raw = cell.v;
      const v = values[si][ref];
      if (raw !== '' && raw != null) {
        if (typeof raw === 'string' && raw[0] === '=' && raw.length > 1) {
          const result = isErr(v) ? { error: EXCEL_ERRORS.has(v.error) ? v.error : ERRORS.REF } : v;
          xc.value = { formula: toExcelFormula(raw.slice(1)), result };
        } else xc.value = typeof v === 'number' || typeof v === 'boolean' ? v : v == null ? null : String(v);
      }
      const font = {};
      if (cell.b) font.bold = true;
      if (cell.i) font.italic = true;
      if (cell.u) font.underline = true;
      if (cell.fg) font.color = { argb: argb(cell.fg) };
      if (Object.keys(font).length) xc.font = font;
      if (cell.al) xc.alignment = { horizontal: cell.al };
      if (cell.bg) xc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(cell.bg) } };
      const nf = effectiveFormat(cell);
      if (nf && nf !== 'General') xc.numFmt = nf;
    }
    for (const [c, w] of Object.entries(sheet.colW || {})) ws.getColumn(+c + 1).width = Math.max(2, Math.round((w / 7) * 10) / 10);
  });
  const buf = await book.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function displayOf(sheet, vals, ref) {
  const v = vals[ref];
  return formatValue(v, effectiveFormat(sheet.cells[ref]));
}

export function toCsv(wb, si = wb.active || 0) {
  const sheet = wb.sheets[si];
  const vals = computeWorkbook(wb)[si];
  const { rows, cols } = usedRange(sheet.cells);
  const esc = (s) => (/[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) row.push(esc(displayOf(sheet, vals, refName(r, c))));
    lines.push(row.join(','));
  }
  // BOM so Excel opens UTF-8 (e.g. Urdu text) correctly.
  return new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
}

const rgbHex = (rgb, hex) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);

export async function toSheetPdf(wb, title = 'Workbook') {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const values = computeWorkbook(wb);
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator('NexPDF');
  const F = {
    r: await doc.embedFont(StandardFonts.Helvetica),
    b: await doc.embedFont(StandardFonts.HelveticaBold),
    i: await doc.embedFont(StandardFonts.HelveticaOblique),
    bi: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const ok = new Map();
  const safe = (s, f) =>
    [...s]
      .map((ch) => {
        if (!ok.has(ch)) {
          try { f.widthOfTextAtSize(ch, 10); ok.set(ch, true); } catch { ok.set(ch, false); }
        }
        return ok.get(ch) ? ch : '?';
      })
      .join('');
  const M = 36, baseSize = 9, pad = 4, baseRowH = 16;
  const sheets = wb.sheets.map((s, si) => ({ s, si, used: usedRange(s.cells) })).filter((x) => x.used.rows);
  if (!sheets.length) doc.addPage([595.28, 841.89]);

  for (const { s, si, used } of sheets) {
    const vals = values[si];
    const colW = Array.from({ length: used.cols }, (_, c) => (s.colW?.[c] ?? DEFAULT_COL_W) * 0.75);
    const total = colW.reduce((a, b) => a + b, 0);
    const landscape = total > 595.28 - 2 * M;
    const [W, H] = landscape ? [841.89, 595.28] : [595.28, 841.89];
    const scale = Math.min(1, (W - 2 * M) / total);
    const size = baseSize * Math.max(scale, 0.6);
    const rowH = baseRowH * Math.max(scale, 0.6);
    let page, y;
    const newPage = () => {
      page = doc.addPage([W, H]);
      y = H - M;
      if (sheets.length > 1) {
        page.drawText(safe(s.name, F.b), { x: M, y: y - 12, size: 12, font: F.b, color: rgb(0.2, 0.2, 0.3) });
        y -= 22;
      }
    };
    newPage();
    for (let r = 0; r < used.rows; r++) {
      if (y - rowH < M) newPage();
      let x = M;
      for (let c = 0; c < used.cols; c++) {
        const ref = refName(r, c);
        const cell = s.cells[ref];
        const w = colW[c] * scale;
        if (cell?.bg) page.drawRectangle({ x, y: y - rowH, width: w, height: rowH, color: rgbHex(rgb, cell.bg) });
        page.drawRectangle({ x, y: y - rowH, width: w, height: rowH, borderColor: rgb(0.82, 0.84, 0.88), borderWidth: 0.5 });
        const v = vals[ref];
        const f = F[(cell?.b ? 'b' : '') + (cell?.i ? 'i' : '') || 'r'];
        let t = safe(displayOf(s, vals, ref), f);
        while (t && f.widthOfTextAtSize(t, size) > w - pad * 2) t = t.slice(0, -1);
        if (t) {
          const tw = f.widthOfTextAtSize(t, size);
          const al = cell?.al || (typeof v === 'number' ? 'right' : typeof v === 'boolean' || isErr(v) ? 'center' : 'left');
          const tx = al === 'right' ? x + w - pad - tw : al === 'center' ? x + (w - tw) / 2 : x + pad;
          page.drawText(t, { x: tx, y: y - rowH + (rowH - size) / 2 + 1.5, size, font: f, color: cell?.fg ? rgbHex(rgb, cell.fg) : rgb(0.1, 0.1, 0.12) });
          if (cell?.u) page.drawLine({ start: { x: tx, y: y - rowH + (rowH - size) / 2 }, end: { x: tx + tw, y: y - rowH + (rowH - size) / 2 }, thickness: 0.5 });
        }
        x += w;
      }
      y -= rowH;
    }
  }
  return new Blob([await doc.save()], { type: 'application/pdf' });
}

// ---------- import (browser) ----------
const KNOWN_NF = new Set(NUMBER_FORMATS.map((f) => f.id));

/** Read every sheet of an .xlsx file into a workbook. */
export async function fromXlsx(file) {
  const ExcelJS = (await import('exceljs')).default;
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await file.arrayBuffer());
  const sheets = [];
  book.eachSheet((ws) => {
    if (sheets.length >= 50) return;
    const cells = {};
    ws.eachRow({ includeEmpty: false }, (row) =>
      row.eachCell({ includeEmpty: true }, (xc) => {
        if (!parseRef(xc.address)) return;
        const cell = {};
        const v = xc.value;
        if (xc.type === ExcelJS.ValueType.Formula || (v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v))) {
          const f = xc.formula;
          cell.v = f ? '=' + fromExcelFormula(f) : String(v?.result ?? '');
        } else if (v instanceof Date) {
          const d = new Date(v);
          cell.v = String(toSerial(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) + (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds()) / 86400);
          cell.nf = xc.numFmt && !/^general$/i.test(xc.numFmt) ? xc.numFmt : 'dd-mmm-yyyy';
        } else if (v && typeof v === 'object' && 'richText' in v) cell.v = v.richText.map((t) => t.text).join('');
        else if (v && typeof v === 'object' && 'text' in v) cell.v = String(v.text);
        else if (v && typeof v === 'object' && 'error' in v) cell.v = String(v.error);
        else if (typeof v === 'boolean') cell.v = v ? 'TRUE' : 'FALSE';
        else cell.v = v == null ? '' : typeof v === 'string' && /^[=']/.test(v) ? `'${v}` : String(v);
        const font = xc.font || {};
        if (font.bold) cell.b = true;
        if (font.italic) cell.i = true;
        if (font.underline) cell.u = true;
        const fg = hexOf(font.color);
        if (fg && fg !== '#000000') cell.fg = fg;
        const bg = xc.fill?.type === 'pattern' && xc.fill.pattern === 'solid' ? hexOf(xc.fill.fgColor) : undefined;
        if (bg && bg !== '#ffffff') cell.bg = bg;
        const al = xc.alignment?.horizontal;
        if (['left', 'center', 'right'].includes(al)) cell.al = al;
        if (!cell.nf && xc.numFmt && !/^general$/i.test(xc.numFmt)) cell.nf = KNOWN_NF.has(xc.numFmt) ? xc.numFmt : xc.numFmt.slice(0, 99);
        if (cell.v !== '' || Object.keys(cell).length > 1) cells[xc.address] = { v: cell.v ?? '', ...cell };
      })
    );
    const colW = {};
    (ws.columns || []).forEach((col, i) => {
      if (col?.width && i < 260) colW[i] = Math.round(col.width * 7);
    });
    sheets.push({ ...newSheet(ws.name.slice(0, 31), cells), colW });
  });
  if (!sheets.length) sheets.push(newSheet('Sheet1'));
  return { sheets, active: 0 };
}

export async function fromCsv(file) {
  const text = (await file.text()).replace(/^﻿/, '');
  const delim = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const cells = {};
  let r = 0, c = 0, field = '', q = false;
  const push = () => {
    if (field !== '') cells[colName(c) + (r + 1)] = { v: /^=/.test(field) ? `'${field}` : field };
    field = '';
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { push(); c++; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      push();
      r++;
      c = 0;
    } else field += ch;
  }
  push();
  return { sheets: [newSheet(file.name.replace(/\.[^.]+$/, '').slice(0, 31) || 'Sheet1', cells)], active: 0 };
}

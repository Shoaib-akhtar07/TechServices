'use client';
// Spreadsheet import/export: .xlsx (exceljs), .csv and .pdf (pdf-lib).
import { colName, parseRef, display, isErr } from './formula';

/** Bounding box of non-empty cells. */
export function usedRange(cells) {
  let maxR = 0, maxC = 0;
  for (const [ref, cell] of Object.entries(cells)) {
    if (cell?.v === '' || cell?.v == null) continue;
    const p = parseRef(ref);
    maxR = Math.max(maxR, p.r + 1);
    maxC = Math.max(maxC, p.c + 1);
  }
  return { rows: maxR, cols: maxC };
}

export async function toXlsx(cells, values, sheetName = 'Sheet1') {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NexPDF';
  const ws = wb.addWorksheet(sheetName.slice(0, 31) || 'Sheet1');
  const widths = {};
  for (const [ref, cell] of Object.entries(cells)) {
    const raw = cell?.v;
    if (raw === '' || raw == null) continue;
    const xc = ws.getCell(ref);
    const v = values[ref];
    if (String(raw).startsWith('=')) xc.value = { formula: String(raw).slice(1), result: isErr(v) ? { error: v.error } : v };
    else xc.value = typeof v === 'number' ? v : String(raw);
    if (cell.b) xc.font = { bold: true };
    const c = parseRef(ref).c;
    widths[c] = Math.max(widths[c] || 10, display(v).length + 2);
  }
  for (const [c, w] of Object.entries(widths)) ws.getColumn(+c + 1).width = Math.min(50, w);
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function toCsv(cells, values) {
  const { rows, cols } = usedRange(cells);
  const esc = (s) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) row.push(esc(display(values[colName(c) + (r + 1)])));
    lines.push(row.join(','));
  }
  // BOM so Excel opens UTF-8 (e.g. Urdu text) correctly.
  return new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
}

export async function toSheetPdf(cells, values, title) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const { rows, cols } = usedRange(cells);
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const size = 9, pad = 4, rowH = 18, M = 36;
  const safe = (s, f) => [...s].map((ch) => { try { f.widthOfTextAtSize(ch, size); return ch; } catch { return '?'; } }).join('');

  // Column widths from content, then pick orientation.
  const colW = [];
  for (let c = 0; c < cols; c++) {
    let w = 30;
    for (let r = 0; r < rows; r++) w = Math.max(w, font.widthOfTextAtSize(safe(display(values[colName(c) + (r + 1)]), font), size) + pad * 2);
    colW.push(Math.min(w, 220));
  }
  const total = colW.reduce((a, b) => a + b, 0);
  const landscape = total > 595 - 2 * M;
  const [W, H] = landscape ? [841.89, 595.28] : [595.28, 841.89];
  const scale = Math.min(1, (W - 2 * M) / Math.max(total, 1));

  let page, y;
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  newPage();
  for (let r = 0; r < rows; r++) {
    if (y - rowH < M) newPage();
    let x = M;
    for (let c = 0; c < cols; c++) {
      const ref = colName(c) + (r + 1);
      const w = colW[c] * scale;
      page.drawRectangle({ x, y: y - rowH, width: w, height: rowH, borderColor: rgb(0.8, 0.8, 0.85), borderWidth: 0.5 });
      const f = cells[ref]?.b ? bold : font;
      let text = safe(display(values[ref]), f);
      while (text && f.widthOfTextAtSize(text, size * scale) > w - pad * 2) text = text.slice(0, -1);
      const v = values[ref];
      const tw = f.widthOfTextAtSize(text, size * scale);
      const tx = typeof v === 'number' ? x + w - pad - tw : x + pad; // numbers right-aligned
      page.drawText(text, { x: tx, y: y - rowH + 6, size: size * scale, font: f, color: rgb(0.1, 0.1, 0.12) });
      x += w;
    }
    y -= rowH;
  }
  return new Blob([await doc.save()], { type: 'application/pdf' });
}

/** Read the first sheet of an .xlsx file into our cell model. */
export async function fromXlsx(file) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  const cells = {};
  if (!ws) return cells;
  ws.eachRow({ includeEmpty: false }, (row) =>
    row.eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value;
      let raw;
      if (v && typeof v === 'object' && 'formula' in v) raw = `=${v.formula}`;
      else if (v && typeof v === 'object' && 'richText' in v) raw = v.richText.map((t) => t.text).join('');
      else if (v && typeof v === 'object' && 'text' in v) raw = String(v.text);
      else if (v instanceof Date) raw = v.toISOString().slice(0, 10);
      else raw = v == null ? '' : String(v);
      cells[cell.address] = { v: raw, ...(cell.font?.bold ? { b: true } : {}) };
    })
  );
  return cells;
}

export async function fromCsv(file) {
  const text = (await file.text()).replace(/^﻿/, '');
  const cells = {};
  let r = 0, c = 0, field = '', q = false;
  const push = () => { if (field !== '') cells[colName(c) + (r + 1)] = { v: field }; field = ''; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { push(); c++; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; push(); r++; c = 0; }
    else field += ch;
  }
  push();
  return cells;
}

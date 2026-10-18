import 'server-only';
// Server-side processors for Pro tools. Each receives
// (files: { name, bytes: Uint8Array }[], options) and returns { name, bytes, mime, info? }.

import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';
import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';

const require = createRequire(import.meta.url);
const run = promisify(execFile);
const baseName = (n) => n.replace(/\.[^.]+$/, '');

export class UserError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ---------- pdf.js in Node (rendering via @napi-rs/canvas) ----------
let pdfjsPromise;
async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const canvas = require('@napi-rs/canvas');
      // pdf.js expects these browser globals when rendering.
      globalThis.DOMMatrix ??= canvas.DOMMatrix;
      globalThis.Path2D ??= canvas.Path2D;
      globalThis.ImageData ??= canvas.ImageData;
      return require('pdfjs-dist/legacy/build/pdf.js');
    })();
  }
  return pdfjsPromise;
}

class NodeCanvasFactory {
  create(w, h) {
    const { createCanvas } = require('@napi-rs/canvas');
    const canvas = createCanvas(Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)));
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(cc, w, h) {
    cc.canvas.width = Math.floor(w);
    cc.canvas.height = Math.floor(h);
  }
  destroy(cc) {
    cc.canvas.width = 0;
    cc.canvas.height = 0;
    cc.canvas = null;
    cc.context = null;
  }
}

async function openPdf(bytes, password) {
  const pdfjs = await getPdfjs();
  const dir = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + path.sep;
  try {
    return await pdfjs.getDocument({
      data: new Uint8Array(bytes),
      password,
      canvasFactory: new NodeCanvasFactory(),
      disableFontFace: true,
      isEvalSupported: false,
      standardFontDataUrl: dir,
      verbosity: 0,
    }).promise;
  } catch (e) {
    if (e?.name === 'PasswordException') throw new UserError('This PDF is password-protected. Unlock it first with the Unlock PDF tool.');
    throw new UserError('Could not read this PDF. The file may be damaged.');
  }
}

async function renderPng(page, scale) {
  const base = page.getViewport({ scale: 1 });
  const s = Math.min(scale, 5000 / Math.max(base.width, base.height));
  const vp = page.getViewport({ scale: s });
  const factory = new NodeCanvasFactory();
  const { canvas, context } = factory.create(vp.width, vp.height);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport: vp, canvasFactory: factory }).promise;
  return { png: await canvas.encode('png'), width: base.width, height: base.height };
}

// ---------- text layout helpers (PDF → Word / Excel) ----------
function pageLines(content) {
  const items = content.items
    .filter((it) => it.str && it.str.trim())
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width,
      size: Math.hypot(it.transform[2], it.transform[3]) || 10,
      bold: /bold|black|heavy/i.test(content.styles[it.fontName]?.fontFamily || '') || /bold/i.test(it.fontName),
    }));
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const it of items) {
    const line = lines.find((l) => Math.abs(l.y - it.y) < Math.max(2, it.size * 0.4));
    if (line) line.items.push(it);
    else lines.push({ y: it.y, size: it.size, items: [it] });
  }
  for (const l of lines) {
    l.items.sort((a, b) => a.x - b.x);
    l.size = Math.max(...l.items.map((i) => i.size));
  }
  return lines.sort((a, b) => b.y - a.y);
}

// ---------- LibreOffice ----------
function findSoffice() {
  const candidates = [
    process.env.SOFFICE_PATH,
    'C:/Program Files/LibreOffice/program/soffice.exe',
    'C:/Program Files (x86)/LibreOffice/program/soffice.exe',
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  ].filter(Boolean);
  return candidates.find((c) => existsSync(c));
}

async function officeToPdf([f]) {
  const soffice = findSoffice();
  if (!soffice) throw new UserError('The document converter is not installed on this server yet. Please try again later.', 503);
  const dir = path.join(os.tmpdir(), `nexpdf-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  try {
    const safe = `input${path.extname(f.name).toLowerCase()}`;
    await fs.writeFile(path.join(dir, safe), f.bytes);
    // Separate profile per job so conversions can run in parallel.
    const profile = 'file:///' + path.join(dir, 'profile').replace(/\\/g, '/');
    await run(soffice, [`-env:UserInstallation=${profile}`, '--headless', '--norestore', '--convert-to', 'pdf', '--outdir', dir, path.join(dir, safe)], {
      timeout: 120000,
    });
    const out = await fs.readFile(path.join(dir, 'input.pdf')).catch(() => null);
    if (!out) throw new UserError('This document could not be converted. Please check the file opens correctly.');
    const pages = (await PDFDocument.load(out)).getPageCount();
    return { name: `${baseName(f.name)}.pdf`, bytes: out, mime: 'application/pdf', info: `${pages} page${pages > 1 ? 's' : ''}` };
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// ---------- processors ----------
export const SERVER_PROCESSORS = {
  async 'pdf-to-word'([f]) {
    const { Document, Packer, Paragraph, TextRun, ImageRun, PageBreak } = require('docx');
    const pdf = await openPdf(f.bytes);
    const children = [];
    let scanned = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const lines = pageLines(await page.getTextContent());
      if (i > 1) children.push(new Paragraph({ children: [new PageBreak()] }));
      if (!lines.length) {
        // Scanned page: keep it as an image so nothing is lost.
        scanned++;
        const { png, width, height } = await renderPng(page, 2);
        const w = 600, h = Math.round((height / width) * 600);
        children.push(new Paragraph({ children: [new ImageRun({ data: png, transformation: { width: w, height: h } })] }));
        continue;
      }
      // Merge consecutive lines into paragraphs when the vertical gap is small.
      let para = [];
      let prev = null;
      const flush = () => {
        if (para.length) children.push(new Paragraph({ children: para, spacing: { after: 120 } }));
        para = [];
      };
      for (const line of lines) {
        const gap = prev ? prev.y - line.y : 0;
        if (prev && (gap > prev.size * 1.8 || Math.abs(line.size - prev.size) > 1.5)) flush();
        else if (prev) para.push(new TextRun({ text: ' ' }));
        line.items.forEach((it, k) => {
          const space = k > 0 && it.x - (line.items[k - 1].x + line.items[k - 1].w) > it.size * 0.2 ? ' ' : '';
          para.push(new TextRun({ text: space + it.str, bold: it.bold, size: Math.round(it.size * 2) }));
        });
        prev = line;
      }
      flush();
      page.cleanup();
    }
    await pdf.destroy();
    const doc = new Document({ creator: 'SoftServices', sections: [{ children }] });
    const bytes = await Packer.toBuffer(doc);
    return {
      name: `${baseName(f.name)}.docx`,
      bytes,
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      info: scanned ? `${scanned} scanned page(s) kept as images — use OCR PDF first for editable text` : 'Editable Word document',
    };
  },

  async 'pdf-to-excel'([f]) {
    const ExcelJS = require('exceljs');
    const pdf = await openPdf(f.bytes);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SoftServices';
    let rowsTotal = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const lines = pageLines(await page.getTextContent());
      const ws = wb.addWorksheet(`Page ${i}`);
      // Column boundaries: cluster the start x of every text item on the page.
      const xs = lines.flatMap((l) => l.items.map((it) => it.x)).sort((a, b) => a - b);
      const cols = [];
      for (const x of xs) if (!cols.length || x - cols[cols.length - 1] > 18) cols.push(x);
      for (const line of lines) {
        const row = [];
        for (const it of line.items) {
          let c = 0;
          while (c + 1 < cols.length && cols[c + 1] <= it.x + 2) c++;
          row[c] = row[c] ? `${row[c]} ${it.str.trim()}` : it.str.trim();
        }
        const values = Array.from({ length: row.length }, (_, k) => {
          const v = row[k] ?? '';
          const num = v.replace(/,/g, '');
          return /^-?\d+(\.\d+)?$/.test(num) ? Number(num) : v;
        });
        ws.addRow(values);
        rowsTotal++;
      }
      ws.columns.forEach((col) => {
        let max = 8;
        col.eachCell?.({ includeEmpty: false }, (cell) => (max = Math.max(max, String(cell.value ?? '').length + 2)));
        col.width = Math.min(60, max);
      });
      page.cleanup();
    }
    await pdf.destroy();
    if (!rowsTotal) throw new UserError('No text tables were found. If this is a scanned PDF, run OCR PDF first.');
    return {
      name: `${baseName(f.name)}.xlsx`,
      bytes: Buffer.from(await wb.xlsx.writeBuffer()),
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      info: `${rowsTotal} rows on ${pdf.numPages} sheet(s)`,
    };
  },

  async 'pdf-to-powerpoint'([f]) {
    const PptxGenJS = require('pptxgenjs');
    const pdf = await openPdf(f.bytes);
    const pptx = new PptxGenJS();
    const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
    pptx.defineLayout({ name: 'PDF', width: first.width / 72, height: first.height / 72 });
    pptx.layout = 'PDF';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const { png } = await renderPng(page, 2);
      pptx.addSlide().addImage({ data: `data:image/png;base64,${png.toString('base64')}`, x: 0, y: 0, w: first.width / 72, h: first.height / 72 });
      page.cleanup();
    }
    const n = pdf.numPages;
    await pdf.destroy();
    return {
      name: `${baseName(f.name)}.pptx`,
      bytes: await pptx.write({ outputType: 'nodebuffer' }),
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      info: `${n} slide${n > 1 ? 's' : ''}`,
    };
  },

  'word-to-pdf': officeToPdf,
  'excel-to-pdf': officeToPdf,
  'powerpoint-to-pdf': officeToPdf,

  async 'ocr-pdf'([f], o) {
    const { createWorker } = require('tesseract.js');
    const lang = ['eng', 'urd', 'hin', 'ara', 'fra', 'deu', 'spa'].includes(o.language) ? o.language : 'eng';
    const cachePath = path.join(os.tmpdir(), 'nexpdf-tessdata');
    await fs.mkdir(cachePath, { recursive: true });
    const worker = await createWorker(lang, 1, { cachePath });
    try {
      const images = [];
      if (/\.pdf$/i.test(f.name)) {
        const pdf = await openPdf(f.bytes);
        if (pdf.numPages > 50) throw new UserError('OCR supports up to 50 pages per file.');
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          images.push((await renderPng(page, 300 / 72)).png);
          page.cleanup();
        }
        await pdf.destroy();
      } else {
        images.push(Buffer.from(f.bytes));
      }

      if (o.output === 'txt') {
        const parts = [];
        for (const [i, img] of images.entries()) {
          const { data } = await worker.recognize(img);
          parts.push(images.length > 1 ? `----- Page ${i + 1} -----\n${data.text.trim()}` : data.text.trim());
        }
        const text = parts.join('\n\n');
        return { name: `${baseName(f.name)}.txt`, bytes: Buffer.from(text, 'utf8'), mime: 'text/plain; charset=utf-8', info: `${text.length.toLocaleString()} characters recognised` };
      }

      // Searchable PDF: tesseract returns one PDF per page (image + invisible text layer).
      const out = await PDFDocument.create();
      let chars = 0;
      for (const img of images) {
        const { data } = await worker.recognize(img, { pdfTitle: baseName(f.name) }, { pdf: true, text: true });
        chars += data.text.length;
        const pageDoc = await PDFDocument.load(new Uint8Array(data.pdf));
        const pages = await out.copyPages(pageDoc, pageDoc.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      return { name: `${baseName(f.name)}-ocr.pdf`, bytes: await out.save(), mime: 'application/pdf', info: `Searchable PDF · ${chars.toLocaleString()} characters recognised` };
    } finally {
      await worker.terminate();
    }
  },

  async 'protect-pdf'([f], o) {
    const password = String(o.password || '');
    if (password.length < 4) throw new UserError('Please choose a password with at least 4 characters.');
    const { PDFDocument: EncPDF } = require('@cantoo/pdf-lib');
    let doc;
    try {
      doc = await EncPDF.load(f.bytes);
    } catch {
      throw new UserError('This PDF is already protected or damaged. Unlock it first.');
    }
    doc.encrypt({
      userPassword: password,
      ownerPassword: `${password}-${randomUUID()}`,
      permissions: {
        printing: o.allowPrinting ? 'highResolution' : false,
        copying: !!o.allowCopying,
        modifying: false,
        annotating: false,
        fillingForms: true,
        contentAccessibility: true,
        documentAssembly: false,
      },
    });
    return { name: `${baseName(f.name)}-protected.pdf`, bytes: await doc.save(), mime: 'application/pdf', info: 'AES-256 encrypted — password required to open' };
  },

  async 'unlock-pdf'([f], o) {
    const { PDFDocument: EncPDF } = require('@cantoo/pdf-lib');
    let doc;
    try {
      doc = await EncPDF.load(f.bytes, { password: String(o.password || '') });
    } catch (e) {
      throw new UserError(/password/i.test(e.message) ? 'Wrong password. Please check and try again.' : 'Could not read this PDF. The file may be damaged.');
    }
    return { name: `${baseName(f.name)}-unlocked.pdf`, bytes: await doc.save(), mime: 'application/pdf', info: 'Password removed' };
  },
};

/** Bundle several results into one ZIP response. */
export async function zipResults(results) {
  const zip = new JSZip();
  results.forEach((r) => zip.file(r.name, r.bytes));
  return { name: 'softservices-pro.zip', bytes: await zip.generateAsync({ type: 'nodebuffer' }), mime: 'application/zip', info: `${results.length} files` };
}

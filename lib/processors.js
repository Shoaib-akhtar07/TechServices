'use client';
// All processing runs in the browser. Each processor receives
// (files: File[], options, progress: (msg) => void) and returns
// an array of { name, blob, info? }.

import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { formatBytes } from './format';

// ---------- helpers ----------
let pdfjsPromise;
export function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/build/pdf').then((m) => {
      const lib = m.default || m;
      lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      return lib;
    });
  }
  return pdfjsPromise;
}

const baseName = (name) => name.replace(/\.[^.]+$/, '');
const pdfBlob = (bytes) => new Blob([bytes], { type: 'application/pdf' });
const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] };

async function loadPdf(file) {
  try {
    return await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  } catch (e) {
    throw new Error(`Could not read "${file.name}". The file may be damaged or not a PDF — try the Repair PDF tool.`);
  }
}

async function openPdfjs(file) {
  const pdfjs = await getPdfjs();
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

export async function pageCount(file) {
  try {
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
    return doc.getPageCount();
  } catch {
    return null;
  }
}

/** Parse "1-3, 5, 8-" into groups of 0-based page indices. Descending ranges ("5-1") are allowed. */
export function parseRanges(input, total) {
  const groups = [];
  for (const raw of String(input || '').split(',')) {
    const p = raw.trim();
    if (!p) continue;
    let a, b, m;
    if ((m = p.match(/^(\d*)\s*-\s*(\d*)$/))) {
      a = m[1] ? +m[1] : 1;
      b = m[2] ? +m[2] : total;
    } else if (/^\d+$/.test(p)) {
      a = b = +p;
    } else {
      throw new Error(`"${p}" is not a valid page range.`);
    }
    if (a < 1 || b < 1 || a > total || b > total) {
      throw new Error(`Page range "${p}" is outside this document (1–${total}).`);
    }
    const g = [];
    if (a <= b) for (let i = a; i <= b; i++) g.push(i - 1);
    else for (let i = a; i >= b; i--) g.push(i - 1);
    groups.push(g);
  }
  if (!groups.length) throw new Error('Please enter at least one page number.');
  return groups;
}

async function copyToNew(src, indices) {
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  pages.forEach((p) => out.addPage(p));
  return out;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encoding failed.'))), type, quality)
  );
}

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function toGrayscale(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  ctx.putImageData(img, 0, 0);
}

/** Render a page with pdf.js onto a white canvas, capped to a safe size. */
async function renderPage(page, scale) {
  const base = page.getViewport({ scale: 1 });
  const maxDim = 6000;
  const s = Math.min(scale, maxDim / Math.max(base.width, base.height));
  const vp = page.getViewport({ scale: s });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(vp.width);
  canvas.height = Math.floor(vp.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return { canvas, ctx, base };
}

/** Rebuild a PDF from page images (used by compress, grayscale, repair fallback). */
async function rasterizePdf(file, { scale, quality, grayscale }, progress) {
  const pdf = await openPdfjs(file);
  const out = await PDFDocument.create();
  for (let i = 1; i <= pdf.numPages; i++) {
    progress(`Processing page ${i} of ${pdf.numPages}…`);
    const page = await pdf.getPage(i);
    const { canvas, ctx, base } = await renderPage(page, scale);
    if (grayscale) toGrayscale(ctx, canvas.width, canvas.height);
    const jpg = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', quality)).arrayBuffer());
    const img = await out.embedJpg(jpg);
    const pg = out.addPage([base.width, base.height]);
    pg.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
    page.cleanup();
  }
  await pdf.destroy();
  return pdfBlob(await out.save());
}

async function loadBitmap(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Fallback for formats/browsers that reject createImageBitmap options.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new Error(`Could not read image "${file.name}".`);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function drawToCanvas(bmp, w, h, background) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function encodeImage(canvas, mime, quality, name, suffix) {
  const blob = await canvasToBlob(canvas, mime, quality);
  // Some browsers (old Safari) silently fall back to PNG for WebP.
  const ext = EXT[blob.type] || 'png';
  return { name: `${baseName(name)}${suffix}.${ext}`, blob };
}

// WinAnsi-safe text for the standard PDF fonts.
function sanitizeText(s) {
  return s
    .replace(/\t/g, '    ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF\n\r]/g, '?');
}

function wrapLine(text, font, size, maxW) {
  if (!text) return [''];
  const words = text.split(/(\s+)/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line + w;
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      line = test;
      continue;
    }
    if (line.trim()) lines.push(line.trimEnd());
    line = w.trimStart();
    // Break words longer than a full line.
    while (font.widthOfTextAtSize(line, size) > maxW) {
      let i = line.length;
      while (i > 1 && font.widthOfTextAtSize(line.slice(0, i), size) > maxW) i--;
      lines.push(line.slice(0, i));
      line = line.slice(i);
    }
  }
  lines.push(line.trimEnd());
  return lines;
}

function corner(position, pageW, pageH, boxW, boxH, margin) {
  const [v, h] = position.split('-');
  const x = h === 'left' ? margin : h === 'right' ? pageW - boxW - margin : (pageW - boxW) / 2;
  const y = v === 'top' ? pageH - boxH - margin : margin;
  return { x, y };
}

// ---------- processors ----------
export const PROCESSORS = {
  async 'merge-pdf'(files, o, progress) {
    const out = await PDFDocument.create();
    for (const [i, f] of files.entries()) {
      progress(`Adding file ${i + 1} of ${files.length}…`);
      const src = await loadPdf(f);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    return [{ name: 'merged.pdf', blob: pdfBlob(await out.save()), info: `${out.getPageCount()} pages` }];
  },

  async 'split-pdf'([f], o, progress) {
    const src = await loadPdf(f);
    const total = src.getPageCount();
    let groups;
    if (o.mode === 'every') groups = src.getPageIndices().map((i) => [i]);
    else if (o.mode === 'chunk') {
      const n = Math.max(1, parseInt(o.chunk, 10) || 1);
      groups = [];
      for (let i = 0; i < total; i += n) groups.push(src.getPageIndices().slice(i, i + n));
    } else groups = parseRanges(o.ranges, total);

    const results = [];
    for (const [i, g] of groups.entries()) {
      progress(`Creating file ${i + 1} of ${groups.length}…`);
      const doc = await copyToNew(src, g);
      const label = g.length === 1 ? `page-${g[0] + 1}` : `pages-${g[0] + 1}-${g[g.length - 1] + 1}`;
      results.push({ name: `${baseName(f.name)}-${label}.pdf`, blob: pdfBlob(await doc.save()), info: `${g.length} page${g.length > 1 ? 's' : ''}` });
    }
    return results;
  },

  async 'remove-pages'([f], o) {
    const src = await loadPdf(f);
    const total = src.getPageCount();
    const remove = new Set(parseRanges(o.ranges, total).flat());
    const keep = src.getPageIndices().filter((i) => !remove.has(i));
    if (!keep.length) throw new Error('You cannot remove every page of the document.');
    const doc = await copyToNew(src, keep);
    return [{ name: `${baseName(f.name)}-edited.pdf`, blob: pdfBlob(await doc.save()), info: `${remove.size} removed, ${keep.length} left` }];
  },

  async 'extract-pages'([f], o) {
    const src = await loadPdf(f);
    const keep = parseRanges(o.ranges, src.getPageCount()).flat();
    const doc = await copyToNew(src, keep);
    return [{ name: `${baseName(f.name)}-extracted.pdf`, blob: pdfBlob(await doc.save()), info: `${keep.length} pages` }];
  },

  async 'organize-pdf'([f], o) {
    const src = await loadPdf(f);
    const order = o.reverse ? src.getPageIndices().reverse() : parseRanges(o.order, src.getPageCount()).flat();
    const doc = await copyToNew(src, order);
    return [{ name: `${baseName(f.name)}-organized.pdf`, blob: pdfBlob(await doc.save()), info: `${order.length} pages` }];
  },

  async 'rotate-pdf'(files, o, progress) {
    const angle = parseInt(o.angle, 10);
    const results = [];
    for (const f of files) {
      progress(`Rotating ${f.name}…`);
      const doc = await loadPdf(f);
      const pages = doc.getPages();
      const targets = String(o.pages).trim().toLowerCase() === 'all' || !String(o.pages).trim()
        ? pages.map((_, i) => i)
        : parseRanges(o.pages, pages.length).flat();
      for (const i of new Set(targets)) {
        const p = pages[i];
        p.setRotation(degrees((p.getRotation().angle + angle) % 360));
      }
      results.push({ name: `${baseName(f.name)}-rotated.pdf`, blob: pdfBlob(await doc.save()) });
    }
    return results;
  },

  async 'compress-pdf'(files, o, progress) {
    const results = [];
    for (const f of files) {
      progress(`Compressing ${f.name}…`);
      let blob;
      if (o.level === 'low') {
        const doc = await loadPdf(f);
        blob = pdfBlob(await doc.save({ useObjectStreams: true }));
      } else {
        const cfg = o.level === 'high' ? { scale: 1.0, quality: 0.45 } : { scale: 1.5, quality: 0.7 };
        blob = await rasterizePdf(f, cfg, progress);
      }
      let info;
      if (blob.size >= f.size) {
        blob = f;
        info = `Already optimized — original kept (${formatBytes(f.size)})`;
      } else {
        const pct = Math.round((1 - blob.size / f.size) * 100);
        info = `${formatBytes(f.size)} → ${formatBytes(blob.size)} (−${pct}%)`;
      }
      results.push({ name: `${baseName(f.name)}-compressed.pdf`, blob, info });
    }
    return results;
  },

  async 'repair-pdf'(files, o, progress) {
    const results = [];
    for (const f of files) {
      progress(`Repairing ${f.name}…`);
      let blob, info;
      try {
        const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true, throwOnInvalidObject: false });
        blob = pdfBlob(await doc.save());
        info = 'Structure rebuilt';
      } catch {
        // pdf.js is more tolerant of broken files; rebuild from rendered pages.
        try {
          blob = await rasterizePdf(f, { scale: 2, quality: 0.85 }, progress);
        } catch {
          throw new Error(`"${f.name}" is too badly damaged to recover. Try to get a fresh copy of the file from its source.`);
        }
        info = 'Recovered by re-rendering pages';
      }
      results.push({ name: `${baseName(f.name)}-repaired.pdf`, blob, info });
    }
    return results;
  },

  async 'flatten-pdf'(files) {
    const results = [];
    for (const f of files) {
      const doc = await loadPdf(f);
      let info = 'No form fields found';
      try {
        const form = doc.getForm();
        const n = form.getFields().length;
        if (n) {
          form.flatten();
          info = `${n} field${n > 1 ? 's' : ''} flattened`;
        }
      } catch {
        info = 'Form could not be flattened';
      }
      results.push({ name: `${baseName(f.name)}-flattened.pdf`, blob: pdfBlob(await doc.save()), info });
    }
    return results;
  },

  async 'grayscale-pdf'(files, o, progress) {
    const results = [];
    for (const f of files) {
      const blob = await rasterizePdf(f, { scale: 2, quality: 0.85, grayscale: true }, progress);
      results.push({ name: `${baseName(f.name)}-grayscale.pdf`, blob });
    }
    return results;
  },

  async 'jpg-to-pdf'(files, o, progress) {
    const margin = parseInt(o.margin, 10) || 0;
    const make = () => PDFDocument.create();
    const addImage = async (doc, f) => {
      const bmp = await loadBitmap(f);
      const isPng = f.type === 'image/png';
      const canvas = drawToCanvas(bmp, bmp.width, bmp.height, isPng ? null : '#fff');
      const bytes = new Uint8Array(await (await canvasToBlob(canvas, isPng ? 'image/png' : 'image/jpeg', 0.92)).arrayBuffer());
      const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      let pw, ph;
      if (o.size === 'fit') {
        pw = img.width + margin * 2;
        ph = img.height + margin * 2;
      } else {
        [pw, ph] = PAGE_SIZES[o.size];
        const landscape = o.orientation === 'landscape' || (o.orientation === 'auto' && img.width > img.height);
        if (landscape) [pw, ph] = [ph, pw];
      }
      const s = Math.min((pw - margin * 2) / img.width, (ph - margin * 2) / img.height);
      const w = img.width * s, h = img.height * s;
      doc.addPage([pw, ph]).drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    };

    if (o.merge) {
      const doc = await make();
      for (const [i, f] of files.entries()) {
        progress(`Adding image ${i + 1} of ${files.length}…`);
        await addImage(doc, f);
      }
      return [{ name: files.length === 1 ? `${baseName(files[0].name)}.pdf` : 'images.pdf', blob: pdfBlob(await doc.save()), info: `${files.length} pages` }];
    }
    const results = [];
    for (const f of files) {
      const doc = await make();
      await addImage(doc, f);
      results.push({ name: `${baseName(f.name)}.pdf`, blob: pdfBlob(await doc.save()) });
    }
    return results;
  },

  'pdf-to-jpg': (files, o, progress) => pdfToImages(files, o, progress, 'image/jpeg'),
  'pdf-to-png': (files, o, progress) => pdfToImages(files, o, progress, 'image/png'),

  async 'pdf-to-text'(files, o, progress) {
    const results = [];
    for (const f of files) {
      const pdf = await openPdfjs(f);
      const parts = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        progress(`Reading page ${i} of ${pdf.numPages}…`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        let text = '';
        for (const item of content.items) {
          text += item.str;
          if (item.hasEOL) text += '\n';
        }
        parts.push(o.separators ? `----- Page ${i} -----\n${text.trim()}` : text.trim());
      }
      await pdf.destroy();
      const body = parts.join('\n\n');
      results.push({
        name: `${baseName(f.name)}.txt`,
        blob: new Blob([body], { type: 'text/plain;charset=utf-8' }),
        info: body.replace(/\s|-|Page \d+/g, '').length ? `${body.length.toLocaleString()} characters` : 'No text found (scanned PDF?)',
      });
    }
    return results;
  },

  async 'text-to-pdf'(files, o) {
    const results = [];
    const size = Math.min(36, Math.max(6, parseInt(o.fontSize, 10) || 11));
    for (const f of files) {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts[o.font] || StandardFonts.Helvetica);
      const [W, H] = PAGE_SIZES[o.size] || PAGE_SIZES.a4;
      const margin = 56, lineH = size * 1.45, maxW = W - margin * 2;
      let page = doc.addPage([W, H]);
      let y = H - margin;
      const text = sanitizeText(await f.text());
      for (const para of text.split(/\r?\n/)) {
        for (const line of wrapLine(para, font, size, maxW)) {
          if (y - size < margin) {
            page = doc.addPage([W, H]);
            y = H - margin;
          }
          if (line) page.drawText(line, { x: margin, y: y - size, size, font, color: rgb(0.1, 0.1, 0.1) });
          y -= lineH;
        }
      }
      results.push({ name: `${baseName(f.name)}.pdf`, blob: pdfBlob(await doc.save()), info: `${doc.getPageCount()} page${doc.getPageCount() > 1 ? 's' : ''}` });
    }
    return results;
  },

  async 'sign-pdf'([f], o) {
    if (!o.signature) throw new Error('Please draw your signature first.');
    const doc = await loadPdf(f);
    const img = await doc.embedPng(o.signature);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const targets = o.pages === 'all' ? pages : o.pages === 'first' ? [pages[0]] : [pages[pages.length - 1]];
    const w = Number(o.width) || 150;
    const h = (img.height / img.width) * w;
    const dateText = new Date().toLocaleDateString();
    const dateSize = 9;
    for (const p of targets) {
      const { width, height } = p.getSize();
      const boxH = h + (o.date ? dateSize + 4 : 0);
      const { x, y } = corner(o.position, width, height, w, boxH, 36);
      p.drawImage(img, { x, y: y + (o.date ? dateSize + 4 : 0), width: w, height: h });
      if (o.date) p.drawText(dateText, { x, y, size: dateSize, font, color: rgb(0.25, 0.25, 0.25) });
    }
    return [{ name: `${baseName(f.name)}-signed.pdf`, blob: pdfBlob(await doc.save()) }];
  },

  async 'add-watermark'(files, o) {
    const results = [];
    const text = sanitizeText(o.text || 'WATERMARK');
    const size = Number(o.fontSize) || 60;
    const angle = Number(o.angle) || 0;
    const rad = (angle * Math.PI) / 180;
    for (const f of files) {
      const doc = await loadPdf(f);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const tw = font.widthOfTextAtSize(text, size);
      const style = { size, font, color: hexToRgb(o.color || '#e11d48'), opacity: (Number(o.opacity) || 25) / 100, rotate: degrees(angle) };
      for (const p of doc.getPages()) {
        const { width, height } = p.getSize();
        // Offset so the rotated text is centred on (cx, cy).
        const at = (cx, cy) => ({
          x: cx - (tw / 2) * Math.cos(rad) + (size / 3) * Math.sin(rad),
          y: cy - (tw / 2) * Math.sin(rad) - (size / 3) * Math.cos(rad),
        });
        if (o.layout === 'tile') {
          const stepX = tw + size * 2, stepY = size * 4;
          for (let cy = 0; cy < height + stepY; cy += stepY)
            for (let cx = (cy / stepY) % 2 ? stepX / 2 : 0; cx < width + stepX; cx += stepX)
              p.drawText(text, { ...style, ...at(cx, cy) });
        } else {
          p.drawText(text, { ...style, ...at(width / 2, height / 2) });
        }
      }
      results.push({ name: `${baseName(f.name)}-watermarked.pdf`, blob: pdfBlob(await doc.save()) });
    }
    return results;
  },

  async 'add-page-numbers'(files, o) {
    const results = [];
    const size = Number(o.fontSize) || 11;
    const start = Number.isFinite(+o.start) ? +o.start : 1;
    for (const f of files) {
      const doc = await loadPdf(f);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();
      const numbered = o.skipFirst ? pages.slice(1) : pages;
      const total = numbered.length + start - 1;
      numbered.forEach((p, i) => {
        const text = o.format.replace('{n}', i + start).replace('{total}', total);
        const { width, height } = p.getSize();
        const { x, y } = corner(o.position, width, height, font.widthOfTextAtSize(text, size), size, 28);
        p.drawText(text, { x, y, size, font, color: rgb(0.2, 0.2, 0.2) });
      });
      results.push({ name: `${baseName(f.name)}-numbered.pdf`, blob: pdfBlob(await doc.save()) });
    }
    return results;
  },

  async 'edit-pdf-metadata'([f], o) {
    const doc = await loadPdf(f);
    if (o.clear) {
      doc.setTitle('');
      doc.setAuthor('');
      doc.setSubject('');
      doc.setKeywords([]);
      doc.setCreator('');
      doc.setProducer('');
    } else {
      doc.setTitle(o.title || '');
      doc.setAuthor(o.author || '');
      doc.setSubject(o.subject || '');
      doc.setKeywords((o.keywords || '').split(',').map((k) => k.trim()).filter(Boolean));
      doc.setCreator(o.creator || '');
    }
    doc.setModificationDate(new Date());
    return [{ name: f.name, blob: pdfBlob(await doc.save({ updateMetadata: false })), info: o.clear ? 'Metadata removed' : 'Metadata updated' }];
  },

  async 'compress-image'(files, o, progress) {
    const mime = o.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const results = [];
    for (const f of files) {
      progress(`Compressing ${f.name}…`);
      const bmp = await loadBitmap(f);
      const canvas = drawToCanvas(bmp, bmp.width, bmp.height, mime === 'image/jpeg' ? '#fff' : null);
      const r = await encodeImage(canvas, mime, o.quality / 100, f.name, '-compressed');
      r.info = `${formatBytes(f.size)} → ${formatBytes(r.blob.size)}`;
      results.push(r);
    }
    return results;
  },

  async 'resize-image'(files, o, progress) {
    const results = [];
    for (const f of files) {
      progress(`Resizing ${f.name}…`);
      const bmp = await loadBitmap(f);
      let w, h;
      if (o.mode === 'percent') {
        w = (bmp.width * o.percent) / 100;
        h = (bmp.height * o.percent) / 100;
      } else if (o.keepRatio) {
        const s = Math.min(o.width / bmp.width, o.height / bmp.height);
        w = bmp.width * s;
        h = bmp.height * s;
      } else {
        w = +o.width;
        h = +o.height;
      }
      const mime = ['image/png', 'image/webp'].includes(f.type) ? f.type : 'image/jpeg';
      const canvas = drawToCanvas(bmp, w, h, mime === 'image/jpeg' ? '#fff' : null);
      const r = await encodeImage(canvas, mime, 0.92, f.name, '-resized');
      r.info = `${bmp.width}×${bmp.height} → ${canvas.width}×${canvas.height}`;
      results.push(r);
    }
    return results;
  },

  async 'convert-image'(files, o, progress) {
    const mime = `image/${o.format}`;
    const results = [];
    for (const f of files) {
      progress(`Converting ${f.name}…`);
      const bmp = await loadBitmap(f);
      const canvas = drawToCanvas(bmp, bmp.width, bmp.height, mime === 'image/jpeg' ? '#fff' : null);
      results.push(await encodeImage(canvas, mime, o.quality / 100, f.name, ''));
    }
    return results;
  },
};

async function pdfToImages(files, o, progress, mime) {
  const scale = (parseInt(o.dpi, 10) || 150) / 72;
  const results = [];
  for (const f of files) {
    const pdf = await openPdfjs(f);
    for (let i = 1; i <= pdf.numPages; i++) {
      progress(`Converting page ${i} of ${pdf.numPages}…`);
      const page = await pdf.getPage(i);
      const { canvas } = await renderPage(page, scale);
      results.push(await encodeImage(canvas, mime, 0.92, f.name, `-page-${i}`));
      page.cleanup();
    }
    await pdf.destroy();
  }
  return results;
}

/** Optional per-tool hook: read values from the first file to pre-fill options. */
export const PREFILL = {
  async 'edit-pdf-metadata'(file) {
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true, updateMetadata: false });
    return {
      title: doc.getTitle() || '',
      author: doc.getAuthor() || '',
      subject: doc.getSubject() || '',
      keywords: doc.getKeywords() || '',
      creator: doc.getCreator() || '',
    };
  },
};

/** Render a small thumbnail of the first page (data URL) for the file list. */
export async function pdfThumbnail(file) {
  try {
    const pdf = await openPdfjs(file);
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const { canvas } = await renderPage(page, 160 / base.width);
    const url = canvas.toDataURL('image/jpeg', 0.7);
    await pdf.destroy();
    return url;
  } catch {
    return null;
  }
}

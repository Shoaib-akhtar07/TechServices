'use client';
// All processing runs in the browser. Each processor receives
// (files: File[], options, progress: (msg) => void) and returns
// an array of { name, blob, info? }.

import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { formatBytes } from './format';
import { IMAGE_CONVERSIONS, ENCODER } from './image-formats';

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

// ---------- extra image formats (the canvas only writes JPG, PNG and WebP) ----------

/** 24-bit BMP. Transparent pixels must already be filled (drawToCanvas with a background). */
function canvasToBmp(canvas) {
  const { width: w, height: h } = canvas;
  const px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const row = Math.ceil((w * 3) / 4) * 4;
  const buf = new ArrayBuffer(54 + row * h);
  const v = new DataView(buf);
  v.setUint16(0, 0x4d42, true); // "BM"
  v.setUint32(2, buf.byteLength, true);
  v.setUint32(10, 54, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, w, true);
  v.setInt32(22, h, true); // positive height = rows stored bottom-up
  v.setUint16(26, 1, true);
  v.setUint16(28, 24, true);
  v.setUint32(34, row * h, true);
  v.setInt32(38, 2835, true); // 72 DPI
  v.setInt32(42, 2835, true);
  const out = new Uint8Array(buf);
  for (let y = 0; y < h; y++) {
    let o = 54 + (h - 1 - y) * row;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      out[o++] = px[i + 2];
      out[o++] = px[i + 1];
      out[o++] = px[i];
    }
  }
  return new Blob([buf], { type: 'image/bmp' });
}

/** ICO holding one PNG per size (square, image centred and kept in proportion). Sizes up to 256. */
async function bitmapToIco(bmp, sizes) {
  const pngs = [];
  for (const size of sizes) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    const s = Math.min(size / bmp.width, size / bmp.height);
    const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
    ctx.drawImage(bmp, Math.floor((size - w) / 2), Math.floor((size - h) / 2), w, h);
    pngs.push({ size, bytes: new Uint8Array(await (await canvasToBlob(c, 'image/png')).arrayBuffer()) });
  }
  const head = new DataView(new ArrayBuffer(6 + 16 * pngs.length));
  head.setUint16(2, 1, true); // type 1 = icon
  head.setUint16(4, pngs.length, true);
  let offset = head.byteLength;
  pngs.forEach(({ size, bytes }, i) => {
    const e = 6 + i * 16;
    head.setUint8(e, size >= 256 ? 0 : size); // 0 means 256
    head.setUint8(e + 1, size >= 256 ? 0 : size);
    head.setUint16(e + 4, 1, true); // colour planes
    head.setUint16(e + 6, 32, true); // bits per pixel
    head.setUint32(e + 8, bytes.length, true);
    head.setUint32(e + 12, offset, true);
    offset += bytes.length;
  });
  return new Blob([head.buffer, ...pngs.map((x) => x.bytes)], { type: 'image/x-icon' });
}

const ICO_SIZES = { favicon: [16, 32, 48], app: [16, 32, 48, 64, 128, 256], '256': [256], '64': [64], '32': [32], '16': [16] };

// ---------- GIF (256 colours, LZW) ----------

/** Median cut: split the colour cloud along its widest channel until there are `n` boxes. */
function medianCut(colors, n) {
  let boxes = [colors];
  while (boxes.length < n) {
    let best = -1, bestRange = -1, bestCh = 0;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let ch = 0; ch < 3; ch++) {
        let lo = 255, hi = 0;
        for (const c of b) { const v = (c >> (16 - ch * 8)) & 255; if (v < lo) lo = v; if (v > hi) hi = v; }
        if (hi - lo > bestRange) { bestRange = hi - lo; best = i; bestCh = ch; }
      }
    });
    if (best < 0 || bestRange === 0) break;
    const shift = 16 - bestCh * 8;
    const b = boxes[best].sort((x, y) => ((x >> shift) & 255) - ((y >> shift) & 255));
    const mid = b.length >> 1;
    boxes.splice(best, 1, b.slice(0, mid), b.slice(mid));
  }
  return boxes.filter((b) => b.length).map((b) => {
    let r = 0, g = 0, bl = 0;
    for (const c of b) { r += (c >> 16) & 255; g += (c >> 8) & 255; bl += c & 255; }
    return [Math.round(r / b.length), Math.round(g / b.length), Math.round(bl / b.length)];
  });
}

/** RGBA pixels → palette (max 256 entries, index 0 transparent when needed) + one index per pixel. */
function quantize(px, w, h, dither) {
  const n = w * h;
  let transparent = false;
  const unique = new Map();
  for (let i = 0; i < n; i++) {
    if (px[i * 4 + 3] < 128) { transparent = true; continue; }
    if (unique.size <= 256) unique.set((px[i * 4] << 16) | (px[i * 4 + 1] << 8) | px[i * 4 + 2], 0);
  }
  const room = transparent ? 255 : 256;
  const offset = transparent ? 1 : 0;
  const indices = new Uint8Array(n);
  let palette;

  if (unique.size <= room) {
    // Few colours (logos, icons, screenshots): exact palette, no dithering needed.
    palette = [...unique.keys()].map((c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255]);
    const lookup = new Map([...unique.keys()].map((c, i) => [c, i + offset]));
    for (let i = 0; i < n; i++) {
      indices[i] = px[i * 4 + 3] < 128 ? 0 : lookup.get((px[i * 4] << 16) | (px[i * 4 + 1] << 8) | px[i * 4 + 2]);
    }
  } else {
    // Photos: median cut on a sample, then nearest colour (optionally with Floyd–Steinberg dithering).
    const step = Math.max(1, Math.floor(n / 60000));
    const sample = [];
    for (let i = 0; i < n; i += step) if (px[i * 4 + 3] >= 128) sample.push((px[i * 4] << 16) | (px[i * 4 + 1] << 8) | px[i * 4 + 2]);
    palette = medianCut(sample, room);
    const cache = new Int16Array(32768).fill(-1);
    const nearest = (r, g, b) => {
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      if (cache[key] >= 0) return cache[key];
      let best = 0, bd = Infinity;
      for (let j = 0; j < palette.length; j++) {
        const [pr, pg, pb] = palette[j];
        const d = (pr - r) ** 2 * 2 + (pg - g) ** 2 * 4 + (pb - b) ** 2 * 3;
        if (d < bd) { bd = d; best = j; }
      }
      cache[key] = best;
      return best;
    };
    const err = dither ? new Float32Array(n * 3) : null;
    const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (px[i * 4 + 3] < 128) { indices[i] = 0; continue; }
        let r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
        if (err) { r = clamp(r + err[i * 3]); g = clamp(g + err[i * 3 + 1]); b = clamp(b + err[i * 3 + 2]); }
        const j = nearest(r | 0, g | 0, b | 0);
        indices[i] = j + offset;
        if (err) {
          const [pr, pg, pb] = palette[j];
          const e = [r - pr, g - pg, b - pb];
          const spread = (xx, yy, f) => {
            if (xx < 0 || xx >= w || yy >= h) return;
            const k = (yy * w + xx) * 3;
            err[k] += e[0] * f; err[k + 1] += e[1] * f; err[k + 2] += e[2] * f;
          };
          spread(x + 1, y, 7 / 16); spread(x - 1, y + 1, 3 / 16); spread(x, y + 1, 5 / 16); spread(x + 1, y + 1, 1 / 16);
        }
      }
    }
  }
  if (transparent) palette = [[0, 0, 0], ...palette];
  return { palette, indices, transparent };
}

/** GIF LZW with 8-bit minimum code size, packed into 255-byte sub-blocks. */
function lzw(indices) {
  const out = [];
  let cur = 0, bits = 0, size = 9, next = 258;
  let dict = new Map();
  const emit = (code) => {
    cur |= code << bits;
    bits += size;
    while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; }
  };
  emit(256);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const code = dict.get(key);
    if (code !== undefined) { prefix = code; continue; }
    emit(prefix);
    if (next === 4096) {
      emit(256);
      dict = new Map();
      next = 258;
      size = 9;
    } else {
      if (next >= 1 << size) size++;
      dict.set(key, next++);
    }
    prefix = k;
  }
  emit(prefix);
  emit(257);
  if (bits > 0) out.push(cur & 255);
  const blocks = [8];
  for (let i = 0; i < out.length; i += 255) {
    const chunk = out.slice(i, i + 255);
    blocks.push(chunk.length, ...chunk);
  }
  blocks.push(0);
  return blocks;
}

function canvasToGif(canvas, dither = true) {
  const { width: w, height: h } = canvas;
  const px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const { palette, indices, transparent } = quantize(px, w, h, dither);
  let bitsPer = 1;
  while (1 << bitsPer < palette.length) bitsPer++;
  const tableSize = 1 << bitsPer;
  const bytes = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, w & 255, w >> 8, h & 255, h >> 8, 0x80 | ((bitsPer - 1) << 4) | (bitsPer - 1), 0, 0];
  for (let i = 0; i < tableSize; i++) bytes.push(...(palette[i] || [0, 0, 0]));
  if (transparent) bytes.push(0x21, 0xf9, 4, 1, 0, 0, 0, 0);
  bytes.push(0x2c, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0);
  const data = lzw(indices);
  const all = new Uint8Array(bytes.length + data.length + 1);
  all.set(bytes);
  all.set(data, bytes.length);
  all[all.length - 1] = 0x3b;
  return new Blob([all], { type: 'image/gif' });
}

/** One image in any supported output format: jpeg | png | webp | gif | bmp | ico. */
async function convertOne(f, o) {
  const bmp = await loadBitmap(f);
  const format = o.format || 'jpeg';
  if (format === 'ico') {
    const blob = await bitmapToIco(bmp, ICO_SIZES[o.icoSizes] || ICO_SIZES.favicon);
    return { name: `${baseName(f.name)}.ico`, blob, info: `${(ICO_SIZES[o.icoSizes] || ICO_SIZES.favicon).join(', ')} px` };
  }
  const flat = format === 'jpeg' || format === 'bmp';
  // Optional output width (used by SVG to PNG, where the drawing has no fixed pixel size).
  const bw = bmp.width || 300, bh = bmp.height || 150; // SVGs without a size report 0
  const width = Number(o.width) > 0 ? Math.min(10000, Number(o.width)) : bw;
  const height = (bh * width) / bw;
  const canvas = drawToCanvas(bmp, width, height, flat ? o.background || '#ffffff' : null);
  if (format === 'bmp') return { name: `${baseName(f.name)}.bmp`, blob: canvasToBmp(canvas) };
  if (format === 'gif') return { name: `${baseName(f.name)}.gif`, blob: canvasToGif(canvas, o.dither !== false) };
  const r = await encodeImage(canvas, `image/${format}`, (o.quality ?? 90) / 100, f.name, '');
  if (format === 'webp' && r.blob.type !== 'image/webp') r.info = 'Your browser cannot write WebP, so this was saved as PNG.';
  return r;
}

async function convertAll(files, o, progress) {
  const results = [];
  for (const f of files) {
    progress(`Converting ${f.name}…`);
    const r = await convertOne(f, o);
    r.info = r.info || `${formatBytes(f.size)} → ${formatBytes(r.blob.size)}`;
    results.push(r);
  }
  return results;
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

/** "all" (or empty) → every page, otherwise the pages in a range like "1-3, 6". */
function pageTargets(input, total) {
  const s = String(input ?? '').trim().toLowerCase();
  return [...new Set(s === 'all' || !s ? [...Array(total).keys()] : parseRanges(s, total).flat())];
}

/** Keep PNG and WebP as they are; everything else is saved as JPG. */
const imageMime = (f) => (['image/png', 'image/webp'].includes(f.type) ? f.type : 'image/jpeg');

/** Text lines of a page with their font size (pdf.js text items joined until each end of line). */
async function pageLines(page) {
  const { items } = await page.getTextContent();
  const lines = [];
  let text = '', size = 0;
  const flush = () => {
    lines.push({ text: text.trim(), size });
    text = '';
    size = 0;
  };
  for (const it of items) {
    text += it.str;
    if (it.str.trim()) size = Math.max(size, Math.hypot(it.transform[2], it.transform[3]));
    if (it.hasEOL) flush();
  }
  if (text) flush();
  return lines;
}

/** Line diff (longest common subsequence). Returns [{ op: ' ' | '-' | '+', a?, b? }]. */
function diffLines(a, b) {
  // The LCS table is a × b; past ~25M cells fall back to a plain side-by-side listing.
  if (a.length * b.length > 25e6) return [...a.map((l) => ({ op: '-', a: l })), ...b.map((l) => ({ op: '+', b: l }))];
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i].text === b[j].text ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i].text === b[j].text) out.push({ op: ' ', a: a[i++], b: b[j++] });
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ op: '-', a: a[i++] });
    else out.push({ op: '+', b: b[j++] });
  }
  while (i < n) out.push({ op: '-', a: a[i++] });
  while (j < m) out.push({ op: '+', b: b[j++] });
  return out;
}

/** Make a phone photo of a document look like a scan: grey, brighter paper, darker ink. */
function scanFilter(canvas) {
  const ctx = canvas.getContext('2d');
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, (g - 128) * 1.5 + 150));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
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
      for (const i of pageTargets(o.pages, pages.length)) {
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
      const isPng = f.type === 'image/png' && !o.enhance;
      const canvas = drawToCanvas(bmp, bmp.width, bmp.height, isPng ? null : '#fff');
      if (o.enhance) scanFilter(canvas);
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
      const mime = imageMime(f);
      const canvas = drawToCanvas(bmp, w, h, mime === 'image/jpeg' ? '#fff' : null);
      const r = await encodeImage(canvas, mime, 0.92, f.name, '-resized');
      r.info = `${bmp.width}×${bmp.height} → ${canvas.width}×${canvas.height}`;
      results.push(r);
    }
    return results;
  },

  'convert-image': (files, o, progress) => convertAll(files, o, progress),

  'image-to-ico': (files, o, progress) => convertAll(files, { ...o, format: 'ico' }, progress),

  // Same converter, separate landing pages for the searches people actually make.
  'png-to-pdf': (files, o, progress) => PROCESSORS['jpg-to-pdf'](files, o, progress),
  'image-to-pdf': (files, o, progress) => PROCESSORS['jpg-to-pdf'](files, o, progress),
  'scan-to-pdf': (files, o, progress) => PROCESSORS['jpg-to-pdf'](files, { ...o, merge: true }, progress),

  async 'crop-pdf'(files, o, progress) {
    const mm = (v) => (Math.max(0, Number(v) || 0) * 72) / 25.4;
    const [top, right, bottom, left] = [o.top, o.right, o.bottom, o.left].map(mm);
    const results = [];
    for (const f of files) {
      progress(`Cropping ${f.name}…`);
      const doc = await loadPdf(f);
      const pages = doc.getPages();
      for (const i of pageTargets(o.pages, pages.length)) {
        const p = pages[i];
        const box = p.getCropBox();
        const w = box.width - left - right, h = box.height - top - bottom;
        if (w < 36 || h < 36) throw new Error(`The margins are larger than page ${i + 1}. Use smaller values.`);
        p.setCropBox(box.x + left, box.y + bottom, w, h);
        p.setMediaBox(box.x + left, box.y + bottom, w, h);
      }
      results.push({ name: `${baseName(f.name)}-cropped.pdf`, blob: pdfBlob(await doc.save()) });
    }
    return results;
  },

  async 'add-text-to-pdf'(files, o) {
    const results = [];
    const size = Number(o.fontSize) || 14;
    // "\n" typed in the one-line box starts a new line.
    const lines = sanitizeText(String(o.text || '').replace(/\\n/g, '\n')).split('\n');
    if (!lines.join('').trim()) throw new Error('Please type the text to add.');
    for (const f of files) {
      const doc = await loadPdf(f);
      const font = await doc.embedFont(StandardFonts[o.font] || StandardFonts.Helvetica);
      const pages = doc.getPages();
      const lineH = size * 1.3;
      const boxW = Math.max(...lines.map((l) => font.widthOfTextAtSize(l, size)));
      const boxH = lineH * (lines.length - 1) + size;
      for (const i of pageTargets(o.pages, pages.length)) {
        const p = pages[i];
        const { width, height } = p.getSize();
        const pos = o.position === 'center' ? { x: (width - boxW) / 2, y: (height - boxH) / 2 } : corner(o.position, width, height, boxW, boxH, 36);
        lines.forEach((line, n) => p.drawText(line, { x: pos.x, y: pos.y + boxH - size - n * lineH, size, font, color: hexToRgb(o.color || '#111827') }));
      }
      results.push({ name: `${baseName(f.name)}-text.pdf`, blob: pdfBlob(await doc.save()) });
    }
    return results;
  },

  async 'redact-pdf'([f], o, progress) {
    const words = String(o.words || '').split(',').map((w) => w.trim()).filter(Boolean);
    const patterns = words.map((w) => new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), o.matchCase ? 'g' : 'gi'));
    if (o.emails) patterns.push(/[\w.+-]+@[\w-]+\.[\w.]+/g);
    if (o.phones) patterns.push(/\+?\d[\d\s()-]{7,}\d/g);
    if (!patterns.length) throw new Error('Type at least one word to redact, or tick emails / phone numbers.');

    const pdfjs = await getPdfjs();
    const pdf = await openPdfjs(f);
    const src = await loadPdf(f);
    const out = await PDFDocument.create();
    let total = 0, redactedPages = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      progress(`Checking page ${i} of ${pdf.numPages}…`);
      const page = await pdf.getPage(i);
      const { items, styles } = await page.getTextContent();
      // Every match as [text item, first char, last char + 1].
      const hits = [];
      for (const it of items) {
        if (!it.str) continue;
        for (const re of patterns) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(it.str))) {
            if (!m[0].length) { re.lastIndex++; continue; }
            hits.push([it, m.index, m.index + m[0].length]);
          }
        }
      }
      if (!hits.length) {
        // Untouched pages are copied as they are, so their text stays selectable.
        const [copy] = await out.copyPages(src, [i - 1]);
        out.addPage(copy);
        page.cleanup();
        continue;
      }
      // Pages with matches become an image with black boxes, so the hidden text is really gone.
      const { canvas, ctx, base } = await renderPage(page, 2);
      const vp = page.getViewport({ scale: canvas.width / base.width });
      // Where a match starts inside a text item: measure the text in a similar font, then scale to the item's real width.
      const measure = document.createElement('canvas').getContext('2d');
      ctx.fillStyle = '#000';
      for (const [it, a, b] of hits) {
        const t = pdfjs.Util.transform(vp.transform, it.transform);
        const fontH = Math.hypot(t[2], t[3]);
        const w = it.width * vp.scale;
        measure.font = `100px ${styles[it.fontName]?.fontFamily || 'sans-serif'}`;
        const k = w / (measure.measureText(it.str).width || 1);
        const x0 = t[4] + measure.measureText(it.str.slice(0, a)).width * k;
        const x1 = t[4] + measure.measureText(it.str.slice(0, b)).width * k;
        const pad = fontH * 0.3;
        ctx.fillRect(x0 - pad, t[5] - fontH * 1.1, x1 - x0 + pad * 2, fontH * 1.45);
      }
      const jpg = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', 0.9)).arrayBuffer());
      const img = await out.embedJpg(jpg);
      out.addPage([base.width, base.height]).drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
      total += hits.length;
      redactedPages++;
      page.cleanup();
    }
    await pdf.destroy();
    if (!total) throw new Error('None of the words were found in this PDF. If it is a scan, run OCR PDF first.');
    return [{ name: `${baseName(f.name)}-redacted.pdf`, blob: pdfBlob(await out.save()), info: `${total} match${total > 1 ? 'es' : ''} blacked out on ${redactedPages} page${redactedPages > 1 ? 's' : ''}` }];
  },

  async 'compare-pdf'(files, o, progress) {
    if (files.length !== 2) throw new Error('Add exactly two PDFs: the original and the new version.');
    const texts = [];
    for (const f of files) {
      progress(`Reading ${f.name}…`);
      const pdf = await openPdfjs(f);
      const lines = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        for (const l of await pageLines(page)) {
          const text = o.ignoreSpace ? l.text.replace(/\s+/g, ' ').trim() : l.text;
          if (text) lines.push({ page: i, text });
        }
        page.cleanup();
      }
      await pdf.destroy();
      texts.push(lines);
    }
    progress('Comparing…');
    const ops = diffLines(texts[0], texts[1]);
    const added = ops.filter((d) => d.op === '+').length, removed = ops.filter((d) => d.op === '-').length;
    const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const rows = ops
      .map((d) => `<tr class="${d.op === '+' ? 'add' : d.op === '-' ? 'del' : ''}"><td>${d.op === '+' ? '' : d.a.page}</td><td>${d.op === '-' ? '' : d.b.page}</td><td class="op">${d.op === ' ' ? '' : d.op}</td><td>${esc((d.a || d.b).text)}</td></tr>`)
      .join('\n');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PDF comparison</title><style>
body{font:14px/1.5 system-ui,sans-serif;margin:24px;color:#111;background:#fff}h1{font-size:20px}table{border-collapse:collapse;width:100%}td{padding:2px 8px;vertical-align:top;border-bottom:1px solid #eee}td:nth-child(-n+3){color:#888;width:1%;white-space:nowrap}
.add{background:#dcfce7}.del{background:#fee2e2;text-decoration:line-through}.op{font-weight:bold}</style></head><body>
<h1>Comparison: ${esc(files[0].name)} → ${esc(files[1].name)}</h1>
<p><strong style="color:#15803d">${added} lines added</strong> · <strong style="color:#b91c1c">${removed} lines removed</strong> · Columns: page in the first file, page in the second file.</p>
<table>${rows}</table></body></html>`;
    return [{ name: `comparison-${baseName(files[0].name)}.html`, blob: new Blob([html], { type: 'text/html;charset=utf-8' }), info: added || removed ? `${added} added, ${removed} removed` : 'No text differences found' }];
  },

  async 'pdf-to-markdown'(files, o, progress) {
    const results = [];
    for (const f of files) {
      const pdf = await openPdfjs(f);
      const lines = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        progress(`Reading page ${i} of ${pdf.numPages}…`);
        const page = await pdf.getPage(i);
        lines.push(...(await pageLines(page)), null);
        page.cleanup();
      }
      await pdf.destroy();
      // The most used font size is body text; bigger lines become headings.
      const sizes = {};
      for (const l of lines) if (l?.text) sizes[Math.round(l.size)] = (sizes[Math.round(l.size)] || 0) + l.text.length;
      const body = Number(Object.entries(sizes).sort((x, y) => y[1] - x[1])[0]?.[0]) || 12;
      const md = [];
      for (const l of lines) {
        if (!l?.text) { md.push(''); continue; }
        const r = l.size / body;
        let t = l.text.replace(/^[•●▪◦‣∙·]\s*/, '- ').replace(/^[–—]\s+/, '- ');
        const short = t.length < 120;
        if (short && r >= 1.6) t = `# ${t}`;
        else if (short && r >= 1.25) t = `## ${t}`;
        else if (short && r >= 1.1) t = `### ${t}`;
        if (t.startsWith('#')) md.push('', t, '');
        else md.push(t);
      }
      const text = md.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
      results.push({
        name: `${baseName(f.name)}.md`,
        blob: new Blob([text], { type: 'text/markdown;charset=utf-8' }),
        info: text.trim() ? `${text.length.toLocaleString()} characters` : 'No text found (scanned PDF?)',
      });
    }
    return results;
  },

  async 'rotate-image'(files, o, progress) {
    const angle = parseInt(o.angle, 10) || 0;
    const results = [];
    for (const f of files) {
      progress(`Rotating ${f.name}…`);
      const bmp = await loadBitmap(f);
      const swap = angle % 180 !== 0;
      const canvas = document.createElement('canvas');
      canvas.width = swap ? bmp.height : bmp.width;
      canvas.height = swap ? bmp.width : bmp.height;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.scale(o.flip === 'horizontal' ? -1 : 1, o.flip === 'vertical' ? -1 : 1);
      ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
      results.push(await encodeImage(canvas, imageMime(f), 0.92, f.name, '-rotated'));
    }
    return results;
  },

  async 'crop-image'(files, o, progress) {
    const results = [];
    for (const f of files) {
      progress(`Cropping ${f.name}…`);
      const bmp = await loadBitmap(f);
      let sx, sy, sw, sh;
      if (o.mode === 'margins') {
        const pct = (v) => Math.min(45, Math.max(0, Number(v) || 0)) / 100;
        sx = bmp.width * pct(o.left);
        sy = bmp.height * pct(o.top);
        sw = bmp.width - sx - bmp.width * pct(o.right);
        sh = bmp.height - sy - bmp.height * pct(o.bottom);
      } else {
        const [rw, rh] = String(o.ratio).split(':').map(Number);
        const target = rw / rh;
        if (bmp.width / bmp.height > target) {
          sh = bmp.height;
          sw = sh * target;
        } else {
          sw = bmp.width;
          sh = sw / target;
        }
        sx = (bmp.width - sw) / 2;
        sy = o.anchor === 'top' ? 0 : o.anchor === 'bottom' ? bmp.height - sh : (bmp.height - sh) / 2;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      canvas.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const r = await encodeImage(canvas, imageMime(f), 0.92, f.name, '-cropped');
      r.info = `${bmp.width}×${bmp.height} → ${canvas.width}×${canvas.height}`;
      results.push(r);
    }
    return results;
  },

  async 'watermark-image'(files, o, progress) {
    const text = String(o.text || '').trim() || '© My Brand';
    const results = [];
    for (const f of files) {
      progress(`Watermarking ${f.name}…`);
      const bmp = await loadBitmap(f);
      const mime = imageMime(f);
      const canvas = drawToCanvas(bmp, bmp.width, bmp.height, mime === 'image/jpeg' ? '#fff' : null);
      const ctx = canvas.getContext('2d');
      const size = Math.max(10, Math.round((Math.min(canvas.width, canvas.height) * (Number(o.size) || 8)) / 100));
      ctx.font = `bold ${size}px system-ui, sans-serif`;
      ctx.fillStyle = o.color || '#ffffff';
      ctx.globalAlpha = (Number(o.opacity) || 50) / 100;
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width;
      if (o.position === 'tile') {
        ctx.textAlign = 'center';
        const stepY = size * 4;
        for (let y = size; y < canvas.height + size; y += stepY)
          for (let x = (y / stepY) % 2 ? tw : tw / 2; x < canvas.width + tw; x += tw * 2) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-Math.PI / 6);
            ctx.fillText(text, 0, 0);
            ctx.restore();
          }
      } else {
        const x = o.position === 'center' ? (canvas.width - tw) / 2 : o.position.endsWith('left') ? size : canvas.width - tw - size;
        const y = o.position === 'center' ? canvas.height / 2 : o.position.startsWith('top') ? size : canvas.height - size;
        ctx.fillText(text, x, y);
      }
      results.push(await encodeImage(canvas, mime, 0.92, f.name, '-watermarked'));
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

// Every "X to Y" image page (lib/image-formats.js) runs the shared converter with its fixed output format.
for (const t of IMAGE_CONVERSIONS) {
  PROCESSORS[t.slug] = (files, o, progress) => convertAll(files, { ...o, format: ENCODER[t.to] }, progress);
}

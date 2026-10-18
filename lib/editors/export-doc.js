'use client';
// Converts the rich-text editor's DOM into .docx (docx library) and .pdf (pdf-lib).

/** Flatten editor HTML into blocks of styled runs. */
export function parseBlocks(root) {
  const blocks = [];
  let listCounter = 0;

  const runsOf = (node, style = {}, out = []) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) {
        const text = n.textContent.replace(/\s+/g, ' ');
        if (text) out.push({ text, ...style });
      } else if (n.nodeType === 1) {
        const tag = n.tagName;
        if (tag === 'BR') { out.push({ br: true }); continue; }
        if (['UL', 'OL'].includes(tag)) continue; // nested lists handled separately
        const s = { ...style };
        const css = n.style || {};
        if (tag === 'B' || tag === 'STRONG' || Number(css.fontWeight) >= 600 || css.fontWeight === 'bold') s.bold = true;
        if (tag === 'I' || tag === 'EM' || css.fontStyle === 'italic') s.italic = true;
        if (tag === 'U' || /underline/.test(css.textDecoration || '')) s.underline = true;
        if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || /line-through/.test(css.textDecoration || '')) s.strike = true;
        runsOf(n, s, out);
      }
    }
    return out;
  };

  const align = (el) => {
    const a = el.style?.textAlign || el.getAttribute?.('align') || '';
    return ['center', 'right', 'justify'].includes(a) ? a : 'left';
  };

  const walkList = (list, level, listId) => {
    let i = 0;
    for (const li of list.children) {
      if (li.tagName !== 'LI') continue;
      i++;
      blocks.push({ type: 'li', ordered: list.tagName === 'OL', index: i, level, listId, align: align(li), runs: runsOf(li) });
      for (const sub of li.children) if (['UL', 'OL'].includes(sub.tagName)) walkList(sub, level + 1, ++listCounter);
    }
  };

  for (const el of root.children) {
    const tag = el.tagName;
    if (tag === 'UL' || tag === 'OL') walkList(el, 0, ++listCounter);
    else if (['H1', 'H2', 'H3'].includes(tag)) blocks.push({ type: tag.toLowerCase(), align: align(el), runs: runsOf(el) });
    else if (tag === 'HR') blocks.push({ type: 'hr' });
    else blocks.push({ type: 'p', align: align(el), runs: runsOf(el) });
  }
  // Loose text directly inside the editor (no wrapping block)
  if (!root.children.length && root.textContent.trim()) blocks.push({ type: 'p', align: 'left', runs: runsOf(root) });
  return blocks;
}

// ---------- DOCX ----------
export async function toDocx(blocks, title) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } = await import('docx');
  const AL = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED };
  const SIZE = { h1: 40, h2: 30, h3: 26, p: 22, li: 22 };
  const run = (r, type) =>
    r.br
      ? new TextRun({ text: '', break: 1 })
      : new TextRun({ text: r.text, bold: r.bold || undefined, italics: r.italic || undefined, underline: r.underline ? {} : undefined, strike: r.strike || undefined, size: SIZE[type] });

  const paragraphs = blocks.map((b) => {
    if (b.type === 'hr') return new Paragraph({ border: { bottom: { style: 'single', size: 6, color: 'BBBBBB', space: 1 } } });
    const opts = { children: b.runs.map((r) => run(r, b.type)), alignment: AL[b.align], spacing: { after: 120 } };
    if (b.type === 'h1') opts.heading = HeadingLevel.HEADING_1;
    if (b.type === 'h2') opts.heading = HeadingLevel.HEADING_2;
    if (b.type === 'h3') opts.heading = HeadingLevel.HEADING_3;
    if (b.type === 'li') {
      if (b.ordered) opts.numbering = { reference: 'ordered', level: Math.min(b.level, 2), instance: b.listId };
      else opts.bullet = { level: Math.min(b.level, 2) };
      opts.spacing = { after: 60 };
    }
    return new Paragraph(opts);
  });

  const doc = new Document({
    creator: 'NexPDF',
    title,
    numbering: {
      config: [
        {
          reference: 'ordered',
          levels: [0, 1, 2].map((level) => ({
            level,
            format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][level],
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [{ children: paragraphs }],
  });
  return Packer.toBlob(doc);
}

// ---------- PDF ----------
const PAGE = { a4: [595.28, 841.89], letter: [612, 792] };

export async function toPdf(blocks, { pageSize = 'a4', title = 'Document' } = {}) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator('NexPDF');
  const F = {
    r: await doc.embedFont(StandardFonts.Helvetica),
    b: await doc.embedFont(StandardFonts.HelveticaBold),
    i: await doc.embedFont(StandardFonts.HelveticaOblique),
    bi: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const fontFor = (r, heading) => F[(r.bold || heading ? 'b' : '') + (r.italic ? 'i' : '') || 'r'];

  // Replace characters the standard fonts can't encode.
  const ok = new Map();
  const safe = (text, font) =>
    [...text]
      .map((ch) => {
        const key = ch;
        if (!ok.has(key)) {
          try { font.widthOfTextAtSize(ch, 10); ok.set(key, true); } catch { ok.set(key, false); }
        }
        return ok.get(key) ? ch : '?';
      })
      .join('');

  const [W, H] = PAGE[pageSize] || PAGE.a4;
  const M = 56;
  let page = doc.addPage([W, H]);
  let y = H - M;
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };

  const SIZE = { h1: 24, h2: 18, h3: 14, p: 11, li: 11 };
  const GAP = { h1: 10, h2: 8, h3: 6, p: 8, li: 3 };

  for (const b of blocks) {
    if (b.type === 'hr') {
      if (y - 12 < M) newPage();
      page.drawLine({ start: { x: M, y: y - 6 }, end: { x: W - M, y: y - 6 }, thickness: 0.7, color: rgb(0.75, 0.75, 0.75) });
      y -= 16;
      continue;
    }
    const size = SIZE[b.type];
    const heading = b.type.startsWith('h');
    const indent = b.type === 'li' ? 18 + b.level * 18 : 0;
    const maxW = W - 2 * M - indent;
    const lineH = size * 1.4;

    // Split runs into words (keeping style) then wrap into lines.
    const words = [];
    for (const r of b.runs) {
      if (r.br) { words.push({ br: true }); continue; }
      const font = fontFor(r, heading);
      for (const part of safe(r.text, font).split(/(\s+)/)) if (part) words.push({ ...r, text: part, font, w: font.widthOfTextAtSize(part, size) });
    }
    const lines = [[]];
    let lw = 0;
    for (const w of words) {
      if (w.br) { lines.push([]); lw = 0; continue; }
      if (lw + w.w > maxW && lines[lines.length - 1].length && w.text.trim()) { lines.push([]); lw = 0; }
      if (!lines[lines.length - 1].length && !w.text.trim()) continue; // no leading spaces
      lines[lines.length - 1].push(w);
      lw += w.w;
    }

    if (heading) y -= GAP[b.type];
    lines.forEach((line, li) => {
      if (y - lineH < M) newPage();
      const width = line.reduce((s, w) => s + w.w, 0);
      let x = M + indent;
      if (b.align === 'center') x = M + indent + (maxW - width) / 2;
      if (b.align === 'right') x = W - M - width;
      const baseline = y - size;
      if (b.type === 'li' && li === 0) {
        const marker = b.ordered ? `${b.index}.` : '•';
        page.drawText(marker, { x: M + indent - 14, y: baseline, size, font: F.r, color: rgb(0.15, 0.15, 0.15) });
      }
      // Draw runs of same-styled words as one string, so copied PDF text has normal spacing.
      const segs = [];
      for (const w of line) {
        const last = segs[segs.length - 1];
        if (last && last.font === w.font && !!last.underline === !!w.underline && !!last.strike === !!w.strike) {
          last.text += w.text;
          last.w += w.w;
        } else segs.push({ ...w });
      }
      for (const s of segs) {
        page.drawText(s.text, { x, y: baseline, size, font: s.font, color: rgb(0.1, 0.1, 0.12) });
        if (s.underline) page.drawLine({ start: { x, y: baseline - 1.5 }, end: { x: x + s.w, y: baseline - 1.5 }, thickness: 0.6 });
        if (s.strike) page.drawLine({ start: { x, y: baseline + size * 0.3 }, end: { x: x + s.w, y: baseline + size * 0.3 }, thickness: 0.6 });
        x += s.w;
      }
      y -= lineH;
    });
    y -= GAP[b.type];
  }
  return new Blob([await doc.save()], { type: 'application/pdf' });
}

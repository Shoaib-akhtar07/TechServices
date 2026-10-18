// Presentation export: .pptx (pptxgenjs) and .pdf (pdf-lib). Slides are 16:9.

export const THEMES = {
  indigo: { name: 'Indigo', bg: '1E1B4B', title: 'FFFFFF', text: 'C7D2FE', accent: '818CF8' },
  ocean: { name: 'Ocean', bg: '0C4A6E', title: 'FFFFFF', text: 'BAE6FD', accent: '38BDF8' },
  midnight: { name: 'Midnight', bg: '0F172A', title: 'F8FAFC', text: 'CBD5E1', accent: 'F59E0B' },
  forest: { name: 'Forest', bg: '14532D', title: 'F0FDF4', text: 'BBF7D0', accent: '4ADE80' },
  sunset: { name: 'Sunset', bg: '7C2D12', title: 'FFF7ED', text: 'FED7AA', accent: 'FB923C' },
  paper: { name: 'Paper', bg: 'FFFFFF', title: '0F172A', text: '334155', accent: '4F6BFF' },
};

export const LAYOUTS = { title: 'Title slide', content: 'Title + bullet points', section: 'Section / closing' };

const bullets = (body) => String(body || '').split('\n').map((l) => l.trim()).filter(Boolean);

export async function toPptx(deck, title) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 in
  pptx.title = title;
  pptx.company = 'NexPDF';
  const t = THEMES[deck.theme] || THEMES.indigo;
  for (const s of deck.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: t.bg };
    const hasImg = !!s.image && s.layout === 'content';
    if (s.layout === 'title' || s.layout === 'section') {
      slide.addShape(pptx.ShapeType.rect, { x: 5.67, y: s.layout === 'title' ? 4.25 : 4.05, w: 2, h: 0.08, fill: { color: t.accent }, line: { color: t.accent } });
      slide.addText(s.title || '', { x: 0.8, y: 2.0, w: 11.73, h: 2.0, fontSize: s.layout === 'title' ? 44 : 38, bold: true, color: t.title, align: 'center', valign: 'bottom', fontFace: 'Arial' });
      slide.addText(s.body || '', { x: 1.5, y: 4.55, w: 10.33, h: 1.2, fontSize: 20, color: t.text, align: 'center', valign: 'top', fontFace: 'Arial' });
    } else {
      slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 1.45, w: 1.2, h: 0.07, fill: { color: t.accent }, line: { color: t.accent } });
      slide.addText(s.title || '', { x: 0.8, y: 0.45, w: 11.73, h: 1.0, fontSize: 32, bold: true, color: t.title, fontFace: 'Arial', valign: 'bottom' });
      const items = bullets(s.body).map((text) => ({ text, options: { bullet: { code: '25CF' }, color: t.text, breakLine: true } }));
      if (items.length) slide.addText(items, { x: 0.8, y: 1.85, w: hasImg ? 6.6 : 11.73, h: 4.9, fontSize: 22, valign: 'top', paraSpaceAfter: 12, fontFace: 'Arial' });
    }
    if (hasImg) slide.addImage({ data: s.image, x: 7.8, y: 1.85, w: 4.75, h: 4.75, sizing: { type: 'contain', w: 4.75, h: 4.75 } });
  }
  return pptx.write({ outputType: 'blob' });
}

export async function toSlidesPdf(deck, title) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const t = THEMES[deck.theme] || THEMES.indigo;
  const col = (hex) => rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
  const safe = (s, f) => [...String(s || '')].map((ch) => { try { f.widthOfTextAtSize(ch, 10); return ch; } catch { return '?'; } }).join('');
  const W = 960, H = 540;

  const wrap = (text, f, size, maxW) => {
    const out = [];
    let line = '';
    for (const word of safe(text, f).split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(test, size) > maxW && line) { out.push(line); line = word; } else line = test;
    }
    if (line) out.push(line);
    return out;
  };
  const center = (page, lines, f, size, yTop, color) =>
    lines.forEach((l, i) => page.drawText(l, { x: (W - f.widthOfTextAtSize(l, size)) / 2, y: yTop - (i + 1) * size * 1.2, size, font: f, color }));

  for (const s of deck.slides) {
    const page = doc.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: col(t.bg) });
    const hasImg = !!s.image && s.layout === 'content';
    if (s.layout === 'title' || s.layout === 'section') {
      const size = s.layout === 'title' ? 42 : 36;
      const lines = wrap(s.title, bold, size, W - 140);
      center(page, lines, bold, size, 300 + lines.length * size * 1.2, col(t.title));
      page.drawRectangle({ x: W / 2 - 72, y: 282, width: 144, height: 6, color: col(t.accent) });
      center(page, wrap(s.body, font, 20, W - 220), font, 20, 268, col(t.text));
    } else {
      wrap(s.title, bold, 30, W - 115).slice(0, 2).forEach((l, i, arr) => page.drawText(l, { x: 58, y: 440 + (arr.length - 1 - i) * 34, size: 30, font: bold, color: col(t.title) }));
      page.drawRectangle({ x: 58, y: 425, width: 86, height: 5, color: col(t.accent) });
      let y = 390;
      const maxW = hasImg ? 470 : W - 140;
      for (const b of bullets(s.body)) {
        const lines = wrap(b, font, 20, maxW);
        if (y - lines.length * 26 < 30) break;
        page.drawCircle({ x: 66, y: y - 13, size: 4, color: col(t.accent) });
        lines.forEach((l, i) => page.drawText(l, { x: 82, y: y - 20 - i * 26, size: 20, font, color: col(t.text) }));
        y -= lines.length * 26 + 14;
      }
    }
    if (hasImg) {
      const bytes = Uint8Array.from(atob(s.image.split(',')[1]), (c) => c.charCodeAt(0));
      const img = s.image.startsWith('data:image/png') ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      const box = 340, k = Math.min(box / img.width, box / img.height);
      page.drawImage(img, { x: 562 + (box - img.width * k) / 2, y: 50 + (box - img.height * k) / 2, width: img.width * k, height: img.height * k });
    }
  }
  return new Blob([await doc.save()], { type: 'application/pdf' });
}

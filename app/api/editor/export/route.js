import { getAccess } from '@/lib/server/auth';
import { consume, getDailyLimit } from '@/lib/server/usage';
import { toDocx, toPdf } from '@/lib/editors/export-doc';
import { toXlsx, toCsv, toSheetPdf } from '@/lib/editors/export-sheet';
import { toPptx, toSlidesPdf, THEMES, LAYOUTS } from '@/lib/editors/export-slides';
import { cleanWorkbook } from '@/lib/editors/sheet-model';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// The document editors are a Pro feature: files are only generated here, after the subscription check.
const MAX_BYTES = 25 * 1024 * 1024;
const BLOCK_TYPES = new Set(['p', 'h1', 'h2', 'h3', 'li', 'hr']);
const fail = (error, status) => Response.json({ error }, { status });
const str = (v, max = 500) => String(v ?? '').slice(0, max);

function cleanBlocks(input) {
  if (!Array.isArray(input) || input.length > 20000) throw new Error('Invalid document.');
  return input
    .filter((b) => b && BLOCK_TYPES.has(b.type))
    .map((b) => ({
      type: b.type,
      align: ['left', 'center', 'right', 'justify'].includes(b.align) ? b.align : 'left',
      ordered: !!b.ordered,
      index: Math.max(1, Math.min(10000, b.index | 0)),
      level: Math.max(0, Math.min(5, b.level | 0)),
      listId: Math.max(0, b.listId | 0),
      runs: (Array.isArray(b.runs) ? b.runs : []).slice(0, 5000).map((r) =>
        r?.br ? { br: true } : { text: str(r?.text, 20000), bold: !!r?.bold, italic: !!r?.italic, underline: !!r?.underline, strike: !!r?.strike }
      ),
    }));
}

function cleanDeck(input) {
  if (!input || !Array.isArray(input.slides) || !input.slides.length || input.slides.length > 200) throw new Error('Invalid presentation.');
  return {
    theme: THEMES[input.theme] ? input.theme : 'indigo',
    slides: input.slides.map((s) => ({
      layout: LAYOUTS[s?.layout] ? s.layout : 'content',
      title: str(s?.title, 300),
      body: str(s?.body, 5000),
      image: typeof s?.image === 'string' && /^data:image\/(png|jpeg);base64,/.test(s.image) ? s.image : null,
    })),
  };
}

const MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv;charset=utf-8',
  pdf: 'application/pdf',
};

export async function POST(req) {
  const { user, pro } = await getAccess();
  if (!user) return fail('Please log in to download your file.', 401);
  if (!pro) return fail('Creating documents is part of SoftServices Pro. Please upgrade to continue.', 402);
  if (Number(req.headers.get('content-length') || 0) > MAX_BYTES) return fail('This document is too large to export (25 MB max). Try smaller images.', 413);

  let body;
  try {
    body = await req.json();
  } catch {
    return fail('Invalid request.', 400);
  }
  const title = str(body.title, 120) || 'Untitled';

  let blob, ext;
  try {
    switch (body.kind) {
      case 'docx': blob = await toDocx(cleanBlocks(body.blocks), title); ext = 'docx'; break;
      case 'doc-pdf': blob = await toPdf(cleanBlocks(body.blocks), { pageSize: body.pageSize === 'letter' ? 'letter' : 'a4', title }); ext = 'pdf'; break;
      case 'xlsx': blob = await toXlsx(cleanWorkbook(body.wb), title); ext = 'xlsx'; break;
      case 'csv': {
        const wb = cleanWorkbook(body.wb);
        blob = toCsv(wb, Math.min(Math.max(0, body.sheet | 0), wb.sheets.length - 1));
        ext = 'csv';
        break;
      }
      case 'sheet-pdf': blob = await toSheetPdf(cleanWorkbook(body.wb), title); ext = 'pdf'; break;
      case 'pptx': blob = await toPptx(cleanDeck(body.deck), title); ext = 'pptx'; break;
      case 'slides-pdf': blob = await toSlidesPdf(cleanDeck(body.deck), title); ext = 'pdf'; break;
      default: return fail('Unknown export type.', 400);
    }
  } catch (e) {
    if (/^(Invalid|This workbook)/.test(e?.message)) return fail(e.message, 400);
    console.error('[editor-export]', body.kind, e);
    return fail('Sorry, the file could not be created. Please try again.', 500);
  }

  if (!(await consume(user.id))) return fail(`You’ve reached today’s fair-use limit of ${await getDailyLimit()} Pro files. It resets at midnight UTC.`, 429);

  return new Response(await blob.arrayBuffer(), {
    headers: { 'Content-Type': MIME[ext], 'Content-Disposition': `attachment; filename="export.${ext}"`, 'Cache-Control': 'no-store' },
  });
}

import { getAccess } from '@/lib/server/auth';
import { SERVER_PROCESSORS, UserError, zipResults } from '@/lib/server/premium';
import { consume } from '@/lib/server/usage';
import { findTool } from '@/lib/server/content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_FILES = 10;

// Heavy jobs (OCR, LibreOffice) are CPU-bound: cap how many run at once per server,
// how many may wait in line, and how long a request waits for its result.
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_JOBS || 2);
const MAX_QUEUE = Number(process.env.MAX_QUEUED_JOBS || 20);
const JOB_TIMEOUT_MS = Number(process.env.JOB_TIMEOUT_SECONDS || 180) * 1000;
let running = 0;
const queue = [];
const busy = () => running >= MAX_CONCURRENT && queue.length >= MAX_QUEUE;

function withTimeout(promise) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new UserError('This file took too long to process. Try a smaller file or fewer pages.', 504)), JOB_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function withSlot(fn) {
  if (running >= MAX_CONCURRENT) await new Promise((r) => queue.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    queue.shift()?.();
  }
}

const fail = (error, status) => Response.json({ error }, { status });

function accepts(name, accept) {
  const n = name.toLowerCase();
  return accept.split(',').some((a) => a.trim().startsWith('.') && n.endsWith(a.trim().toLowerCase()));
}

export async function POST(req, { params }) {
  const tool = await findTool(params.tool); // null when hidden in Admin → Tools
  if (!tool?.premium || !SERVER_PROCESSORS[tool.slug]) return fail('Unknown tool.', 404);

  // Check access before reading the upload body.
  const { user, pro, usage } = await getAccess();
  if (!user) return fail('Please log in to use Pro tools.', 401);
  if (!pro) return fail('This tool is part of SoftServices Pro. Please upgrade to continue.', 402);

  if (busy()) {
    return Response.json({ error: 'Our servers are very busy right now. Please try again in a minute.' }, { status: 503, headers: { 'Retry-After': '60' } });
  }
  const DAILY_LIMIT = usage.limit;
  if (usage.today >= DAILY_LIMIT) {
    return fail(`You’ve reached today’s fair-use limit of ${DAILY_LIMIT} Pro files. It resets at midnight UTC.`, 429);
  }

  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_BYTES * 1.05) return fail('Files are too large. The Pro limit is 100 MB.', 413);

  let form;
  try {
    form = await req.formData();
  } catch {
    return fail('Upload failed. Please try again.', 400);
  }
  const uploads = form.getAll('files').filter((f) => typeof f === 'object' && f.size > 0);
  if (!uploads.length) return fail('Please add a file.', 400);
  if (uploads.length > (tool.multiple ? MAX_FILES : 1)) return fail('Too many files.', 400);
  for (const f of uploads) {
    if (f.size > MAX_BYTES) return fail(`"${f.name}" is larger than 100 MB.`, 413);
    if (!accepts(f.name, tool.accept)) return fail(`"${f.name}" is not a supported file type for ${tool.name}.`, 415);
  }
  if (usage.today + uploads.length > DAILY_LIMIT) {
    return fail(`This would go over today’s fair-use limit (${DAILY_LIMIT - usage.today} Pro files left today).`, 429);
  }
  let options = {};
  try {
    options = JSON.parse(form.get('options') || '{}');
  } catch {}

  // Count the files up front so parallel requests can't slip past the limit.
  if (!(await consume(user.id, uploads.length))) {
    return fail(`You’ve reached today’s fair-use limit of ${DAILY_LIMIT} Pro files. It resets at midnight UTC.`, 429);
  }

  try {
    const result = await withTimeout(withSlot(async () => {
      const results = [];
      // Multi-file tools process each file separately; single-file tools get one.
      for (const f of uploads) {
        const file = { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) };
        results.push(await SERVER_PROCESSORS[tool.slug]([file], options));
      }
      return results.length === 1 ? results[0] : zipResults(results);
    }));
    return new Response(result.bytes, {
      headers: {
        'Content-Type': result.mime,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.name)}`,
        'X-Result-Name': encodeURIComponent(result.name),
        'X-Result-Info': encodeURIComponent(result.info || ''),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, e.status);
    console.error(`[premium:${tool.slug}]`, e);
    return fail('Something went wrong while processing your file. Please try again.', 500);
  }
}

import 'server-only';
import { SITE } from '@/lib/site';
import { CATEGORIES, COMMON_FAQS } from '@/lib/tools';
import { FORMATS } from '@/lib/image-formats';
import { COMPARISONS } from '@/lib/comparisons';
import { getSite, listPosts, listTools } from './content';

// /llms.txt (a short map) and /llms-full.txt (every tool's how-to in Markdown) for AI assistants.
// A community proposal (llmstxt.org): Google Search ignores it; other AI tools may read it.

const one = (s) => String(s || '').replace(/\s+/g, ' ').trim();

export async function buildLlms({ full = false } = {}) {
  const [{ freeMode, email }, tools, posts] = await Promise.all([getSite(), listTools(), listPosts().catch(() => [])]);
  const out = [];
  out.push(`# ${SITE.name}`);
  out.push(
    `> ${SITE.name} (${SITE.url}) is a website of free online tools for PDF files and images. ` +
      `Standard tools (merge, split, compress, convert, sign, edit PDF; convert, compress, resize and crop images) run entirely in the browser, ` +
      `so files are not uploaded and there is no sign-up, watermark or limit. ` +
      (freeMode
        ? 'Office conversions, OCR and the document editors are free with an account.'
        : 'Office conversions, OCR and the document editors are part of the paid Pro plan.'),
  );
  out.push(
    [
      'Key facts:',
      `- Private: browser tools process files on the user's device; Pro tools process files in memory on the server and delete them right after.`,
      `- Image formats: converts between ${['jpg', 'png', 'webp', 'gif', 'bmp', 'ico'].map((f) => FORMATS[f].name).join(', ')}; also opens AVIF and SVG.`,
      `- Works on Windows, macOS, Linux, Android and iPhone in any modern browser; no app to install.`,
      `- Contact: ${email}`,
    ].join('\n'),
  );

  for (const c of CATEGORIES) {
    const list = tools.filter((t) => t.category === c.id);
    if (!list.length) continue;
    out.push(`## ${c.name}\n\n` + list.map((t) => `- [${t.name}](${SITE.url}/${t.slug}/): ${one(t.short)}`).join('\n'));
  }

  if (posts.length) out.push(`## Guides\n\n` + posts.map((p) => `- [${one(p.title)}](${SITE.url}/blog/${p.slug}/): ${one(p.description)}`).join('\n'));

  out.push(
    `## Optional\n\n` +
      [
        `- [Full tool reference](${SITE.url}/llms-full.txt): every tool's steps and FAQs in one Markdown file`,
        `- [About ${SITE.name}](${SITE.url}/about/): who makes the site and how it works`,
        ...COMPARISONS.map((c) => `- [${c.competitor} alternative](${SITE.url}/compare/${c.slug}/): ${SITE.name} compared with ${c.competitor}, sourced`),
        ...(freeMode ? [] : [`- [Pricing](${SITE.url}/pricing/): Pro plan prices`]),
        `- [Privacy policy](${SITE.url}/privacy/)`,
      ].join('\n'),
  );

  if (full) {
    out.push('---\n\n# Tool reference');
    for (const t of tools) {
      const faqs = [...(t.faqs || []), ...(t.premium ? [] : COMMON_FAQS)];
      out.push(
        [
          `## ${t.name}`,
          `URL: ${SITE.url}/${t.slug}/`,
          '',
          one(t.answer || t.description),
          ...(t.from && t.to
            ? ['', `| | ${FORMATS[t.from].name} | ${FORMATS[t.to].name} |`, '|---|---|---|',
               ...['compression', 'transparency', 'animation', 'bestFor'].map((k) => `| ${k === 'bestFor' ? 'Best for' : k[0].toUpperCase() + k.slice(1)} | ${FORMATS[t.from][k]} | ${FORMATS[t.to][k]} |`)]
            : []),
          '',
          'Steps:',
          ...t.steps.map((s, i) => `${i + 1}. ${one(s)}`),
          ...(faqs.length ? ['', 'FAQ:', ...faqs.map((f) => `- **${one(f.q)}** ${one(f.a)}`)] : []),
        ].join('\n'),
      );
    }
  }
  return out.join('\n\n') + '\n';
}

export const markdownResponse = (text) =>
  new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });

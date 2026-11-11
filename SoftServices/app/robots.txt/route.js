import { SITE } from '@/lib/site';

// robots.txt as plain text (Next's robots.js cannot write Content-Signal lines).
// Policy chosen by the site owner: search engines, AI search/answer engines AND AI training are
// all welcome. Content-Signal is a stated preference (Cloudflare's Content Signals Policy), not a
// standard any crawler is known to enforce. Private areas are protected by login, not by this file.

export const dynamic = 'force-static';

const SIGNAL = 'Content-Signal: search=yes, ai-input=yes, ai-train=yes';
const PRIVATE = ['/api/', '/account/', '/admin/', '/login/', '/signup/', '/search/'];

const group = (agents, comment) =>
  [`# ${comment}`, ...agents.map((a) => `User-agent: ${a}`), SIGNAL, 'Allow: /', ...PRIVATE.map((p) => `Disallow: ${p}`)].join('\n');

export function GET() {
  const body = [
    group(['*'], 'Everyone, including search engines (Googlebot, Bingbot, Applebot…)'),
    // Named groups replace the * group for these bots, so each one repeats the same rules.
    group(['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User'], 'AI search and answer engines (citations in ChatGPT, Claude, Perplexity)'),
    group(['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent', 'Amazonbot', 'cohere-ai'], 'AI model training: allowed by the site owner'),
    `Sitemap: ${SITE.url}/sitemap.xml`,
    '',
  ].join('\n\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

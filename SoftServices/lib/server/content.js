import 'server-only';
import { cache } from 'react';
import { api, apiOrNull, getSiteConfig } from './api';
import { SITE } from '@/lib/site';
import { TOOLS, getTool, relatedTools } from '@/lib/tools';
import { POSTS } from '@/lib/posts';

// Everything an admin can change about the public site is read through here (from the .NET API),
// so pages, the sitemap and the admin panel all see the same values. Code defaults apply until
// something is saved, or when the API cannot be reached.

// ---------- Site ----------

/** Site identity with the admin's changes (Settings → Site). */
export async function getSite() {
  const c = await getSiteConfig();
  const s = c?.site || {};
  return {
    ...SITE,
    email: s.email || SITE.email,
    twitter: s.twitter || SITE.twitter,
    developer: s.developer || SITE.developer,
    developerUrl: s.developerUrl || '',
    announcement: s.announcement || '',
    verification: { google: s.verifyGoogle || '', bing: s.verifyBing || '' },
    business: s.business || {},
    profiles: s.profiles || [],
    freeMode: c?.freeMode ?? true,
  };
}

// ---------- Tools ----------

/** Fields of a tool the admin can rewrite. Options, accepted files and processing stay in code. */
export const TOOL_TEXT_FIELDS = ['name', 'short', 'title', 'description'];

/** Saved per-tool changes: { [slug]: { hidden?, name?, short?, title?, description? } }. */
export async function getToolOverrides() {
  const tools = (await getSiteConfig())?.tools;
  return tools && typeof tools === 'object' ? { ...tools } : {};
}

function withOverrides(tool, o = {}) {
  const changed = Object.fromEntries(TOOL_TEXT_FIELDS.filter((k) => o[k]).map((k) => [k, o[k]]));
  return { ...tool, ...changed, hidden: !!o.hidden };
}

/** Every tool with the admin's text changes, including hidden ones (for the admin panel). */
export async function listAllTools() {
  const overrides = await getToolOverrides();
  return TOOLS.map((t) => withOverrides(t, overrides[t.slug]));
}

/** Tools shown on the site. */
export async function listTools() {
  return (await listAllTools()).filter((t) => !t.hidden);
}

/** One visible tool, or null when it does not exist or is hidden. */
export async function findTool(slug) {
  const tool = getTool(slug);
  if (!tool) return null;
  const t = withOverrides(tool, (await getToolOverrides())[slug]);
  return t.hidden ? null : t;
}

export async function listRelatedTools(slug, n) {
  const tools = await listTools();
  // Variant pages (the many "X to Y" image converters) only appear next to each other.
  return relatedTools(slug, n, getTool(slug)?.variant ? tools : tools.filter((t) => !t.variant || t.slug === slug));
}

// ---------- Blog ----------

/** API post → the shape the pages use ({ body: blocks, date: 'YYYY-MM-DD' }). */
const toPost = (p) => ({ ...p, body: p.body || [], date: p.date || String(p.publishedAt).slice(0, 10) });

async function allPages(path) {
  const items = [];
  for (let page = 1; page <= 50; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const r = await api(`${path}${sep}page=${page}&pageSize=50`, path.startsWith('/posts/manage') ? {} : { token: null });
    items.push(...r.items);
    if (items.length >= r.total || !r.items.length) break;
  }
  return items;
}

/**
 * Posts, newest first. Published only, unless `all` (admin: drafts and scheduled too).
 * List items have no body. Falls back to the built-in guides when the API cannot be reached.
 */
export async function listPosts({ all = false } = {}) {
  try {
    return (await allPages(all ? '/posts/manage' : '/posts')).map(toPost);
  } catch (e) {
    if (all) throw e;
    console.warn(`Posts unavailable, using built-in guides: ${e.message}`);
    return POSTS;
  }
}

/** Any post (drafts too) by id, for the admin panel. */
export async function getPostById(id) {
  const p = await apiOrNull(`/posts/manage/${encodeURIComponent(id)}`);
  return p && toPost(p);
}

/** One published post by slug (with its body), or null. Cached per request so metadata + page count one view. */
export const findPost = cache(async (slug) => {
  try {
    const p = await apiOrNull(`/posts/${encodeURIComponent(slug)}`, { token: null });
    return p && toPost(p);
  } catch (e) {
    console.warn(`Post unavailable, using built-in guides: ${e.message}`);
    return POSTS.find((p) => p.slug === slug) || null;
  }
});

import { SITE } from '@/lib/site';
import { getSite, listPosts, listTools } from '@/lib/server/content';
import { COMPARISONS } from '@/lib/comparisons';

// Rebuilt hourly (and whenever an admin saves) so hidden tools, new posts and free mode reach the sitemap.
export const revalidate = 3600;

export default async function sitemap() {
  const [{ freeMode }, tools, posts] = await Promise.all([getSite(), listTools(), listPosts()]);
  const now = new Date();
  const page = (path, priority, changeFrequency = 'monthly', lastModified = now) => ({ url: `${SITE.url}${path}`, lastModified, changeFrequency, priority });
  return [
    page('/', 1.0, 'weekly'),
    ...tools.map((t) => page(`/${t.slug}/`, 0.9)),
    ...(freeMode ? [] : [page('/pricing/', 0.8)]),
    page('/blog/', 0.7, 'weekly'),
    ...posts.map((p) => page(`/blog/${p.slug}/`, 0.6, 'yearly', new Date(p.updatedAt || p.date))),
    page('/compare/', 0.5),
    ...COMPARISONS.map((c) => page(`/compare/${c.slug}/`, 0.5, 'monthly', new Date(c.checked))),
    page('/about/', 0.4, 'yearly'),
    page('/contact/', 0.3, 'yearly'),
    page('/privacy/', 0.2, 'yearly'),
    page('/terms/', 0.2, 'yearly'),
  ];
}

import { TOOLS } from '@/lib/tools';
import { POSTS } from '@/lib/posts';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap() {
  const now = new Date();
  const page = (path, priority, changeFrequency = 'monthly', lastModified = now) => ({ url: `${SITE.url}${path}`, lastModified, changeFrequency, priority });
  return [
    page('/', 1.0, 'weekly'),
    ...TOOLS.map((t) => page(`/${t.slug}/`, 0.9)),
    page('/pricing/', 0.8),
    page('/blog/', 0.7, 'weekly'),
    ...POSTS.map((p) => page(`/blog/${p.slug}/`, 0.6, 'yearly', new Date(p.date))),
    page('/about/', 0.4, 'yearly'),
    page('/contact/', 0.3, 'yearly'),
    page('/privacy/', 0.2, 'yearly'),
    page('/terms/', 0.2, 'yearly'),
  ];
}

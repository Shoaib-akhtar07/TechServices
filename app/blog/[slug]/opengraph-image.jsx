import { OG_SIZE, ogImage } from '@/lib/og';
import { SITE } from '@/lib/site';
import { getPost } from '@/lib/posts';

export const alt = `${SITE.name} guide`;
export const size = OG_SIZE;
export const contentType = 'image/png';
export const runtime = 'edge';

// Edge runtime has no database: built-in guides use their real text, posts written in the admin panel
// get a title made from their URL ("how-to-crop-a-pdf" → "How to crop a pdf").
export default function Image({ params }) {
  const post = getPost(params.slug);
  const fromSlug = params.slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return ogImage({ eyebrow: 'Guide', title: post?.title || fromSlug, subtitle: post?.description || `Free step-by-step guide from ${SITE.name}.` });
}

import { buildLlms, markdownResponse } from '@/lib/server/llms';

// Rebuilt hourly so new tools and blog posts show up (same as the sitemap).
export const revalidate = 3600;

export async function GET() {
  return markdownResponse(await buildLlms());
}

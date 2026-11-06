import { OG_SIZE, ogImage } from '@/lib/og';
import { SITE } from '@/lib/site';
import { getTool, getCategory } from '@/lib/tools';

export const alt = `${SITE.name} online tool`;
export const size = OG_SIZE;
export const contentType = 'image/png';
export const runtime = 'edge';

export default function Image({ params }) {
  const tool = getTool(params.tool);
  return ogImage({ eyebrow: getCategory(tool.category).name, title: tool.name, subtitle: tool.short });
}

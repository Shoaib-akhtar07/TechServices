import { OG_SIZE, ogImage } from '@/lib/og';
import { SITE } from '@/lib/site';

export const alt = `${SITE.name} – free online PDF tools`;
export const size = OG_SIZE;
export const contentType = 'image/png';
export const runtime = 'edge';

export default function Image() {
  return ogImage({ eyebrow: 'Online PDF & image tools', title: 'Every PDF tool you need, free', subtitle: 'Merge, split, compress, convert, sign, redact and edit PDFs in your browser.' });
}

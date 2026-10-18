import StaticPage from '@/components/StaticPage';
import { SITE } from '@/lib/site';
import { TOOLS } from '@/lib/tools';

export const metadata = { title: 'About Us', description: `Learn about ${SITE.name}, the free and private online PDF toolkit.`, alternates: { canonical: '/about/' } };

export default function About() {
  return (
    <StaticPage
      title={`About ${SITE.name}`}
      blocks={[
        { p: `${SITE.name} is a toolkit of ${TOOLS.filter((t) => !t.premium).length} free PDF and image tools built around one idea: your documents are yours. Instead of uploading files to a remote server, every free tool runs directly in your web browser. For jobs that need more power — Office conversions, OCR and PDF passwords — SoftServices Pro processes files on our server and deletes them immediately.` },
        { h2: 'What we believe' },
        { ul: ['Everyday document tasks should be free.', 'Privacy should be the default, not a premium feature.', 'Tools should be fast, simple and work on any device.'] },
        { h2: 'How it works' },
        { p: 'We use open-source libraries such as pdf-lib and Mozilla’s pdf.js to read, edit and create documents locally. When you close the tab, nothing remains.' },
        { p: 'Have an idea for a new tool? [Get in touch](/contact/).' },
      ]}
    />
  );
}

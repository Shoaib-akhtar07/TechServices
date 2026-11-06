import StaticPage from '@/components/StaticPage';
import { SITE } from '@/lib/site';

export const metadata = { title: 'Terms of Use', description: `The terms for using ${SITE.name} online PDF and image tools and accounts. Please read them before you use the service.`, alternates: { canonical: '/terms/' } };

export default function Terms() {
  return (
    <StaticPage
      title="Terms of use"
      blocks={[
        { p: 'Last updated: October 2026.' },
        { p: `By using ${SITE.name} you agree to these terms.` },
        { h2: 'Use of the service' },
        { p: 'You may use the tools for personal and commercial purposes. You are responsible for having the rights to the files you process and for keeping your own backups.' },
        { h2: 'No warranty' },
        { p: 'The tools are provided “as is”, without warranties of any kind. We are not liable for any loss or damage resulting from their use.' },
        { h2: 'Changes' },
        { p: 'We may update these terms from time to time. Continued use of the site means you accept the updated terms.' },
      ]}
    />
  );
}

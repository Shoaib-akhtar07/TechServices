import StaticPage from '@/components/StaticPage';
import { SITE } from '@/lib/site';
import { getSite } from '@/lib/server/content';

export const metadata = { title: 'Contact', description: `Contact the ${SITE.name} team with questions, bug reports or tool ideas.`, alternates: { canonical: '/contact/' } };

export default async function Contact() {
  const { email } = await getSite();
  return (
    <StaticPage
      title="Contact us"
      blocks={[
        { p: 'We read every message. Whether you found a bug, have a feature idea or a business enquiry, we would love to hear from you.' },
        { h2: 'Email' },
        { p: `Write to [${email}](mailto:${email}) and we usually reply within two working days.` },
        { h2: 'Reporting a problem' },
        { p: 'Please mention the tool you used, your browser and device, and what happened. Never send us confidential documents.' },
      ]}
    />
  );
}

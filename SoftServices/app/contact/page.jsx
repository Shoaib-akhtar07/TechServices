import StaticPage from '@/components/StaticPage';
import { SITE } from '@/lib/site';
import { getSite } from '@/lib/server/content';
import { addressLine, hasOffice, mapsHref, telHref } from '@/lib/business';

export const metadata = { title: 'Contact', description: `Contact the ${SITE.name} team with questions, bug reports or tool ideas.`, alternates: { canonical: '/contact/' } };

export default async function Contact() {
  const { email, business: b } = await getSite();
  const office = hasOffice(b)
    ? [
        { h2: 'Our office' },
        { p: `${b.name || SITE.name}, ${addressLine(b)}. [Open in Google Maps](${mapsHref(b)})` },
        ...(b.phone ? [{ p: `Phone: [${b.phone}](${telHref(b.phone)})` }] : []),
        ...(b.hours ? [{ p: `Opening hours: ${b.hours.replace(/\s*;\s*/g, ', ')}` }] : []),
      ]
    : [];
  return (
    <StaticPage
      title="Contact us"
      blocks={[
        { p: 'We read every message. Whether you found a bug, have a feature idea or a business enquiry, we would love to hear from you.' },
        { h2: 'Email' },
        { p: `Write to [${email}](mailto:${email}) and we usually reply within two working days.` },
        ...office,
        { h2: 'Reporting a problem' },
        { p: 'Please mention the tool you used, your browser and device, and what happened. Never send us confidential documents.' },
      ]}
    />
  );
}

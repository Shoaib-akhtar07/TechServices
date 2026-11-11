import { SITE } from './site';

// Office details (Admin → Settings → Office & profiles) as page text and schema.org data.
// One source for the footer, the contact page and the structured data keeps Name, Address and
// Phone identical everywhere, which is what local search checks.

/** True once a street address and city are saved: only then is the office shown or marked up. */
export const hasOffice = (b) => !!(b?.street && b?.city);

/** "Street, City Region Postal, Country" on one line. */
export function addressLine(b) {
  return [b.street, [b.city, b.region, b.postal].filter(Boolean).join(' '), b.country].filter(Boolean).join(', ');
}

/** "+92 300 1234567" → "+923001234567" for tel: links. */
export const telHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

/** Google Maps link: the saved Business Profile / Maps URL, else a search for the address. */
export const mapsHref = (b) => (b.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine(b))}`).replace(/\(/g, '%28').replace(/\)/g, '%29');

/** Organization (+ LocalBusiness when an office is saved) for the site-wide JSON-LD graph. */
export function organizationSchema(site) {
  const b = site.business || {};
  const sameAs = [...(site.profiles || []), ...(b.mapsUrl ? [b.mapsUrl] : [])];
  const org = {
    '@type': 'Organization',
    '@id': `${SITE.url}/#org`,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icon.svg`,
    email: site.email,
    ...(b.phone && { telephone: b.phone }),
    ...(sameAs.length && { sameAs }),
  };
  if (!hasOffice(b)) return [org];
  const lat = Number(b.lat), lng = Number(b.lng);
  const office = {
    '@type': 'ProfessionalService',
    '@id': `${SITE.url}/#office`,
    name: b.name || SITE.name,
    url: SITE.url,
    image: `${SITE.url}/icon.svg`,
    parentOrganization: { '@id': `${SITE.url}/#org` },
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.street,
      addressLocality: b.city,
      ...(b.region && { addressRegion: b.region }),
      ...(b.postal && { postalCode: b.postal }),
      ...(b.country && { addressCountry: b.country }),
    },
    ...(b.phone && { telephone: b.phone }),
    email: site.email,
    ...(Number.isFinite(lat) && Number.isFinite(lng) && b.lat && b.lng && { geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } }),
    ...(b.hours && { openingHours: b.hours.split(/\s*;\s*/).filter(Boolean) }),
    hasMap: mapsHref(b),
    ...(sameAs.length && { sameAs }),
  };
  return [org, office];
}

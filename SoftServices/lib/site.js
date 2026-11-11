// Change these values before going live (domain, socials, email).
export const SITE = {
  name: 'SoftServices',
  // Set NEXT_PUBLIC_SITE_URL to the live domain (e.g. https://www.example.com) in production.
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.softservices.com').replace(/\/+$/, ''),
  tagline: 'Free online PDF tools — fast, private, no sign-up',
  description:
    'Free online PDF tools: merge, split, compress, convert, sign, redact and edit PDFs in your browser. Private — no uploads, no watermarks.',
  email: 'support@softservices.com',
  twitter: '@softservices',
  // Company that built the site, credited in the footer.
  developer: 'NextTech Sol',
};

/** Date the tool pages' content was last reviewed (shown on pages and in structured data). Update when you edit tool copy. */
export const CONTENT_UPDATED = '2026-11-11';

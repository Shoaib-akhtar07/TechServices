// "Alternative to X" comparison pages (/compare/<slug>/). Every competitor fact must come from the
// competitor's own public page, linked in `sources` and checked on `checked`. Re-check them at least
// every 3 months: prices and limits change. Never add a claim you cannot link to.

export const COMPARISONS = [
  {
    slug: 'ilovepdf-alternative',
    competitor: 'iLovePDF',
    checked: '2026-11-11',
    title: 'iLovePDF Alternative: Free PDF Tools With No Uploads',
    description:
      'Comparing SoftServices and iLovePDF: where your files are processed, free-plan limits, price and apps. A private, free iLovePDF alternative that works in your browser.',
    intro:
      'iLovePDF is one of the best-known online PDF suites. SoftServices does the everyday jobs — merge, split, compress, convert, sign and image conversion — inside your browser instead of on a server, with no per-task file limits for those tools.',
    rows: [
      ['Price of the core tools', 'Free', 'Basic plan free; Premium US$7 per month, or US$4 per month billed yearly (US$48)'],
      ['Where your files go', 'Standard tools run in your browser: files never leave your device', 'Uploaded to iLovePDF servers; kept for up to 2 hours'],
      ['Free-plan file limits', 'No per-task limits set by the site for browser tools', 'Per task on Basic, e.g. 1 file for Split and OCR, 2 for Compress, 25 for Merge (up to 100 MB)'],
      ['OCR (scanned PDFs)', 'Yes, as a server tool for signed-in users', 'Basic OCR on the free plan; advanced OCR on Premium'],
      ['Desktop app', 'No — works in any modern browser', 'Yes, Windows and Mac'],
      ['Mobile app', 'No — works in mobile browsers', 'Yes, iOS and Android'],
    ],
    theirStrengths: [
      'Desktop apps for Windows and Mac and mobile apps for iOS and Android.',
      'Team plans (Business) and a choice of processing regions on paid plans.',
      'Advanced OCR, including OCR versions of PDF to Word, PowerPoint and Excel, on Premium.',
    ],
    ourStrengths: [
      'Files for the standard tools are processed on your own device, so confidential documents are never uploaded.',
      'No per-task file count limits on the browser tools, and no sign-up.',
      'Converts images between JPG, PNG, WebP, GIF, BMP and ICO, and opens AVIF and SVG.',
    ],
    verdict:
      'Choose iLovePDF if you want installed desktop or mobile apps or team accounts. Choose SoftServices if you would rather not upload documents at all, or keep hitting the free plan’s file limits.',
    sources: [
      ['iLovePDF pricing', 'https://www.ilovepdf.com/pricing'],
      ['iLovePDF FAQ (file retention)', 'https://www.ilovepdf.com/help/faq'],
      ['iLovePDF home page (apps)', 'https://www.ilovepdf.com/'],
    ],
  },
  {
    slug: 'pdf24-alternative',
    competitor: 'PDF24',
    checked: '2026-11-11',
    title: 'PDF24 Alternative: Private PDF Tools That Run in Your Browser',
    description:
      'Comparing SoftServices and PDF24 Tools: where files are processed, ads, limits and offline use. A free PDF24 alternative with no uploads for everyday PDF and image tasks.',
    intro:
      'PDF24 Tools is a popular free PDF toolbox from Germany. Both are free for everyday tasks; the main difference is where your files are processed.',
    rows: [
      ['Price of the core tools', 'Free', 'Free'],
      ['Where your files go', 'Standard tools run in your browser: files never leave your device', 'Online tools run on PDF24 servers; files deleted within one hour'],
      ['Limits', 'No per-task limits set by the site for browser tools', '“No artificial limits”, according to PDF24'],
      ['How it is paid for', 'Optional Pro features for Office conversions and OCR', 'Advertising on the web pages'],
      ['Offline use', 'Browser tools keep working once the page has loaded; no install', 'PDF24 Creator desktop software for Windows'],
    ],
    theirStrengths: [
      'Completely free online tools, with no artificial limits according to PDF24.',
      'PDF24 Creator: free Windows software for working fully offline.',
    ],
    ourStrengths: [
      'Standard tools process files on your own device, so nothing is uploaded — not even for a short time.',
      'Works the same on Windows, Mac, Linux, Android and iPhone, with nothing to install.',
      'Converts images between JPG, PNG, WebP, GIF, BMP and ICO, and opens AVIF and SVG.',
    ],
    verdict:
      'Choose PDF24 if you work on Windows and want installed offline software. Choose SoftServices if you want files to stay on your device on any system, straight from the browser.',
    sources: [
      ['PDF24 Tools home page', 'https://tools.pdf24.org/en/'],
      ['PDF24 Tools FAQ (file deletion)', 'https://tools.pdf24.org/en/faq'],
    ],
  },
];

export const getComparison = (slug) => COMPARISONS.find((c) => c.slug === slug);

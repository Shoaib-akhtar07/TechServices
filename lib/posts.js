// Starter blog articles. They are copied into the database once (lib/server/content.js) and from then on
// edited in Admin → Blog; this file is only used again when the database is unavailable.
// Body is a list of blocks: { h2 }, { p }, { ul: [] }, { ol: [] }. Links use [text](/path/).

export const POSTS = [
  {
    slug: 'how-to-reduce-pdf-file-size',
    title: 'How to Reduce PDF File Size Without Losing Quality (2026 Guide)',
    description: 'Practical ways to make a PDF smaller for email, job portals and government forms — and how to pick the right compression level.',
    date: '2026-10-01',
    tool: 'compress-pdf',
    body: [
      { p: 'Large PDFs bounce off email servers, fail on upload portals and eat mobile data. The good news: most PDFs can be shrunk dramatically in a few seconds. This guide explains why PDFs get big and which method to use for each situation.' },
      { h2: 'Why are some PDFs so large?' },
      { ul: ['Scanned pages stored as high-resolution photos', 'Images embedded at print quality (300 DPI or more)', 'Duplicate fonts and objects left by editing software', 'Hidden data such as old revisions, thumbnails and metadata'] },
      { h2: 'Method 1: Lossless compression' },
      { p: 'If your PDF is mostly text — reports, invoices, e-books — start with lossless compression. It rewrites the internal structure and packs objects more tightly, without touching how anything looks. Text stays selectable and searchable. In the [Compress PDF](/compress-pdf/) tool, choose “Light”.' },
      { h2: 'Method 2: Image re-compression' },
      { p: 'For scanned documents and photo-heavy files, the images are what make the file big. Re-encoding each page as an optimized image can cut size by 70–90%. Choose “Recommended” for a good balance or “Extreme” when you must hit a strict limit like 100 KB or 200 KB.' },
      { h2: 'Tips for hitting an exact size limit' },
      { ol: ['Try “Recommended” first and check the result size.', 'If still too big, use “Extreme”.', 'Still too big? Use [Split PDF](/split-pdf/) to upload in parts, or [Remove Pages](/remove-pages/) you do not need.', 'For scans, converting to [grayscale](/grayscale-pdf/) first can save even more.'] },
      { h2: 'Is online compression safe?' },
      { p: 'Many sites upload your file to a server. SoftServices compresses PDFs inside your browser, so sensitive documents like ID cards and bank statements never leave your device.' },
    ],
  },
  {
    slug: 'how-to-merge-pdf-files',
    title: 'How to Merge PDF Files into One Document (Free & Secure)',
    description: 'Combine several PDFs into a single file on any device, keep pages in the right order and avoid common mistakes.',
    date: '2026-09-20',
    tool: 'merge-pdf',
    body: [
      { p: 'Sending one tidy PDF is far more professional than attaching five separate files. Whether it is a job application, a project report or tax documents, merging takes less than a minute.' },
      { h2: 'Step-by-step' },
      { ol: ['Open the [Merge PDF](/merge-pdf/) tool.', 'Select or drag in all your PDF files.', 'Use the arrows on each file to set the order.', 'Click “Merge PDF” and download the combined file.'] },
      { h2: 'Common mistakes to avoid' },
      { ul: ['Merging files in the wrong order — check the page thumbnails before you click merge.', 'Including blank or duplicate pages — clean them up afterwards with [Remove Pages](/remove-pages/).', 'Ending up with a huge file — run the result through [Compress PDF](/compress-pdf/).'] },
      { h2: 'Can I merge images and PDFs together?' },
      { p: 'Yes. First turn your photos into a PDF with [JPG to PDF](/jpg-to-pdf/), then merge that file with your other PDFs.' },
    ],
  },
  {
    slug: 'how-to-sign-a-pdf-online',
    title: 'How to Sign a PDF Online Without Printing',
    description: 'Add your handwritten signature to any PDF from your phone or computer in under a minute — no printer or scanner needed.',
    date: '2026-09-05',
    tool: 'sign-pdf',
    body: [
      { p: 'Printing a document just to sign it and scan it back is slow and wasteful. An electronic signature does the same job in seconds.' },
      { h2: 'Sign a PDF in 3 steps' },
      { ol: ['Open [Sign PDF](/sign-pdf/) and choose your document.', 'Draw your signature with a mouse, trackpad or finger.', 'Choose the page and position, then download the signed PDF.'] },
      { h2: 'Tips for a clean-looking signature' },
      { ul: ['Draw large — the tool trims and scales the signature automatically.', 'Dark blue ink is a classic choice for documents that will be printed.', 'Tick “Add today’s date” for forms that need a signing date.'] },
      { h2: 'Lock the document after signing' },
      { p: 'If the PDF is a fillable form, run it through [Flatten PDF](/flatten-pdf/) after signing so the filled-in values can no longer be changed.' },
    ],
  },
  {
    slug: 'pdf-to-jpg-vs-png',
    title: 'PDF to JPG vs PDF to PNG: Which Format Should You Use?',
    description: 'Understand the difference between JPG and PNG when converting PDF pages to images, with recommended settings for each use case.',
    date: '2026-08-22',
    tool: 'pdf-to-jpg',
    body: [
      { p: 'Turning PDF pages into images is handy for social media posts, presentations and websites. But should you pick JPG or PNG?' },
      { h2: 'Choose JPG when…' },
      { ul: ['The page contains photos or gradients', 'You need small files for sharing on WhatsApp or email', 'Slight compression artefacts are acceptable'] },
      { h2: 'Choose PNG when…' },
      { ul: ['The page is mostly text, charts or line art', 'You need perfectly sharp edges', 'You plan to edit the image further'] },
      { h2: 'What resolution should I use?' },
      { p: '72 DPI is fine for quick previews, 150 DPI is great for screens, and 300 DPI is the standard for printing. Try [PDF to JPG](/pdf-to-jpg/) or [PDF to PNG](/pdf-to-png/) and compare.' },
    ],
  },
];

export function getPost(slug) {
  return POSTS.find((p) => p.slug === slug);
}

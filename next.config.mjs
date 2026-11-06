/** @type {import('next').NextConfig} */
const nextConfig = {
  // Runs as a Node server (needed for login, the API proxy and Pro tools).
  // Free tool pages are still pre-rendered as static HTML at build time.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  // Files in /public are not content-hashed, so Next serves them with max-age=0 and the browser
  // re-checks them on every visit. Let the browser keep them (the pdf.js worker is ~1 MB).
  async headers() {
    const week = 'public, max-age=604800, stale-while-revalidate=86400';
    return [
      { source: '/pdf.worker.min.js', headers: [{ key: 'Cache-Control', value: week }] },
      { source: '/icon.svg', headers: [{ key: 'Cache-Control', value: week }] },
      { source: '/manifest.webmanifest', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }] },
    ];
  },
  experimental: {
    // Native / worker-based packages must be loaded by Node directly, not bundled.
    serverComponentsExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist', 'tesseract.js', 'exceljs', 'pptxgenjs', 'docx', '@cantoo/pdf-lib'],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;

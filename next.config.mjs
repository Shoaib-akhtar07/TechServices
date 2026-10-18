/** @type {import('next').NextConfig} */
const nextConfig = {
  // Runs as a Node server (needed for login, Stripe and Pro tools).
  // Free tool pages are still pre-rendered as static HTML at build time.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  experimental: {
    // Native / worker-based packages must be loaded by Node directly, not bundled.
    serverComponentsExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist', 'tesseract.js', '@prisma/client', 'bcryptjs', 'exceljs', 'pptxgenjs', 'docx', '@cantoo/pdf-lib'],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;

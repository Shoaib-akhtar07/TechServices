import './globals.css';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HomeButton from '@/components/HomeButton';
import JsonLd from '@/components/JsonLd';
import { RichInline } from '@/components/RichText';
import Providers from '@/components/Providers';
import SiteChrome from '@/components/SiteChrome';
import { SITE } from '@/lib/site';
import { getSite, listTools } from '@/lib/server/content';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' });
const display = Jost({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-display', display: 'swap' });

// Pages re-read admin changes at least this often (saving in the admin panel refreshes them at once).
export const revalidate = 300;

export async function generateMetadata() {
  const site = await getSite();
  return {
  metadataBase: new URL(SITE.url),
  title: {
    default: `Free Online PDF Tools – Merge, Compress & Convert | ${SITE.name}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ['pdf tools', 'online pdf editor', 'merge pdf', 'compress pdf', 'pdf converter', 'free pdf tools'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    url: SITE.url,
    title: `${SITE.name} – Free Online PDF Tools`,
    description: SITE.description,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', site: site.twitter, title: `${SITE.name} – Free Online PDF Tools`, description: SITE.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  manifest: '/manifest.webmanifest',
  // Search Console / Bing codes are entered in Admin → Settings → Search engines.
  verification: { google: site.verification.google || undefined, other: site.verification.bing ? { 'msvalidate.01': site.verification.bing } : undefined },
  };
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6efe3' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  width: 'device-width',
  initialScale: 1,
};

// Applies the saved/system theme before paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function RootLayout({ children }) {
  const [site, tools] = await Promise.all([getSite(), listTools()]);
  // Only what menus and the tool grid need goes to the browser.
  const toolList = tools.map(({ slug, name, short, icon, category, premium }) => ({ slug, name, short, icon, category, premium: !!premium }));
  return (
    <html lang="en" className={`${serif.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              { '@type': 'Organization', '@id': `${SITE.url}/#org`, name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon.svg`, email: site.email },
              {
                '@type': 'WebSite',
                '@id': `${SITE.url}/#website`,
                name: SITE.name,
                url: SITE.url,
                publisher: { '@id': `${SITE.url}/#org` },
                inLanguage: 'en',
              },
            ],
          }}
        />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
          Skip to content
        </a>
        <Providers freeMode={site.freeMode} tools={toolList}>
          <SiteChrome>
            {site.announcement && (
              <p className="bg-ink px-4 py-2 text-center text-sm text-cream-100 dark:bg-brand-900">
                <RichInline text={site.announcement} />
              </p>
            )}
            <Header />
          </SiteChrome>
          <main id="main">{children}</main>
          <SiteChrome>
            <Footer />
            <HomeButton />
          </SiteChrome>
        </Providers>
      </body>
    </html>
  );
}

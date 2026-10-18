import './globals.css';
import { Cormorant_Garamond, Jost } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import Providers from '@/components/Providers';
import { SITE } from '@/lib/site';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' });
const display = Jost({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-display', display: 'swap' });

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} – Free Online PDF Tools: Merge, Split, Compress & Convert`,
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
  twitter: { card: 'summary_large_image', site: SITE.twitter, title: `${SITE.name} – Free Online PDF Tools`, description: SITE.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  manifest: '/manifest.webmanifest',
  // Paste your Search Console / Bing verification codes here:
  verification: { google: '', other: { 'msvalidate.01': '' } },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  width: 'device-width',
  initialScale: 1,
};

// Applies the saved/system theme before paint to avoid a flash.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${serif.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              { '@type': 'Organization', '@id': `${SITE.url}/#org`, name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon.svg`, email: SITE.email },
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
        <Providers>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

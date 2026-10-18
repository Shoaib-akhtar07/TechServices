import Link from 'next/link';
import { ShieldCheck, Zap, Infinity as InfinityIcon, Smartphone, Moon, Package, Crown } from 'lucide-react';
import ToolGrid from '@/components/ToolGrid';
import JsonLd from '@/components/JsonLd';
import { TOOLS } from '@/lib/tools';
import { SITE } from '@/lib/site';

export const metadata = { alternates: { canonical: '/' } };

const FEATURES = [
  { icon: ShieldCheck, title: 'Private by design', text: 'Files are processed inside your browser. They are never uploaded, stored or seen by anyone — including us.' },
  { icon: Zap, title: 'Instant results', text: 'No upload or download queue. Work starts the moment you drop a file, even on slow connections.' },
  { icon: InfinityIcon, title: 'Free, no limits', text: 'No sign-up, no daily caps, no file-size paywalls and no watermarks on your documents.' },
  { icon: Package, title: 'Batch & ZIP', text: 'Process many files at once and grab every result in a single ZIP download.' },
  { icon: Smartphone, title: 'Works everywhere', text: 'Android, iPhone, Windows, Mac or Linux — any modern browser, no app to install.' },
  { icon: Moon, title: 'Dark mode', text: 'Easy on the eyes at night, with a theme that follows your system settings.' },
];

const FAQS = [
  { q: 'What is NexPDF?', a: `NexPDF is a collection of ${TOOLS.filter((t) => !t.premium).length} free online tools for working with PDF files and images — merge, split, compress, convert, sign, watermark, number pages and more. Pro adds online Word, Excel, PowerPoint and PDF editors, Office conversions, OCR, PDF passwords and premium templates.` },
  { q: 'Do I need to install anything or create an account?', a: 'No. Every tool runs in your web browser. Just open a tool, add your files and download the result.' },
  { q: 'Are my documents uploaded to a server?', a: 'Not with the free tools. Unlike most online PDF services, NexPDF’s free tools process files locally on your device using your browser, so your documents never leave your computer or phone. Pro tools (Office conversions, OCR, passwords) run on our server over encrypted HTTPS, and files are deleted as soon as the result is ready.' },
  { q: 'Is there a file size limit?', a: 'There is no artificial limit. Very large files depend on your device’s memory, but typical documents of several hundred pages work well.' },
  { q: 'Can I use NexPDF offline?', a: 'Once a tool page has loaded, processing does not need an internet connection, because all the work happens on your device.' },
];

export default function Home() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'ItemList',
              name: 'PDF tools',
              itemListElement: TOOLS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, url: `${SITE.url}/${t.slug}/` })),
            },
            {
              '@type': 'FAQPage',
              mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
            },
          ],
        }}
      />

      {/* Pulled up behind the floating header so the cream background reaches the top of the page. */}
      <section className="relative -mt-20 overflow-hidden bg-gradient-to-b from-[#f6efe3] via-[#faf7f1] to-slate-50 pt-20 font-display dark:from-[#16120d] dark:via-slate-950 dark:to-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.9),transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(154,118,70,0.18),transparent_55%)]" />
        <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-14 text-center sm:pt-20">
          <p
            aria-hidden="true"
            className="bg-gradient-to-r from-slate-800 from-40% to-bronze-500 bg-clip-text pl-[0.45em] text-4xl font-light tracking-[0.45em] text-transparent dark:from-white dark:via-slate-200 dark:to-bronze-300 sm:text-7xl"
          >
            NEXPDF
          </p>
          <h1 className="mt-8 font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl">
            All Your PDF Work{' '}
            <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-bronze-500 bg-clip-text text-transparent dark:from-slate-100 dark:to-bronze-300">in One Place.</span>
            <span className="mt-2 block font-normal text-slate-800 dark:text-slate-200">Free, Fast &amp; Private.</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
            Merge, split, compress, convert, sign and edit PDFs in seconds — right in your browser. No uploads, no sign-up, no watermarks.
          </p>
          <div className="mx-auto mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
            <Link
              href="/merge-pdf/"
              className="rounded-xl bg-gradient-to-r from-[#141a24] via-[#1d2129] to-[#5c4128] px-8 py-4 text-[17px] font-medium text-white shadow-xl shadow-bronze-900/25 transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              Merge PDF now
            </Link>
            <Link
              href="#tools"
              className="rounded-xl border border-slate-900/80 bg-white/70 px-8 py-4 text-[17px] font-medium text-slate-900 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/30 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Explore all <span className="text-bronze-500 dark:text-bronze-300">tools</span>
            </Link>
          </div>
          <p className="mt-8 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Your files never leave your device
          </p>
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-7xl scroll-mt-28 px-4" aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="sr-only">All PDF tools</h2>
        <ToolGrid />
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4">
        <h2 className="text-center text-3xl font-bold">Why people switch to NexPDF</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600 dark:text-slate-400">
          Most online PDF sites upload your documents to their servers. NexPDF does all the work on your own device, so it is faster and far more private.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <Icon className="h-8 w-8 text-brand-600" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-4">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 p-8 text-white sm:p-12">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-300">
                <Crown className="h-4 w-4" /> NexPDF Pro
              </p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Need Word, Excel or OCR? Go Pro.</h2>
              <p className="mt-4 text-slate-300">
                Convert PDFs to editable Office files and back, turn scans into searchable text, and lock documents with AES-256 passwords.
              </p>
              <Link href="/pricing/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg hover:opacity-90">
                <Crown className="h-5 w-5" /> See plans — from $4/month
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 text-sm">
              {TOOLS.filter((t) => t.premium).map((t) => (
                <li key={t.slug}>
                  <Link href={`/${t.slug}/`} className="block rounded-xl bg-white/5 px-4 py-3 font-medium ring-1 ring-white/10 hover:bg-white/10">
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-5xl px-4">
        <h2 className="text-center text-3xl font-bold">How it works</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {['Pick a tool and add your files', 'Adjust options if you like', 'Download the result instantly'].map((s, i) => (
            <li key={s} className="rounded-2xl bg-white p-6 text-center dark:bg-slate-900">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</span>
              <p className="mt-4 font-medium">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-24 max-w-3xl px-4">
        <h2 className="text-center text-3xl font-bold">Frequently asked questions</h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <summary className="cursor-pointer list-none font-semibold">{f.q}</summary>
              <p className="mt-3 text-slate-600 dark:text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

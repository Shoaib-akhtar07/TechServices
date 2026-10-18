import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import ToolClient from '@/components/ToolClient';
import ToolCard from '@/components/ToolCard';
import ToolIcon from '@/components/ToolIcon';
import JsonLd from '@/components/JsonLd';
import ProBadge from '@/components/ProBadge';
import EditorLoader from '@/components/editors/EditorLoader';
import { TOOLS, COMMON_FAQS, PRO_FAQS, getTool, getCategory, relatedTools } from '@/lib/tools';
import { PLANS } from '@/lib/plans';
import { SITE } from '@/lib/site';

export const dynamicParams = false;

// "Compress PDF" -> "compress PDF" (keeps acronyms capitalised for headings).
const PROPER = { pdf: 'PDF', jpg: 'JPG', png: 'PNG', ocr: 'OCR', word: 'Word', excel: 'Excel', powerpoint: 'PowerPoint' };
const lowerName = (s) => s.toLowerCase().replace(/\b(pdf|jpg|png|ocr|word|excel|powerpoint)\b/g, (m) => PROPER[m]);
// "JPG to PDF" -> "convert JPG to PDF", "Merge PDF" -> "merge PDF" (reads as a verb phrase in headings).
const action = (s) => (/ to /i.test(s) ? `convert ${lowerName(s)}` : lowerName(s));

export function generateStaticParams() {
  return TOOLS.map((t) => ({ tool: t.slug }));
}

export function generateMetadata({ params }) {
  const tool = getTool(params.tool);
  if (!tool) return {};
  const url = `/${tool.slug}/`;
  return {
    title: { absolute: `${tool.title} | ${SITE.name}` },
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: url },
    openGraph: { title: tool.title, description: tool.description, url, type: 'website', siteName: SITE.name },
    twitter: { card: 'summary_large_image', title: tool.title, description: tool.description },
  };
}

export default function ToolPage({ params }) {
  const tool = getTool(params.tool);
  if (!tool) notFound();
  const cat = getCategory(tool.category);
  const premium = !!tool.premium;
  const faqs = [...tool.faqs, ...(premium ? PRO_FAQS : COMMON_FAQS)];
  const editor = tool.editor;
  const perks = editor
    ? [
        ['Real Office files', 'Downloads open in Microsoft Office, Google Docs, LibreOffice and WPS.'],
        ['Auto-saved draft', 'Close the tab and come back — your draft is still here, in this browser.'],
        ['Private by design', 'Drafts stay in your browser. Files are built on our server when you download and never stored.'],
      ]
    : premium
    ? [
        ['Accurate conversion', 'Server-grade engines for results you can rely on.'],
        ['Files up to 100 MB', 'Big reports, scans and presentations are fine.'],
        ['Deleted instantly', 'We remove your file as soon as the result is ready.'],
      ]
    : [
        ['No uploads', 'Your files stay on your device the whole time.'],
        ['No sign-up', 'Use the tool instantly, no email or account required.'],
        ['No watermarks', 'Clean output files, free forever.'],
      ];
  const url = `${SITE.url}/${tool.slug}/`;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebApplication',
              name: `${SITE.name} ${tool.name}`,
              url,
              description: tool.description,
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Any (web browser)',
              browserRequirements: 'Requires JavaScript',
              offers: premium
                ? { '@type': 'Offer', price: String(PLANS.monthly.price), priceCurrency: 'USD', category: 'subscription', url: `${SITE.url}/pricing/` }
                : { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              publisher: { '@id': `${SITE.url}/#org` },
            },
            {
              '@type': 'HowTo',
              name: `How to ${action(tool.name)} online`,
              totalTime: 'PT1M',
              step: tool.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: `Step ${i + 1}`, text: s })),
            },
            {
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
                { '@type': 'ListItem', position: 2, name: tool.name, item: url },
              ],
            },
          ],
        }}
      />

      <section className={`mx-auto px-4 pt-6 ${editor ? 'max-w-7xl' : 'max-w-6xl'}`}>
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <Link href="/" className="hover:text-brand-600">Home</Link> <span aria-hidden>›</span>{' '}
          <span className={cat.text}>{cat.name}</span> <span aria-hidden>›</span> <span className="text-slate-700 dark:text-slate-300">{tool.name}</span>
        </nav>
        <div className="mt-8 text-center">
          <span className={`mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white ${cat.color}`}>
            <ToolIcon name={tool.icon} className="h-7 w-7" />
          </span>
          <h1 className="text-4xl font-semibold sm:text-6xl">{tool.name}</h1>
          {premium && <ProBadge className="mt-3" />}
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">{tool.description}</p>
        </div>
        <div className="mt-10">{editor ? <EditorLoader kind={editor} name={tool.name} slug={tool.slug} /> :<ToolClient slug={tool.slug} />}</div>
      </section>

      <article className="mx-auto mt-20 max-w-4xl px-4">
        <h2 className="text-3xl font-semibold">
          How to {action(tool.name)} online{premium ? '' : ' for free'}
        </h2>
        <ol className="mt-6 space-y-4">
          {tool.steps.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
              <p className="pt-1 text-slate-700 dark:text-slate-300">{s}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {perks.map(([t, d]) => (
            <div key={t} className="rounded-2xl card p-5">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex gap-4 rounded-2xl bg-emerald-50 p-6 dark:bg-emerald-500/10">
          <ShieldCheck className="h-8 w-8 shrink-0 text-emerald-600" />
          <div>
            {editor ? (
              <>
                <h2 className="text-xl font-semibold">How we protect your documents</h2>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  You write in your own browser and your draft is saved only on this device. When you download, the content travels over encrypted HTTPS, the
                  file is generated in memory for signed-in Pro members, and nothing is kept on our servers.
                </p>
              </>
            ) : premium ? (
              <>
                <h2 className="text-xl font-semibold">How we protect your files</h2>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  Files travel over encrypted HTTPS, are processed in memory on our server and are deleted the moment your result is ready. Only signed-in Pro
                  members can use this tool, and we never keep copies or look at your documents.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold">Safe {lowerName(tool.name)} with zero uploads</h2>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {SITE.name} uses modern browser technology to {tool.short.charAt(0).toLowerCase() + tool.short.slice(1, -1)} directly on your device. Confidential
                  contracts, IDs and bank statements are never sent across the internet.
                </p>
              </>
            )}
          </div>
        </div>

        <h2 className="mt-16 text-3xl font-semibold">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="rounded-2xl card p-5">
              <summary className="cursor-pointer list-none font-semibold">{f.q}</summary>
              <p className="mt-3 text-slate-600 dark:text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </article>

      <section className="mx-auto mt-20 max-w-6xl px-4">
        <h2 className="mb-6 text-3xl font-semibold">Related tools</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {relatedTools(tool.slug).map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
      </section>
    </>
  );
}

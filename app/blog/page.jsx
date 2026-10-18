import Link from 'next/link';
import { POSTS } from '@/lib/posts';

export const metadata = {
  title: 'PDF Guides & Tips Blog',
  description: 'Step-by-step guides for merging, compressing, signing and converting PDF files — free tips from the NexPDF team.',
  alternates: { canonical: '/blog/' },
};

export default function Blog() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-14">
      <h1 className="text-4xl font-extrabold tracking-tight">PDF guides &amp; tips</h1>
      <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">Learn how to get more done with your documents.</p>
      <div className="mt-10 space-y-5">
        {POSTS.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}/`} className="block rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand-500 dark:border-slate-800 dark:bg-slate-900">
            <time dateTime={p.date} className="text-sm text-slate-500">
              {new Date(p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            <h2 className="mt-1 text-xl font-bold">{p.title}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">{p.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

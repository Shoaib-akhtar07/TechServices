import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findPost, findTool, listPosts } from '@/lib/server/content';
import { SITE } from '@/lib/site';
import RichText from '@/components/RichText';
import JsonLd from '@/components/JsonLd';

// Posts written later in Admin → Blog render on first visit.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await listPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const post = await findPost(params.slug);
  if (!post) return {};
  return {
    title: { absolute: `${post.title} | ${SITE.name}` },
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}/` },
    openGraph: { type: 'article', title: post.title, description: post.description, publishedTime: post.date, ...(post.coverImageUrl && { images: [post.coverImageUrl] }) },
  };
}

export default async function Post({ params }) {
  const post = await findPost(params.slug);
  if (!post) notFound();
  const tool = post.tool ? await findTool(post.tool) : null;
  const url = `${SITE.url}/blog/${post.slug}/`;
  return (
    <article className="mx-auto max-w-3xl px-4 pt-14">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : post.date,
          mainEntityOfPage: url,
          author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
          publisher: { '@id': `${SITE.url}/#org` },
        }}
      />
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-600">Home</Link> › <Link href="/blog/" className="hover:text-brand-600">Blog</Link>
      </nav>
      <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">{post.title}</h1>
      <time dateTime={post.date} className="mt-3 block text-sm text-slate-500">
        {new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        {post.readingMinutes ? ` · ${post.readingMinutes} min read` : ''}
      </time>
      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt="" className="mt-8 w-full rounded-3xl object-cover" />
      )}
      <div className="mt-8">
        <RichText blocks={post.body} />
      </div>
      {tool && (
        <div className="mt-12 rounded-3xl bg-brand-600 p-8 text-center text-white">
          <h2 className="text-3xl font-semibold">Try {tool.name} now</h2>
          <p className="mt-2 text-brand-100">{tool.short}</p>
          <Link href={`/${tool.slug}/`} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 hover:bg-brand-50">
            Open {tool.name}
          </Link>
        </div>
      )}
    </article>
  );
}

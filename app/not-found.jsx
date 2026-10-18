import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-5xl font-extrabold">404</h1>
      <p className="mt-4 text-slate-600 dark:text-slate-400">This page does not exist.</p>
      <Link href="/" className="btn-primary mt-8">See all PDF tools</Link>
    </div>
  );
}

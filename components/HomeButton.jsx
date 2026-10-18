'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home } from 'lucide-react';

// Floating "back to home" button, shown on every page except the home page.
export default function HomeButton() {
  if (usePathname() === '/') return null;
  return (
    <Link
      href="/"
      aria-label="Go to home page"
      className="group fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-ink via-[#1d2129] to-[#5c4128] text-white shadow-btn ring-4 ring-white/70 transition duration-300 animate-[home-in_0.4s_ease-out] hover:-translate-y-1 hover:shadow-btn-hover dark:ring-slate-900/70 sm:bottom-6 sm:right-6"
    >
      <Home className="h-6 w-6 text-brand-200 transition duration-300 group-hover:scale-110 group-hover:text-white" />
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white opacity-0 shadow-btn transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        Home
      </span>
    </Link>
  );
}

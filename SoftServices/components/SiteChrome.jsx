'use client';
import { usePathname } from 'next/navigation';

/** Site header, footer and banners: hidden inside the admin panel, which has its own app shell. */
export default function SiteChrome({ children }) {
  const pathname = usePathname() || '';
  return pathname.startsWith('/admin') ? null : children;
}

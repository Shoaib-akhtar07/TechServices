'use client';
import { Crown } from 'lucide-react';
import { useFreeMode } from './Providers';

export default function ProBadge({ className = '' }) {
  if (useFreeMode()) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ${className}`}>
      <Crown className="h-3 w-3" aria-hidden="true" /> Pro
    </span>
  );
}

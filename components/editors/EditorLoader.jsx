'use client';
import dynamic from 'next/dynamic';
import { EditorSkeleton } from './common';

// Editors load in the browser only, after the SEO content has rendered.
const DocEditor = dynamic(() => import('./DocEditor'), { ssr: false, loading: EditorSkeleton });
const SheetEditor = dynamic(() => import('./SheetEditor'), { ssr: false, loading: EditorSkeleton });
const SlideEditor = dynamic(() => import('./SlideEditor'), { ssr: false, loading: EditorSkeleton });

export default function EditorLoader({ kind }) {
  if (kind === 'sheet') return <SheetEditor />;
  if (kind === 'slides') return <SlideEditor />;
  return <DocEditor mode={kind === 'pdf' ? 'pdf' : 'doc'} />;
}

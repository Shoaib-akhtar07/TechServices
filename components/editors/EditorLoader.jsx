'use client';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import ProGate from '../ProGate';
import { EditorSkeleton } from './common';

// Editors load in the browser only, after the SEO content has rendered, and only for Pro members.
const DocEditor = dynamic(() => import('./DocEditor'), { ssr: false, loading: EditorSkeleton });
const SheetEditor = dynamic(() => import('./SheetEditor'), { ssr: false, loading: EditorSkeleton });
const SlideEditor = dynamic(() => import('./SlideEditor'), { ssr: false, loading: EditorSkeleton });

export default function EditorLoader({ kind, name, slug }) {
  const { data: session, status } = useSession();
  if (status === 'loading') return <EditorSkeleton />;
  if (!session?.user?.pro) return <ProGate name={name} slug={slug} loggedIn={!!session} />;
  if (kind === 'sheet') return <SheetEditor />;
  if (kind === 'slides') return <SlideEditor />;
  return <DocEditor mode={kind === 'pdf' ? 'pdf' : 'doc'} />;
}

import Link from 'next/link';
import ToolIcon from './ToolIcon';
import ProBadge from './ProBadge';
import { getCategory } from '@/lib/tools';

export default function ToolCard({ tool }) {
  const cat = getCategory(tool.category);
  return (
    <Link
      href={`/${tool.slug}/`}
      className="group relative flex flex-col card card-hover rounded-2xl p-5"
    >
      {tool.premium && <ProBadge className="absolute right-4 top-4" />}
      <span className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl text-white ${cat.color}`}>
        <ToolIcon name={tool.icon} />
      </span>
      <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 dark:text-white">{tool.name}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{tool.short}</p>
    </Link>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

/**
 * Cover image: upload a file (sent as `coverFile`) or paste an image URL (`coverImageUrl`).
 * "Remove" submits `removeCover=1`.
 */
export default function CoverPicker({ defaultUrl = '' }) {
  const [url, setUrl] = useState(defaultUrl);
  const [preview, setPreview] = useState(defaultUrl);
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => () => preview?.startsWith('blob:') && URL.revokeObjectURL(preview), [preview]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    setError('');
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) {
      setError('Use a JPEG, PNG, WebP or GIF image.');
      e.target.value = '';
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('The image can be at most 5 MB.');
      e.target.value = '';
      return;
    }
    setRemoved(false);
    setPreview(URL.createObjectURL(f));
  };

  const remove = () => {
    if (fileRef.current) fileRef.current.value = '';
    setUrl('');
    setPreview('');
    setRemoved(true);
  };

  return (
    <div>
      <input type="hidden" name="removeCover" value={removed ? '1' : '0'} />
      <input type="hidden" name="coverImageUrl" value={url} />
      <input ref={fileRef} type="file" name="coverFile" accept="image/jpeg,image/png,image/webp,image/gif" onChange={pick} className="hidden" />

      {preview ? (
        <div className="group relative overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Cover preview" className="aspect-[1200/630] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-white">
              Replace
            </button>
            <button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-white">
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex aspect-[1200/630] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="font-medium">Upload cover image</span>
          <span className="text-xs">JPEG, PNG or WebP · up to 5 MB · 1200×630 works best</span>
        </button>
      )}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      <details className="mt-2 text-xs text-slate-500">
        <summary className="cursor-pointer hover:text-slate-700">…or use an image address</summary>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setPreview(e.target.value);
            setRemoved(false);
          }}
          placeholder="https://…"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
      </details>
    </div>
  );
}

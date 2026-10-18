'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { UploadCloud, ArrowUp, ArrowDown, X, Download, Loader2, ShieldCheck, RotateCcw, FileText, Plus } from 'lucide-react';
import { getTool } from '@/lib/tools';
import { formatBytes } from '@/lib/format';
import SignaturePad from './SignaturePad';
import ProGate from './ProGate';

// Heavy PDF libraries load only once the user adds a file (keeps pages fast for SEO / Core Web Vitals).
const loadLib = () => import('@/lib/processors');

const defaults = (tool) => Object.fromEntries(tool.options.map((o) => [o.id, o.default]));

function matchesAccept(file, accept) {
  const name = file.name.toLowerCase();
  return accept.split(',').some((a) => {
    a = a.trim().toLowerCase();
    if (a.startsWith('.')) return name.endsWith(a);
    if (a.endsWith('/*')) return file.type.startsWith(a.slice(0, -1));
    return file.type === a;
  });
}

function visible(opt, values) {
  if (!opt.showIf) return true;
  return Object.entries(opt.showIf).every(([k, v]) => (Array.isArray(v) ? v.includes(values[k]) : values[k] === v));
}

let uid = 0;

export default function ToolClient({ slug }) {
  const tool = getTool(slug);
  const isPdf = tool.accept.includes('pdf');
  const { data: session, status: authStatus } = useSession();
  const premium = !!tool.premium;
  const [files, setFiles] = useState([]);
  const [opts, setOpts] = useState(() => defaults(tool));
  const [status, setStatus] = useState('idle'); // idle | working | done
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const set = (id, v) => setOpts((o) => ({ ...o, [id]: v }));

  const addFiles = useCallback(
    async (list) => {
      setError('');
      const incoming = Array.from(list);
      const valid = incoming.filter((f) => matchesAccept(f, tool.accept));
      if (valid.length < incoming.length) setError('Some files were skipped because their format is not supported by this tool.');
      if (!valid.length) return;
      const items = (tool.multiple ? valid : valid.slice(0, 1)).map((file) => ({
        id: ++uid,
        file,
        pages: null,
        thumb: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      }));
      setFiles((prev) => (tool.multiple ? [...prev, ...items] : items));

      const { PREFILL, pageCount, pdfThumbnail } = await loadLib();
      if (isPdf) {
        for (const it of items) {
          const [pages, thumb] = await Promise.all([pageCount(it.file), pdfThumbnail(it.file)]);
          setFiles((prev) => prev.map((p) => (p.id === it.id ? { ...p, pages, thumb } : p)));
        }
      }
      if (PREFILL[slug]) {
        try {
          const values = await PREFILL[slug](items[0].file);
          setOpts((o) => ({ ...o, ...values }));
        } catch {}
      }
    },
    [tool, slug, isPdf]
  );

  // Paste files with Ctrl+V anywhere on the page.
  useEffect(() => {
    const onPaste = (e) => {
      if (status !== 'idle' || !e.clipboardData?.files?.length) return;
      addFiles(e.clipboardData.files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles, status]);

  const move = (i, d) =>
    setFiles((prev) => {
      const next = [...prev];
      const j = i + d;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const remove = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const run = async () => {
    setError('');
    if (files.length < (tool.minFiles || 1)) {
      setError(`Please add at least ${tool.minFiles} files.`);
      return;
    }
    setStatus('working');
    setProgress('Starting…');
    try {
      let out;
      if (premium) {
        out = [await runOnServer()];
      } else {
        const { PROCESSORS } = await loadLib();
        out = await PROCESSORS[slug](files.map((f) => f.file), opts, setProgress);
      }
      setResults(out);
      setStatus('done');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Something went wrong while processing your file.');
      setStatus('idle');
    }
  };

  // Pro tools: the server checks login + subscription before processing anything.
  const runOnServer = async () => {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f.file));
    fd.append('options', JSON.stringify(opts));
    setProgress('Processing on secure server…');
    const res = await fetch(`/api/premium/${slug}/`, { method: 'POST', body: fd });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `Server error (${res.status}). Please try again.`);
    }
    const blob = await res.blob();
    return {
      name: decodeURIComponent(res.headers.get('X-Result-Name') || `${slug}-result`),
      info: decodeURIComponent(res.headers.get('X-Result-Info') || ''),
      blob,
    };
  };

  const download = (r) => {
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = r.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const downloadZip = async () => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const used = new Set();
    for (const r of results) {
      let n = r.name, k = 1;
      while (used.has(n)) n = r.name.replace(/(\.[^.]+)$/, `-${k++}$1`);
      used.add(n);
      zip.file(n, r.blob);
    }
    download({ name: `${slug}-nexpdf.zip`, blob: await zip.generateAsync({ type: 'blob' }) });
  };

  const reset = () => {
    files.forEach((f) => f.thumb?.startsWith('blob:') && URL.revokeObjectURL(f.thumb));
    setFiles([]);
    setResults([]);
    setStatus('idle');
    setOpts(defaults(tool));
  };

  // ---------- result view ----------
  if (status === 'done') {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <h2 className="text-center text-2xl font-bold">Your files are ready 🎉</h2>
        <p className="mt-2 text-center text-slate-600 dark:text-slate-400">
          {premium ? 'Processed on our secure server — your files have already been deleted.' : 'Processed locally on your device — nothing was uploaded.'}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {results.length > 1 ? (
            <button onClick={downloadZip} className="btn-primary">
              <Download className="h-5 w-5" /> Download all ({results.length}) as ZIP
            </button>
          ) : (
            <button onClick={() => download(results[0])} className="btn-primary">
              <Download className="h-5 w-5" /> Download {results[0]?.name.split('.').pop().toUpperCase()}
            </button>
          )}
          <button onClick={reset} className="btn-secondary">
            <RotateCcw className="h-5 w-5" /> Start over
          </button>
        </div>
        <ul className="mx-auto mt-8 max-w-2xl divide-y divide-slate-200 dark:divide-slate-800">
          {results.map((r, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <FileText className="h-5 w-5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs text-slate-500">{r.info || formatBytes(r.blob.size)}</p>
              </div>
              <button onClick={() => download(r)} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10" aria-label={`Download ${r.name}`}>
                <Download className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ---------- Pro gate ----------
  if (premium && authStatus === 'loading') {
    return <div className="h-72 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />;
  }
  if (premium && !session?.user?.pro) {
    return <ProGate name={tool.name} slug={tool.slug} loggedIn={!!session} />;
  }

  // ---------- upload view ----------
  if (!files.length) {
    return (
      <div>
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-16 text-center transition ${
            dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-300 bg-white hover:border-brand-500 dark:border-slate-700 dark:bg-slate-900'
          }`}
        >
          <UploadCloud className="h-14 w-14 text-brand-600" />
          <span className="btn-primary mt-6 text-lg">
            Select {premium ? (tool.accept === '.pdf' ? 'PDF ' : '') : isPdf ? 'PDF ' : tool.accept.includes('txt') ? 'text ' : 'image '}file{tool.multiple ? 's' : ''}
          </span>
          <span className="mt-3 text-sm text-slate-500">or drop {tool.multiple ? 'them' : 'it'} here · you can also paste with Ctrl+V</span>
          <input ref={inputRef} type="file" accept={tool.accept} multiple={tool.multiple} className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </label>
        {error && <p className="mt-4 text-center text-sm text-rose-600">{error}</p>}
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          {premium
            ? 'Encrypted upload · processed on our server · deleted right after conversion.'
            : '100% private — files are processed in your browser and never uploaded.'}
        </p>
      </div>
    );
  }

  // ---------- options view ----------
  const working = status === 'working';
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-semibold">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
          {tool.multiple && (
            <button onClick={() => inputRef.current?.click()} className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline" disabled={working}>
              <Plus className="h-4 w-4" /> Add more
            </button>
          )}
          <input ref={inputRef} type="file" accept={tool.accept} multiple={tool.multiple} className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {files.map((f, i) => (
            <li key={f.id} className="group relative rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-white dark:bg-slate-900">
                {f.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.thumb} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <FileText className="h-10 w-10 text-slate-300" />
                )}
              </div>
              <p className="mt-2 truncate text-xs font-medium" title={f.file.name}>{f.file.name}</p>
              <p className="text-xs text-slate-500">
                {formatBytes(f.file.size)}
                {f.pages ? ` · ${f.pages} page${f.pages > 1 ? 's' : ''}` : ''}
              </p>
              <div className="absolute right-2 top-2 flex gap-1">
                {tool.multiple && files.length > 1 && (
                  <>
                    <button onClick={() => move(i, -1)} disabled={i === 0 || working} className="icon-btn" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button onClick={() => move(i, 1)} disabled={i === files.length - 1 || working} className="icon-btn" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  </>
                )}
                <button onClick={() => remove(f.id)} disabled={working} className="icon-btn" aria-label="Remove file"><X className="h-3.5 w-3.5" /></button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold">{tool.name} options</h2>
        <div className="flex-1 space-y-5">
          {tool.options.filter((o) => visible(o, opts)).map((o) => (
            <Option key={o.id} opt={o} value={opts[o.id]} onChange={(v) => set(o.id, v)} />
          ))}
          {!tool.options.length && <p className="text-sm text-slate-500">No settings needed — just click the button.</p>}
        </div>
        {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
        <button onClick={run} disabled={working} className="btn-primary mt-6 w-full justify-center">
          {working ? <><Loader2 className="h-5 w-5 animate-spin" /> {progress}</> : tool.cta}
        </button>
        <button onClick={reset} disabled={working} className="mt-3 text-sm text-slate-500 hover:underline">Cancel</button>
      </aside>
    </div>
  );
}

const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950';

function Option({ opt, value, onChange }) {
  const id = `opt-${opt.id}`;
  if (opt.type === 'checkbox')
    return (
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
        {opt.label}
      </label>
    );
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex justify-between text-sm font-medium">
        {opt.label}
        {opt.type === 'range' && <span className="text-slate-500">{value}</span>}
      </label>
      {opt.type === 'select' && (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={field}>
          {opt.choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      )}
      {opt.type === 'text' && <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} className={field} />}
      {opt.type === 'password' && (
        <input id={id} type="password" autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} className={field} />
      )}
      {opt.type === 'number' && (
        <input id={id} type="number" value={value} min={opt.min} max={opt.max} onChange={(e) => onChange(e.target.value === '' ? '' : +e.target.value)} className={field} />
      )}
      {opt.type === 'range' && (
        <input id={id} type="range" value={value} min={opt.min} max={opt.max} step={opt.step} onChange={(e) => onChange(+e.target.value)} className="w-full accent-brand-600" />
      )}
      {opt.type === 'color' && <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-20 cursor-pointer rounded border border-slate-300 dark:border-slate-700" />}
      {opt.type === 'signature' && <SignaturePad onChange={onChange} />}
      {opt.help && <p className="mt-1 text-xs text-slate-500">{opt.help}</p>}
    </div>
  );
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, Copy, Trash2, ChevronUp, ChevronDown, ImagePlus, X, LayoutTemplate, Download, Loader2 } from 'lucide-react';
import { FREE_TEMPLATES } from '@/lib/templates/free';
import { THEMES, LAYOUTS, toPptx, toSlidesPdf } from '@/lib/editors/export-slides';
import { ToolBtn, TopBar, TemplatePicker, downloadBlob, draft, safeName } from './common';

const KEY = 'nexpdf-draft-slides';
const clone = (o) => JSON.parse(JSON.stringify(o));

/** Live 16:9 preview. Font sizes use container-query units so it scales from thumbnail to full size. */
function SlideView({ slide, theme }) {
  const t = THEMES[theme] || THEMES.indigo;
  const items = String(slide.body || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const centered = slide.layout !== 'content';
  const hasImg = slide.layout === 'content' && slide.image;
  return (
    <div className="relative aspect-video w-full overflow-hidden" style={{ background: `#${t.bg}`, containerType: 'inline-size' }}>
      {centered ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-[8cqw] text-center">
          <p className="font-bold leading-tight" style={{ color: `#${t.title}`, fontSize: slide.layout === 'title' ? '4.6cqw' : '4cqw' }}>{slide.title}</p>
          <span className="my-[2cqw] block h-[0.6cqw] w-[15cqw] rounded" style={{ background: `#${t.accent}` }} />
          <p style={{ color: `#${t.text}`, fontSize: '2.1cqw' }}>{slide.body}</p>
        </div>
      ) : (
        <div className="absolute inset-0 px-[6cqw] py-[5cqw]">
          <p className="font-bold leading-tight" style={{ color: `#${t.title}`, fontSize: '3.4cqw' }}>{slide.title}</p>
          <span className="mt-[1.2cqw] block h-[0.5cqw] w-[9cqw] rounded" style={{ background: `#${t.accent}` }} />
          <div className="mt-[3cqw] flex gap-[3cqw]">
            <ul className="flex-1 space-y-[1.4cqw]" style={{ color: `#${t.text}`, fontSize: '2.3cqw' }}>
              {items.map((it, i) => (
                <li key={i} className="flex gap-[1.2cqw]">
                  <span className="mt-[0.9cqw] h-[0.9cqw] w-[0.9cqw] shrink-0 rounded-full" style={{ background: `#${t.accent}` }} />
                  {it}
                </li>
              ))}
            </ul>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {hasImg && <img src={slide.image} alt="" className="max-h-[36cqw] w-[36cqw] object-contain" />}
          </div>
        </div>
      )}
    </div>
  );
}

// Downscale uploaded images so drafts and exports stay small.
async function readImage(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return file.type === 'image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85);
}

export default function SlideEditor() {
  const [name, setName] = useState('Untitled presentation');
  const [deck, setDeck] = useState(() => clone(FREE_TEMPLATES['slides-blank']));
  const [i, setI] = useState(0);
  const [status, setStatus] = useState('Draft saved in this browser');
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState('');
  const imgRef = useRef(null);
  const loaded = useRef(false);
  const slide = deck.slides[i] || deck.slides[0];

  useEffect(() => {
    const d = draft.load(KEY);
    if (d?.deck?.slides?.length) setDeck(d.deck);
    if (d?.name) setName(d.name);
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => setStatus(draft.save(KEY, { name, deck }) ? 'Draft saved in this browser' : 'Draft too large to auto-save — download to keep it'), 400);
    return () => clearTimeout(t);
  }, [name, deck]);

  const update = (patch) => setDeck((d) => ({ ...d, slides: d.slides.map((s, k) => (k === i ? { ...s, ...patch } : s)) }));
  const insert = (s) => { setDeck((d) => ({ ...d, slides: [...d.slides.slice(0, i + 1), s, ...d.slides.slice(i + 1)] })); setI(i + 1); };
  const remove = () => {
    if (deck.slides.length === 1) return;
    setDeck((d) => ({ ...d, slides: d.slides.filter((_, k) => k !== i) }));
    setI(Math.max(0, i - 1));
  };
  const moveSlide = (dir) => {
    const j = i + dir;
    if (j < 0 || j >= deck.slides.length) return;
    setDeck((d) => {
      const s = [...d.slides];
      [s[i], s[j]] = [s[j], s[i]];
      return { ...d, slides: s };
    });
    setI(j);
  };

  const exportAs = async (fmt) => {
    setBusy(fmt);
    try {
      const file = safeName(name, 'presentation');
      if (fmt === 'pptx') downloadBlob(await toPptx(deck, name), `${file}.pptx`);
      else downloadBlob(await toSlidesPdf(deck, name), `${file}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Sorry, the file could not be created. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950';

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <TopBar name={name} setName={setName} status={status}>
        <button onClick={() => setPicker(true)} className="btn-secondary !px-3 !py-2 text-sm"><LayoutTemplate className="h-4 w-4" /> Templates</button>
        <button onClick={() => exportAs('pptx')} disabled={!!busy} className="btn-primary !px-4 !py-2 text-sm">
          {busy === 'pptx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PowerPoint
        </button>
        <button onClick={() => exportAs('pdf')} disabled={!!busy} className="btn-secondary !px-3 !py-2 text-sm">
          {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
        </button>
      </TopBar>

      <div className="grid gap-0 lg:grid-cols-[200px_1fr_300px]">
        {/* Slide list */}
        <div className="flex gap-3 overflow-x-auto border-b border-slate-200 p-3 dark:border-slate-800 lg:max-h-[640px] lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
          {deck.slides.map((s, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={`Slide ${k + 1}`}
              aria-current={k === i}
              className={`relative w-36 shrink-0 overflow-hidden rounded-lg ring-2 lg:w-full ${k === i ? 'ring-brand-500' : 'ring-transparent hover:ring-slate-300'}`}
            >
              <SlideView slide={s} theme={deck.theme} />
              <span className="absolute left-1 top-1 rounded bg-black/50 px-1.5 text-[10px] font-semibold text-white">{k + 1}</span>
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="bg-slate-100 p-4 dark:bg-slate-950 sm:p-8">
          <div className="overflow-hidden rounded-xl shadow-xl">
            <SlideView slide={slide} theme={deck.theme} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1" role="toolbar" aria-label="Slide actions">
            <ToolBtn label="Add slide" onClick={() => insert({ layout: 'content', title: 'New slide', body: 'First point\nSecond point' })}><Plus className="h-4 w-4" /><span className="ml-1">Add</span></ToolBtn>
            <ToolBtn label="Duplicate slide" onClick={() => insert(clone(slide))}><Copy className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Move slide up" disabled={i === 0} onClick={() => moveSlide(-1)}><ChevronUp className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Move slide down" disabled={i === deck.slides.length - 1} onClick={() => moveSlide(1)}><ChevronDown className="h-4 w-4" /></ToolBtn>
            <ToolBtn label="Delete slide" disabled={deck.slides.length === 1} onClick={remove}><Trash2 className="h-4 w-4" /></ToolBtn>
            <span className="ml-2 text-xs text-slate-500">Slide {i + 1} of {deck.slides.length}</span>
          </div>
        </div>

        {/* Properties */}
        <div className="space-y-5 border-t border-slate-200 p-5 dark:border-slate-800 lg:border-l lg:border-t-0">
          <div>
            <label htmlFor="slide-layout" className="mb-1.5 block text-sm font-medium">Layout</label>
            <select id="slide-layout" value={slide.layout} onChange={(e) => update({ layout: e.target.value })} className={field}>
              {Object.entries(LAYOUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="slide-title" className="mb-1.5 block text-sm font-medium">Title</label>
            <input id="slide-title" value={slide.title} onChange={(e) => update({ title: e.target.value })} className={field} />
          </div>
          <div>
            <label htmlFor="slide-body" className="mb-1.5 block text-sm font-medium">{slide.layout === 'content' ? 'Bullet points (one per line)' : 'Subtitle'}</label>
            <textarea id="slide-body" rows={slide.layout === 'content' ? 7 : 3} value={slide.body} onChange={(e) => update({ body: e.target.value })} className={field} />
          </div>
          {slide.layout === 'content' && (
            <div>
              <p className="mb-1.5 text-sm font-medium">Image</p>
              {slide.image ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide.image} alt="" className="h-14 w-20 rounded object-cover" />
                  <button onClick={() => update({ image: null })} className="inline-flex items-center gap-1 text-sm text-rose-600 hover:underline"><X className="h-4 w-4" /> Remove</button>
                </div>
              ) : (
                <button onClick={() => imgRef.current?.click()} className="btn-secondary !px-3 !py-2 text-sm"><ImagePlus className="h-4 w-4" /> Add image</button>
              )}
              <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) update({ image: await readImage(f) }); }} />
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-medium">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(THEMES).map(([k, t]) => (
                <button
                  key={k}
                  onClick={() => setDeck((d) => ({ ...d, theme: k }))}
                  aria-pressed={deck.theme === k}
                  className={`rounded-lg p-2 text-xs font-medium ring-2 ${deck.theme === k ? 'ring-brand-500' : 'ring-transparent'}`}
                  style={{ background: `#${t.bg}`, color: `#${t.title}` }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {picker && (
        <TemplatePicker
          kind="slides"
          onPick={(t) => { setDeck(clone({ theme: t.theme, slides: t.slides })); setI(0); setPicker(false); }}
          onClose={() => setPicker(false)}
        />
      )}
    </div>
  );
}

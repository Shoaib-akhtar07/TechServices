'use client';
import { useEffect, useRef, useState } from 'react';

// Returns a trimmed transparent PNG data URL via onChange ('' when cleared).
export default function SignaturePad({ onChange }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const [color, setColor] = useState('#0f172a');
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
  }, []);

  const pos = (e) => {
    const r = ref.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const start = (e) => {
    e.preventDefault();
    ref.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = ref.current.getContext('2d');
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(...pos(e));
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = ref.current.getContext('2d');
    ctx.lineTo(...pos(e));
    ctx.stroke();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setEmpty(false);
    onChange(trim(ref.current));
  };
  const clear = () => {
    const c = ref.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange('');
  };

  return (
    <div>
      <div className="relative">
        <canvas
          ref={ref}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-40 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white dark:border-slate-600"
          aria-label="Signature drawing area"
        />
        {empty && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">Sign here</span>}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2">
          {['#0f172a', '#1d4ed8', '#b91c1c'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Ink colour ${c}`}
              className={`h-6 w-6 rounded-full border-2 ${color === c ? 'border-brand-500' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <button type="button" onClick={clear} className="text-sm font-medium text-brand-600 hover:underline">
          Clear
        </button>
      </div>
    </div>
  );
}

function trim(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < x0) return '';
  const pad = 6;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(width, x1 + pad); y1 = Math.min(height, y1 + pad);
  const out = document.createElement('canvas');
  out.width = x1 - x0;
  out.height = y1 - y0;
  out.getContext('2d').drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

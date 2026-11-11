'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { fmtPrice } from '@/lib/plans';

// Single-series column chart for the admin dashboard (one bar per day).
// Thin bars with a rounded top on one baseline, hairline gridlines, a tooltip on hover and
// keyboard focus (arrow keys), and a table view underneath so no value depends on hovering.

const H = 180; // plot height
const PAD = { top: 12, right: 8, bottom: 26, left: 40 };

/** 0, 1, 2, 5, 10, 20, 50… : a round top for the y axis and its step. */
function niceScale(max) {
  if (max <= 0) return { top: 4, step: 1 };
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
  const stepFixed = step < 1 && Number.isInteger(max) ? 1 : step;
  return { top: Math.ceil(max / stepFixed) * stepFixed, step: stepFixed };
}

const shortDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * data: [{ date: 'YYYY-MM-DD', value: number }]. label: what one value is, e.g. "Sign-ups".
 * currency: when set, values are shown as money (functions cannot be passed from server pages).
 */
export default function BarChart({ data, label, currency, emptyText = 'Nothing in this period yet.' }) {
  const format = currency ? (v) => fmtPrice(v, currency) : (v) => v.toLocaleString('en-US');
  const wrap = useRef(null);
  const [width, setWidth] = useState(0); // 0 until measured, so the chart never forces its card wider
  const [active, setActive] = useState(null);
  const tableId = useId();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const max = Math.max(0, ...data.map((d) => d.value));
  const { top, step } = niceScale(max);
  const plotW = width - PAD.left - PAD.right;
  const slot = plotW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(24, slot - 2)); // ≤24px, and a 2px gap between neighbours
  const y = (v) => PAD.top + H - (v / top) * H;
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  // About six date labels whatever the range.
  const every = Math.max(1, Math.ceil(data.length / 6));

  const onKey = (e) => {
    if (!data.length) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      setActive((i) => (i === null ? (d > 0 ? 0 : data.length - 1) : Math.min(data.length - 1, Math.max(0, i + d))));
    } else if (e.key === 'Escape') setActive(null);
  };

  const a = active !== null ? data[active] : null;
  // The tooltip sits beside the hovered column (right of it, or left near the edge) so it never hides the bar.
  const colX = a ? PAD.left + slot * active : 0;
  const tipOnRight = colX + slot + 190 < width;
  const tipStyle = a ? (tipOnRight ? { left: colX + slot + 6 } : { right: width - colX + 6 }) : null;

  return (
    <div className="viz-root">
      <div ref={wrap} className="relative w-full" style={{ minHeight: H + PAD.top + PAD.bottom }}>
        {width > 0 && (
        <svg
          width={width}
          height={H + PAD.top + PAD.bottom}
          role="img"
          aria-label={`${label} per day. Use the left and right arrow keys to read each day.`}
          aria-describedby={tableId}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
          className="block overflow-visible rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--series-1)]"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth="1" shapeRendering="crispEdges" />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-[var(--text-muted)] text-[11px] tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const x = PAD.left + slot * i + (slot - barW) / 2;
            const h = Math.max(0, PAD.top + H - y(d.value));
            const r = Math.min(4, barW / 2, h);
            const yTop = PAD.top + H - h;
            return (
              <g key={d.date}>
                {h > 0 && (
                  <path
                    d={`M${x},${PAD.top + H} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${PAD.top + H} Z`}
                    fill="var(--series-1)"
                    opacity={active === null || active === i ? 1 : 0.45}
                  />
                )}
                {/* The whole column is the hover target, not just the painted bar. */}
                <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={H} fill="transparent" onPointerEnter={() => setActive(i)} />
                {i % every === 0 && (
                  <text x={PAD.left + slot * i + slot / 2} y={PAD.top + H + 18} textAnchor="middle" className="fill-[var(--text-muted)] text-[11px]">
                    {shortDate(d.date)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        )}

        {a && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg border border-[var(--grid)] bg-[var(--surface)] px-3 py-2 shadow-lg"
            style={tipStyle}
          >
            <p className="text-base font-semibold tabular-nums text-[var(--text-primary)]">{format(a.value)}</p>
            <p className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span className="inline-block h-0.5 w-3 rounded bg-[var(--series-1)]" />
              {label} · {longDate(a.date)}
            </p>
          </div>
        )}

        {width > 0 && max === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-sm text-[var(--text-muted)]">{emptyText}</p>
        )}
      </div>

      <details className="mt-2 text-sm">
        <summary className="cursor-pointer select-none text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Show as table</summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[var(--grid)]">
          <table id={tableId} className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--surface)]">
              <tr className="text-left text-xs text-[var(--text-secondary)]">
                <th className="px-3 py-1.5 font-medium">Day</th>
                <th className="px-3 py-1.5 text-right font-medium">{label}</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t border-[var(--grid)]">
                  <td className="px-3 py-1.5 text-[var(--text-secondary)]">{longDate(d.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[var(--text-primary)]">{format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

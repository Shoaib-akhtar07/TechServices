'use client';
import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { FUNCTION_INFO, FUNCTION_MAP } from '@/lib/editors/functions';

/** The function whose argument list the caret is inside, and which argument it is on. */
function currentCall(before) {
  let depth = 0, arg = 0, q = false;
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i];
    if (ch === '"') { q = !q; continue; }
    if (q) continue;
    if (ch === ')') depth++;
    else if (ch === '(') {
      if (depth === 0) {
        const m = /([A-Za-z][A-Za-z0-9.]*)\s*$/.exec(before.slice(0, i));
        const info = m && FUNCTION_MAP.get(m[1].toUpperCase());
        return info ? { info, arg } : null;
      }
      depth--;
    } else if (ch === ',' && depth === 0) arg++;
  }
  return null;
}

function Signature({ info, arg }) {
  const parts = info.args ? info.args.split(', ') : [];
  return (
    <span className="font-mono">
      <b>{info.name}</b>(
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && ', '}
          <span className={i === Math.min(arg, parts.length - 1) ? 'rounded bg-brand-100 px-0.5 font-semibold text-brand-700 dark:bg-brand-500/30 dark:text-white' : ''}>{p}</span>
        </span>
      ))}
      )
    </span>
  );
}

/**
 * Cell / formula-bar input with function autocomplete (Tab to accept) and an argument hint.
 * The parent handles every other key through onKeyDown.
 */
const FormulaInput = forwardRef(function FormulaInput({ value, onChange, onKeyDown, onBlur, onFocus, className, label, placeholder, autoFocus, dataRole }, ref) {
  const input = useRef(null);
  const [caret, setCaret] = useState(value.length);
  const [pick, setPick] = useState(0);
  const [closed, setClosed] = useState(false);
  const [focused, setFocused] = useState(false);

  useImperativeHandle(ref, () => ({
    el: () => input.current,
    caret: () => input.current?.selectionStart ?? value.length,
    setCaret(pos) {
      const el = input.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
      setCaret(pos);
    },
    focus: () => input.current?.focus(),
  }));

  useEffect(() => {
    if (autoFocus) {
      const el = input.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
      setCaret(el?.value.length || 0);
    }
  }, [autoFocus]);

  const formula = value.startsWith('=');
  const before = value.slice(0, caret);
  const inString = (before.match(/"/g) || []).length % 2 === 1;
  const tokenM = formula && !inString ? /(?:^=|[^A-Za-z0-9_.$'!"])([A-Za-z][A-Za-z0-9.]*)$/.exec(before) : null;
  const token = tokenM?.[1]?.toUpperCase();
  const list = focused && token && !closed ? FUNCTION_INFO.filter((f) => f.name.startsWith(token) && f.name !== token).slice(0, 8) : [];
  const exact = token && FUNCTION_MAP.get(token);
  const shown = list.length ? list : focused && exact && !closed && value[caret] !== '(' ? [exact] : [];
  const call = focused && formula && !inString && !shown.length ? currentCall(before) : null;

  const sync = (e) => setCaret(e.target.selectionStart ?? 0);

  const accept = (f) => {
    const start = caret - token.length;
    const next = value.slice(0, start) + f.name + '(' + value.slice(caret);
    onChange(next);
    const pos = start + f.name.length + 1;
    requestAnimationFrame(() => {
      input.current?.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  };

  const handleKey = (e) => {
    if (shown.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setPick((p) => (p + 1) % shown.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setPick((p) => (p - 1 + shown.length) % shown.length); return; }
      if (e.key === 'Tab') { e.preventDefault(); accept(shown[Math.min(pick, shown.length - 1)]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setClosed(true); return; }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={input}
        value={value}
        data-role={dataRole}
        aria-label={label}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          sync(e);
          setClosed(false);
          setPick(0);
        }}
        onSelect={sync}
        onKeyUp={sync}
        onClick={sync}
        onKeyDown={handleKey}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        className={className}
      />
      {shown.length > 0 && (
        <ul role="listbox" aria-label="Functions" className="absolute left-0 top-full z-50 mt-1 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left text-sm shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {shown.map((f, i) => (
            <li
              key={f.name}
              role="option"
              aria-selected={i === pick}
              onMouseDown={(e) => { e.preventDefault(); accept(f); }}
              className={`cursor-pointer px-3 py-1.5 ${i === pick ? 'bg-brand-50 dark:bg-brand-500/20' : ''}`}
            >
              <span className="font-mono font-semibold">{f.name}</span>
              <span className="block truncate text-xs text-slate-500">{f.desc}</span>
            </li>
          ))}
          <li className="border-t border-slate-100 px-3 pt-1 text-[11px] text-slate-400 dark:border-slate-800">Tab to insert</li>
        </ul>
      )}
      {call && (
        <div className="absolute left-0 top-full z-50 mt-1 max-w-[90vw] rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <Signature info={call.info} arg={call.arg} />
          <p className="mt-1 max-w-sm text-slate-500">{call.info.desc}</p>
        </div>
      )}
    </div>
  );
});

export default FormulaInput;

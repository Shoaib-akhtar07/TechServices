import Link from 'next/link';

// Renders "[text](/path/)" links inside a plain string.
function inline(text) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    return m ? <Link key={i} href={m[2]}>{m[1]}</Link> : part;
  });
}

export default function RichText({ blocks }) {
  return (
    <div className="prose-content">
      {blocks.map((b, i) => {
        if (b.h2) return <h2 key={i}>{b.h2}</h2>;
        if (b.p) return <p key={i}>{inline(b.p)}</p>;
        if (b.ul) return <ul key={i}>{b.ul.map((x, j) => <li key={j}>{inline(x)}</li>)}</ul>;
        if (b.ol) return <ol key={i}>{b.ol.map((x, j) => <li key={j}>{inline(x)}</li>)}</ol>;
        return null;
      })}
    </div>
  );
}

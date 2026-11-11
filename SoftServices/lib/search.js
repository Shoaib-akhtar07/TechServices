// Site search shared by the header search box and the /search/ page.
// Small enough to run in the browser: every word typed must appear somewhere in the item,
// and matches in the name count more than matches in the description.

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Words of the query; "jpg to png" → ['jpg', 'to', 'png'] (short filler words are dropped). */
export function queryWords(q) {
  const words = norm(q).split(/[^a-z0-9]+/).filter(Boolean);
  const kept = words.filter((w) => !['to', 'a', 'an', 'the', 'my', 'for', 'and', 'in', 'of', 'online', 'free'].includes(w));
  return kept.length ? kept : words;
}

/**
 * Score one item: 0 = no match. `fields` is a list of [text, weight] pairs.
 * A word at the start of the main field (weight >= 10) scores extra, so "comp" ranks Compress first.
 */
function score(words, fields) {
  let total = 0;
  for (const w of words) {
    let best = 0;
    for (const [text, weight] of fields) {
      const t = norm(text);
      const i = t.indexOf(w);
      if (i === -1) continue;
      const startsWord = i === 0 || /[^a-z0-9]/.test(t[i - 1]);
      best = Math.max(best, weight * (startsWord ? 2 : 1));
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}

/** Tools matching the query, best first. Tools need { name, short, keywords? }. */
export function searchTools(tools, q, limit = Infinity) {
  const words = queryWords(q);
  if (!words.length) return [];
  return tools
    .map((t) => ({ t, s: score(words, [[t.name, 10], [(t.keywords || []).join(' '), 6], [t.short, 3], [t.description, 1]]) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.t);
}

/** Blog posts matching the query, best first. Posts need { title, description, tags? }. */
export function searchPosts(posts, q, limit = Infinity) {
  const words = queryWords(q);
  if (!words.length) return [];
  return posts
    .map((p) => ({ p, s: score(words, [[p.title, 10], [(p.tags || []).join(' '), 6], [p.description, 3]]) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}

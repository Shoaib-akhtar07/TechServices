// Rich text is stored as blocks: { h2 } | { p } | { ul: [] } | { ol: [] } (rendered by components/RichText).
// Admins edit it as simple text: "## Heading", "- bullet", "1. step", blank line between paragraphs,
// and [link text](/path/) for links.

export function blocksToText(blocks = []) {
  return blocks
    .map((b) => {
      if (b.h2) return `## ${b.h2}`;
      if (b.ul) return b.ul.map((x) => `- ${x}`).join('\n');
      if (b.ol) return b.ol.map((x, i) => `${i + 1}. ${x}`).join('\n');
      return b.p || '';
    })
    .join('\n\n');
}

export function textToBlocks(text = '') {
  const blocks = [];
  let para = [];
  let list = null; // the list block that following "- " / "1. " lines join, until a blank line
  const endPara = () => {
    if (para.length) blocks.push({ p: para.join(' ') });
    para = [];
  };
  const pushItem = (kind, item) => {
    if (!list?.[kind]) blocks.push((list = { [kind]: [] }));
    list[kind].push(item);
  };
  for (const raw of String(text).replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    let m;
    if (!line || !/^([-*•]|\d+[.)])\s/.test(line)) list = null;
    if (!line) endPara();
    else if ((m = line.match(/^#{1,3}\s+(.+)/))) (endPara(), blocks.push({ h2: m[1] }));
    else if ((m = line.match(/^[-*•]\s+(.+)/))) (endPara(), pushItem('ul', m[1]));
    else if ((m = line.match(/^\d+[.)]\s+(.+)/))) (endPara(), pushItem('ol', m[1]));
    else para.push(line);
  }
  endPara();
  return blocks;
}

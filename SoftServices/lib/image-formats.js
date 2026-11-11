// Every "X to Y" image converter page, generated from one table of format facts so each page
// carries real, specific content (what each format is, what changes, what to expect) instead of
// the same paragraph with two words swapped. Processing: lib/processors.js (convertAll).

/** Facts shown on the pages. Keep them accurate: they are quoted by search engines and AI answers. */
export const FORMATS = {
  jpg: {
    name: 'JPG', full: 'JPEG (Joint Photographic Experts Group)', year: 1992, mime: 'image/jpeg', accept: 'image/jpeg,.jpg,.jpeg,.jfif',
    compression: 'Lossy', transparency: 'No', animation: 'No',
    bestFor: 'photos and images with smooth colour changes',
    about: 'JPG (also written JPEG) is the most widely used photo format. It uses lossy compression, which makes photos small but slightly blurs sharp edges and text, and it cannot store transparent areas.',
  },
  png: {
    name: 'PNG', full: 'Portable Network Graphics', year: 1996, mime: 'image/png', accept: 'image/png,.png',
    compression: 'Lossless', transparency: 'Yes (full alpha)', animation: 'No (APNG is rare)',
    bestFor: 'screenshots, logos, text and graphics that need transparency',
    about: 'PNG is a lossless format: every pixel is kept exactly, and it supports smooth, partial transparency. That makes it ideal for screenshots, logos and graphics, but photos saved as PNG are much larger than JPG.',
  },
  webp: {
    name: 'WebP', full: 'WebP (developed by Google)', year: 2010, mime: 'image/webp', accept: 'image/webp,.webp',
    compression: 'Lossy or lossless', transparency: 'Yes (full alpha)', animation: 'Yes',
    bestFor: 'fast-loading images on websites',
    about: 'WebP is a modern format made by Google for the web. It supports lossy and lossless compression, transparency and animation, and is usually noticeably smaller than JPG or PNG at the same visual quality. All current browsers open it, but some older apps do not.',
  },
  gif: {
    name: 'GIF', full: 'Graphics Interchange Format', year: 1987, mime: 'image/gif', accept: 'image/gif,.gif',
    compression: 'Lossless, max 256 colours', transparency: 'Yes (on/off only)', animation: 'Yes',
    bestFor: 'simple animations, icons and graphics with few colours',
    about: 'GIF is one of the oldest web image formats. It is best known for short animations. Each frame can use at most 256 colours and a pixel is either fully transparent or fully visible, so photos look grainy as GIF.',
  },
  bmp: {
    name: 'BMP', full: 'Bitmap Image File (Windows)', year: 1990, mime: 'image/bmp', accept: 'image/bmp,.bmp',
    compression: 'Usually none', transparency: 'No (in practice)', animation: 'No',
    bestFor: 'older Windows software and devices that need uncompressed images',
    about: 'BMP is the classic Windows bitmap format. It normally stores pixels without compression, so quality is perfect but files are very large. It is mostly needed for older software, printers and embedded devices.',
  },
  avif: {
    name: 'AVIF', full: 'AV1 Image File Format', year: 2019, mime: 'image/avif', accept: 'image/avif,.avif',
    compression: 'Lossy or lossless', transparency: 'Yes (full alpha)', animation: 'Yes',
    bestFor: 'very small, high-quality images on modern websites',
    about: 'AVIF is a newer image format based on the AV1 video codec. It often makes files even smaller than WebP at the same quality, but many apps, editors and older devices still cannot open it.',
  },
  svg: {
    name: 'SVG', full: 'Scalable Vector Graphics', year: 2001, mime: 'image/svg+xml', accept: 'image/svg+xml,.svg',
    compression: 'Text (vector)', transparency: 'Yes', animation: 'Yes (CSS / SMIL)',
    bestFor: 'logos, icons and illustrations that must stay sharp at any size',
    about: 'SVG is a vector format: the image is stored as shapes and paths written in text, not as pixels, so it stays perfectly sharp at any size. Many apps, social networks and document editors do not accept SVG, which is why it is often converted to a pixel format.',
  },
  ico: {
    name: 'ICO', full: 'Windows Icon', year: 1985, mime: 'image/x-icon', accept: 'image/x-icon,image/vnd.microsoft.icon,.ico',
    compression: 'Container (PNG or bitmap inside)', transparency: 'Yes', animation: 'No',
    bestFor: 'website favicons and Windows application icons',
    about: 'ICO is the Windows icon format. One .ico file can hold the same icon in several sizes (for example 16, 32 and 48 pixels) so each place it is shown can use the sharpest one. Browsers still look for favicon.ico on every website.',
  },
};

/** Formats this site can write (in the browser). SVG and AVIF can be read but not written. */
export const OUTPUTS = ['jpg', 'png', 'webp', 'gif', 'bmp', 'ico'];
export const INPUTS = ['jpg', 'png', 'webp', 'gif', 'bmp', 'avif', 'svg', 'ico'];
/** Output format id used by the processors. */
export const ENCODER = { jpg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif', bmp: 'bmp', ico: 'ico' };

/** Pages that stay in the menus and tool grid; the rest are reachable from search, the hub and related links. */
const FEATURED = new Set(['png-to-jpg', 'jpg-to-png', 'webp-to-jpg', 'webp-to-png', 'jpg-to-webp', 'png-to-webp', 'svg-to-png', 'png-to-ico']);

const ICO_SIZE_OPTION = {
  id: 'icoSizes', label: 'Icon sizes', type: 'select', default: 'favicon',
  choices: [
    { value: 'favicon', label: 'Favicon (16, 32, 48 px)' },
    { value: 'app', label: 'All sizes (16 to 256 px)' },
    { value: '256', label: '256 px only' },
    { value: '32', label: '32 px only' },
  ],
};

const hasAlpha = (f) => !FORMATS[f].transparency.startsWith('No');
const isAnimated = (f) => FORMATS[f].animation.startsWith('Yes');

/** What changes when going from `from` to `to`: honest notes, used in the intro and FAQs. */
function notes(from, to) {
  const F = FORMATS[from], T = FORMATS[to];
  const n = [];
  if (from === 'svg') n.push([`What size will the image be?`, `The SVG drawing is turned into pixels at the width you choose, so pick a size at least as large as you will display it.`]);
  if (hasAlpha(from) && !hasAlpha(to)) n.push([`What happens to transparent areas?`, `${T.name} cannot store transparency, so transparent areas of the ${F.name} are filled with a background colour you choose (white by default).`]);
  if (hasAlpha(from) && to === 'gif') n.push([`Is transparency kept in GIF?`, `GIF transparency is on or off only, so soft, semi-transparent edges become either fully visible or fully transparent.`]);
  if (hasAlpha(from) && ['png', 'webp', 'ico'].includes(to)) n.push([`Is transparency kept?`, `Transparent areas are kept: ${T.name} supports full transparency.`]);
  if (isAnimated(from)) n.push([`What about animated ${F.name} files?`, `Animated ${F.name} files are converted from their first frame into a still ${T.name} image.`]);
  if (to === 'gif') n.push([`Will colours change in GIF?`, `GIF can show at most 256 colours. The converter picks the best 256 for your image and can dither (mix dots of colour) so gradients and photos look smoother.`]);
  if (to === 'jpg') n.push([`Which JPG quality should I choose?`, `JPG is lossy: a quality of 85–90% looks identical to the eye for photos while keeping the file small. Use 100% only when you will edit the image again.`]);
  if (to === 'webp') n.push([`Will the WebP file be smaller?`, `WebP files are usually much smaller than ${from === 'png' ? 'PNG' : 'JPG'} at the same visual quality, which makes pages load faster.`]);
  if (to === 'png' && ['jpg', 'webp', 'avif'].includes(from)) n.push([`Does converting to PNG improve quality?`, `PNG is lossless, so nothing more is lost in the conversion — but it cannot bring back detail the ${F.name} compression already removed, and the file is usually larger.`]);
  if (to === 'bmp') n.push([`Why is the BMP file so large?`, `BMP is uncompressed, so expect a much larger file than the ${F.name} you started with.`]);
  if (to === 'ico') n.push([`How is the image turned into an icon?`, `The image is fitted into square icons (it is centred and keeps its proportions). For a favicon, choose the 16, 32 and 48 px set.`]);
  return n;
}

function reason(from, to) {
  const F = FORMATS[from], T = FORMATS[to];
  const why = {
    jpg: `to get a smaller file that opens everywhere — every phone, computer, email client and upload form accepts JPG`,
    png: `to get a lossless image with ${hasAlpha(from) ? 'transparency kept' : 'no further quality loss'} that editors, documents and design tools accept`,
    webp: `to make the image smaller so websites and online shops load faster`,
    gif: `when a website, forum or older app only accepts GIF, or for simple graphics with few colours`,
    bmp: `when older Windows software, a printer or an embedded device requires uncompressed bitmap images`,
    ico: `to create a favicon for a website or an icon for a Windows program`,
  };
  const fromWhy = {
    webp: 'WebP images saved from websites often will not open in older apps or upload forms. ',
    avif: 'AVIF is very new, so many apps, editors and websites cannot open it yet. ',
    svg: 'SVG is not accepted by many apps, social networks and document editors. ',
    bmp: 'BMP files are very large and awkward to share. ',
    gif: '',
    ico: 'Icon files cannot be used as normal pictures in most apps. ',
    jpg: '',
    png: '',
  };
  return `${fromWhy[from]}Convert ${F.name} to ${T.name} ${why[to]}.`;
}

function build(from, to) {
  const F = FORMATS[from], T = FORMATS[to];
  const slug = `${from}-to-${to}`;
  const name = `${F.name} to ${T.name}`;
  const options = [];
  if (from === 'svg') options.push({ id: 'width', label: 'Width (px)', type: 'number', default: 1024, min: 16, max: 10000 });
  if (to === 'jpg' || to === 'webp') options.push({ id: 'quality', label: 'Quality (%)', type: 'range', default: 90, min: 10, max: 100, step: 5 });
  if (!hasAlpha(to) && hasAlpha(from)) options.push({ id: 'background', label: 'Background for transparent areas', type: 'color', default: '#ffffff' });
  if (to === 'gif') options.push({ id: 'dither', label: 'Dither (smoother gradients and photos)', type: 'checkbox', default: true });
  if (to === 'ico') options.push(ICO_SIZE_OPTION);

  const n = notes(from, to);
  const jpegAlias = (f) => (f === 'jpg' ? ['jpeg'] : []);
  const kw = new Set([
    `${from} to ${to}`, `convert ${from} to ${to}`, `${from} to ${to} converter`, `${F.name.toLowerCase()} to ${T.name.toLowerCase()} online`,
    ...jpegAlias(from).map((a) => `${a} to ${to}`), ...jpegAlias(to).map((a) => `${from} to ${a}`),
    ...(to === 'ico' ? ['favicon generator', `${from} to favicon`] : []),
  ]);

  return {
    slug,
    name,
    category: 'image',
    icon: to === 'ico' ? 'ImageDown' : 'RefreshCw',
    from,
    to,
    conversion: true,
    variant: !FEATURED.has(slug),
    short: `Convert ${F.name} images to ${T.name}${to === 'ico' ? ' icons and favicons' : ''} in your browser.`,
    title: `${name} Converter Online Free${to === 'ico' ? ' – Favicon Maker' : ''}`,
    description: `Convert ${F.name} to ${T.name} online for free. ${n[0] ? n[0][1].split('. ')[0].replace(/\.$/, '') + '.' : ''} Batch convert in your browser — nothing is uploaded.`.replace(/\s+/g, ' ').slice(0, 300),
    answer: `To convert ${F.name} to ${T.name}, choose your ${F.name} files above${options.length ? ', adjust the settings if needed' : ''}, click “Convert to ${T.name}” and download the result. The conversion runs entirely in your browser, so your images are never uploaded. ${n.slice(0, 2).map((x) => x[1]).join(' ')}`,
    reason: reason(from, to),
    keywords: [...kw],
    accept: F.accept,
    multiple: true,
    cta: `Convert to ${T.name}`,
    options,
    steps: [
      `Click “Select image files” or drag your ${F.name} files onto the page.`,
      options.length ? `Adjust the ${options.map((o) => o.label.replace(/ \(.*\)/, '').toLowerCase()).join(' and ')} if you like.` : `Nothing to set up — ${T.name} keeps the full quality.`,
      `Click “Convert to ${T.name}”, then download each ${T.name} file or all of them as a ZIP.`,
    ],
    faqs: [
      { q: `Is it free to convert ${F.name} to ${T.name}?`, a: `Yes. The ${name} converter is free with no sign-up, no watermark and no limit on the number of images.` },
      { q: `Are my ${F.name} files uploaded?`, a: `No. The conversion happens inside your browser using its built-in image engine, so your files never leave your device.` },
      ...n.map(([q, a]) => ({ q, a })),
      { q: `Can I convert many ${F.name} files at once?`, a: `Yes. Select or drop as many images as you like; they are converted one after another and can be downloaded together as a ZIP.` },
    ],
  };
}

export const IMAGE_CONVERSIONS = INPUTS.flatMap((from) => OUTPUTS.filter((to) => to !== from).map((to) => build(from, to)));

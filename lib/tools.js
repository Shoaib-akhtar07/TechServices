// Single source of truth for every tool: SEO copy, UI options and FAQ.
// Processing logic lives in lib/processors.js, keyed by the same slug.

export const CATEGORIES = [
  { id: 'create', name: 'Create Documents', color: 'bg-indigo-500', text: 'text-indigo-500', soft: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { id: 'pro', name: 'Pro Tools', color: 'bg-gradient-to-br from-amber-400 to-orange-600', text: 'text-orange-500', soft: 'bg-orange-50 dark:bg-orange-500/10' },
  { id: 'organize', name: 'Organize PDF', color: 'bg-rose-500', text: 'text-rose-500', soft: 'bg-rose-50 dark:bg-rose-500/10' },
  { id: 'optimize', name: 'Optimize PDF', color: 'bg-emerald-500', text: 'text-emerald-500', soft: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { id: 'convert', name: 'Convert PDF', color: 'bg-amber-500', text: 'text-amber-500', soft: 'bg-amber-50 dark:bg-amber-500/10' },
  { id: 'edit', name: 'Edit & Sign PDF', color: 'bg-violet-500', text: 'text-violet-500', soft: 'bg-violet-50 dark:bg-violet-500/10' },
  { id: 'image', name: 'Image Tools', color: 'bg-sky-500', text: 'text-sky-500', soft: 'bg-sky-50 dark:bg-sky-500/10' },
];

const PDF = 'application/pdf,.pdf';
const IMG = 'image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp';

const RANGE_HELP = 'Example: 1-3, 5, 8-10. Use "8-" for page 8 to the end.';
const WORD = '.doc,.docx,.odt,.rtf';
const EXCEL = '.xls,.xlsx,.ods,.csv';
const PPT = '.ppt,.pptx,.odp';

// Pro tools run on the server and require an active subscription (see app/api/premium).
const PRO_TOOLS = [
  {
    slug: 'pdf-to-word',
    name: 'PDF to Word',
    icon: 'FileType',
    short: 'Turn a PDF into an editable Word (.docx) document.',
    title: 'PDF to Word Converter – Editable DOCX',
    description:
      'Convert PDF to editable Word documents. NexPDF Pro keeps paragraphs, font sizes and bold text so you can edit right away in Microsoft Word or Google Docs.',
    keywords: ['pdf to word', 'convert pdf to docx', 'pdf to editable word', 'pdf to doc converter'],
    accept: '.pdf',
    cta: 'Convert to Word',
    options: [],
    steps: ['Choose your PDF.', 'Click “Convert to Word”.', 'Download the editable .docx file.'],
    faqs: [{ q: 'What about scanned PDFs?', a: 'Scanned pages are images, so they are kept as pictures in the Word file. Run OCR PDF first to turn them into real text, then convert.' }],
  },
  {
    slug: 'pdf-to-excel',
    name: 'PDF to Excel',
    icon: 'Sheet',
    short: 'Pull tables out of a PDF into an Excel spreadsheet.',
    title: 'PDF to Excel Converter – Extract Tables to XLSX',
    description:
      'Convert PDF tables to Excel spreadsheets. NexPDF Pro detects rows and columns, turns numbers into real numeric cells and puts each page on its own sheet.',
    keywords: ['pdf to excel', 'pdf to xlsx', 'extract table from pdf', 'convert pdf to spreadsheet'],
    accept: '.pdf',
    cta: 'Convert to Excel',
    options: [],
    steps: ['Choose a PDF that contains tables.', 'Click “Convert to Excel”.', 'Download the .xlsx workbook — one sheet per page.'],
    faqs: [{ q: 'Are numbers kept as numbers?', a: 'Yes. Values such as 1,250.50 become numeric cells, so formulas and sorting work straight away.' }],
  },
  {
    slug: 'pdf-to-powerpoint',
    name: 'PDF to PowerPoint',
    icon: 'Presentation',
    short: 'Turn every PDF page into a PowerPoint slide.',
    title: 'PDF to PowerPoint Converter – PDF to PPTX',
    description: 'Convert PDF to PowerPoint presentations. Every page becomes a sharp, full-size slide you can present, reorder and annotate.',
    keywords: ['pdf to ppt', 'pdf to powerpoint', 'convert pdf to pptx', 'pdf to slides'],
    accept: '.pdf',
    cta: 'Convert to PowerPoint',
    options: [],
    steps: ['Choose your PDF.', 'Click “Convert to PowerPoint”.', 'Download the .pptx presentation.'],
    faqs: [],
  },
  {
    slug: 'word-to-pdf',
    name: 'Word to PDF',
    icon: 'FileText',
    short: 'Convert DOC and DOCX files into perfect PDFs.',
    title: 'Word to PDF Converter – DOCX to PDF',
    description: 'Convert Word documents (DOC, DOCX, ODT, RTF) to PDF with layout, fonts and images preserved. Fast, accurate and secure with NexPDF Pro.',
    keywords: ['word to pdf', 'docx to pdf', 'doc to pdf', 'convert word to pdf'],
    accept: WORD,
    multiple: true,
    cta: 'Convert to PDF',
    options: [],
    steps: ['Choose one or more Word files.', 'Click “Convert to PDF”.', 'Download your PDFs.'],
    faqs: [],
  },
  {
    slug: 'excel-to-pdf',
    name: 'Excel to PDF',
    icon: 'Table',
    short: 'Convert spreadsheets into clean, printable PDFs.',
    title: 'Excel to PDF Converter – XLSX to PDF',
    description: 'Convert Excel spreadsheets (XLS, XLSX, ODS, CSV) to PDF. Every sheet is converted with its formatting intact.',
    keywords: ['excel to pdf', 'xlsx to pdf', 'convert spreadsheet to pdf', 'csv to pdf'],
    accept: EXCEL,
    multiple: true,
    cta: 'Convert to PDF',
    options: [],
    steps: ['Choose your Excel files.', 'Click “Convert to PDF”.', 'Download the PDFs.'],
    faqs: [],
  },
  {
    slug: 'powerpoint-to-pdf',
    name: 'PowerPoint to PDF',
    icon: 'MonitorPlay',
    short: 'Convert PPT and PPTX presentations to PDF.',
    title: 'PowerPoint to PDF Converter – PPTX to PDF',
    description: 'Convert PowerPoint presentations (PPT, PPTX, ODP) to PDF — one slide per page, ready to share or print.',
    keywords: ['ppt to pdf', 'powerpoint to pdf', 'pptx to pdf', 'convert slides to pdf'],
    accept: PPT,
    multiple: true,
    cta: 'Convert to PDF',
    options: [],
    steps: ['Choose your presentations.', 'Click “Convert to PDF”.', 'Download the PDFs.'],
    faqs: [],
  },
  {
    slug: 'ocr-pdf',
    name: 'OCR PDF',
    icon: 'ScanText',
    short: 'Make scanned PDFs and photos searchable and copyable.',
    title: 'OCR PDF Online – Make Scanned PDFs Searchable',
    description:
      'OCR scanned PDFs and images. NexPDF Pro recognises the text and creates a searchable, copyable PDF or a plain text file. Supports English, Urdu, Hindi, Arabic and more.',
    keywords: ['ocr pdf', 'scanned pdf to text', 'make pdf searchable', 'image to text', 'urdu ocr'],
    accept: '.pdf,.jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff',
    cta: 'Run OCR',
    options: [
      {
        id: 'language', label: 'Document language', type: 'select', default: 'eng',
        choices: [
          { value: 'eng', label: 'English' },
          { value: 'urd', label: 'Urdu' },
          { value: 'hin', label: 'Hindi' },
          { value: 'ara', label: 'Arabic' },
          { value: 'fra', label: 'French' },
          { value: 'deu', label: 'German' },
          { value: 'spa', label: 'Spanish' },
        ],
      },
      {
        id: 'output', label: 'Output', type: 'select', default: 'pdf',
        choices: [{ value: 'pdf', label: 'Searchable PDF' }, { value: 'txt', label: 'Plain text (.txt)' }],
      },
    ],
    steps: ['Choose a scanned PDF or photo.', 'Pick the document language and output.', 'Click “Run OCR” and download.'],
    faqs: [{ q: 'How accurate is OCR?', a: 'Clear scans at 300 DPI usually reach 95%+ accuracy. Blurry photos, handwriting and unusual fonts reduce accuracy.' }],
  },
  {
    slug: 'protect-pdf',
    name: 'Protect PDF',
    icon: 'Lock',
    short: 'Add a password and AES-256 encryption to a PDF.',
    title: 'Protect PDF with Password – AES-256 Encryption',
    description: 'Password-protect PDF files with strong AES-256 encryption. Optionally block printing and copying. Secure your contracts, statements and IDs.',
    keywords: ['protect pdf', 'password protect pdf', 'encrypt pdf', 'lock pdf', 'secure pdf'],
    accept: '.pdf',
    cta: 'Protect PDF',
    options: [
      { id: 'password', label: 'Password', type: 'password', default: '', help: 'At least 4 characters. We never store it — don’t forget it!' },
      { id: 'allowPrinting', label: 'Allow printing', type: 'checkbox', default: true },
      { id: 'allowCopying', label: 'Allow copying text', type: 'checkbox', default: false },
    ],
    steps: ['Choose your PDF.', 'Enter a strong password and choose permissions.', 'Click “Protect PDF” and download.'],
    faqs: [{ q: 'Can you recover a forgotten password?', a: 'No. We never store passwords, and AES-256 cannot be reversed. Keep your password somewhere safe.' }],
  },
  {
    slug: 'unlock-pdf',
    name: 'Unlock PDF',
    icon: 'LockOpen',
    short: 'Remove the password from a PDF you own.',
    title: 'Unlock PDF – Remove PDF Password',
    description: 'Remove password protection from your PDF files. Enter the password once and download an unlocked copy that opens without it.',
    keywords: ['unlock pdf', 'remove pdf password', 'decrypt pdf', 'pdf password remover'],
    accept: '.pdf',
    cta: 'Unlock PDF',
    options: [{ id: 'password', label: 'Current password', type: 'password', default: '' }],
    steps: ['Choose the protected PDF.', 'Enter its password.', 'Click “Unlock PDF” and download.'],
    faqs: [{ q: 'Can I unlock a PDF without the password?', a: 'No. You need the password — this tool is for removing protection from documents you are allowed to open.' }],
  },
].map((t) => ({ ...t, category: 'pro', premium: true, multiple: !!t.multiple }));

// Document editors: run fully in the browser, free to use; Pro unlocks extra templates.
const EDITOR_FAQS = [
  { q: 'Is my document saved anywhere?', a: 'Your draft is auto-saved only in this browser, on this device. Nothing is uploaded to our servers. Download your file when you are done — that is your copy.' },
  { q: 'What do Pro members get?', a: 'Pro members unlock professionally designed templates such as resumes, invoices, business proposals, sales trackers and pitch decks.' },
];

const CREATE_TOOLS = [
  {
    slug: 'create-word',
    name: 'Create Word Document',
    editor: 'doc',
    icon: 'FilePen',
    short: 'Write and format documents online, then download as Word or PDF.',
    title: 'Create Word Document Online Free – DOCX Editor',
    description:
      'Write a Word document online for free. Headings, bold, lists and alignment — then download as .docx or PDF. No sign-up, nothing uploaded.',
    keywords: ['create word document online', 'online word editor', 'write docx online', 'free word processor', 'make word file'],
    steps: ['Start with a blank page or a template.', 'Type and format your text with the toolbar.', 'Download as Word (.docx) or PDF.'],
    faqs: [{ q: 'Can I open the file in Microsoft Word?', a: 'Yes. The .docx file opens in Microsoft Word, Google Docs, LibreOffice and WPS with headings, lists and formatting intact.' }],
  },
  {
    slug: 'create-excel',
    name: 'Create Excel Sheet',
    editor: 'sheet',
    icon: 'Grid3x3',
    short: 'Build spreadsheets with formulas and download as Excel.',
    title: 'Create Excel Spreadsheet Online Free – XLSX Editor',
    description:
      'Create an Excel spreadsheet online for free. Enter data, use formulas like SUM, AVERAGE and IF, then download as .xlsx, CSV or PDF. Works in your browser.',
    keywords: ['create excel online', 'online spreadsheet', 'make xlsx file', 'free excel editor', 'spreadsheet with formulas'],
    steps: ['Start blank, from a template, or open an .xlsx / .csv file.', 'Type values and formulas — e.g. =SUM(B2:B10).', 'Download as Excel (.xlsx), CSV or PDF.'],
    faqs: [{ q: 'Which formulas are supported?', a: 'SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS and IF, plus + − × ÷ ^, comparisons and & to join text. Formulas are kept in the downloaded Excel file.' }],
  },
  {
    slug: 'create-powerpoint',
    name: 'Create PowerPoint',
    editor: 'slides',
    icon: 'GalleryHorizontal',
    short: 'Design slides with themes and download as PowerPoint or PDF.',
    title: 'Create PowerPoint Presentation Online Free – PPTX Maker',
    description:
      'Make a PowerPoint presentation online for free. Add slides, pick a theme, write bullet points and add images — then download as .pptx or PDF.',
    keywords: ['create powerpoint online', 'presentation maker', 'make pptx', 'online slides maker', 'free ppt maker'],
    steps: ['Pick a theme or a template.', 'Add slides and type titles, bullet points and images.', 'Download as PowerPoint (.pptx) or PDF.'],
    faqs: [{ q: 'Can I edit the slides later in PowerPoint?', a: 'Yes. Titles and bullet points are real, editable text boxes in the .pptx file.' }],
  },
  {
    slug: 'create-pdf',
    name: 'Create PDF',
    editor: 'pdf',
    icon: 'FilePlus2',
    short: 'Write a document and save it straight to PDF.',
    title: 'Create PDF Online Free – Write & Save as PDF',
    description: 'Create a PDF from scratch online. Type and format your text, choose A4 or Letter, and download a clean PDF in one click — free and private.',
    keywords: ['create pdf online', 'make pdf', 'write pdf', 'pdf creator free', 'text to pdf editor'],
    steps: ['Start blank or from a template.', 'Write and format your content.', 'Click “Download PDF”.'],
    faqs: [],
  },
].map((t) => ({ ...t, category: 'create', accept: '', options: [], faqs: [...t.faqs, ...EDITOR_FAQS] }));

export const TOOLS = [
  ...CREATE_TOOLS,
  ...PRO_TOOLS,
  // ---------------- ORGANIZE ----------------
  {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    category: 'organize',
    icon: 'Combine',
    short: 'Combine multiple PDFs into one file in the order you choose.',
    title: 'Merge PDF Online Free – Combine PDF Files in Seconds',
    description:
      'Merge PDF files online for free. Combine multiple PDFs into one document, reorder them with a click and download instantly. No upload, no sign-up, 100% private.',
    keywords: ['merge pdf', 'combine pdf', 'join pdf files', 'pdf merger online', 'merge pdf free'],
    accept: PDF,
    multiple: true,
    minFiles: 2,
    cta: 'Merge PDF',
    options: [],
    steps: [
      'Drop two or more PDF files into the box, or click to choose them.',
      'Use the arrows to put the files in the order you want.',
      'Click “Merge PDF” and download your combined document.',
    ],
    faqs: [
      { q: 'How many PDFs can I merge at once?', a: 'There is no fixed limit. Because merging runs on your own device, the practical limit is your computer’s memory — dozens of normal-sized files work fine.' },
      { q: 'Will merging reduce the quality of my PDF?', a: 'No. Pages are copied as-is, so text stays selectable and images keep their original quality.' },
    ],
  },
  {
    slug: 'split-pdf',
    name: 'Split PDF',
    category: 'organize',
    icon: 'Scissors',
    short: 'Split a PDF into single pages, fixed chunks or custom ranges.',
    title: 'Split PDF Online Free – Separate PDF Pages Instantly',
    description:
      'Split a PDF into separate files by page range, every page, or every N pages. Free online PDF splitter that works in your browser — no upload required.',
    keywords: ['split pdf', 'separate pdf pages', 'pdf splitter', 'split pdf by pages', 'cut pdf'],
    accept: PDF,
    multiple: false,
    cta: 'Split PDF',
    options: [
      {
        id: 'mode', label: 'Split mode', type: 'select', default: 'ranges',
        choices: [
          { value: 'ranges', label: 'Custom ranges (one file per range)' },
          { value: 'every', label: 'Every page as a separate file' },
          { value: 'chunk', label: 'Every N pages' },
        ],
      },
      { id: 'ranges', label: 'Page ranges', type: 'text', default: '1-2, 3-', help: RANGE_HELP, showIf: { mode: 'ranges' } },
      { id: 'chunk', label: 'Pages per file', type: 'number', default: 2, min: 1, max: 1000, showIf: { mode: 'chunk' } },
    ],
    steps: [
      'Choose the PDF you want to split.',
      'Pick a split mode: custom ranges, every page, or every N pages.',
      'Click “Split PDF” and download the files individually or as a ZIP.',
    ],
    faqs: [
      { q: 'Can I split a PDF into single pages?', a: 'Yes. Choose “Every page as a separate file” and each page becomes its own PDF, bundled in a ZIP for easy download.' },
    ],
  },
  {
    slug: 'remove-pages',
    name: 'Remove Pages',
    category: 'organize',
    icon: 'Trash2',
    short: 'Delete unwanted pages from a PDF document.',
    title: 'Remove Pages from PDF Online Free – Delete PDF Pages',
    description:
      'Delete pages from a PDF online for free. Enter the pages you want gone and download a clean document in seconds. Private, browser-based PDF page remover.',
    keywords: ['remove pages from pdf', 'delete pdf pages', 'pdf page remover', 'delete page from pdf'],
    accept: PDF,
    multiple: false,
    cta: 'Remove pages',
    options: [{ id: 'ranges', label: 'Pages to remove', type: 'text', default: '1', help: RANGE_HELP }],
    steps: [
      'Choose your PDF file.',
      'Type the page numbers you want to delete, e.g. “2, 5-7”.',
      'Click “Remove pages” and download the new PDF.',
    ],
    faqs: [{ q: 'Is the original file changed?', a: 'No. Your original file is never modified — you download a new copy without the removed pages.' }],
  },
  {
    slug: 'extract-pages',
    name: 'Extract Pages',
    category: 'organize',
    icon: 'FileOutput',
    short: 'Pull selected pages out of a PDF into a new file.',
    title: 'Extract Pages from PDF Online Free – Save Selected Pages',
    description:
      'Extract specific pages from a PDF and save them as a new document. Free, fast and secure — the PDF page extractor runs entirely in your browser.',
    keywords: ['extract pdf pages', 'save pages from pdf', 'pdf page extractor', 'select pages pdf'],
    accept: PDF,
    multiple: false,
    cta: 'Extract pages',
    options: [{ id: 'ranges', label: 'Pages to keep', type: 'text', default: '1-3', help: RANGE_HELP }],
    steps: ['Choose your PDF file.', 'Enter the pages you want to keep.', 'Click “Extract pages” and download the result.'],
    faqs: [],
  },
  {
    slug: 'organize-pdf',
    name: 'Organize PDF',
    category: 'organize',
    icon: 'ListOrdered',
    short: 'Reorder, duplicate or reverse the pages of a PDF.',
    title: 'Organize PDF Pages Online Free – Reorder & Rearrange PDF',
    description:
      'Rearrange PDF pages in any order, duplicate pages or reverse the whole document. Free online PDF organizer with no upload and no sign-up.',
    keywords: ['organize pdf', 'reorder pdf pages', 'rearrange pdf', 'reverse pdf pages', 'sort pdf pages'],
    accept: PDF,
    multiple: false,
    cta: 'Organize PDF',
    options: [
      { id: 'reverse', label: 'Simply reverse the page order', type: 'checkbox', default: false },
      { id: 'order', label: 'New page order', type: 'text', default: '1, 2, 3', help: 'List pages in the new order, e.g. 3, 1, 2, 4-10. Repeating a number duplicates that page.', showIf: { reverse: false } },
    ],
    steps: ['Choose your PDF file.', 'Type the new page order, or tick “reverse”.', 'Click “Organize PDF” and download it.'],
    faqs: [{ q: 'Can I duplicate a page?', a: 'Yes. Just list the page number twice, for example “1, 1, 2, 3”.' }],
  },
  {
    slug: 'rotate-pdf',
    name: 'Rotate PDF',
    category: 'organize',
    icon: 'RotateCw',
    short: 'Rotate all pages or just selected pages of a PDF.',
    title: 'Rotate PDF Online Free – Turn PDF Pages Permanently',
    description:
      'Rotate PDF pages 90°, 180° or 270° and save permanently. Rotate every page or just the ones you pick. Free, private online PDF rotator.',
    keywords: ['rotate pdf', 'rotate pdf pages', 'turn pdf', 'rotate pdf permanently', 'flip pdf'],
    accept: PDF,
    multiple: true,
    cta: 'Rotate PDF',
    options: [
      {
        id: 'angle', label: 'Rotation', type: 'select', default: '90',
        choices: [
          { value: '90', label: '90° clockwise' },
          { value: '180', label: '180°' },
          { value: '270', label: '90° counter-clockwise' },
        ],
      },
      { id: 'pages', label: 'Pages to rotate', type: 'text', default: 'all', help: 'Type “all” or a range like 1-3, 6.' },
    ],
    steps: ['Choose one or more PDFs.', 'Pick the rotation angle and which pages to rotate.', 'Click “Rotate PDF” and download.'],
    faqs: [],
  },

  // ---------------- OPTIMIZE ----------------
  {
    slug: 'compress-pdf',
    name: 'Compress PDF',
    category: 'optimize',
    icon: 'Minimize2',
    short: 'Reduce PDF file size while keeping good quality.',
    title: 'Compress PDF Online Free – Reduce PDF File Size',
    description:
      'Compress PDF files online for free. Shrink PDF size for email, upload portals and WhatsApp with three compression levels. Private — nothing is uploaded.',
    keywords: ['compress pdf', 'reduce pdf size', 'pdf compressor', 'shrink pdf', 'compress pdf to 100kb', 'make pdf smaller'],
    accept: PDF,
    multiple: true,
    cta: 'Compress PDF',
    options: [
      {
        id: 'level', label: 'Compression level', type: 'select', default: 'medium',
        choices: [
          { value: 'low', label: 'Light – lossless, keeps text selectable' },
          { value: 'medium', label: 'Recommended – good quality, much smaller' },
          { value: 'high', label: 'Extreme – smallest size, lower quality' },
        ],
      },
    ],
    steps: ['Choose the PDF files to compress.', 'Select a compression level.', 'Click “Compress PDF” and download the smaller files.'],
    faqs: [
      { q: 'What is the difference between the levels?', a: '“Light” rewrites the file structure without touching content, so text stays selectable. “Recommended” and “Extreme” re-encode each page as an optimized image, which gives much bigger savings on scanned or image-heavy PDFs, but text is no longer selectable.' },
      { q: 'What if the file does not get smaller?', a: 'If the compressed version would be larger than the original, NexPDF keeps your original file so you never end up with a bigger PDF.' },
    ],
  },
  {
    slug: 'repair-pdf',
    name: 'Repair PDF',
    category: 'optimize',
    icon: 'Wrench',
    short: 'Fix damaged or corrupted PDFs that will not open.',
    title: 'Repair PDF Online Free – Fix Corrupted PDF Files',
    description:
      'Repair damaged or corrupted PDF files online. NexPDF rebuilds the PDF structure and recovers readable pages — free and fully in your browser.',
    keywords: ['repair pdf', 'fix corrupted pdf', 'pdf repair online', 'recover pdf', 'damaged pdf'],
    accept: PDF,
    multiple: true,
    cta: 'Repair PDF',
    options: [],
    steps: ['Choose the damaged PDF.', 'Click “Repair PDF”.', 'Download the rebuilt file.'],
    faqs: [{ q: 'Can every PDF be repaired?', a: 'Many common problems such as broken cross-reference tables can be fixed. Files that are severely truncated may only be partly recoverable.' }],
  },
  {
    slug: 'flatten-pdf',
    name: 'Flatten PDF',
    category: 'optimize',
    icon: 'Layers',
    short: 'Lock form fields so filled PDFs can no longer be edited.',
    title: 'Flatten PDF Online Free – Lock PDF Form Fields',
    description:
      'Flatten PDF forms online so filled-in fields become permanent page content. Perfect before sharing or printing forms. Free and private.',
    keywords: ['flatten pdf', 'flatten pdf form', 'lock pdf fields', 'make pdf non editable'],
    accept: PDF,
    multiple: true,
    cta: 'Flatten PDF',
    options: [],
    steps: ['Choose a filled-in PDF form.', 'Click “Flatten PDF”.', 'Download the locked document.'],
    faqs: [],
  },
  {
    slug: 'grayscale-pdf',
    name: 'Grayscale PDF',
    category: 'optimize',
    icon: 'Palette',
    short: 'Convert a colour PDF to black and white for cheap printing.',
    title: 'Convert PDF to Grayscale Online Free – Black & White PDF',
    description:
      'Turn a colour PDF into grayscale (black and white) online. Save ink when printing and reduce file size. Free, fast and runs in your browser.',
    keywords: ['grayscale pdf', 'pdf to black and white', 'convert pdf to grayscale', 'remove color from pdf'],
    accept: PDF,
    multiple: true,
    cta: 'Convert to grayscale',
    options: [],
    steps: ['Choose the PDF.', 'Click “Convert to grayscale”.', 'Download your black-and-white PDF.'],
    faqs: [],
  },

  // ---------------- CONVERT ----------------
  {
    slug: 'jpg-to-pdf',
    name: 'JPG to PDF',
    category: 'convert',
    icon: 'FileImage',
    short: 'Turn JPG, PNG, WebP and other images into a PDF.',
    title: 'JPG to PDF Converter Online Free – Images to PDF',
    description:
      'Convert JPG, PNG, WebP and GIF images to PDF online for free. Choose page size, orientation and margins, then combine everything into one PDF.',
    keywords: ['jpg to pdf', 'image to pdf', 'png to pdf', 'convert photo to pdf', 'pictures to pdf'],
    accept: IMG,
    multiple: true,
    cta: 'Convert to PDF',
    options: [
      {
        id: 'size', label: 'Page size', type: 'select', default: 'a4',
        choices: [
          { value: 'fit', label: 'Same as image' },
          { value: 'a4', label: 'A4' },
          { value: 'letter', label: 'US Letter' },
        ],
      },
      {
        id: 'orientation', label: 'Orientation', type: 'select', default: 'auto', showIf: { size: ['a4', 'letter'] },
        choices: [
          { value: 'auto', label: 'Automatic' },
          { value: 'portrait', label: 'Portrait' },
          { value: 'landscape', label: 'Landscape' },
        ],
      },
      {
        id: 'margin', label: 'Margin', type: 'select', default: '20',
        choices: [
          { value: '0', label: 'No margin' },
          { value: '20', label: 'Small' },
          { value: '50', label: 'Large' },
        ],
      },
      { id: 'merge', label: 'Put all images into one PDF', type: 'checkbox', default: true },
    ],
    steps: ['Choose your images (JPG, PNG, WebP…).', 'Arrange the order and set page size and margins.', 'Click “Convert to PDF” and download.'],
    faqs: [{ q: 'Are phone photos rotated correctly?', a: 'Yes. NexPDF reads the photo’s orientation data so portrait pictures from your phone stay upright.' }],
  },
  {
    slug: 'pdf-to-jpg',
    name: 'PDF to JPG',
    category: 'convert',
    icon: 'Image',
    short: 'Convert every PDF page into a high-quality JPG image.',
    title: 'PDF to JPG Converter Online Free – High Quality Images',
    description:
      'Convert PDF pages to JPG images online. Pick the resolution (up to 300 DPI) and download all pages as a ZIP. Free, fast and private.',
    keywords: ['pdf to jpg', 'convert pdf to image', 'pdf to jpeg', 'pdf page to image', 'save pdf as jpg'],
    accept: PDF,
    multiple: true,
    cta: 'Convert to JPG',
    options: [
      {
        id: 'dpi', label: 'Image quality', type: 'select', default: '150',
        choices: [
          { value: '72', label: 'Low (72 DPI) – smallest files' },
          { value: '150', label: 'Normal (150 DPI)' },
          { value: '300', label: 'High (300 DPI) – best for print' },
        ],
      },
    ],
    steps: ['Choose your PDF.', 'Select the image quality.', 'Click “Convert to JPG” and download the images.'],
    faqs: [],
  },
  {
    slug: 'pdf-to-png',
    name: 'PDF to PNG',
    category: 'convert',
    icon: 'ImageDown',
    short: 'Save PDF pages as lossless PNG images.',
    title: 'PDF to PNG Converter Online Free – Lossless Images',
    description:
      'Convert PDF to PNG online for crisp, lossless images of every page. Choose resolution and download as a ZIP. No upload, no sign-up.',
    keywords: ['pdf to png', 'convert pdf to png', 'pdf to png high quality', 'pdf to transparent png'],
    accept: PDF,
    multiple: true,
    cta: 'Convert to PNG',
    options: [
      {
        id: 'dpi', label: 'Image quality', type: 'select', default: '150',
        choices: [
          { value: '72', label: 'Low (72 DPI)' },
          { value: '150', label: 'Normal (150 DPI)' },
          { value: '300', label: 'High (300 DPI)' },
        ],
      },
    ],
    steps: ['Choose your PDF.', 'Select the image quality.', 'Click “Convert to PNG” and download.'],
    faqs: [],
  },
  {
    slug: 'pdf-to-text',
    name: 'PDF to Text',
    category: 'convert',
    icon: 'FileText',
    short: 'Extract all the text from a PDF into a .txt file.',
    title: 'PDF to Text Converter Online Free – Extract Text from PDF',
    description:
      'Extract text from PDF files online and save it as a plain .txt file. Great for copying content, research and data entry. Free and private.',
    keywords: ['pdf to text', 'extract text from pdf', 'pdf to txt', 'copy text from pdf'],
    accept: PDF,
    multiple: true,
    cta: 'Extract text',
    options: [{ id: 'separators', label: 'Add page separators', type: 'checkbox', default: true }],
    steps: ['Choose your PDF.', 'Click “Extract text”.', 'Download the .txt file.'],
    faqs: [{ q: 'Does it work on scanned PDFs?', a: 'Scanned PDFs are pictures of text, so they contain no extractable text. This tool works on PDFs created digitally (Word exports, e-books, invoices, etc.).' }],
  },
  {
    slug: 'text-to-pdf',
    name: 'Text to PDF',
    category: 'convert',
    icon: 'Type',
    short: 'Convert plain .txt files into clean, printable PDFs.',
    title: 'Text to PDF Converter Online Free – TXT to PDF',
    description:
      'Convert TXT files to PDF online with your choice of font, size and page format. Clean, printable PDFs in one click — free and private.',
    keywords: ['text to pdf', 'txt to pdf', 'convert text file to pdf', 'notepad to pdf'],
    accept: '.txt,text/plain',
    multiple: true,
    cta: 'Convert to PDF',
    options: [
      {
        id: 'font', label: 'Font', type: 'select', default: 'Helvetica',
        choices: [
          { value: 'Helvetica', label: 'Sans-serif (Helvetica)' },
          { value: 'TimesRoman', label: 'Serif (Times)' },
          { value: 'Courier', label: 'Monospace (Courier)' },
        ],
      },
      { id: 'fontSize', label: 'Font size', type: 'number', default: 11, min: 6, max: 36 },
      {
        id: 'size', label: 'Page size', type: 'select', default: 'a4',
        choices: [{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' }],
      },
    ],
    steps: ['Choose your .txt files.', 'Pick a font, size and page format.', 'Click “Convert to PDF” and download.'],
    faqs: [{ q: 'Are non-English characters supported?', a: 'The built-in PDF fonts cover Latin characters. Characters outside that range (for example Hindi or Chinese) are replaced with “?”.' }],
  },

  // ---------------- EDIT ----------------
  {
    slug: 'sign-pdf',
    name: 'Sign PDF',
    category: 'edit',
    icon: 'PenTool',
    short: 'Draw your signature and place it on a PDF.',
    title: 'Sign PDF Online Free – Add Electronic Signature to PDF',
    description:
      'Sign PDF documents online for free. Draw your signature, choose where it goes and download the signed PDF. No account, no upload, totally private.',
    keywords: ['sign pdf', 'esign pdf', 'add signature to pdf', 'electronic signature pdf', 'sign pdf online free'],
    accept: PDF,
    multiple: false,
    cta: 'Sign PDF',
    options: [
      { id: 'signature', label: 'Draw your signature', type: 'signature', default: '' },
      {
        id: 'pages', label: 'Place on', type: 'select', default: 'last',
        choices: [
          { value: 'last', label: 'Last page' },
          { value: 'first', label: 'First page' },
          { value: 'all', label: 'Every page' },
        ],
      },
      {
        id: 'position', label: 'Position', type: 'select', default: 'bottom-right',
        choices: [
          { value: 'bottom-right', label: 'Bottom right' },
          { value: 'bottom-center', label: 'Bottom centre' },
          { value: 'bottom-left', label: 'Bottom left' },
          { value: 'top-right', label: 'Top right' },
          { value: 'top-left', label: 'Top left' },
        ],
      },
      { id: 'width', label: 'Signature width (points)', type: 'range', default: 150, min: 60, max: 300, step: 10 },
      { id: 'date', label: 'Add today’s date under the signature', type: 'checkbox', default: false },
    ],
    steps: ['Choose the PDF you need to sign.', 'Draw your signature with mouse, finger or stylus and pick its position.', 'Click “Sign PDF” and download the signed copy.'],
    faqs: [{ q: 'Is this a legally binding signature?', a: 'A drawn signature is a simple electronic signature, which is accepted for many everyday documents in most countries. For contracts that need certificate-based digital signatures, check your local regulations.' }],
  },
  {
    slug: 'add-watermark',
    name: 'Add Watermark',
    category: 'edit',
    icon: 'Droplets',
    short: 'Stamp text like “CONFIDENTIAL” over your PDF pages.',
    title: 'Add Watermark to PDF Online Free – Text Watermark',
    description:
      'Add a text watermark to PDF pages online. Control text, size, colour, opacity, angle and tiling. Free, private PDF watermark tool.',
    keywords: ['watermark pdf', 'add watermark to pdf', 'pdf watermark online', 'stamp pdf', 'confidential watermark'],
    accept: PDF,
    multiple: true,
    cta: 'Add watermark',
    options: [
      { id: 'text', label: 'Watermark text', type: 'text', default: 'CONFIDENTIAL' },
      { id: 'fontSize', label: 'Font size', type: 'range', default: 60, min: 10, max: 150, step: 2 },
      { id: 'opacity', label: 'Opacity (%)', type: 'range', default: 25, min: 5, max: 100, step: 5 },
      { id: 'color', label: 'Colour', type: 'color', default: '#e11d48' },
      { id: 'angle', label: 'Angle (degrees)', type: 'range', default: 45, min: -90, max: 90, step: 5 },
      {
        id: 'layout', label: 'Layout', type: 'select', default: 'center',
        choices: [{ value: 'center', label: 'Once, in the centre' }, { value: 'tile', label: 'Tiled across the page' }],
      },
    ],
    steps: ['Choose your PDF files.', 'Type the watermark text and style it.', 'Click “Add watermark” and download.'],
    faqs: [],
  },
  {
    slug: 'add-page-numbers',
    name: 'Add Page Numbers',
    category: 'edit',
    icon: 'Hash',
    short: 'Insert page numbers with your choice of style and position.',
    title: 'Add Page Numbers to PDF Online Free',
    description:
      'Add page numbers to a PDF online. Choose position, format (“Page 1 of 10”), font size and starting number. Free and works in your browser.',
    keywords: ['add page numbers to pdf', 'number pdf pages', 'pdf page numbering', 'insert page numbers pdf'],
    accept: PDF,
    multiple: true,
    cta: 'Add page numbers',
    options: [
      {
        id: 'position', label: 'Position', type: 'select', default: 'bottom-center',
        choices: [
          { value: 'bottom-center', label: 'Bottom centre' },
          { value: 'bottom-right', label: 'Bottom right' },
          { value: 'bottom-left', label: 'Bottom left' },
          { value: 'top-center', label: 'Top centre' },
          { value: 'top-right', label: 'Top right' },
          { value: 'top-left', label: 'Top left' },
        ],
      },
      {
        id: 'format', label: 'Format', type: 'select', default: '{n}',
        choices: [
          { value: '{n}', label: '1' },
          { value: 'Page {n}', label: 'Page 1' },
          { value: 'Page {n} of {total}', label: 'Page 1 of 10' },
          { value: '{n} / {total}', label: '1 / 10' },
        ],
      },
      { id: 'start', label: 'Start numbering at', type: 'number', default: 1, min: 0, max: 100000 },
      { id: 'fontSize', label: 'Font size', type: 'number', default: 11, min: 6, max: 48 },
      { id: 'skipFirst', label: 'Don’t number the first page (cover)', type: 'checkbox', default: false },
    ],
    steps: ['Choose your PDF.', 'Pick position, format and starting number.', 'Click “Add page numbers” and download.'],
    faqs: [],
  },
  {
    slug: 'edit-pdf-metadata',
    name: 'Edit PDF Metadata',
    category: 'edit',
    icon: 'Info',
    short: 'Change or remove a PDF’s title, author, subject and keywords.',
    title: 'Edit PDF Metadata Online Free – Change Title & Author',
    description:
      'View and edit PDF metadata online: title, author, subject, keywords and creator. Remove hidden metadata before sharing. Free and private.',
    keywords: ['edit pdf metadata', 'change pdf title', 'pdf properties editor', 'remove pdf metadata', 'pdf author'],
    accept: PDF,
    multiple: false,
    cta: 'Save metadata',
    options: [
      { id: 'clear', label: 'Remove all metadata (privacy clean-up)', type: 'checkbox', default: false },
      { id: 'title', label: 'Title', type: 'text', default: '', showIf: { clear: false } },
      { id: 'author', label: 'Author', type: 'text', default: '', showIf: { clear: false } },
      { id: 'subject', label: 'Subject', type: 'text', default: '', showIf: { clear: false } },
      { id: 'keywords', label: 'Keywords (comma separated)', type: 'text', default: '', showIf: { clear: false } },
      { id: 'creator', label: 'Creator application', type: 'text', default: '', showIf: { clear: false } },
    ],
    steps: ['Choose your PDF — its current metadata loads automatically.', 'Edit the fields, or tick “Remove all metadata”.', 'Click “Save metadata” and download.'],
    faqs: [{ q: 'Why does PDF metadata matter for SEO?', a: 'Search engines index PDFs, and the Title field is often shown as the result headline. A clear title and subject help your PDF rank and get clicked.' }],
  },

  // ---------------- IMAGE ----------------
  {
    slug: 'compress-image',
    name: 'Compress Image',
    category: 'image',
    icon: 'ImageMinus',
    short: 'Shrink JPG, PNG and WebP images with adjustable quality.',
    title: 'Compress Image Online Free – Reduce JPG & PNG Size',
    description:
      'Compress images online to reduce file size for websites, email and forms. Adjust quality, output JPG or WebP, and batch-process many images at once.',
    keywords: ['compress image', 'reduce image size', 'compress jpg', 'image compressor', 'compress photo to 50kb'],
    accept: IMG,
    multiple: true,
    cta: 'Compress images',
    options: [
      { id: 'quality', label: 'Quality (%)', type: 'range', default: 70, min: 10, max: 100, step: 5 },
      {
        id: 'format', label: 'Output format', type: 'select', default: 'jpeg',
        choices: [{ value: 'jpeg', label: 'JPG' }, { value: 'webp', label: 'WebP (smaller)' }],
      },
    ],
    steps: ['Choose your images.', 'Set the quality and format.', 'Click “Compress images” and download.'],
    faqs: [],
  },
  {
    slug: 'resize-image',
    name: 'Resize Image',
    category: 'image',
    icon: 'Scaling',
    short: 'Change image dimensions by pixels or percentage.',
    title: 'Resize Image Online Free – Change Image Dimensions',
    description:
      'Resize images online by exact pixels or percentage while keeping the aspect ratio. Batch resize JPG, PNG and WebP — free and private.',
    keywords: ['resize image', 'image resizer', 'change image size', 'resize photo online', 'resize jpg'],
    accept: IMG,
    multiple: true,
    cta: 'Resize images',
    options: [
      {
        id: 'mode', label: 'Resize by', type: 'select', default: 'percent',
        choices: [{ value: 'percent', label: 'Percentage' }, { value: 'pixels', label: 'Exact pixels' }],
      },
      { id: 'percent', label: 'Scale (%)', type: 'range', default: 50, min: 5, max: 200, step: 5, showIf: { mode: 'percent' } },
      { id: 'width', label: 'Width (px)', type: 'number', default: 1280, min: 1, max: 10000, showIf: { mode: 'pixels' } },
      { id: 'height', label: 'Height (px)', type: 'number', default: 720, min: 1, max: 10000, showIf: { mode: 'pixels' } },
      { id: 'keepRatio', label: 'Keep aspect ratio (fit inside width × height)', type: 'checkbox', default: true, showIf: { mode: 'pixels' } },
    ],
    steps: ['Choose your images.', 'Enter the new size.', 'Click “Resize images” and download.'],
    faqs: [],
  },
  {
    slug: 'convert-image',
    name: 'Convert Image',
    category: 'image',
    icon: 'RefreshCw',
    short: 'Convert between JPG, PNG and WebP formats.',
    title: 'Image Converter Online Free – JPG, PNG & WebP',
    description:
      'Convert images between JPG, PNG and WebP online. Batch convert in seconds with no upload and no quality surprises. Free image format converter.',
    keywords: ['image converter', 'png to jpg', 'jpg to png', 'webp to jpg', 'convert image format'],
    accept: IMG,
    multiple: true,
    cta: 'Convert images',
    options: [
      {
        id: 'format', label: 'Convert to', type: 'select', default: 'jpeg',
        choices: [{ value: 'jpeg', label: 'JPG' }, { value: 'png', label: 'PNG' }, { value: 'webp', label: 'WebP' }],
      },
      { id: 'quality', label: 'Quality (%)', type: 'range', default: 90, min: 10, max: 100, step: 5, showIf: { format: ['jpeg', 'webp'] } },
    ],
    steps: ['Choose your images.', 'Pick the target format.', 'Click “Convert images” and download.'],
    faqs: [],
  },
];

// FAQs shared by every tool page (added after tool-specific ones).
export const COMMON_FAQS = [
  { q: 'Is NexPDF really free?', a: 'Yes. Every tool is free to use with no sign-up, no watermarks and no daily limits.' },
  { q: 'Are my files safe?', a: 'Your files never leave your device. All processing happens inside your browser, so nothing is uploaded to a server — not even to us.' },
  { q: 'Does it work on mobile?', a: 'Yes. NexPDF works in any modern browser on Android, iPhone, Windows, Mac and Linux. No app install needed.' },
];

// FAQs for Pro tools, which are processed on our server rather than in the browser.
export const PRO_FAQS = [
  { q: 'Do I need a subscription?', a: 'Yes. This is a NexPDF Pro tool. Pro starts at $4/month on the yearly plan and unlocks every Pro tool. All 22 standard tools stay free forever.' },
  { q: 'What happens to my uploaded files?', a: 'Files are sent over an encrypted HTTPS connection, processed in memory on our server and deleted immediately after your download is generated. We never keep copies or look at your documents.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account page in one click. You keep Pro access until the end of the period you paid for.' },
];

export function getTool(slug) {
  return TOOLS.find((t) => t.slug === slug);
}

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id);
}

export function toolsByCategory(id) {
  return TOOLS.filter((t) => t.category === id);
}

export function relatedTools(slug, n = 6) {
  const tool = getTool(slug);
  const same = TOOLS.filter((t) => t.category === tool.category && t.slug !== slug);
  const others = TOOLS.filter((t) => t.category !== tool.category);
  return [...same, ...others].slice(0, n);
}

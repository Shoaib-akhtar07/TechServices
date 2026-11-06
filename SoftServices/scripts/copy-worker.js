// Copies the pdf.js worker into /public so it is served as a static file.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const dest = path.join(__dirname, '..', 'public', 'pdf.worker.min.js');
if (fs.existsSync(src)) fs.copyFileSync(src, dest);

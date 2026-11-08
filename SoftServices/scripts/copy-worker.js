// Copies the pdf.js worker into /public so it is served as a static file.
// Runs on `npm install` too — in a Docker build /public may not exist yet, so create it.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.js');
const dest = path.join(__dirname, '..', 'public', 'pdf.worker.min.js');
if (fs.existsSync(src)) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

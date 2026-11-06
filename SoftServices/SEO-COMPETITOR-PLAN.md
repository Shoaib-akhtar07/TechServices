# SoftServices – Competitor & SEO Plan

Prepared by NextTech Sol · 28 October 2026

## 1. Who we are competing with

| Site | What it really is | Threat |
|---|---|---|
| **ilovepdf.com** | The market leader for free online PDF tools. About 30 PDF tools, 25 languages, apps, API. | Main competitor for every "merge / compress / convert PDF" search. |
| **adobe.com/acrobat/online** | Adobe's free online tools (~50), many AI features (chat with PDF, summarise), very strong brand and domain. | Wins brand-trust searches; hard to outrank on head terms. |
| **get.adobe.com/reader** | Download page for the Acrobat Reader desktop app, not an online tool. | Competes only for "PDF reader / open PDF" searches. |
| **softservice.org** | **Not a PDF site.** A software-development outsourcing company. | **Brand risk:** its name is almost identical to "SoftServices". People searching for us may land on them, and Google may mix the two up. See section 5. |

## 2. Tool coverage after this update

SoftServices now has **47 tools** (was 35). New in this update:

| New tool | Matches competitor tool | Where it runs |
|---|---|---|
| Crop PDF | iLovePDF, Adobe | Browser |
| Add Text to PDF | Adobe | Browser |
| Redact PDF (true redaction, text removed) | iLovePDF | Browser |
| Compare PDF (green/red report) | iLovePDF | Browser |
| PDF to Markdown | iLovePDF | Browser |
| Scan to PDF (phone camera + scan clean-up) | iLovePDF | Browser |
| PNG to PDF, Image to PDF | Adobe | Browser |
| HTML to PDF | iLovePDF | Server (LibreOffice) |
| Crop Image, Rotate Image, Watermark Image | iLoveIMG | Browser |

**Where SoftServices is already ahead**

- Most tools run **inside the browser**, so files are never uploaded. iLovePDF and Adobe upload every file. This is our main selling point and should be in every headline.
- **Free mode:** Office conversions, OCR, protect/unlock and the Word/Excel/PowerPoint editors are free with an account. Adobe and iLovePDF limit these or charge for them.
- **Urdu and Hindi OCR**, which neither competitor promotes.
- **No watermarks and no daily task limits** on browser tools. iLovePDF limits free tasks.

**Still missing (next phase)**

| Missing | Why it matters | What it needs |
|---|---|---|
| AI: Chat with PDF, Summarise, Translate PDF | Adobe and iLovePDF push these hard; fast-growing searches | An AI API key (for example Claude). Has a running cost per use, so needs a daily limit. |
| PDF Forms / Fill & Sign | High-intent search ("fill pdf form online") | A visual form editor (bigger UI job) |
| Edit PDF (change existing text) | One of the biggest PDF searches | A visual page editor (largest job) |
| PDF to PDF/A | Needed for courts and government archives | Ghostscript on the server |
| HEIC to PDF / HEIC to JPG | iPhone users search this a lot | An open-source HEIC decoder library |
| Languages (Urdu, Hindi, Arabic…) | iLovePDF ranks in 25 languages | Translated pages plus `hreflang` tags |

## 3. Technical SEO – done in this update

| Check | Before | Now |
|---|---|---|
| Social share image (`og:image`) | Missing on all 57 pages | Every tool, blog post and the home page has its own branded 1200×630 image |
| Titles longer than ~65 characters | 20 pages | 3 blog posts (fine for articles) |
| Meta descriptions over 160 or under 70 characters | 13 pages | 0 |
| Meta descriptions promising a paid "Pro" plan | 6 | 0 (they work in both free and paid mode) |
| Canonical URL, one H1, valid JSON-LD, image alt text | OK | OK |
| Sitemap | 45 URLs, fixed at build time | 57 URLs, refreshed hourly, hides `/pricing/` in free mode |
| Production build | – | Passes |

## 4. Before going live (critical)

1. **Choose the real domain** and set it in `lib/site.js` (`url`, `email`, `twitter`). The site still uses the placeholder `https://www.softservices.com`. Every canonical, sitemap and share link uses this value. Wrong value = Google indexes nothing useful.
2. **Add Google Search Console and Bing Webmaster Tools**, paste the verification codes in Admin → Settings → Search engines, and submit `/sitemap.xml` to both. Bing matters because ChatGPT and Copilot search through Bing.
3. **Change the admin password** and create the production admin with `npm run make-admin`.
4. **Install LibreOffice on the server** (the Docker image does this). Without it, Word/Excel/PowerPoint/HTML to PDF do not work.

## 5. Brand name problem

"SoftServices" vs "softservice.org" (a software company) will confuse Google and users, and the plain name is hard to rank for. Options, best first:

1. **Rename to something unique** before launch (only cheap now, before any links exist). A name containing "PDF" helps ranking. Check that the .com is free and that there is no trademark.
2. Keep the name, but always use "SoftServices PDF" in titles, the logo and social profiles, and register the matching domain and social handles so Google learns which entity is which.

## 6. Keyword clusters (content plan)

Each cluster = one tool page (the hub) + 2–4 blog guides linking to it. Tool pages already exist; the guides are the work.

| Cluster (hub page) | Guides to write | Local angle (Pakistan / India) |
|---|---|---|
| Compress PDF | "Compress PDF to 100 KB / 200 KB", "Reduce PDF size for email" | "PDF size for NADRA / FBR / university portal upload" |
| Merge & Split PDF | "Combine scanned pages into one PDF", "Split a PDF on phone" | "Merge documents for visa application" |
| PDF to Word / Word to PDF | "Edit a PDF in Word for free", "Convert PDF to Word on mobile" | "CV to PDF for job applications" |
| OCR PDF | "Copy text from a scanned PDF", "Urdu OCR online" | Urdu / Hindi OCR (very low competition) |
| Sign & Redact | "Sign a PDF without printing", "Hide CNIC number in a PDF" | CNIC / Aadhaar redaction |
| Scan to PDF | "Scan documents with your phone without an app" | "Scan documents for online admission forms" |
| Image tools | "Passport size photo online", "Resize photo to 50 KB for forms" | Government form photo sizes (very high search volume) |
| Compare PDF | "Compare two contract versions" | – |

Rules for every guide: one clear question in the title, the answer in the first two sentences, step-by-step list, a link to the tool, FAQ at the end. This format is what Google AI Overviews and ChatGPT quote.

## 7. Backlinks & authority (after launch)

Backlinks cannot be audited yet because the site is not live. Plan for the first 3 months:

1. **Directories for free tools:** Product Hunt launch, AlternativeTo (list as an alternative to iLovePDF and Smallpdf), SaaSHub, G2/Capterra free listings.
2. **"Best free PDF tools" articles:** email the authors of top-10 lists and ask to be included. Lead with "files never leave your browser". These lists are the top source for AI-assistant answers.
3. **Pakistan/India education and job sites:** offer a short guide ("how to compress documents for admission portals") to university, scholarship and job-board blogs.
4. **Reddit and Quora:** answer real questions ("how do I compress a PDF to 100 KB") with a helpful answer and a link, not spam.
5. **NextTech Sol site:** add SoftServices to the portfolio with a link.

Target: 5–10 good links per month. Do not buy links.

## 8. Local SEO

Not applicable. SoftServices is an online tool used worldwide, with no shop or office customers visit. A Google Business Profile or `LocalBusiness` schema would be wrong and could get a listing suspended. If NextTech Sol has an office, local SEO belongs on the **NextTech Sol** website instead.

## 9. What this report could not measure

- Real search volumes and keyword difficulty (needs a tool such as Ahrefs, Semrush or DataForSEO).
- Competitor backlink profiles and our rankings (the site is not live yet).
- Core Web Vitals on real devices (measure with PageSpeed Insights after launch).

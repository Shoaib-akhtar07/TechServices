# NexPDF – Free + Pro online PDF tools

- **22 free tools** that run 100% in the browser (no uploads, no account).
- **9 Pro tools** for subscribers, processed on the server:
  PDF ↔ Word/Excel/PowerPoint, OCR, Protect PDF, Unlock PDF.
- **4 document editors** for Pro members (Create Word / Excel / PowerPoint / PDF). Editing runs
  in the browser with a draft auto-saved in `localStorage`; the .docx / .xlsx / .csv / .pptx / .pdf
  file is built on the server. The Excel editor has 140+ formulas, multiple sheets, number formats,
  fill handle and Excel keyboard shortcuts (Ctrl+/ lists them).
- Accounts (NextAuth, email + password), Stripe subscriptions (monthly / yearly),
  SQLite database via Prisma.

## Run locally

```bash
npm install
cp .env.example .env      # then set NEXTAUTH_SECRET (see comment in the file)
npx prisma db push        # creates prisma/dev.db
npm run dev               # http://localhost:3000
```

Without Stripe keys you can still test Pro locally: sign up, open **Pricing** and click
**“Activate test subscription (local dev only)”**. This button and its API are disabled
when `NODE_ENV=production`.

## How access control works

- Pro tools run only through `POST /api/premium/<tool>/`. The route checks the session
  **and** an active subscription in the database before it reads the upload.
  Logged out → 401, no subscription → 402.
- The lock screen in the UI is only for convenience; the server is the real gate.
- Subscription status comes from Stripe webhooks (`app/api/stripe/webhook`), so cancelling,
  failed payments and renewals update automatically.
- Editor files are built only by `POST /api/editor/export/`, with the same session + subscription
  check (401 / 402). The request body is validated and capped at 25 MB, and each export counts
  toward the daily fair-use limit.
- Premium template content is never shipped in the page bundle. It lives in
  `lib/server/pro-templates.js` and is served by `GET /api/templates/<id>/` with the same checks.
- Fair use: each Pro user can process `PRO_DAILY_LIMIT` files per UTC day (default 200, shown on
  the account page). Heavy jobs are queued per server: `MAX_CONCURRENT_JOBS` (2) run at once,
  `MAX_QUEUED_JOBS` (20) may wait, and each times out after `JOB_TIMEOUT_SECONDS` (180).

## Stripe setup

1. Stripe Dashboard → **Products** → create “NexPDF Pro” with two recurring prices
   (monthly $5.99, yearly $47.99) → copy the price IDs into `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY`.
   If you change prices, also update `lib/plans.js` (display prices).
2. **Developers → API keys** → `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks** → add endpoint `https://yourdomain.com/api/stripe/webhook/`
   (keep the trailing slash) with events `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted` → copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Billing → Customer portal** → enable it (lets users cancel / change plan / update card).
5. Local webhook testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook/`.

## Deploy

Pro tools need a real Node server (not static hosting). Word/Excel/PowerPoint → PDF also
needs LibreOffice, which the included `Dockerfile` installs.

```bash
docker build -t nexpdf .
docker run -p 3000:3000 -v nexpdf-data:/data --env-file .env nexpdf
```

Works on any Docker host: Railway, Render, Fly.io, DigitalOcean, a VPS, etc.
Set `NEXTAUTH_URL` to your real domain and remove the `ENABLE_TEST_BILLING` lines.

## Before going live (SEO)

1. Set your real domain in `lib/site.js`.
2. Add the site to Google Search Console / Bing Webmaster Tools, put the verification codes
   in `app/layout.jsx`, and submit `/sitemap.xml`.
3. Add a 1200×630 `public/og.png` for link previews.

## Adding a tool

1. Add an entry to `TOOLS` (or `PRO_TOOLS`) in `lib/tools.js`.
2. Free tool → processor in `lib/processors.js` (browser).
   Pro tool → processor in `lib/server/premium.js` (server).
3. Add its icon to `components/ToolIcon.jsx` if new.

## Adding a template

1. Add it to `lib/templates/catalog.js` (`kind`: `doc` | `sheet` | `slides`; `pro: true` for premium).
2. Put its content in `lib/templates/free.js` (free) or `lib/server/pro-templates.js` (Pro).
   Docs are HTML (`p`, `h1`–`h3`, `ul`/`ol`, `strong`/`em`/`u`, `hr`), sheets are
   `{ A1: { v: 'text or =FORMULA', b: true } }`, slides are `{ theme, slides: [{ layout, title, body }] }`.

## Project structure

```
app/[tool]/page.jsx          every tool page (SEO + schema)
app/api/premium/[tool]       Pro processing (auth + subscription check)
app/api/editor/export        editor downloads (auth + subscription check)
app/api/stripe/*             checkout, billing portal, webhook
app/pricing, login, signup, account
components/ToolClient        upload → options → process → download
components/ProGate           lock screen for Pro tools and editors
components/editors/*         Word / Excel / PowerPoint / PDF editors + template picker
lib/editors/*                editor exports (docx, xlsx/csv, pptx, pdf), formula engine
                             (formula.js), number formats (numfmt.js), sheet operations (sheet-model.js)
lib/templates/*              template catalog + free template content
lib/server/pro-templates.js  premium template content (subscribers only)
lib/server/usage.js          daily fair-use counter
lib/tools.js                 tool definitions and SEO content
lib/processors.js            free tools (browser)
lib/server/premium.js        Pro tools (server)
lib/server/auth.js           NextAuth config + subscription check
prisma/schema.prisma         User, Subscription and Usage tables
```

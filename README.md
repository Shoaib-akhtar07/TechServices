# SoftServices – Free + Pro online PDF tools

- **22 free tools** that run 100% in the browser (no uploads, no account).
- **9 Pro tools** for subscribers, processed on the server:
  PDF ↔ Word/Excel/PowerPoint, OCR, Protect PDF, Unlock PDF.
- **4 document editors** for Pro members (Create Word / Excel / PowerPoint / PDF). Editing runs
  in the browser with a draft auto-saved in `localStorage`; the .docx / .xlsx / .csv / .pptx / .pdf
  file is built on the server. The Excel editor has 140+ formulas, multiple sheets, number formats,
  fill handle and Excel keyboard shortcuts (Ctrl+/ lists them).
- Accounts, subscriptions (monthly / yearly) paid by **card (Stripe)**, **PayPal**, or **manual bank / JazzCash /
  Easypaisa transfer**, and the blog are served by the **.NET API** in `../SoftServices.Api`.
- **Admin panel** at `/admin/`: dashboard, users (give / remove Pro, make admin, delete),
  manual payment approvals, and settings for prices, limits and every payment method.

## Run locally

The site needs the .NET backend (`../SoftServices.Api`) running — it holds accounts, payments,
settings and blog posts.

```bash
# 1. Backend
cd ../SoftServices.Api && dotnet run --launch-profile http     # http://localhost:5087

# 2. Website
cd ../SoftServices
npm install
cp .env.example .env      # set NEXTAUTH_SECRET; API_URL points at the backend
npm run dev               # http://localhost:3000
```

Make yourself an admin: sign up, then in `SoftServices.Api` run `dotnet run -- make-admin you@example.com`
and open **/admin/**.

## How it fits together

- **Login**: NextAuth (email + password) checks the password with the API and keeps the API token inside
  its encrypted session cookie. The token is never sent to the browser.
- **Server pages and admin actions** call the API from `lib/server/*` (`api.js` is the client).
- **Browser components** (sign-up, checkout, manual payment, billing portal) call `/api/backend/…`,
  a proxy that only allows those routes and adds the token on the server.
- **Webhooks** keep their URLs: `/api/stripe/webhook/` and `/api/paypal/webhook/` forward the raw body and
  signature headers to the API, which verifies them.
- **Pro tools** still run here (`POST /api/premium/<tool>/`, LibreOffice / OCR); access and the daily
  fair-use count come from the API (401 logged out, 402 no Pro, 429 over the limit).

Payment setup (Stripe, PayPal, manual) and all endpoints are described in `../SoftServices.Api/README.md`.

## Deploy

Run both services (see each Dockerfile). The website needs `API_URL` (e.g. `http://api:8080` on a private
network), `NEXTAUTH_URL` and `NEXTAUTH_SECRET`. The API does not need to be public — payment webhooks reach it
through the website. Word/Excel/PowerPoint → PDF needs LibreOffice, which the website `Dockerfile` installs.

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
app/api/backend/[...path]   proxy from browser components to the .NET API
app/api/stripe|paypal/webhook   forward payment webhooks to the API
app/admin/*                  admin panel (actions.js = all admin server actions)
app/pricing, login, signup, account
components/ToolClient        upload → options → process → download
components/ProGate           lock screen for Pro tools and editors
components/editors/*         Word / Excel / PowerPoint / PDF editors + template picker
lib/editors/*                editor exports (docx, xlsx/csv, pptx, pdf), formula engine
                             (formula.js), number formats (numfmt.js), sheet operations (sheet-model.js)
lib/templates/*              template catalog + free template content
lib/server/pro-templates.js  premium template content (subscribers only)
lib/server/api.js            .NET API client (token from the session cookie)
lib/server/usage.js          daily fair-use counter (API)
lib/tools.js                 tool definitions and SEO content
lib/processors.js            free tools (browser)
lib/server/premium.js        Pro tools (server)
lib/server/auth.js           NextAuth config (login through the API) + getAccess()
lib/server/settings.js       admin settings, prices and payment methods (API)
lib/server/content.js        site details, tools and blog posts (API)
```

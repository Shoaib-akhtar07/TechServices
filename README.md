# SoftServices

Online PDF tools with free and Pro plans.

| Folder | What it is |
|---|---|
| [`SoftServices/`](SoftServices/) | Website — Next.js 14: tool pages, editors, Pro tools (LibreOffice / OCR), admin panel UI |
| [`SoftServices.Api/`](SoftServices.Api/) | Backend — ASP.NET Core (.NET 10): accounts, subscriptions & payments (Stripe, PayPal, Bank / JazzCash / Easypaisa), blog articles, admin API |

```
Browser ──► Next.js website (port 3000) ──► .NET API (port 5087) ──► SQLite / SQL Server
                    ▲
Stripe / PayPal webhooks (/api/stripe/webhook/, /api/paypal/webhook/) are forwarded to the API
```

## Run locally

Needs the .NET 10 SDK and Node.js 20+.

```bash
# Terminal 1 — backend
cd SoftServices.Api
dotnet run --launch-profile http          # http://localhost:5087  (API docs: /docs)

# Terminal 2 — website
cd SoftServices
npm install
cp .env.example .env                      # set NEXTAUTH_SECRET
npm run dev                               # http://localhost:3000
```

The backend needs `Auth:Secret` (32+ random characters). For local runs put it in
`SoftServices.Api/appsettings.Development.json` (not committed):

```json
{ "Auth": { "Secret": "<random 64 hex chars>" }, "App": { "EnableTestBilling": true } }
```

Make an admin: sign up on the website, then `cd SoftServices.Api && dotnet run -- make-admin you@example.com`.

Details: [website README](SoftServices/README.md) · [API README](SoftServices.Api/README.md)

# SoftServices.Api — .NET 10 backend

ASP.NET Core Web API for the SoftServices site: accounts, Pro subscriptions with **Stripe**,
**PayPal** and **manual (Bank / JazzCash / Easypaisa)** payments, an **article (blog) system**, and
the admin panel API. It follows the same rules as the Next.js backend in `../SoftServices`.

## Run locally

```bash
cd SoftServices.Api
dotnet run --launch-profile http        # http://localhost:5087  → API docs at /docs
```

`appsettings.Development.json` already has a dev `Auth:Secret`. The SQLite database
(`softservices.db`) is created on first start.

Make an admin: register through `POST /api/auth/register`, then

```bash
dotnet run -- make-admin you@example.com
# production / Docker:  dotnet SoftServices.Api.dll make-admin you@example.com
```

Other server commands (run in this folder; in Docker use `dotnet SoftServices.Api.dll …`):

```bash
dotnet run -- import-prisma ../SoftServices/prisma/dev.db    # copy users, posts, payments, settings from the old Next.js database
echo "value" | dotnet run -- set-setting paypal_client_secret  # save a setting (secrets encrypted); value read from stdin
```

`SoftServices.Api.http` has ready-made requests for VS Code (REST Client) / Visual Studio.

## Configuration

Set in `appsettings.json` or environment variables (`__` for nesting):

| Setting | Env variable | Notes |
|---|---|---|
| `Auth:Secret` | `Auth__Secret` | **Required**, 32+ random chars. Signs login tokens and encrypts saved payment keys. Changing it logs everyone out and means re-entering the keys. |
| `App:FrontendUrl` | `App__FrontendUrl` | Public website URL; Stripe/PayPal send customers back to `/account/` and `/pricing/` here. |
| `App:CorsOrigins` | `App__CorsOrigins__0` | Website origin(s) allowed to call the API. |
| `Database:Provider` | `Database__Provider` | `Sqlite` (default) or `SqlServer`. |
| `ConnectionStrings:Default` | `ConnectionStrings__Default` | e.g. `Data Source=/data/softservices.db` or a SQL Server connection string. |
| `App:EnableTestBilling` | | Development only: `POST /api/billing/test-activate` gives Pro without paying. |

Prices, the daily limit, free mode and **all payment keys** are set through the admin API
(`PUT /api/admin/settings`) and stored in the `Settings` table — secrets AES-256-GCM encrypted.
`free_mode` starts as `"1"` (everything free); set it to `"0"` to sell Pro.

## Authentication

`POST /api/auth/login` returns `{ token }`. Send it as `Authorization: Bearer <token>`.
Role and Pro status are read from the database on every request, so changes apply immediately.
Responses for errors are always `{ "error": "message" }`. 401 = not logged in, 402 = needs Pro,
403 = not allowed, 404 on admin routes for non-admins. Login/sign-up are limited to 10/min per IP.

Roles: `user`, `author` (can write their own articles), `admin` (everything).

## Endpoints

**Auth** — `POST /api/auth/register`, `POST /api/auth/login`, `GET|PUT /api/auth/me`, `POST /api/auth/change-password`

**Billing (customer)**
- `GET /api/billing/plans` — prices, available methods, manual instructions (public)
- `POST /api/billing/stripe/checkout` `{plan}` → `{url}` · `POST /api/billing/stripe/sync` `{sessionId}` · `POST /api/billing/stripe/portal` → `{url}`
- `POST /api/billing/paypal/checkout` `{plan}` → `{url}` · `POST /api/billing/paypal/sync` `{subscriptionId}` · `POST /api/billing/paypal/cancel`
- `POST /api/billing/manual` `{plan, method, reference, note}` · `GET /api/billing/manual`
- `GET /api/billing/history`

**Site** — `GET /api/site` (public: prices, payment methods, site details, tool changes, daily limit) ·
`POST /api/pro/consume` `{count}` (Pro: count files against the daily limit, 429 when over)

**Webhooks** — `POST /api/webhooks/stripe`, `POST /api/webhooks/paypal`. The website forwards
`https://yourdomain.com/api/stripe/webhook/` and `/api/paypal/webhook/` here, so use those URLs in the dashboards.

**Articles**
- Public: `GET /api/posts?page&pageSize&tag&q`, `GET /api/posts/{slug}`, `GET /api/posts/tags`
- Authors/admins: `GET /api/posts/manage?status=draft|scheduled|published`, `GET /api/posts/manage/{id}`,
  `POST /api/posts`, `PUT /api/posts/{id}`, `DELETE /api/posts/{id}`, `POST /api/posts/uploads` (multipart `file`, image ≤ 5 MB)

Article body: send `body` as simple text (`## Heading`, `- bullet`, `1. step`, blank line between
paragraphs) **or** `blocks` as JSON (`[{ "h2": "" }, { "p": "" }, { "ul": [] }, { "ol": [] }]`).
`published: false` = draft; a future `publishedAt` = scheduled. Authors only see and edit their own posts.

**Admin** — `GET /api/admin/stats` · `GET /api/admin/users?q&filter` (filter: all, pro, free, admin, author, suspended) ·
`POST /api/admin/users` `{email, name, password, role}` · `PUT /api/admin/users/{id}` `{email, name}` ·
`POST /api/admin/users/{id}/password` `{password}` · `POST /api/admin/users/{id}/suspend` `{suspended}` ·
`POST /api/admin/users/{id}/grant-pro` `{plan, days}` ·
`POST /api/admin/users/{id}/revoke-pro` · `PUT /api/admin/users/{id}/role` `{role}` · `DELETE /api/admin/users/{id}` ·
`GET /api/admin/payments/manual?status=pending` · `POST /api/admin/payments/manual/{id}/approve` · `POST …/{id}/reject` `{adminNote}` ·
`GET /api/admin/payments/history` · `GET|PUT /api/admin/settings` · `DELETE /api/admin/settings/{key}` ·
`POST /api/admin/settings/stripe/test` · `POST /api/admin/settings/stripe/create-prices` ·
`POST /api/admin/settings/paypal/test` · `POST /api/admin/settings/paypal/create-plans`

## Payment setup

**Stripe** — save `stripe_secret_key` and `stripe_webhook_secret` via `PUT /api/admin/settings`, then call
`stripe/create-prices` (or save `stripe_price_monthly` / `stripe_price_yearly`). Webhook endpoint:
`https://yourdomain.com/api/stripe/webhook/` with events `checkout.session.completed`,
`customer.subscription.created|updated|deleted` and `invoice.paid`. Enable the Customer portal in Stripe.
Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook/`.

**PayPal** — save `paypal_client_id`, `paypal_client_secret`, `paypal_mode` (`sandbox`/`live`), call
`paypal/create-plans`, add webhook `https://yourdomain.com/api/paypal/webhook/` with
`BILLING.SUBSCRIPTION.*` and `PAYMENT.SALE.COMPLETED`, and save its `paypal_webhook_id`. Set `paypal_enabled` to `"1"`.

**Manual** — set `manual_enabled: "1"`, `manual_instructions` (your account details), `manual_methods`,
`manual_price_monthly` / `manual_price_yearly` (e.g. `PKR 1,700`). Approving adds 30 / 365 days of Pro
(renewing early adds to the remaining time).

After Stripe/PayPal redirect back to `/account/`, the site should call `stripe/sync` (with `session_id`)
or `paypal/sync` (with `subscription_id`) so Pro turns on before the webhook arrives.

## Deploy (Docker)

```bash
docker build -t softservices-api .
docker run -p 8080:8080 -v softservices-api-data:/data \
  -e Auth__Secret=... -e App__FrontendUrl=https://yourdomain.com \
  -e App__CorsOrigins__0=https://yourdomain.com softservices-api
docker exec <container> dotnet SoftServices.Api.dll make-admin you@example.com
```

The database and uploaded images live in `/data`. Put it behind HTTPS (reverse proxy); forwarded headers are honoured.

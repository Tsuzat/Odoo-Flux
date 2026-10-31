# Brightloop Software — Subscription Management System

One system to run plans, subscriptions and recurring billing in one place:
products and plans → quotations → subscriptions → invoices → payments →
revenue. Built for the Odoo hackathon problem statement _"Subscription
Management System"_.

Brightloop sells everything on subscription — business software billed
monthly or yearly, add-ons customers switch on and off, and products that
come in different variants — for customers from small shops to large
companies on yearly contracts.

## Demo credentials

Use these seeded accounts to explore the app. Each role lands on its own
dashboard after sign-in:

| Role     | Email                | Password      | Lands on  |
| -------- | -------------------- | ------------- | --------- |
| Admin    | `admin@example.com`  | `admin@123`   | `/admin`  |
| Staff    | `staff@example.com`  | `staff@123`   | `/staff`  |
| Customer | Sign up at `/signup` | (your choice) | `/portal` |

> ⚠️ These are **demo credentials for evaluation only**. Change the
> passwords (or delete these users) before any real production use.

A good 10-minute tour: **Admin** create a product with a variant
(e.g. Brand: Odoo +₹560) and a plan → build a quotation template → create
a subscription from it and walk Draft → Quotation → Confirmed → Active →
**Run Billing** → confirm the invoice → **Staff** record a payment →
**Customer** toggle an add-on, pay the invoice in the mock payment
portal, and download the invoice/receipt PDFs.

## What it does

**Admin** (controls the whole system)

- Dashboard: active subscriptions, MRR, revenue collected, outstanding
  and overdue invoices, renewals — SQL aggregates behind a 60s Redis cache
- Catalog: products & variants (per-variant extra pricing), plans
  (price, daily/weekly/monthly/yearly billing, min quantity, validity
  window, auto-close / closable / pausable / renewable per plan), taxes,
  discounts (fixed or %, min purchase/quantity, date window, usage limit)
- Operations: subscriptions with the full lifecycle, quotation templates,
  invoices (confirm / cancel / send / PDF), payments, customers
- Staff management via Better Auth's admin plugin: create staff, change
  roles, ban with a reason, delete users (never yourself or the last admin)
- Run Billing: generates every due invoice in one click, auto-closes
  expired plans, never bills twice (unique subscription+period index)

**Staff** (day-to-day, limited access)

- Dashboard, subscriptions (create from templates, run the lifecycle,
  edit lines/add-ons), quotation templates (read-only), invoices
  (confirm / send / cancel, record payments), payments, customers
  (read-only)

**Customer portal** (self-service, own data only)

- Overview of subscriptions, outstanding balances and next billing date
- Pause / resume / renew / close subscriptions within the plan's rules
- Switch add-ons on and off — they land on the next invoice
- Pay invoices in a mock payment portal (UPI, card, Google Pay,
  Apple Pay on Mac), download invoice & payment-receipt PDFs,
  profile and password management

**Platform behaviour**

- Taxes and discounts are applied automatically at invoice generation
  (tax on the discounted net); discounts stop when expired or used up
- Customers are emailed when an invoice is generated, and get weekly
  overdue reminders with a pay-now link
- Every write is validated (Zod) and role-checked server-side; invoices
  are snapshots, so later catalog edits never rewrite issued bills

## Tech stack

- **SvelteKit 3 + Svelte 5** (runes, remote functions), TypeScript
- **shadcn-svelte** UI (Tailwind CSS v4), Lucide icons
- **Better Auth** (email/password + admin plugin) with Redis/Valkey
  secondary storage for sessions
- **Drizzle ORM** on PostgreSQL, **Bun** runtime end to end
- **ZeptoMail** for transactional email, **jsPDF** for client-side PDFs

## Getting started

```sh
bun install
cp .env.example .env   # if present; otherwise create .env (see below)
bun run db:push        # apply the schema to your database
bun run dev            # http://localhost:5173
```

> This app uses Bun-only APIs (`bun:sql`, Bun's Redis client), so Vite
> must run on the Bun runtime. The `dev`/`build` scripts already pass
> `--bun`; running `vite dev` directly under Node fails.

### Environment variables

| Variable             | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string                                        |
| `REDIS_URL`          | Redis/Valkey URL (Better Auth sessions, rate limits, caching)       |
| `ORIGIN`             | Public app origin, e.g. `https://app.example.com`                   |
| `BETTER_AUTH_SECRET` | Auth secret (32+ random characters)                                 |
| `ZEPTO_MAIL_URL`     | ZeptoMail API URL                                                   |
| `ZEPTO_MAIL_API_KEY` | ZeptoMail API key (sender `brightloop@tsuzat.com` must be verified) |
| `CRON_SECRET`        | Shared secret for `POST /api/cron/billing` (see below)              |

## Project layout

```
src/routes/(app)/admin    Admin console (dashboard, catalog, operations, billing)
src/routes/(app)/staff    Staff workspace
src/routes/(app)/portal   Customer portal (+ mock payment pages)
src/routes/api/cron       Scheduled-jobs endpoint
src/lib/server/admin      Dashboard, catalog, operations, billing engine, users
src/lib/server            Auth, DB (Drizzle schema + relations), email, portal/staff data
src/lib/components/ui     shadcn-svelte components
src/lib/components/custom Sidebar, expandable sheets, calendar date-picker
src/lib/pdf.ts            Client-side invoice & receipt PDF generation
```

## Scheduled billing & reminders (Railway Function)

Billing runs and overdue-payment reminders are exposed as a protected
endpoint: `POST /api/cron/billing` (header `x-cron-secret: <CRON_SECRET>`).
It generates due invoices, auto-closes expired plans, and emails overdue
reminders (weekly cadence). It is idempotent, so retries are safe.

Run it daily with a **Railway Function** (Bun):

1. Set `CRON_SECRET` (any long random string) on the **app service**.
2. Create a **Function** in the same Railway project and paste the code
   below.
3. On the Function, set env vars `APP_URL` (public app URL) and
   `CRON_SECRET` (same value as the app).
4. Set the Function's **Cron Schedule** to `30 3 * * *` (03:30 UTC =
   09:00 IST, daily).

```ts
/**
 * Brightloop billing cron — Railway Function (Bun).
 * Invoked on the function's cron schedule; also runs on POST.
 */
const APP_URL = process.env.APP_URL; // e.g. https://your-app.up.railway.app
const CRON_SECRET = process.env.CRON_SECRET;

async function runBilling(): Promise<string> {
	if (!APP_URL || !CRON_SECRET) {
		throw new Error('APP_URL and CRON_SECRET env vars are required');
	}
	const res = await fetch(`${APP_URL.replace(/\/+$/, '')}/api/cron/billing`, {
		method: 'POST',
		headers: { 'x-cron-secret': CRON_SECRET }
	});
	const body = await res.text();
	if (!res.ok) {
		throw new Error(`Billing endpoint failed: HTTP ${res.status} — ${body}`);
	}
	console.log('[billing-cron]', res.status, body);
	return body;
}

export default async function handler(req?: Request): Promise<Response> {
	// Health checks (GET) must not trigger a billing run.
	if (req && req.method === 'GET') {
		return new Response('Brightloop billing cron function');
	}
	const body = await runBilling();
	return new Response(body, {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
}
```

The same jobs can be triggered manually from **Admin → Run Billing**
(billing run and "Send overdue reminders" buttons).

## Scripts

| Command               | What it does                            |
| --------------------- | --------------------------------------- |
| `bun run dev`         | Dev server on the Bun runtime           |
| `bun run build`       | Production build (adapter-bun)          |
| `bun run check`       | `svelte-kit sync` + `svelte-check`      |
| `bun run lint`        | Prettier check + ESLint                 |
| `bun run format`      | Prettier write                          |
| `bun run db:push`     | Push the Drizzle schema to the database |
| `bun run db:generate` | Generate a migration                    |
| `bun run db:migrate`  | Apply migrations                        |
| `bun run db:studio`   | Drizzle Studio                          |
| `bun run test`        | Vitest (unit)                           |

## Deployment notes

- Hosted on **Railway** (app service on the Bun runtime).
- Sessions live in Redis/Valkey — the hosted Redis connection must be
  stable, or sign-in will fail.
- Transactional email needs the ZeptoMail sender domain/address
  verified, otherwise sends are rejected with `TM_4001`.

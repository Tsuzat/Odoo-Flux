# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@1.1.1 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" tailwindcss="plugins:none" enhanced-img sveltekit-adapter="adapter:auto" drizzle="database:postgresql+postgresql:postgres.js+docker:no" better-auth="demo:password,github" ai-tools="ide:opencode" experimental="features:async,remoteFunctions" --install bun Brightloop-Software
```

## Adding features

Add features to your project with `sv add`:

```sh
npx sv add
```

For example, to add Tailwind CSS:

```sh
npx sv add tailwindcss
```

## Developing

This app uses Bun-only APIs (`bun:sql`, Bun's Redis client), so Vite must run on the
Bun runtime. The `dev`/`build` scripts already pass `--bun`; running `vite dev`
directly under Node fails with `Cannot find package 'bun'`.

Once you've created a project and installed dependencies with `bun install`, start a development server:

```sh
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
```

## Building

To create a production version of your app:

```sh
bun run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

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

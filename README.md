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

## Scheduled billing & reminders (Railway cron)

Billing runs and overdue-payment reminders are exposed as a protected
endpoint: `POST /api/cron/billing` (header `x-cron-secret: <CRON_SECRET>`).
It generates due invoices, auto-closes expired plans, and emails overdue
reminders (weekly cadence). It is idempotent, so retries are safe.

To run it daily on Railway:

1. Set `CRON_SECRET` (any long random string) on the **app service**.
2. Create a **cron service** from this repo:
   - **Cron schedule (UTC):** `30 3 * * *` (daily, 09:00 IST)
   - **Start command:**
     ```sh
     bun -e "const r = await fetch(process.env.APP_URL + '/api/cron/billing', { method: 'POST', headers: { 'x-cron-secret': process.env.CRON_SECRET } }); console.log(r.status, await r.text()); if (!r.ok) process.exit(1);"
     ```
   - **Env on the cron service:** `APP_URL` (public app URL) and the same
     `CRON_SECRET`.

The same jobs can be triggered manually from **Admin → Run Billing**
(billing run and "Send overdue reminders" buttons).

### Alternative: Cloudflare Workers Cron Triggers

A ready-made worker lives in `cron/billing/` (schedule in its
`wrangler.toml`, daily 03:30 UTC). It calls the same endpoint with the
same secret. From that folder:

```sh
bunx wrangler secret put CRON_SECRET   # same value as the app
bunx wrangler deploy
```

Set `APP_URL` in `cron/billing/wrangler.toml` to the app URL first.
Trigger a run anytime with `curl -X POST https://<worker>/run -H "x-cron-secret: <secret>"`.

import { error } from '@sveltejs/kit';
import { CRON_SECRET } from '$app/env/private';
import { runBilling } from '#lib/server/admin/billing.ts';
import { sendOverdueReminders } from '#lib/server/admin/operations.ts';
import type { RequestHandler } from './$types';

/**
 * Scheduled jobs endpoint — called by the Railway cron service.
 *
 * Railway setup (cron service, same repo):
 *   Schedule (UTC):  30 3 * * *            (daily, 09:00 IST)
 *   Start command:   bun -e "const r = await fetch(process.env.APP_URL +
 *     '/api/cron/billing', { method: 'POST', headers: {
 *     'x-cron-secret': process.env.CRON_SECRET } });
 *     console.log(r.status, await r.text()); if (!r.ok) process.exit(1);"
 *   Env on cron service: APP_URL, CRON_SECRET (same value as the app).
 *
 * Runs the billing engine (due invoices + auto-close sweep), then
 * overdue-payment reminder emails. Idempotent — safe to retry.
 */
export const POST: RequestHandler = async ({ request }) => {
	if (!CRON_SECRET || request.headers.get('x-cron-secret') !== CRON_SECRET) {
		error(401, 'Unauthorized');
	}

	const today = new Date().toISOString().slice(0, 10);
	const billing = await runBilling(today);
	const reminders = await sendOverdueReminders(today);

	return Response.json({
		ok: true,
		ranAt: new Date().toISOString(),
		billing: {
			created: billing.created.length,
			skipped: billing.skipped.length,
			closed: billing.closed.length,
			errors: billing.errors
		},
		reminders
	});
};

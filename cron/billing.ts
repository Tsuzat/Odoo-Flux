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

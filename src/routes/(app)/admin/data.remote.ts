import { error } from '@sveltejs/kit';
import { getRequestEvent, query } from '$app/server';
import { getDashboardData } from '#lib/server/admin/dashboard.ts';

/**
 * Remote functions are public HTTP endpoints, so every one of them
 * re-checks the session and role on the server — the admin layout
 * guard alone is not enough.
 */
function requireAdmin() {
	const { locals } = getRequestEvent();
	if (!locals.user) error(401, 'Sign in required.');
	if (locals.user.role !== 'admin') error(403, 'Admins only.');
	return locals.user;
}

/** Finance overview for the admin dashboard (cached server-side for 60s). */
export const getDashboard = query(async () => {
	requireAdmin();
	return getDashboardData();
});

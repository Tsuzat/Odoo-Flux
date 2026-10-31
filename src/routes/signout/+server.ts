import { auth } from '#lib/server/auth.ts';
import { redirect } from '@sveltejs/kit';

export const GET = async ({ request: { headers } }) => {
	const res = await auth.api.signOut({
		headers
	});
	if (!res.success) {
		throw new Error('Sign out failed');
	}
	return redirect(302, '/signin');
};

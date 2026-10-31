import { redirect } from '@sveltejs/kit';

export const load = async ({ locals: { user, session }, request: { url } }) => {
	if (!user || !session) {
		throw redirect(302, '/signin?next=' + encodeURIComponent(url.toString()));
	}
	if (user.role !== 'admin') {
		throw redirect(304, '/staff');
	}
	return { role: user.role };
};

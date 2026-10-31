import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from '../$types';

export const load: LayoutServerLoad = async ({ locals: { user, session }, request: { url } }) => {
	if (!user) {
		throw redirect(302, '/signin?next=' + encodeURIComponent(url.toString()));
	}
	return { user, session };
};

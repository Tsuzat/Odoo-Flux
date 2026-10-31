import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { user } }) => {
	if (!user) throw redirect(302, '/signin');
	if (user.role !== 'admin' && user.role !== 'staff') throw redirect(303, '/portal');
	return { role: user.role };
};

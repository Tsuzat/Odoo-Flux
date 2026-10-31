import { redirect } from '@sveltejs/kit';
import { getCustomerForUser } from '#lib/server/portal.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { user } }) => {
	if (!user) throw redirect(302, '/signin');
	if ((user.role ?? 'customer') !== 'customer') {
		throw redirect(303, user.role === 'admin' ? '/admin' : '/staff');
	}
	const customer = await getCustomerForUser(user.id);
	if (!customer) throw redirect(303, '/');
	return { customer };
};

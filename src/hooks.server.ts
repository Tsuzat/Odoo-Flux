import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { redirect } from '@sveltejs/kit';

const guards: Record<string, string[]> = {
	'/admin': ['admin'],
	'/staff': ['admin', 'staff'],
	'/portal': ['customer']
};

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	const path = event.url.pathname;
	const rule = Object.entries(guards).find(([p]) => path.startsWith(p));
	if (rule) {
		if (!event.locals.user) throw redirect(303, '/signin');
		if (!rule[1].includes(event.locals.user.role ?? 'customer')) throw redirect(303, '/');
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;

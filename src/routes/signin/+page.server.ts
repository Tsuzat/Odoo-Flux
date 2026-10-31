import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

const DEFAULT_REDIRECT = '/';

/**
 * Only allow same-origin relative paths as post-login targets,
 * so `?next=` can never be used as an open redirect.
 */
function safeRedirectTarget(value: string | null | undefined): string {
	if (value && value.startsWith('/') && !value.startsWith('//')) return value;
	return DEFAULT_REDIRECT;
}

export const load: PageServerLoad = (event) => {
	// Already signed in — no reason to show the form again.
	if (event.locals.user) {
		return redirect(302, safeRedirectTarget(event.url.searchParams.get('next')));
	}
	return { next: safeRedirectTarget(event.url.searchParams.get('next')) };
};

export const actions: Actions = {
	signInEmail: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const next = safeRedirectTarget(formData.get('next')?.toString());

		if (!email || !password) {
			return fail(400, { message: 'Enter your email and password.', email });
		}

		try {
			await auth.api.signInEmail({
				body: { email, password, callbackURL: next },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Sign-in failed.', email });
			}
			console.error('Email sign-in failed', error);
			return fail(500, { message: 'Something went wrong. Please try again.', email });
		}

		return redirect(302, next);
	}
};

import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	// Already signed in — no reason to reset from here.
	if (event.locals.user) {
		return redirect(302, '/');
	}
	return {};
};

export const actions: Actions = {
	requestPasswordReset: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';

		if (!email) {
			return fail(400, { message: 'Enter your email address.', email });
		}

		try {
			await auth.api.requestPasswordReset({
				// The emailed link lands on /reset-password with the one-time token.
				body: { email, redirectTo: '/reset-password' },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Could not send the reset email.', email });
			}
			console.error('Password reset request failed', error);
			return fail(500, { message: 'Something went wrong. Please try again.', email });
		}

		// Same message whether or not the account exists (no email enumeration).
		return {
			notice: 'If an account exists for that email, a password reset link is on its way.',
			email
		};
	}
};

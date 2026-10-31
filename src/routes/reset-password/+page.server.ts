import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

const INVALID_LINK_MESSAGE =
	'This password reset link is invalid or has expired. Request a new one below.';

export const load: PageServerLoad = (event) => {
	// The emailed link arrives here via Better Auth's reset callback as
	// /reset-password?token=<token>, or ?error=INVALID_TOKEN when the
	// token is unknown/expired.
	const token = event.url.searchParams.get('token') ?? '';
	const hasError = event.url.searchParams.has('error');
	return {
		token,
		linkError: hasError || !token ? INVALID_LINK_MESSAGE : null
	};
};

export const actions: Actions = {
	resetPassword: async (event) => {
		const formData = await event.request.formData();
		const token = formData.get('token')?.toString() ?? '';
		const newPassword = formData.get('newPassword')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

		if (!token) {
			return fail(400, { message: INVALID_LINK_MESSAGE });
		}
		if (!newPassword) {
			return fail(400, { message: 'Enter your new password.' });
		}
		if (newPassword.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters.' });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match.' });
		}

		try {
			await auth.api.resetPassword({
				body: { newPassword, token },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				// Expired/already-used tokens surface as token errors.
				if (/token/i.test(error.message)) {
					return fail(400, { message: INVALID_LINK_MESSAGE });
				}
				return fail(400, { message: error.message || 'Password reset failed.' });
			}
			console.error('Password reset failed', error);
			return fail(500, { message: 'Something went wrong. Please try again.' });
		}

		// Sessions are revoked on reset (auth config), so send the user
		// to sign in with the new password.
		return redirect(302, '/signin');
	}
};

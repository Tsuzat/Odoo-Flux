import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { z } from 'zod';
import { auth } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

const DEFAULT_REDIRECT = '/';

/**
 * Sign-up password policy: more than eight characters, with an
 * uppercase letter, a lowercase letter and a special character.
 * Mirrored by the live checklist on the sign-up page.
 */
const passwordSchema = z
	.string()
	.min(9, 'Password must be more than 8 characters.')
	.regex(/[A-Z]/, 'Password must include an uppercase letter.')
	.regex(/[a-z]/, 'Password must include a lowercase letter.')
	.regex(/[^A-Za-z0-9\s]/, 'Password must include a special character (e.g. !@#$%).');

const signUpSchema = z
	.object({
		name: z.string().min(1, 'Enter your name, email and a password.'),
		email: z.email('Enter a valid email address.'),
		password: passwordSchema,
		confirmPassword: z.string()
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match.',
		path: ['confirmPassword']
	});

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
	signUpEmail: async (event) => {
		const formData = await event.request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

		const parsed = signUpSchema.safeParse({ name, email, password, confirmPassword });
		if (!parsed.success) {
			return fail(400, { message: parsed.error.issues[0].message, email, name });
		}

		try {
			await auth.api.signUpEmail({
				body: { name, email, password },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Sign-up failed.', email, name });
			}
			console.error('Email sign-up failed', error);
			return fail(500, { message: 'Something went wrong. Please try again.', email, name });
		}

		// Email verification is required, so there is no session yet: ask the
		// user to verify, then sign in. If the email was already registered,
		// Better Auth still resolves here (enumeration protection) and the
		// account owner gets a notice email instead — same message either way.
		return {
			notice: 'Almost there — check your inbox for a verification link, then sign in.',
			email,
			name
		};
	}
};

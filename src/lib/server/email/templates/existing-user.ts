import { APP_NAME, baseEmailTemplate, type EmailTemplate } from './base.ts';

export interface ExistingUserSignupEmailOptions {
	/** Recipient display name, used for the greeting when present. */
	name?: string;
	/** Absolute sign-in URL, linked from the call to action when present. */
	signInUrl?: string;
	/** Absolute app icon URL (`${ORIGIN}/favicon.svg`) for the header. */
	iconUrl?: string;
}

/**
 * Sent by `emailAndPassword.onExistingUserSignUp` in `auth.ts` when
 * someone tries to register with an email that already has an account.
 * Deliberately contains no verification/reset token: it only notifies
 * the account owner, so the sign-up response can stay indistinguishable
 * from a fresh registration (email-enumeration protection).
 */
export function getExistingUserSignupTemplate({
	name,
	signInUrl,
	iconUrl
}: ExistingUserSignupEmailOptions = {}): EmailTemplate {
	return baseEmailTemplate({
		preheader: `Someone tried to sign up to ${APP_NAME} with your email address.`,
		title: `Sign-up attempt with your email — ${APP_NAME}`,
		eyebrow: 'Security notification',
		iconUrl,
		heading: 'Someone tried to sign up with your email',
		name,
		paragraphs: [
			`Someone — hopefully you — tried to create a new ${APP_NAME} account using this email address, but an account with this email already exists.`,
			'No new account was created and nothing about your existing account has changed. If this was you, sign in with your existing password instead, or reset your password if you have forgotten it.'
		],
		cta: signInUrl ? { label: 'Sign in to your account', url: signInUrl } : undefined,
		notice:
			"If this wasn't you, you can safely ignore this email. Your account is secure and no one has gained access to it."
	});
}

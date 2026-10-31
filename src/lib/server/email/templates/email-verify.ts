import { APP_NAME, baseEmailTemplate, type EmailTemplate } from './base.ts';

export interface SignupVerificationEmailOptions {
	/** Better Auth verification URL (contains the one-time token). */
	url: string;
	/** Recipient display name, used for the greeting when present. */
	name?: string;
	/** Absolute app icon URL (`${ORIGIN}/favicon.svg`) for the header. */
	iconUrl?: string;
}

/**
 * Sent by `emailVerification.sendVerificationEmail` in `auth.ts`
 * when a user signs up (and when they request a fresh link).
 * The token lifetime matches `emailVerification.expiresIn` (1 hour).
 */
export function getSignupVerificationTemplate({
	url,
	name,
	iconUrl
}: SignupVerificationEmailOptions): EmailTemplate {
	return baseEmailTemplate({
		preheader: `Verify your email address to finish creating your ${APP_NAME} account.`,
		title: `Verify your email address — ${APP_NAME}`,
		eyebrow: 'Account verification',
		iconUrl,
		heading: 'Verify your email address',
		name,
		paragraphs: [
			`Thanks for signing up for ${APP_NAME}. Confirm this is your email address to verify your account and continue.`
		],
		cta: { label: 'Verify email address', url },
		ctaNote: 'This link expires in 1 hour and can only be used once.',
		notice:
			"If you didn't create an account with this email address, you can safely ignore this email — no account will be activated."
	});
}

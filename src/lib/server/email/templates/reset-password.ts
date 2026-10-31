import { APP_NAME, baseEmailTemplate, type EmailTemplate } from './base.ts';

export interface PasswordResetEmailOptions {
	/** Better Auth password-reset URL (contains the one-time token). */
	url: string;
	/** Recipient display name, used for the greeting when present. */
	name?: string;
	/** Absolute app icon URL (`${ORIGIN}/favicon.svg`) for the header. */
	iconUrl?: string;
}

/**
 * Sent by `emailAndPassword.sendResetPassword` in `auth.ts`.
 * The token lifetime matches `emailAndPassword.resetPasswordTokenExpiresIn`
 * (1 hour). Because `revokeSessionsOnPasswordReset` is enabled, the copy
 * warns that existing sessions are signed out after the reset.
 */
export function getPasswordResetTemplate({
	url,
	name,
	iconUrl
}: PasswordResetEmailOptions): EmailTemplate {
	return baseEmailTemplate({
		preheader: `Reset your ${APP_NAME} password. This link expires in 1 hour.`,
		title: `Reset your password — ${APP_NAME}`,
		eyebrow: 'Password reset',
		iconUrl,
		heading: 'Reset your password',
		name,
		paragraphs: [
			`We received a request to reset the password for your ${APP_NAME} account. Choose a new password using the button below.`,
			'For your security, all other sessions will be signed out once your password has been reset.'
		],
		cta: { label: 'Reset password', url },
		ctaNote: 'This link expires in 1 hour and can only be used once.',
		notice:
			"If you didn't request a password reset, you can safely ignore this email — your password will stay the same."
	});
}

import { SendMailClient } from 'zeptomail';
import { ZEPTO_MAIL_URL, ZEPTO_MAIL_API_KEY } from '$app/env/private';
import type { EmailTemplate } from './templates/base.ts';

export type { EmailTemplate } from './templates/base.ts';
export {
	APP_NAME,
	baseEmailTemplate,
	escapeHtml,
	getExistingUserSignupTemplate,
	getPasswordResetTemplate,
	getSignupVerificationTemplate
} from './templates/index.ts';
export type {
	BaseEmailOptions,
	EmailCta,
	ExistingUserSignupEmailOptions,
	PasswordResetEmailOptions,
	SignupVerificationEmailOptions
} from './templates/index.ts';

const FROM_ADDRESS = 'brightloop@tsuzat.com';
const FROM_NAME = 'Brightloop Software';

let client: SendMailClient | undefined;

/**
 * Lazily created so importing templates (or `auth.ts`) does not
 * require the ZeptoMail credentials to be present.
 */
function getEmailClient(): SendMailClient {
	if (!ZEPTO_MAIL_URL) throw new Error('ZEPTO_MAIL_URL is not set');
	if (!ZEPTO_MAIL_API_KEY) throw new Error('ZEPTO_MAIL_API_KEY is not set');
	client ??= new SendMailClient({ url: ZEPTO_MAIL_URL, token: ZEPTO_MAIL_API_KEY });
	return client;
}

/**
 * Send a transactional email via ZeptoMail.
 *
 * `content` is normally the `{ html, text }` pair returned by the
 * templates in `./templates.ts/` — sending both parts improves
 * deliverability and gives plain-text clients a readable version.
 * A bare string is treated as HTML-only for convenience.
 *
 * Throws on transport/API errors; fire-and-forget callers (such as
 * the Better Auth callbacks in `auth.ts`) should attach `.catch()`
 * so a mail outage cannot fail or leak the auth response.
 */
export async function sendEmail(
	to: string,
	subject: string,
	content: EmailTemplate | string
): Promise<unknown> {
	const address = to.trim();
	if (!address) throw new Error('sendEmail: recipient address is required');
	if (!subject.trim()) throw new Error('sendEmail: subject is required');

	const { html, text } = typeof content === 'string' ? { html: content, text: undefined } : content;
	if (!html.trim()) throw new Error('sendEmail: email body is required');

	try {
		return await getEmailClient().sendMail({
			from: {
				address: FROM_ADDRESS,
				name: FROM_NAME
			},
			to: [
				{
					email_address: {
						address,
						name: address.split('@')[0]
					}
				}
			],
			subject,
			htmlbody: html,
			textbody: text,
			// Auth links carry one-time tokens: never rewrite them through
			// click tracking, and don't add an open-tracking pixel.
			track_clicks: false,
			track_opens: false
		});
	} catch (error) {
		// ZeptoMail throws plain objects shaped { error: { code, message,
		// details: [{ code, message, target, target_value }] } — flatten
		// them into the message so logs show the actual reason.
		const zepto = (error as { error?: ZeptoError })?.error;
		if (zepto) {
			const details = (zepto.details ?? [])
				.map(
					(d) =>
						`${d.code ?? 'error'}: ${d.message ?? ''} (${d.target ?? ''}: ${d.target_value ?? ''})`
				)
				.join('; ');
			throw new Error(
				`ZeptoMail ${zepto.code ?? ''} ${zepto.message ?? 'request failed'}${details ? ` — ${details}` : ''}`,
				{ cause: error }
			);
		}
		throw error;
	}
}

interface ZeptoErrorDetail {
	code?: string;
	message?: string;
	target?: string;
	target_value?: string;
}

interface ZeptoError {
	code?: string;
	message?: string;
	details?: ZeptoErrorDetail[];
}

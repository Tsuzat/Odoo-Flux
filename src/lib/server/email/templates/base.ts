/**
 * Shared layout for transactional emails.
 *
 * Tokens mirror the shadcn-svelte theme in `src/routes/layout.css`:
 * blue primary (`oklch(0.623 0.214 259.815)` light / `oklch(0.546
 * 0.245 262.881)` dark), zinc foreground/muted/border, white card,
 * `--radius: 0.625rem`, Inter first (like `--font-sans`). OKLCH values
 * are converted to their hex equivalents because mail clients don't
 * support oklch(). Recipients in dark mode get the `.dark` palette via
 * `prefers-color-scheme` (Apple/iOS Mail, Gmail app) — clients without
 * support simply keep the light design.
 *
 * Composition follows the shadcn primitives used in the app: a Card
 * (white surface, 1px border, radius-xl, subtle shadow) on a muted
 * page, a primary Button (radius-md) for the call to action, small
 * muted text for secondary copy, and a muted Alert-style notice box.
 *
 * Email HTML uses tables and inline styles only — external CSS,
 * flex/grid and CSS variables are not reliably supported by mail
 * clients (notably Outlook). The single <style> block only carries
 * the mobile and dark-mode overrides.
 */

export const APP_NAME = 'Brightloop Software';

/** Hex equivalents of the shadcn tokens in `src/routes/layout.css`. */
const colors = {
	page: '#f4f4f5', // --muted (zinc-100)
	card: '#ffffff', // --card
	foreground: '#09090b', // --foreground (zinc-950)
	body: '#3f3f46', // zinc-700 — readable body copy
	mutedForeground: '#71717a', // --muted-foreground (zinc-500)
	mutedBackground: '#f4f4f5', // --muted / --secondary
	border: '#e4e4e7', // --border (zinc-200)
	primary: '#2b7fff', // --primary (blue-500)
	primaryForeground: '#eff6ff', // --primary-foreground (blue-50)
	faint: '#a1a1aa' // zinc-400 — footer copy
} as const;

/** `.dark` palette, applied through the dark-mode <style> block. */
const dark = {
	page: '#09090b', // --background
	card: '#18181b', // --card (zinc-900)
	foreground: '#fafafa', // --foreground
	body: '#d4d4d8', // zinc-300
	mutedForeground: '#a1a1aa', // --muted-foreground (zinc-400)
	noticeBackground: '#27272a', // zinc-800
	border: '#27272a', // --border (white/10%)
	primary: '#155dfc' // --primary (blue-600)
} as const;

const fontStack =
	"'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** `--radius-lg` (card) and `--radius-md` (button/notice) from the theme. */
const radiusCard = '14px';
const radiusControl = '8px';

export interface EmailTemplate {
	html: string;
	text: string;
}

export interface EmailCta {
	label: string;
	url: string;
}

export interface BaseEmailOptions {
	/** Hidden inbox preview text. */
	preheader: string;
	/** `<title>` and plain-text subject line heading. */
	title: string;
	/** Small uppercase label above the heading, e.g. "Account verification". */
	eyebrow?: string;
	/**
	 * Absolute URL of the app icon shown in the header
	 * (e.g. `${ORIGIN}/favicon.svg`). Falls back to the
	 * primary-colored letter mark when omitted.
	 */
	iconUrl?: string;
	heading: string;
	/** Recipient display name, rendered as `Hi <name>,` when present. */
	name?: string;
	/** Body paragraphs (plain text — escaped before being placed in HTML). */
	paragraphs: string[];
	cta?: EmailCta;
	/** Small print shown directly under the button, e.g. link expiry. */
	ctaNote?: string;
	/** Muted security/info box, e.g. "If you didn't request this…". */
	notice?: string;
}

/** Escape a value for safe interpolation into HTML text/attributes. */
export function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function greeting(name?: string): string | undefined {
	const trimmed = name?.trim();
	return trimmed ? `Hi ${trimmed},` : undefined;
}

function renderText({ heading, name, paragraphs, cta, ctaNote, notice }: BaseEmailOptions): string {
	const lines: string[] = [heading, ''];
	const hi = greeting(name);
	if (hi) lines.push(hi, '');
	lines.push(...paragraphs.flatMap((paragraph) => [paragraph, '']));
	if (cta) lines.push(`${cta.label}: ${cta.url}`, '');
	if (ctaNote) lines.push(ctaNote, '');
	if (notice) lines.push(notice, '');
	lines.push('—', `${APP_NAME}`, 'This is an automated email, please do not reply.');
	return (
		lines
			.join('\n')
			.replace(/\n{3,}/g, '\n\n')
			.trim() + '\n'
	);
}

function renderHtml(options: BaseEmailOptions): string {
	const { preheader, title, eyebrow, iconUrl, heading, name, paragraphs, cta, ctaNote, notice } =
		options;
	const hi = greeting(name);
	const year = new Date().getFullYear();

	// Served from the app's static assets in production. Clients that
	// block images (or SVG) still show the wordmark next to it.
	const logoHtml = iconUrl
		? `<td valign="middle" width="36" height="36" style="width:36px;height:36px;"><img src="${escapeHtml(iconUrl)}" width="36" height="36" alt="${APP_NAME}" style="display:block;width:36px;height:36px;border:0;border-radius:${radiusControl};" /></td>`
		: `<td align="center" valign="middle" width="36" height="36" bgcolor="${colors.primary}" style="width:36px;height:36px;border-radius:${radiusControl};background-color:${colors.primary};font-family:${fontStack};font-size:17px;font-weight:700;line-height:36px;color:${colors.primaryForeground};text-align:center;">O</td>`;

	const paragraphHtml = (text: string, first = false) => `
								<tr>
									<td class="email-body" style="padding:${first ? '20px' : '14px'} 0 0 0;font-family:${fontStack};font-size:15px;line-height:24px;color:${colors.body};">
										${escapeHtml(text)}
									</td>
								</tr>`;

	const eyebrowHtml = eyebrow
		? `
								<tr>
									<td class="email-muted" style="padding:26px 0 0 0;font-family:${fontStack};font-size:11px;font-weight:600;letter-spacing:0.08em;line-height:16px;color:${colors.mutedForeground};text-transform:uppercase;">
										${escapeHtml(eyebrow)}
									</td>
								</tr>`
		: '';

	const ctaHtml = cta
		? `
								<tr>
									<td style="padding:26px 0 0 0;">
										<table role="presentation" cellpadding="0" cellspacing="0" border="0">
											<tr>
												<td class="email-button" align="center" bgcolor="${colors.primary}" style="border-radius:${radiusControl};background-color:${colors.primary};box-shadow:0 1px 2px rgba(0,0,0,0.05);">
													<a href="${escapeHtml(cta.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:11px 26px;font-family:${fontStack};font-size:14px;font-weight:500;line-height:20px;color:${colors.primaryForeground};text-decoration:none;border:1px solid ${colors.primary};border-radius:${radiusControl};">${escapeHtml(cta.label)}</a>
												</td>
											</tr>
										</table>
									</td>
								</tr>${
									ctaNote
										? `
								<tr>
									<td class="email-muted" style="padding:12px 0 0 0;font-family:${fontStack};font-size:13px;line-height:20px;color:${colors.mutedForeground};">
										${escapeHtml(ctaNote)}
									</td>
								</tr>`
										: ''
								}
								<tr>
									<td class="email-muted" style="padding:18px 0 0 0;font-family:${fontStack};font-size:13px;line-height:20px;color:${colors.mutedForeground};">
										If the button doesn't work, copy and paste this link into your browser:<br />
										<a class="email-fallback-link" href="${escapeHtml(cta.url)}" target="_blank" rel="noopener noreferrer" style="color:${colors.primary};text-decoration:underline;word-break:break-all;">${escapeHtml(cta.url)}</a>
									</td>
								</tr>`
		: '';

	const noticeHtml = notice
		? `
								<tr>
									<td style="padding:26px 0 0 0;">
										<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
											<tr>
												<td class="email-notice" bgcolor="${colors.mutedBackground}" style="padding:14px 18px;border:1px solid ${colors.border};border-left:3px solid ${colors.primary};border-radius:${radiusControl};background-color:${colors.mutedBackground};font-family:${fontStack};font-size:13px;line-height:20px;color:${colors.mutedForeground};">
													${escapeHtml(notice)}
												</td>
											</tr>
										</table>
									</td>
								</tr>`
		: '';

	return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="x-apple-disable-message-reformatting" />
		<meta name="color-scheme" content="light dark" />
		<meta name="supported-color-schemes" content="light dark" />
		<title>${escapeHtml(title)}</title>
		<!--[if mso]>
			<noscript>
				<xml>
					<o:OfficeDocumentSettings>
						<o:PixelsPerInch>96</o:PixelsPerInch>
					</o:OfficeDocumentSettings>
				</xml>
			</noscript>
		<![endif]-->
		<style>
			@media only screen and (max-width: 620px) {
				.email-card {
					width: 100% !important;
				}
				.email-card-cell {
					padding: 32px 24px !important;
				}
				.email-button,
				.email-button a {
					display: block !important;
					text-align: center !important;
				}
			}
			@media (prefers-color-scheme: dark) {
				.email-page,
				.email-page-cell {
					background-color: ${dark.page} !important;
				}
				.email-card-cell {
					background-color: ${dark.card} !important;
					border-color: ${dark.border} !important;
				}
				.email-heading,
				.email-wordmark {
					color: ${dark.foreground} !important;
				}
				.email-body {
					color: ${dark.body} !important;
				}
				.email-muted {
					color: ${dark.mutedForeground} !important;
				}
				.email-notice {
					background-color: ${dark.noticeBackground} !important;
					border-color: ${dark.border} !important;
					color: ${dark.mutedForeground} !important;
				}
				.email-divider {
					border-color: ${dark.border} !important;
				}
				.email-button {
					background-color: ${dark.primary} !important;
				}
				.email-button a {
					border-color: ${dark.primary} !important;
				}
			}
		</style>
	</head>
	<body class="email-page" style="margin:0;padding:0;width:100%;background-color:${colors.page};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
		<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
		<table class="email-page" role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${colors.page}" style="background-color:${colors.page};">
			<tr>
				<td class="email-page-cell" align="center" bgcolor="${colors.page}" style="padding:40px 16px 32px 16px;">
					<!--[if mso]>
					<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center">
						<tr>
							<td>
					<![endif]-->
					<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="email-card" style="width:600px;max-width:600px;">
						<tr>
							<td class="email-card-cell" bgcolor="${colors.card}" style="padding:40px 48px;border:1px solid ${colors.border};border-radius:${radiusCard};background-color:${colors.card};box-shadow:0 1px 2px rgba(0,0,0,0.05);">
								<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
									<tr>
										<td class="email-divider" style="padding:0 0 24px 0;border-bottom:1px solid ${colors.border};">
											<table role="presentation" cellpadding="0" cellspacing="0" border="0">
												<tr>
													${logoHtml}
													<td class="email-wordmark" valign="middle" style="padding-left:12px;font-family:${fontStack};font-size:19px;font-weight:600;letter-spacing:-0.02em;line-height:24px;color:${colors.foreground};">${APP_NAME}</td>
												</tr>
											</table>
										</td>
									</tr>${eyebrowHtml}
									<tr>
										<td class="email-heading" style="padding:${eyebrow ? '8px' : '26px'} 0 0 0;font-family:${fontStack};font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:30px;color:${colors.foreground};">
											${escapeHtml(heading)}
										</td>
									</tr>${hi ? paragraphHtml(hi, true) : ''}${paragraphs.map((paragraph, index) => paragraphHtml(paragraph, !hi && index === 0)).join('')}${ctaHtml}${noticeHtml}
									<tr>
										<td style="padding:30px 0 0 0;">
											<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
												<tr>
													<td class="email-muted email-divider" style="border-top:1px solid ${colors.border};padding:18px 0 0 0;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.faint};">
														Sent by ${APP_NAME}. This is an automated email, please do not reply.
													</td>
												</tr>
											</table>
										</td>
									</tr>
								</table>
							</td>
						</tr>
						<tr>
							<td class="email-muted" align="center" style="padding:20px 16px 8px 16px;font-family:${fontStack};font-size:12px;line-height:18px;color:${colors.faint};">
								&copy; ${year} ${APP_NAME}. All rights reserved.
							</td>
						</tr>
					</table>
					<!--[if mso]>
							</td>
						</tr>
					</table>
					<![endif]-->
				</td>
			</tr>
		</table>
	</body>
</html>
`;
}

/** Render the shared shadcn-styled layout as an HTML + plain-text pair. */
export function baseEmailTemplate(options: BaseEmailOptions): EmailTemplate {
	return {
		html: renderHtml(options),
		text: renderText(options)
	};
}

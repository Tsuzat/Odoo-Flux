import { APP_NAME, baseEmailTemplate, type EmailTemplate } from './base.ts';

export interface InvoiceOverdueEmailOptions {
	/** Portal pay-page deep link (via sign-in) for this invoice. */
	url: string;
	/** Recipient display name, used for the greeting when present. */
	name?: string;
	/** Absolute app icon URL (`${ORIGIN}/favicon.svg`) for the header. */
	iconUrl?: string;
	invoiceNumber: string;
	/** Pre-formatted outstanding balance, e.g. "Rs. 4,425.00". */
	balance: string;
	/** Pre-formatted due date, e.g. "15 Nov 2026". */
	dueDate: string;
	daysOverdue: number;
}

/**
 * Payment reminder sent by the scheduled job (and the admin
 * "Send overdue reminders" action) for confirmed, unpaid invoices
 * past their due date — on a weekly cadence, not daily.
 */
export function getInvoiceOverdueTemplate({
	url,
	name,
	iconUrl,
	invoiceNumber,
	balance,
	dueDate,
	daysOverdue
}: InvoiceOverdueEmailOptions): EmailTemplate {
	return baseEmailTemplate({
		preheader: `Invoice ${invoiceNumber} for ${balance} was due on ${dueDate}.`,
		title: `Payment reminder: invoice ${invoiceNumber} — ${APP_NAME}`,
		eyebrow: 'Payment reminder',
		iconUrl,
		heading: `Invoice ${invoiceNumber} is overdue`,
		name,
		paragraphs: [
			`This is a friendly reminder that invoice ${invoiceNumber} for ${balance} was due on ${dueDate} and is now ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue.`,
			'You can pay it in seconds from your customer portal — UPI, card, Google Pay and Apple Pay are accepted.'
		],
		cta: { label: 'Pay now', url },
		ctaNote: 'If you have already paid, please ignore this email and accept our thanks.',
		notice: 'Questions about this invoice? Reply to brightloop@tsuzat.com and our team will help.'
	});
}

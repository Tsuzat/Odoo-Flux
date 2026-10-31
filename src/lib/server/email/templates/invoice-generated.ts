import { APP_NAME, baseEmailTemplate, type EmailTemplate } from './base.ts';

export interface InvoiceGeneratedEmailOptions {
	/** Portal sign-in URL (deep-links to the customer's invoices). */
	url: string;
	/** Recipient display name, used for the greeting when present. */
	name?: string;
	/** Absolute app icon URL (`${ORIGIN}/favicon.svg`) for the header. */
	iconUrl?: string;
	invoiceNumber: string;
	subscriptionNumber: string;
	/** Pre-formatted billing period, e.g. "1 Oct 2026 – 1 Nov 2026". */
	period: string;
	/** Pre-formatted total, e.g. "Rs. 4,425.00". */
	total: string;
	/** Pre-formatted due date, e.g. "15 Nov 2026". */
	dueDate: string;
}

/**
 * Sent automatically when a new invoice is generated for a
 * subscription (billing run or manual generation). The invoice
 * starts as a draft, so the copy sets expectations: our team
 * confirms it, then it becomes payable in the portal.
 */
export function getInvoiceGeneratedTemplate({
	url,
	name,
	iconUrl,
	invoiceNumber,
	subscriptionNumber,
	period,
	total,
	dueDate
}: InvoiceGeneratedEmailOptions): EmailTemplate {
	return baseEmailTemplate({
		preheader: `Invoice ${invoiceNumber} for ${total} has been generated. Due by ${dueDate}.`,
		title: `Invoice ${invoiceNumber} — ${APP_NAME}`,
		eyebrow: 'New invoice',
		iconUrl,
		heading: `Invoice ${invoiceNumber} is ready`,
		name,
		paragraphs: [
			`A new invoice has been generated for your subscription ${subscriptionNumber} covering ${period}.`,
			`Amount: ${total} · Due by ${dueDate}. Our team will confirm the invoice shortly — once confirmed, you can pay it right from your customer portal.`
		],
		cta: { label: 'View your invoices', url },
		notice:
			'You are receiving this because a billing period completed on your Brightloop subscription. If anything looks wrong, reply to brightloop@tsuzat.com.'
	});
}

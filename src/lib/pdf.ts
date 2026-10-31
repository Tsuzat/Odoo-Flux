import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate, humanize } from './index.ts';

/**
 * Client-side PDF downloads (invoice + payment receipt), generated
 * with jsPDF — no server round-trip needed since the portal already
 * has the data.
 */

export interface InvoicePdfLine {
	description: string;
	quantity: number;
	unitPrice: string;
	discountAmount: string;
	taxRatePercent: string;
	taxAmount: string;
	amount: string;
}

export interface InvoicePdfData {
	number: string;
	customerName: string;
	subscriptionNumber: string;
	periodStart: string;
	periodEnd: string;
	issueDate: string;
	dueDate: string;
	status: string;
	lines: InvoicePdfLine[];
	subtotal: string;
	discountTotal: string;
	taxTotal: string;
	total: string;
	amountPaid: string;
}

const PAGE = { left: 14, right: 196, top: 16 };

let iconPromise: Promise<string | null> | undefined;

/**
 * Load the app icon (`origin + /favicon.svg`) and rasterize it to a
 * PNG data URL for jsPDF (which can't embed SVG). Cached per page.
 * Falls back to `null` (drawn brand mark) if loading fails.
 */
function loadAppIcon(): Promise<string | null> {
	iconPromise ??= (async () => {
		try {
			const res = await fetch(`${window.location.origin}/favicon.svg`);
			if (!res.ok) return null;
			const objectUrl = URL.createObjectURL(await res.blob());
			try {
				const img = new Image();
				await new Promise<void>((resolvePromise, reject) => {
					img.onload = () => resolvePromise();
					img.onerror = () => reject(new Error('icon load failed'));
					img.src = objectUrl;
				});
				const canvas = document.createElement('canvas');
				canvas.width = 235;
				canvas.height = 235;
				const ctx = canvas.getContext('2d');
				if (!ctx) return null;
				ctx.drawImage(img, 0, 0, 235, 235);
				return canvas.toDataURL('image/png');
			} finally {
				URL.revokeObjectURL(objectUrl);
			}
		} catch {
			return null;
		}
	})();
	return iconPromise;
}

/** jsPDF's built-in Helvetica has no ₹ glyph — use Rs. in PDFs. */
function pdfMoney(value: number | string): string {
	return formatCurrency(value).replace('₹', 'Rs. ');
}

function pageBackground(doc: jsPDF) {
	doc.setFillColor(255, 255, 255);
	doc.rect(0, 0, 210, 297, 'F');
}

function header(doc: jsPDF, title: string, subtitle: string, icon: string | null) {
	if (icon) {
		doc.addImage(icon, 'PNG', PAGE.left, PAGE.top - 6, 12, 12);
	} else {
		doc.setFillColor(43, 127, 255);
		doc.roundedRect(PAGE.left, PAGE.top - 6, 12, 12, 2, 2, 'F');
		doc.setTextColor(255, 255, 255);
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(11);
		doc.text('B', PAGE.left + 6, PAGE.top + 2.5, { align: 'center' });
	}

	doc.setTextColor(20, 20, 20);
	doc.setFontSize(16);
	doc.text('Brightloop Software', PAGE.left + 16, PAGE.top + 1);
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(110, 110, 110);
	doc.text('Business software on subscription', PAGE.left + 16, PAGE.top + 6);

	doc.setTextColor(20, 20, 20);
	doc.setFontSize(18);
	doc.setFont('helvetica', 'bold');
	doc.text(title, PAGE.right, PAGE.top + 1, { align: 'right' });
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(110, 110, 110);
	doc.text(subtitle, PAGE.right, PAGE.top + 6, { align: 'right' });
}

function footer(doc: jsPDF) {
	doc.setFontSize(8);
	doc.setTextColor(140, 140, 140);
	doc.text(
		'Brightloop Software · brightloop@tsuzat.com · This is a computer-generated document.',
		PAGE.left,
		290
	);
}

function row(doc: jsPDF, y: number, label: string, value: string, bold = false) {
	doc.setFont('helvetica', bold ? 'bold' : 'normal');
	doc.setTextColor(20, 20, 20);
	doc.text(label, PAGE.left, y);
	doc.text(value, PAGE.right, y, { align: 'right' });
}

export async function downloadInvoicePdf(inv: InvoicePdfData) {
	const doc = new jsPDF();
	pageBackground(doc);
	header(doc, `Invoice ${inv.number}`, `Status: ${humanize(inv.status)}`, await loadAppIcon());

	let y = 34;
	doc.setFontSize(10);
	row(doc, y, 'Billed to', inv.customerName);
	y += 6;
	row(doc, y, 'Subscription', inv.subscriptionNumber);
	y += 6;
	row(doc, y, 'Billing period', `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`);
	y += 6;
	row(doc, y, 'Issued', formatDate(inv.issueDate));
	y += 6;
	row(doc, y, 'Due by', formatDate(inv.dueDate));
	y += 12;

	// Lines table
	doc.setFillColor(244, 244, 245);
	doc.rect(PAGE.left, y - 4.5, PAGE.right - PAGE.left, 8, 'F');
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(9);
	doc.text('Description', PAGE.left + 1, y);
	doc.text('Qty', 118, y, { align: 'right' });
	doc.text('Unit price', 142, y, { align: 'right' });
	doc.text('Tax', 168, y, { align: 'right' });
	doc.text('Amount', PAGE.right - 1, y, { align: 'right' });
	y += 8;

	doc.setFont('helvetica', 'normal');
	for (const line of inv.lines) {
		if (y > 258) {
			doc.addPage();
			pageBackground(doc);
			y = 24;
		}
		const descLines = doc.splitTextToSize(line.description, 78) as string[];
		doc.text(descLines, PAGE.left + 1, y);
		doc.text(String(line.quantity), 118, y, { align: 'right' });
		doc.text(pdfMoney(line.unitPrice), 142, y, { align: 'right' });
		doc.text(`${pdfMoney(line.taxAmount)} (${Number(line.taxRatePercent)}%)`, 168, y, {
			align: 'right'
		});
		doc.text(pdfMoney(line.amount), PAGE.right - 1, y, { align: 'right' });
		y += Math.max(6, descLines.length * 4.5);
		if (Number(line.discountAmount) > 0) {
			doc.setTextColor(110, 110, 110);
			doc.setFontSize(8);
			doc.text(`Discount applied: -${pdfMoney(line.discountAmount)}`, PAGE.left + 1, y - 1);
			doc.setTextColor(20, 20, 20);
			doc.setFontSize(9);
			y += 4;
		}
	}

	y += 6;
	doc.setDrawColor(220, 220, 220);
	doc.line(PAGE.left, y, PAGE.right, y);
	y += 8;
	doc.setFontSize(10);
	row(doc, y, 'Subtotal', pdfMoney(inv.subtotal));
	y += 6;
	row(doc, y, 'Discounts', `-${pdfMoney(inv.discountTotal)}`);
	y += 6;
	row(doc, y, 'Tax', pdfMoney(inv.taxTotal));
	y += 7;
	row(doc, y, 'Total', pdfMoney(inv.total), true);
	y += 6;
	row(doc, y, 'Paid', pdfMoney(inv.amountPaid));
	y += 6;
	const balance = Number(inv.total) - Number(inv.amountPaid);
	row(doc, y, 'Balance due', pdfMoney(balance), true);

	footer(doc);
	doc.save(`invoice-${inv.number}.pdf`);
}

export interface PaymentPdfData {
	paymentId: string;
	invoiceNumber: string;
	customerName: string;
	amount: string;
	methodLabel: string;
	paidOn: string;
	note?: string | null;
}

export async function downloadPaymentPdf(pay: PaymentPdfData) {
	const doc = new jsPDF();
	pageBackground(doc);
	header(doc, 'Payment receipt', `Invoice ${pay.invoiceNumber}`, await loadAppIcon());

	let y = 36;
	doc.setFontSize(11);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(22, 163, 74);
	doc.text('Payment successful', PAGE.left, y);
	doc.setTextColor(20, 20, 20);

	y += 12;
	doc.setFontSize(10);
	row(doc, y, 'Received from', pay.customerName);
	y += 7;
	row(doc, y, 'Invoice', pay.invoiceNumber);
	y += 7;
	row(doc, y, 'Amount paid', pdfMoney(pay.amount), true);
	y += 7;
	row(doc, y, 'Method', pay.methodLabel);
	y += 7;
	row(doc, y, 'Date', formatDate(pay.paidOn));
	y += 7;
	row(doc, y, 'Transaction reference', pay.paymentId);
	if (pay.note) {
		y += 7;
		row(doc, y, 'Note', pay.note);
	}

	y += 14;
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(110, 110, 110);
	doc.text(
		doc.splitTextToSize(
			'This receipt confirms that Brightloop Software has recorded the payment above against your invoice. Keep it for your records.',
			180
		) as string[],
		PAGE.left,
		y
	);

	footer(doc);
	doc.save(`payment-${pay.invoiceNumber}-${pay.paymentId.slice(0, 8)}.pdf`);
}

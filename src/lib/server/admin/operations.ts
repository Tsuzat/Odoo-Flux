import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	customer,
	invoice,
	payment,
	plan,
	product,
	productVariant,
	quotationTemplate,
	quotationTemplateLine,
	subscription,
	subscriptionLine,
	user,
	type BillingPeriod,
	type PaymentMethod,
	type SubscriptionStatus
} from '#lib/server/db/schema.ts';
import { sendEmail } from '../email/index.ts';
import { baseEmailTemplate, APP_NAME } from '../email/templates/base.ts';
import { getInvoiceGeneratedTemplate } from '../email/templates/invoice-generated.ts';
import { getInvoiceOverdueTemplate } from '../email/templates/invoice-overdue.ts';
import { ORIGIN } from '$app/env/private';

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Add one billing period to a `YYYY-MM-DD` date (UTC math, month/year aware). */
export function addPeriod(dateStr: string, period: BillingPeriod): string {
	const d = new Date(`${dateStr}T00:00:00Z`);
	if (period === 'daily') d.setUTCDate(d.getUTCDate() + 1);
	else if (period === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
	else if (period === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
	else d.setUTCFullYear(d.getUTCFullYear() + 1);
	return d.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
	const d = new Date(`${dateStr}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

async function nextNumber(prefix: 'SUB' | 'INV'): Promise<string> {
	const table = prefix === 'SUB' ? subscription : invoice;
	const rows = await db.select({ number: table.number }).from(table);
	let max = 0;
	for (const r of rows) {
		const n = Number(r.number.replace(`${prefix}-`, ''));
		if (Number.isFinite(n) && n > max) max = n;
	}
	return `${prefix}-${String(max + 1).padStart(6, '0')}`;
}

/* ───────── subscriptions ───────── */

export function listSubscriptions() {
	return db.query.subscription.findMany({
		with: { customer: true, plan: true, lines: true },
		orderBy: desc(subscription.createdAt)
	});
}

export function getSubscriptionDetail(id: string) {
	return db.query.subscription.findFirst({
		where: eq(subscription.id, id),
		with: {
			customer: true,
			plan: true,
			template: true,
			createdByUser: true,
			lines: { with: { product: true, variant: true, tax: true } },
			invoices: { orderBy: desc(invoice.issueDate) }
		}
	});
}

export interface SubscriptionLineInput {
	productId: string;
	variantId?: string | null;
	quantity: number;
	taxId?: string | null;
}

export interface CreateSubscriptionInput {
	customerId: string;
	planId: string;
	templateId?: string | null;
	startDate: string;
	paymentTermsDays: number;
	lines: SubscriptionLineInput[];
}

/** Resolve a line's unit price: product sales price + variant extra. */
async function priceLine(line: SubscriptionLineInput) {
	const prod = await db.query.product.findFirst({ where: eq(product.id, line.productId) });
	if (!prod) throw new Error('One of the selected products no longer exists.');
	let unitPrice = Number(prod.salesPrice);
	if (line.variantId) {
		const variant = await db.query.productVariant.findFirst({
			where: eq(productVariant.id, line.variantId)
		});
		if (!variant || variant.productId !== prod.id)
			throw new Error('One of the selected variants does not belong to its product.');
		unitPrice += Number(variant.extraPrice);
	}
	return { unitPrice: round2(unitPrice), amount: round2(unitPrice * line.quantity) };
}

export async function createSubscription(input: CreateSubscriptionInput) {
	const planRow = await db.query.plan.findFirst({ where: eq(plan.id, input.planId) });
	if (!planRow) throw new Error('Plan not found.');
	if (!planRow.active) throw new Error('This plan is inactive and cannot be sold.');
	if (input.startDate < planRow.validFrom) {
		throw new Error(`This plan is not available before ${planRow.validFrom}.`);
	}
	if (planRow.validTo && input.startDate > planRow.validTo) {
		throw new Error(`This plan stopped being available on ${planRow.validTo}.`);
	}
	const customerRow = await db.query.customer.findFirst({
		where: eq(customer.id, input.customerId)
	});
	if (!customerRow) throw new Error('Customer not found.');

	let lines = input.lines;
	let templateRow:
		| {
				validityDays: number;
				lines: { productId: string; variantId: string | null; quantity: number }[];
		  }
		| undefined;
	if (input.templateId) {
		templateRow = await db.query.quotationTemplate.findFirst({
			where: eq(quotationTemplate.id, input.templateId),
			with: { lines: true }
		});
		if (!templateRow) throw new Error('Quotation template not found.');
		if (lines.length === 0) {
			lines = templateRow.lines.map((l) => ({
				productId: l.productId,
				variantId: l.variantId,
				quantity: l.quantity,
				taxId: null
			}));
		}
	}
	if (lines.length === 0) throw new Error('Add at least one product line.');

	const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
	if (totalQuantity < planRow.minQuantity) {
		throw new Error(
			`This plan needs a minimum quantity of ${planRow.minQuantity} (lines total ${totalQuantity}).`
		);
	}

	const priced = await Promise.all(lines.map(async (l) => ({ ...l, ...(await priceLine(l)) })));
	const number = await nextNumber('SUB');

	const created = await db.transaction(async (tx) => {
		const [sub] = await tx
			.insert(subscription)
			.values({
				number,
				customerId: input.customerId,
				planId: input.planId,
				templateId: input.templateId ?? null,
				status: 'draft',
				startDate: input.startDate,
				expiryDate: planRow.validTo ?? null,
				quotationValidUntil: templateRow
					? addDays(input.startDate, templateRow.validityDays)
					: null,
				paymentTermsDays: input.paymentTermsDays,
				nextBillingDate: input.startDate
			})
			.returning();
		await tx.insert(subscriptionLine).values(
			priced.map((l) => ({
				subscriptionId: sub.id,
				productId: l.productId,
				variantId: l.variantId ?? null,
				quantity: l.quantity,
				unitPrice: String(l.unitPrice),
				taxId: l.taxId ?? null,
				amount: String(l.amount)
			}))
		);
		return sub;
	});
	return created;
}

export type SubscriptionAction =
	'send-quotation' | 'confirm' | 'activate' | 'pause' | 'resume' | 'close' | 'renew';

const TRANSITIONS: Record<
	SubscriptionAction,
	{ from: SubscriptionStatus[]; to: SubscriptionStatus }
> = {
	'send-quotation': { from: ['draft'], to: 'quotation' },
	confirm: { from: ['quotation'], to: 'confirmed' },
	activate: { from: ['confirmed'], to: 'active' },
	pause: { from: ['active'], to: 'paused' },
	resume: { from: ['paused'], to: 'active' },
	close: { from: ['confirmed', 'active', 'paused'], to: 'closed' },
	renew: { from: ['active', 'closed'], to: 'active' }
};

export async function transitionSubscription(id: string, action: SubscriptionAction) {
	const sub = await db.query.subscription.findFirst({
		where: eq(subscription.id, id),
		with: { plan: true }
	});
	if (!sub) throw new Error('Subscription not found.');
	const rule = TRANSITIONS[action];
	if (!rule.from.includes(sub.status)) {
		throw new Error(`Cannot ${action.replace('-', ' ')} a subscription that is ${sub.status}.`);
	}
	if (action === 'confirm') {
		const today = new Date().toISOString().slice(0, 10);
		if (sub.quotationValidUntil && sub.quotationValidUntil < today) {
			throw new Error(
				`This quotation expired on ${sub.quotationValidUntil}. Create a fresh subscription from the template.`
			);
		}
	}
	if (action === 'pause' && !sub.plan.pausable)
		throw new Error('This plan does not allow pausing.');
	if (action === 'close') {
		const expired = sub.expiryDate && sub.expiryDate <= new Date().toISOString().slice(0, 10);
		if (!sub.plan.closable && !expired) throw new Error('This plan does not allow closing early.');
	}
	if (action === 'renew' && !sub.plan.renewable) throw new Error('This plan is not renewable.');

	const patch: Partial<typeof subscription.$inferInsert> = { status: rule.to };
	if (action === 'activate' || action === 'resume') {
		patch.nextBillingDate = sub.nextBillingDate ?? sub.startDate;
	}
	if (action === 'renew') {
		const base = sub.expiryDate ?? new Date().toISOString().slice(0, 10);
		patch.expiryDate = addPeriod(
			base < new Date().toISOString().slice(0, 10) ? new Date().toISOString().slice(0, 10) : base,
			sub.plan.billingPeriod
		);
		patch.nextBillingDate = new Date().toISOString().slice(0, 10);
	}

	const [row] = await db.update(subscription).set(patch).where(eq(subscription.id, id)).returning();
	return row;
}

export async function deleteSubscription(id: string) {
	const sub = await db.query.subscription.findFirst({ where: eq(subscription.id, id) });
	if (!sub) throw new Error('Subscription not found.');
	if (sub.status !== 'draft' && sub.status !== 'quotation') {
		throw new Error('Only draft or quotation subscriptions can be deleted.');
	}
	await db.delete(subscription).where(eq(subscription.id, id));
}

/* ───────── subscription line editing (add-ons on/off) ─────────
 * Lines can be changed after purchase; invoices already generated
 * are snapshots and are never rewritten — changes apply from the
 * next billing period.
 */

async function assertEditableSubscription(subscriptionId: string) {
	const sub = await db.query.subscription.findFirst({
		where: eq(subscription.id, subscriptionId),
		with: { plan: true, lines: true }
	});
	if (!sub) throw new Error('Subscription not found.');
	if (sub.status === 'closed') {
		throw new Error('A closed subscription cannot be changed. Renew it first.');
	}
	return sub;
}

async function assertMinQuantity(
	sub: Awaited<ReturnType<typeof assertEditableSubscription>>,
	extraDelta: number
) {
	const total = sub.lines.reduce((sum, l) => sum + l.quantity, 0) + extraDelta;
	if (total < sub.plan.minQuantity) {
		throw new Error(
			`This plan needs a minimum quantity of ${sub.plan.minQuantity}; the lines would total ${total}.`
		);
	}
}

export async function addSubscriptionLine(subscriptionId: string, line: SubscriptionLineInput) {
	await assertEditableSubscription(subscriptionId);
	const priced = await priceLine(line);
	const [row] = await db
		.insert(subscriptionLine)
		.values({
			subscriptionId,
			productId: line.productId,
			variantId: line.variantId ?? null,
			quantity: line.quantity,
			unitPrice: String(priced.unitPrice),
			taxId: line.taxId ?? null,
			amount: String(priced.amount)
		})
		.returning();
	return row;
}

export async function updateSubscriptionLineQuantity(lineId: string, quantity: number) {
	if (!Number.isInteger(quantity) || quantity < 1) {
		throw new Error('Quantity must be at least 1.');
	}
	const line = await db.query.subscriptionLine.findFirst({
		where: eq(subscriptionLine.id, lineId)
	});
	if (!line) throw new Error('Subscription line not found.');
	const sub = await assertEditableSubscription(line.subscriptionId);
	await assertMinQuantity(sub, quantity - line.quantity);
	const [row] = await db
		.update(subscriptionLine)
		.set({ quantity, amount: String(round2(Number(line.unitPrice) * quantity)) })
		.where(eq(subscriptionLine.id, lineId))
		.returning();
	return row;
}

export async function removeSubscriptionLine(lineId: string) {
	const line = await db.query.subscriptionLine.findFirst({
		where: eq(subscriptionLine.id, lineId)
	});
	if (!line) throw new Error('Subscription line not found.');
	const sub = await assertEditableSubscription(line.subscriptionId);
	await assertMinQuantity(sub, -line.quantity);
	await db.delete(subscriptionLine).where(eq(subscriptionLine.id, lineId));
}

/* ───────── quotation templates ───────── */

export function listQuotationTemplates() {
	return db.query.quotationTemplate.findMany({
		with: { plan: true, lines: { with: { product: true, variant: true } } },
		orderBy: asc(quotationTemplate.name)
	});
}

export interface TemplateInput {
	name: string;
	validityDays: number;
	planId: string;
	lines: { productId: string; variantId?: string | null; quantity: number }[];
}

export async function createQuotationTemplate(input: TemplateInput) {
	if (input.lines.length === 0) throw new Error('Add at least one product line.');
	return db.transaction(async (tx) => {
		const [tpl] = await tx
			.insert(quotationTemplate)
			.values({ name: input.name, validityDays: input.validityDays, planId: input.planId })
			.returning();
		await tx.insert(quotationTemplateLine).values(quotationTemplateLineValues(tpl.id, input.lines));
		return tpl;
	});
}

export async function updateQuotationTemplate(id: string, input: TemplateInput) {
	if (input.lines.length === 0) throw new Error('Add at least one product line.');
	return db.transaction(async (tx) => {
		const [tpl] = await tx
			.update(quotationTemplate)
			.set({ name: input.name, validityDays: input.validityDays, planId: input.planId })
			.where(eq(quotationTemplate.id, id))
			.returning();
		await tx.delete(quotationTemplateLine).where(eq(quotationTemplateLine.templateId, id));
		await tx.insert(quotationTemplateLine).values(quotationTemplateLineValues(id, input.lines));
		return tpl;
	});
}

export async function deleteQuotationTemplate(id: string) {
	await db.delete(quotationTemplate).where(eq(quotationTemplate.id, id));
}

function quotationTemplateLineValues(templateId: string, lines: TemplateInput['lines']) {
	return lines.map((l) => ({
		templateId,
		productId: l.productId,
		variantId: l.variantId ?? null,
		quantity: l.quantity
	}));
}

/* ───────── invoices ───────── */

export function listInvoices() {
	return db.query.invoice.findMany({
		with: { customer: true, subscription: true },
		orderBy: [desc(invoice.issueDate), desc(invoice.createdAt)]
	});
}

export function getInvoiceDetail(id: string) {
	return db.query.invoice.findFirst({
		where: eq(invoice.id, id),
		with: {
			customer: true,
			subscription: true,
			lines: true,
			payments: { orderBy: desc(payment.paidOn) },
			discountApplications: { with: { discount: true } }
		}
	});
}

export async function confirmInvoice(id: string) {
	const inv = await db.query.invoice.findFirst({ where: eq(invoice.id, id) });
	if (!inv) throw new Error('Invoice not found.');
	if (inv.status !== 'draft')
		throw new Error(`Only draft invoices can be confirmed (this one is ${inv.status}).`);
	const [row] = await db
		.update(invoice)
		.set({ status: 'confirmed' })
		.where(eq(invoice.id, id))
		.returning();
	return row;
}

export async function cancelInvoice(id: string) {
	const inv = await db.query.invoice.findFirst({ where: eq(invoice.id, id) });
	if (!inv) throw new Error('Invoice not found.');
	if (inv.status === 'paid') throw new Error('A paid invoice cannot be cancelled.');
	if (inv.status === 'cancelled') throw new Error('Invoice is already cancelled.');
	const [row] = await db
		.update(invoice)
		.set({ status: 'cancelled' })
		.where(eq(invoice.id, id))
		.returning();
	return row;
}

const inrFmt = new Intl.NumberFormat('en-IN', {
	style: 'currency',
	currency: 'INR',
	maximumFractionDigits: 2
});
const dateFmt = new Intl.DateTimeFormat('en-IN', {
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});
const fmtDate = (iso: string) => dateFmt.format(new Date(`${iso}T00:00:00`));

/**
 * Email the customer that a new invoice has been generated for their
 * subscription. Fire-and-forget: a mail outage (or an unverified
 * sender) must never fail billing — failures are logged instead.
 * Called by the billing engine for both billing runs and manual
 * generation.
 */
export async function notifyInvoiceGenerated(invoiceId: string): Promise<void> {
	try {
		const detail = await getInvoiceDetail(invoiceId);
		if (!detail) return;
		const customerUser = await db.query.user.findFirst({
			where: eq(user.id, detail.customer.userId)
		});
		if (!customerUser?.email) return;

		await sendEmail(
			customerUser.email,
			`Invoice ${detail.number} from ${APP_NAME}`,
			getInvoiceGeneratedTemplate({
				url: new URL('/signin?next=/portal/invoices', ORIGIN).toString(),
				name: detail.customer.name,
				iconUrl: new URL('/favicon.svg', ORIGIN).toString(),
				invoiceNumber: detail.number,
				subscriptionNumber: detail.subscription.number,
				period: `${fmtDate(detail.periodStart)} – ${fmtDate(detail.periodEnd)}`,
				total: inrFmt.format(Number(detail.total)),
				dueDate: fmtDate(detail.dueDate)
			})
		);
	} catch (e) {
		console.error(`Failed to send invoice-generated email for invoice ${invoiceId}`, e);
	}
}

/* ───────── overdue reminders ───────── */

export interface OverdueReminderSummary {
	considered: number;
	sent: number;
	errors: string[];
}

const daysBetween = (fromIso: string, toIso: string) =>
	Math.round(
		(new Date(`${toIso}T00:00:00Z`).getTime() - new Date(`${fromIso}T00:00:00Z`).getTime()) /
			86_400_000
	);

/**
 * Email customers whose confirmed invoices are past due. Cadence is
 * weekly (day 1, then every 7 days) so nobody gets spammed daily.
 * Sends are awaited — this runs from the cron endpoint and the admin
 * billing page, where knowing the result matters.
 */
export async function sendOverdueReminders(
	today: string = new Date().toISOString().slice(0, 10)
): Promise<OverdueReminderSummary> {
	const rows = await db.query.invoice.findMany({
		where: and(eq(invoice.status, 'confirmed'), sql`${invoice.dueDate} < ${today}`),
		with: { customer: true, subscription: true }
	});

	let sent = 0;
	const errors: string[] = [];
	for (const inv of rows) {
		const days = daysBetween(inv.dueDate, today);
		if (!(days === 1 || days % 7 === 0)) continue;
		const balance = round2(Number(inv.total) - Number(inv.amountPaid));
		if (!(balance > 0)) continue;

		const customerUser = await db.query.user.findFirst({
			where: eq(user.id, inv.customer.userId)
		});
		if (!customerUser?.email) continue;

		try {
			await sendEmail(
				customerUser.email,
				`Payment reminder: invoice ${inv.number} from ${APP_NAME}`,
				getInvoiceOverdueTemplate({
					url: new URL(`/signin?next=/portal/pay/${inv.id}`, ORIGIN).toString(),
					name: inv.customer.name,
					iconUrl: new URL('/favicon.svg', ORIGIN).toString(),
					invoiceNumber: inv.number,
					balance: inrFmt.format(balance),
					dueDate: fmtDate(inv.dueDate),
					daysOverdue: days
				})
			);
			sent++;
		} catch (e) {
			errors.push(`${inv.number}: ${e instanceof Error ? e.message : 'send failed'}`);
		}
	}
	return { considered: rows.length, sent, errors };
}

/** Mark sent and email the customer a copy (fire-and-forget delivery). */
export async function sendInvoice(id: string) {
	const detail = await getInvoiceDetail(id);
	if (!detail) throw new Error('Invoice not found.');
	if (detail.status === 'draft') throw new Error('Confirm the invoice before sending it.');
	if (detail.status === 'cancelled') throw new Error('A cancelled invoice cannot be sent.');

	const customerUser = await db.query.user.findFirst({
		where: eq(user.id, detail.customer.userId)
	});
	const [row] = await db
		.update(invoice)
		.set({ sentAt: new Date() })
		.where(eq(invoice.id, id))
		.returning();

	if (customerUser?.email) {
		const linesSummary = detail.lines
			.map((l) => `${l.description} — ${l.quantity} × ₹${l.unitPrice}`)
			.join('\n');
		void sendEmail(
			customerUser.email,
			`Invoice ${detail.number} from ${APP_NAME}`,
			baseEmailTemplate({
				preheader: `Invoice ${detail.number} for ${detail.customer.name}: total ₹${detail.total}, due ${detail.dueDate}.`,
				title: `Invoice ${detail.number} — ${APP_NAME}`,
				eyebrow: 'Invoice',
				iconUrl: new URL('/favicon.svg', ORIGIN).toString(),
				heading: `Invoice ${detail.number}`,
				name: detail.customer.name,
				paragraphs: [
					`Your invoice for ${detail.subscription.number} is ready.`,
					linesSummary,
					`Total: ₹${detail.total} · Due by ${detail.dueDate}.`
				],
				cta: { label: 'View your invoices', url: new URL('/signin', ORIGIN).toString() },
				notice: 'If you have already paid this invoice, please ignore this email.'
			})
		).catch((e: unknown) => console.error('Failed to send invoice email', e));
	}
	return row;
}

/* ───────── payments ───────── */

export function listPayments() {
	return db.query.payment.findMany({
		with: { invoice: { with: { customer: true } }, recordedByUser: true },
		orderBy: [desc(payment.paidOn), desc(payment.createdAt)]
	});
}

export interface RecordPaymentInput {
	invoiceId: string;
	method: PaymentMethod;
	amount: number;
	paidOn: string;
	note?: string | null;
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Recompute an invoice's paid amount + status from its payments. */
async function syncInvoicePaymentState(tx: DbTransaction, invoiceId: string) {
	const inv = await tx
		.select()
		.from(invoice)
		.where(eq(invoice.id, invoiceId))
		.then((r) => r[0]);
	if (!inv) throw new Error('Invoice not found.');
	const [agg] = await tx
		.select({ total: sql<string>`coalesce(sum(${payment.amount}), 0)` })
		.from(payment)
		.where(eq(payment.invoiceId, invoiceId));
	const paid = round2(Number(agg?.total ?? 0));
	const patch: Partial<typeof invoice.$inferInsert> = { amountPaid: String(paid) };
	if (inv.status !== 'cancelled') {
		patch.status =
			paid >= Number(inv.total) && Number(inv.total) > 0
				? 'paid'
				: inv.status === 'paid'
					? 'confirmed'
					: inv.status;
	}
	await tx.update(invoice).set(patch).where(eq(invoice.id, invoiceId));
	return { ...inv, ...patch };
}

export async function recordPayment(input: RecordPaymentInput, recordedBy: string) {
	const inv = await db.query.invoice.findFirst({ where: eq(invoice.id, input.invoiceId) });
	if (!inv) throw new Error('Invoice not found.');
	if (inv.status === 'cancelled')
		throw new Error('Cannot record a payment on a cancelled invoice.');
	if (inv.status === 'draft') throw new Error('Confirm the invoice before recording a payment.');
	if (!(input.amount > 0)) throw new Error('Payment amount must be greater than zero.');

	return db.transaction(async (tx) => {
		const [row] = await tx
			.insert(payment)
			.values({
				invoiceId: input.invoiceId,
				method: input.method,
				amount: String(round2(input.amount)),
				paidOn: input.paidOn,
				note: input.note ?? null,
				recordedBy
			})
			.returning();
		await syncInvoicePaymentState(tx, input.invoiceId);
		return row;
	});
}

export async function deletePayment(id: string) {
	const pay = await db.query.payment.findFirst({ where: eq(payment.id, id) });
	if (!pay) throw new Error('Payment not found.');
	await db.transaction(async (tx) => {
		await tx.delete(payment).where(eq(payment.id, id));
		await syncInvoicePaymentState(tx, pay.invoiceId);
	});
}

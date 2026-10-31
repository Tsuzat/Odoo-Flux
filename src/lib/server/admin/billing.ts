import { and, eq, lte, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	discount,
	discountApplication,
	invoice,
	invoiceLine,
	subscription,
	type Discount
} from '#lib/server/db/schema.ts';
import { addDays, addPeriod, round2 } from './operations.ts';
import { deleteCached } from '../cache.ts';
import { DASHBOARD_CACHE_KEY } from './dashboard.ts';

/**
 * The billing engine (PDF: "Billing day" + "A customer asks for a
 * better price"). Generates one invoice per due subscription for the
 * period starting at its `nextBillingDate`, snapshots lines/prices,
 * applies admin discount rules automatically (product scope first,
 * then subscription scope, allocated per line so tax stays correct),
 * calculates tax from the subscription lines' tax rules, and advances
 * the schedule. The `(subscription, period)` unique index makes
 * re-runs safe — nothing is billed twice.
 */

const MAX_PERIODS_PER_RUN = 12; // catch-up cap so a stale sub can't explode a run

async function nextInvoiceNumber(): Promise<string> {
	const rows = await db.select({ number: invoice.number }).from(invoice);
	let max = 0;
	for (const r of rows) {
		const n = Number(r.number.replace('INV-', ''));
		if (Number.isFinite(n) && n > max) max = n;
	}
	return `INV-${String(max + 1).padStart(6, '0')}`;
}

function discountAmountFor(d: Discount, base: number): number {
	if (d.type === 'percentage') return round2((base * Number(d.value)) / 100);
	return round2(Math.min(Number(d.value), base));
}

function isDiscountLive(d: Discount, onDate: string): boolean {
	if (!d.active) return false;
	if (d.startDate > onDate) return false;
	if (d.endDate && d.endDate < onDate) return false;
	if (d.usageLimit != null && d.usedCount >= d.usageLimit) return false;
	return true;
}

export async function generateInvoiceForSubscription(
	subscriptionId: string,
	periodStart: string
): Promise<{ invoiceId: string; number: string } | null> {
	const sub = await db.query.subscription.findFirst({
		where: eq(subscription.id, subscriptionId),
		with: {
			plan: true,
			lines: { with: { product: true, variant: true, tax: true } }
		}
	});
	if (!sub) throw new Error('Subscription not found.');
	if (sub.lines.length === 0) return null;

	const periodEnd = addPeriod(periodStart, sub.plan.billingPeriod);

	// Duplicate-billing guard (also enforced by the unique index).
	const existing = await db.query.invoice.findFirst({
		where: and(
			eq(invoice.subscriptionId, sub.id),
			eq(invoice.periodStart, periodStart),
			eq(invoice.periodEnd, periodEnd)
		)
	});
	if (existing) return null;

	const discounts = await db.select().from(discount);
	const live = discounts.filter((d) => isDiscountLive(d, periodStart));
	const totalQuantity = sub.lines.reduce((s, l) => s + l.quantity, 0);

	// 1) Line bases + product-scoped discounts (best single rule per line).
	const lines = sub.lines.map((l) => {
		const base = round2(Number(l.amount));
		let lineDiscount = 0;
		let applied: Discount | null = null;
		for (const d of live) {
			if (d.scope !== 'product' || d.productId !== l.productId) continue;
			if (d.minQuantity != null && l.quantity < d.minQuantity) continue;
			if (d.minPurchase != null && base < Number(d.minPurchase)) continue;
			const amount = discountAmountFor(d, base);
			if (amount > lineDiscount) {
				lineDiscount = amount;
				applied = d;
			}
		}
		return { line: l, base, lineDiscount, applied };
	});

	const subtotal = round2(lines.reduce((s, x) => s + x.base, 0));
	const productDiscountTotal = round2(lines.reduce((s, x) => s + x.lineDiscount, 0));
	const afterProduct = round2(subtotal - productDiscountTotal);

	// 2) Best subscription-scoped discount on the remaining subtotal.
	let subDiscount: Discount | null = null;
	let subDiscountAmount = 0;
	for (const d of live) {
		if (d.scope !== 'subscription') continue;
		if (d.minPurchase != null && subtotal < Number(d.minPurchase)) continue;
		if (d.minQuantity != null && totalQuantity < d.minQuantity) continue;
		const amount = discountAmountFor(d, afterProduct);
		if (amount > subDiscountAmount) {
			subDiscountAmount = amount;
			subDiscount = d;
		}
	}

	// 3) Allocate the subscription discount across lines (for tax), then tax.
	let allocated = 0;
	const computed = lines.map((x, i) => {
		let share = 0;
		if (subDiscountAmount > 0 && afterProduct > 0) {
			share =
				i === lines.length - 1
					? round2(subDiscountAmount - allocated)
					: round2((subDiscountAmount * (x.base - x.lineDiscount)) / afterProduct);
			allocated = round2(allocated + share);
		}
		const net = round2(x.base - x.lineDiscount - share);
		const rate = x.line.tax ? Number(x.line.tax.ratePercent) : 0;
		const taxAmount = round2((net * rate) / 100);
		return { ...x, share, net, rate, taxAmount };
	});

	const discountTotal = round2(productDiscountTotal + subDiscountAmount);
	const taxTotal = round2(computed.reduce((s, x) => s + x.taxAmount, 0));
	const total = round2(subtotal - discountTotal + taxTotal);
	const issueDate = new Date().toISOString().slice(0, 10);
	const dueDate = addDays(issueDate, sub.paymentTermsDays);
	const number = await nextInvoiceNumber();

	const created = await db.transaction(async (tx) => {
		const [inv] = await tx
			.insert(invoice)
			.values({
				number,
				subscriptionId: sub.id,
				customerId: sub.customerId,
				periodStart,
				periodEnd,
				status: 'draft',
				issueDate,
				dueDate,
				subtotal: String(subtotal),
				discountTotal: String(discountTotal),
				taxTotal: String(taxTotal),
				total: String(total)
			})
			.returning();

		await tx.insert(invoiceLine).values(
			computed.map((x) => ({
				invoiceId: inv.id,
				productId: x.line.productId,
				description: x.line.variant
					? `${x.line.product.name} – ${x.line.variant.attribute}: ${x.line.variant.value}`
					: x.line.product.name,
				quantity: x.line.quantity,
				unitPrice: x.line.unitPrice,
				taxRatePercent: String(x.rate),
				discountAmount: String(round2(x.lineDiscount + x.share)),
				taxAmount: String(x.taxAmount),
				amount: String(x.net)
			}))
		);

		// Record each applied discount once per invoice + bump usage.
		const applications = new Map<string, number>();
		for (const x of computed) {
			if (x.applied && x.lineDiscount > 0) {
				applications.set(
					x.applied.id,
					round2((applications.get(x.applied.id) ?? 0) + x.lineDiscount)
				);
			}
		}
		if (subDiscount && subDiscountAmount > 0) {
			applications.set(
				subDiscount.id,
				round2((applications.get(subDiscount.id) ?? 0) + subDiscountAmount)
			);
		}
		for (const [discountId, amount] of applications) {
			await tx
				.insert(discountApplication)
				.values({ discountId, invoiceId: inv.id, amount: String(amount) });
			await tx
				.update(discount)
				.set({ usedCount: sql`${discount.usedCount} + 1` })
				.where(eq(discount.id, discountId));
		}
		return inv;
	});

	return { invoiceId: created.id, number: created.number };
}

export interface DueSubscription {
	id: string;
	number: string;
	customerName: string;
	planName: string;
	billingPeriod: string;
	nextBillingDate: string | null;
	estimatedAmount: number;
}

export async function getDueSubscriptions(today: string): Promise<DueSubscription[]> {
	const rows = await db.query.subscription.findMany({
		where: and(eq(subscription.status, 'active'), lte(subscription.nextBillingDate, today)),
		with: { customer: true, plan: true, lines: true },
		orderBy: subscription.nextBillingDate
	});
	return rows.map((s) => ({
		id: s.id,
		number: s.number,
		customerName: s.customer.name,
		planName: s.plan.name,
		billingPeriod: s.plan.billingPeriod,
		nextBillingDate: s.nextBillingDate,
		estimatedAmount: round2(s.lines.reduce((sum, l) => sum + Number(l.amount), 0))
	}));
}

export interface BillingRunSummary {
	created: { number: string; subscriptionNumber: string }[];
	skipped: string[];
	closed: string[];
	errors: { subscriptionNumber: string; message: string }[];
}

/** Bill every due active subscription (catching up missed periods, capped). */
export async function runBilling(today: string): Promise<BillingRunSummary> {
	const summary: BillingRunSummary = { created: [], skipped: [], closed: [], errors: [] };
	const due = await getDueSubscriptions(today);

	for (const item of due) {
		try {
			const sub = await db.query.subscription.findFirst({
				where: eq(subscription.id, item.id),
				with: { plan: true }
			});
			if (!sub) continue;

			let cursor = sub.nextBillingDate ?? sub.startDate;
			let periods = 0;
			while (cursor <= today && periods < MAX_PERIODS_PER_RUN) {
				const result = await generateInvoiceForSubscription(sub.id, cursor);
				if (result) {
					summary.created.push({ number: result.number, subscriptionNumber: sub.number });
				} else {
					summary.skipped.push(sub.number);
				}
				cursor = addPeriod(cursor, sub.plan.billingPeriod);
				periods++;
			}

			const patch: Partial<typeof subscription.$inferInsert> = { nextBillingDate: cursor };
			if (
				sub.plan.autoClose &&
				sub.expiryDate &&
				sub.expiryDate <= cursor &&
				sub.status === 'active'
			) {
				patch.status = 'closed';
				summary.closed.push(sub.number);
			}
			await db.update(subscription).set(patch).where(eq(subscription.id, sub.id));
		} catch (e) {
			summary.errors.push({
				subscriptionNumber: item.number,
				message: e instanceof Error ? e.message : 'Unknown error'
			});
		}
	}

	await deleteCached(DASHBOARD_CACHE_KEY);
	return summary;
}

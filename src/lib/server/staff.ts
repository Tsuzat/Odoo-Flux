import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { invoice, payment, subscription } from '#lib/server/db/schema.ts';
import { round2 } from './admin/operations.ts';

/**
 * Staff workspace overview (PDF: internal staff handle customers day
 * to day). Operational numbers only — catalog, discounts, staff and
 * the billing run stay admin-only.
 */
export async function getStaffOverview() {
	const today = new Date().toISOString().slice(0, 10);
	const [activeCount, dueCount, openAgg, overdueAgg, recentInvoices, recentPayments] =
		await Promise.all([
			db
				.select({ value: sql<number>`count(*)::int` })
				.from(subscription)
				.where(eq(subscription.status, 'active')),
			db
				.select({ value: sql<number>`count(*)::int` })
				.from(subscription)
				.where(
					and(eq(subscription.status, 'active'), sql`${subscription.nextBillingDate} <= ${today}`)
				),
			db
				.select({
					value: sql<number>`count(*)::int`,
					amount: sql<string>`coalesce(sum(${invoice.total} - ${invoice.amountPaid}), 0)`
				})
				.from(invoice)
				.where(inArray(invoice.status, ['draft', 'confirmed'])),
			db
				.select({ value: sql<number>`count(*)::int` })
				.from(invoice)
				.where(
					and(inArray(invoice.status, ['draft', 'confirmed']), sql`${invoice.dueDate} < ${today}`)
				),
			db.query.invoice.findMany({
				with: { customer: true },
				orderBy: [desc(invoice.issueDate), desc(invoice.createdAt)],
				limit: 5
			}),
			db.query.payment.findMany({
				with: { invoice: { with: { customer: true } } },
				orderBy: [desc(payment.paidOn), desc(payment.createdAt)],
				limit: 5
			})
		]);

	return {
		activeSubscriptions: activeCount[0]?.value ?? 0,
		dueForBilling: dueCount[0]?.value ?? 0,
		outstandingInvoices: openAgg[0]?.value ?? 0,
		outstandingAmount: round2(Number(openAgg[0]?.amount ?? 0)),
		overdueInvoices: overdueAgg[0]?.value ?? 0,
		recentInvoices,
		recentPayments
	};
}

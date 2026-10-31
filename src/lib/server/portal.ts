import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { customer, invoice, payment, subscription, user } from '#lib/server/db/schema.ts';
import { round2, transitionSubscription, type SubscriptionAction } from './admin/operations.ts';

/**
 * Customer portal data (PDF: "customers see only their own
 * subscriptions and invoices through a portal"). Every query is
 * scoped to the signed-in user's customer record — ownership is
 * enforced here, never trusted from the client.
 */

export async function getCustomerForUser(userId: string) {
	return db.query.customer.findFirst({ where: eq(customer.userId, userId) });
}

export async function getPortalOverview(customerId: string) {
	const today = new Date().toISOString().slice(0, 10);
	const [subs, openAgg, overdueAgg, paidAgg, nextBilling] = await Promise.all([
		db
			.select({ status: subscription.status, value: sql<number>`count(*)::int` })
			.from(subscription)
			.where(eq(subscription.customerId, customerId))
			.groupBy(subscription.status),
		db
			.select({
				value: sql<number>`count(*)::int`,
				amount: sql<string>`coalesce(sum(${invoice.total} - ${invoice.amountPaid}), 0)`
			})
			.from(invoice)
			.where(
				and(eq(invoice.customerId, customerId), inArray(invoice.status, ['draft', 'confirmed']))
			),
		db
			.select({ value: sql<number>`count(*)::int` })
			.from(invoice)
			.where(
				and(
					eq(invoice.customerId, customerId),
					inArray(invoice.status, ['draft', 'confirmed']),
					sql`${invoice.dueDate} < ${today}`
				)
			),
		db
			.select({ total: sql<string>`coalesce(sum(${payment.amount}), 0)` })
			.from(payment)
			.innerJoin(invoice, eq(payment.invoiceId, invoice.id))
			.where(eq(invoice.customerId, customerId)),
		db
			.select({ nextBillingDate: subscription.nextBillingDate })
			.from(subscription)
			.where(and(eq(subscription.customerId, customerId), eq(subscription.status, 'active')))
			.orderBy(subscription.nextBillingDate)
			.limit(1)
	]);

	const byStatus = new Map(subs.map((r) => [r.status, r.value]));
	return {
		activeSubscriptions: byStatus.get('active') ?? 0,
		totalSubscriptions: [...byStatus.values()].reduce((a, b) => a + b, 0),
		outstandingAmount: round2(Number(openAgg[0]?.amount ?? 0)),
		outstandingInvoices: openAgg[0]?.value ?? 0,
		overdueInvoices: overdueAgg[0]?.value ?? 0,
		totalPaid: round2(Number(paidAgg[0]?.total ?? 0)),
		nextBillingDate: nextBilling[0]?.nextBillingDate ?? null
	};
}

export function listMySubscriptions(customerId: string) {
	return db.query.subscription.findMany({
		where: eq(subscription.customerId, customerId),
		with: { plan: true, lines: { with: { product: true, variant: true, tax: true } } },
		orderBy: desc(subscription.createdAt)
	});
}

export async function getMySubscription(customerId: string, id: string) {
	const sub = await db.query.subscription.findFirst({
		where: eq(subscription.id, id),
		with: {
			plan: true,
			lines: { with: { product: true, variant: true, tax: true } },
			invoices: { orderBy: desc(invoice.issueDate) }
		}
	});
	if (!sub || sub.customerId !== customerId) return null;
	return sub;
}

/** Actions a customer may run on their own subscription. */
const PORTAL_ACTIONS: SubscriptionAction[] = ['pause', 'resume', 'renew', 'close'];

export async function transitionMySubscription(
	customerId: string,
	id: string,
	action: SubscriptionAction
) {
	if (!PORTAL_ACTIONS.includes(action)) {
		throw new Error('That action is not available in the portal.');
	}
	const owned = await getMySubscription(customerId, id);
	if (!owned) throw new Error('Subscription not found.');
	return transitionSubscription(id, action);
}

export function listMyInvoices(customerId: string) {
	return db.query.invoice.findMany({
		where: eq(invoice.customerId, customerId),
		with: { subscription: true },
		orderBy: [desc(invoice.issueDate), desc(invoice.createdAt)]
	});
}

export async function getMyInvoice(customerId: string, id: string) {
	const inv = await db.query.invoice.findFirst({
		where: eq(invoice.id, id),
		with: {
			subscription: true,
			lines: true,
			payments: { orderBy: desc(payment.paidOn) },
			discountApplications: { with: { discount: true } }
		}
	});
	if (!inv || inv.customerId !== customerId) return null;
	return inv;
}

export async function listMyPayments(customerId: string) {
	const rows = await db
		.select({ payment, invoice })
		.from(payment)
		.innerJoin(invoice, eq(payment.invoiceId, invoice.id))
		.where(eq(invoice.customerId, customerId))
		.orderBy(desc(payment.paidOn), desc(payment.createdAt));
	return rows.map((r) => ({ ...r.payment, invoice: r.invoice }));
}

export interface ProfileInput {
	name: string;
	company?: string | null;
	phone?: string | null;
	address?: string | null;
}

export async function updateMyProfile(userId: string, customerId: string, input: ProfileInput) {
	await db.transaction(async (tx) => {
		await tx.update(user).set({ name: input.name }).where(eq(user.id, userId));
		await tx
			.update(customer)
			.set({
				name: input.name,
				company: input.company ?? null,
				phone: input.phone ?? null,
				address: input.address ?? null
			})
			.where(eq(customer.id, customerId));
	});
	return getCustomerForUser(userId);
}

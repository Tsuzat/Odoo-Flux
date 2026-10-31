import { and, asc, count, desc, eq, gte, inArray, sql, sum } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	customer,
	discount,
	INVOICE_STATUSES,
	invoice,
	payment,
	plan,
	product,
	quotationTemplate,
	SUBSCRIPTION_STATUSES,
	subscription,
	subscriptionLine,
	tax,
	type InvoiceStatus,
	type SubscriptionStatus
} from '#lib/server/db/schema.ts';
import { cached, deleteCached } from '../cache.ts';

/**
 * Admin dashboard data (PDF: "The finance lead, at the end of the
 * month" — active subscriptions, revenue, payments and overdue
 * invoices in one place). Everything is computed with SQL aggregates
 * so the page stays fast with thousands of subscriptions, and the
 * result is cached in Redis for a short window.
 */

export const DASHBOARD_CACHE_KEY = 'admin:dashboard';
const DASHBOARD_TTL_SECONDS = 60;

/** Invoice statuses that can still carry an outstanding balance. */
const OPEN_INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'confirmed'];

export interface StatusCount {
	status: string;
	count: number;
}

export interface RecentInvoice {
	id: string;
	number: string;
	customerName: string;
	status: InvoiceStatus;
	total: string;
	amountPaid: string;
	dueDate: string;
}

export interface RecentPayment {
	id: string;
	invoiceNumber: string;
	customerName: string;
	method: string;
	amount: string;
	paidOn: string;
}

export interface UpcomingRenewal {
	id: string;
	number: string;
	customerName: string;
	planName: string;
	nextBillingDate: string | null;
}

export interface DashboardData {
	generatedAt: string;
	stats: {
		activeSubscriptions: number;
		totalSubscriptions: number;
		customers: number;
		/** Active subscription lines normalised to a monthly amount (pre-tax). */
		monthlyRecurringRevenue: number;
		revenueCollected: number;
		paymentsCount: number;
		outstandingAmount: number;
		outstandingInvoices: number;
		overdueInvoices: number;
		overdueAmount: number;
	};
	subscriptionsByStatus: StatusCount[];
	invoicesByStatus: StatusCount[];
	catalog: {
		products: number;
		activeProducts: number;
		plans: number;
		activePlans: number;
		taxes: number;
		discounts: number;
		activeDiscounts: number;
		quotationTemplates: number;
	};
	recentInvoices: RecentInvoice[];
	recentPayments: RecentPayment[];
	upcomingRenewals: UpcomingRenewal[];
}

async function countOf(
	table:
		| typeof product
		| typeof plan
		| typeof tax
		| typeof discount
		| typeof quotationTemplate
		| typeof customer,
	where?: ReturnType<typeof eq>
): Promise<number> {
	const [row] = await db.select({ value: count() }).from(table).where(where);
	return row?.value ?? 0;
}

async function computeDashboard(): Promise<DashboardData> {
	const today = new Date().toISOString().slice(0, 10);

	const [
		subStatusRows,
		invStatusRows,
		customerCount,
		paymentAgg,
		openInvoiceAgg,
		overdueAgg,
		mrrRows,
		productCount,
		activeProductCount,
		planCount,
		activePlanCount,
		taxCount,
		discountCount,
		activeDiscountCount,
		templateCount,
		recentInvoices,
		recentPayments,
		upcomingRenewals
	] = await Promise.all([
		db
			.select({ status: subscription.status, value: count() })
			.from(subscription)
			.groupBy(subscription.status),
		db.select({ status: invoice.status, value: count() }).from(invoice).groupBy(invoice.status),
		countOf(customer),
		db.select({ total: sum(payment.amount), value: count() }).from(payment),
		db
			.select({
				value: count(),
				outstanding: sql<string>`coalesce(sum(${invoice.total} - ${invoice.amountPaid}), 0)`
			})
			.from(invoice)
			.where(inArray(invoice.status, OPEN_INVOICE_STATUSES)),
		db
			.select({
				value: count(),
				outstanding: sql<string>`coalesce(sum(${invoice.total} - ${invoice.amountPaid}), 0)`
			})
			.from(invoice)
			.where(
				and(inArray(invoice.status, OPEN_INVOICE_STATUSES), sql`${invoice.dueDate} < ${today}`)
			),
		// Normalise each active subscription line to a monthly amount
		// based on its plan's billing period (daily/weekly/monthly/yearly).
		db
			.select({
				mrr: sql<string>`coalesce(sum(${subscriptionLine.amount} * case ${plan.billingPeriod}
					when 'daily' then 365.0 / 12
					when 'weekly' then 52.0 / 12
					when 'monthly' then 1
					when 'yearly' then 1.0 / 12
				end), 0)`
			})
			.from(subscriptionLine)
			.innerJoin(subscription, eq(subscriptionLine.subscriptionId, subscription.id))
			.innerJoin(plan, eq(subscription.planId, plan.id))
			.where(eq(subscription.status, 'active')),
		countOf(product),
		countOf(product, eq(product.active, true)),
		countOf(plan),
		countOf(plan, eq(plan.active, true)),
		countOf(tax),
		countOf(discount),
		countOf(discount, eq(discount.active, true)),
		countOf(quotationTemplate),
		db
			.select({
				id: invoice.id,
				number: invoice.number,
				customerName: customer.name,
				status: invoice.status,
				total: invoice.total,
				amountPaid: invoice.amountPaid,
				dueDate: invoice.dueDate
			})
			.from(invoice)
			.innerJoin(customer, eq(invoice.customerId, customer.id))
			.orderBy(desc(invoice.issueDate), desc(invoice.createdAt))
			.limit(5),
		db
			.select({
				id: payment.id,
				invoiceNumber: invoice.number,
				customerName: customer.name,
				method: payment.method,
				amount: payment.amount,
				paidOn: payment.paidOn
			})
			.from(payment)
			.innerJoin(invoice, eq(payment.invoiceId, invoice.id))
			.innerJoin(customer, eq(invoice.customerId, customer.id))
			.orderBy(desc(payment.paidOn), desc(payment.createdAt))
			.limit(5),
		db
			.select({
				id: subscription.id,
				number: subscription.number,
				customerName: customer.name,
				planName: plan.name,
				nextBillingDate: subscription.nextBillingDate
			})
			.from(subscription)
			.innerJoin(customer, eq(subscription.customerId, customer.id))
			.innerJoin(plan, eq(subscription.planId, plan.id))
			.where(and(eq(subscription.status, 'active'), gte(subscription.nextBillingDate, today)))
			.orderBy(asc(subscription.nextBillingDate))
			.limit(5)
	]);

	const subCount = new Map<string, number>(subStatusRows.map((r) => [r.status, r.value]));
	const invCount = new Map<string, number>(invStatusRows.map((r) => [r.status, r.value]));

	return {
		generatedAt: new Date().toISOString(),
		stats: {
			activeSubscriptions: subCount.get('active') ?? 0,
			totalSubscriptions: [...subCount.values()].reduce((a, b) => a + b, 0),
			customers: customerCount,
			monthlyRecurringRevenue: Number(mrrRows[0]?.mrr ?? 0),
			revenueCollected: Number(paymentAgg[0]?.total ?? 0),
			paymentsCount: paymentAgg[0]?.value ?? 0,
			outstandingAmount: Number(openInvoiceAgg[0]?.outstanding ?? 0),
			outstandingInvoices: openInvoiceAgg[0]?.value ?? 0,
			overdueInvoices: overdueAgg[0]?.value ?? 0,
			overdueAmount: Number(overdueAgg[0]?.outstanding ?? 0)
		},
		subscriptionsByStatus: SUBSCRIPTION_STATUSES.map((status: SubscriptionStatus) => ({
			status,
			count: subCount.get(status) ?? 0
		})),
		invoicesByStatus: INVOICE_STATUSES.map((status: InvoiceStatus) => ({
			status,
			count: invCount.get(status) ?? 0
		})),
		catalog: {
			products: productCount,
			activeProducts: activeProductCount,
			plans: planCount,
			activePlans: activePlanCount,
			taxes: taxCount,
			discounts: discountCount,
			activeDiscounts: activeDiscountCount,
			quotationTemplates: templateCount
		},
		recentInvoices,
		recentPayments,
		upcomingRenewals
	};
}

export function getDashboardData(): Promise<DashboardData> {
	return cached(DASHBOARD_CACHE_KEY, DASHBOARD_TTL_SECONDS, computeDashboard);
}

/** Call after anything that changes dashboard numbers (billing run, payments, …). */
export function invalidateDashboardCache(): Promise<void> {
	return deleteCached(DASHBOARD_CACHE_KEY);
}

import { error } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';
import { z } from 'zod';
import { auth } from '#lib/server/auth.ts';
import {
	getCustomerForUser,
	getMyInvoice,
	getMySubscription,
	getPortalOverview,
	listAddonProducts,
	listMyInvoices,
	listMyPayments,
	listMySubscriptions,
	toggleMyAddon,
	transitionMySubscription,
	updateMyProfile
} from '#lib/server/portal.ts';
import { recordPayment } from '#lib/server/admin/operations.ts';

const id = z.string().min(1);

/**
 * Portal remote functions: every call resolves the caller's customer
 * record from the session and scopes all data to it.
 */
async function requireCustomer() {
	const { locals } = getRequestEvent();
	if (!locals.user) error(401, 'Sign in required.');
	if ((locals.user.role ?? 'customer') !== 'customer') error(403, 'Customers only.');
	const customer = await getCustomerForUser(locals.user.id);
	if (!customer) error(403, 'No customer account is linked to this login.');
	return { user: locals.user, customer };
}

export const getMyOverviewQuery = query(async () => {
	const { customer } = await requireCustomer();
	return getPortalOverview(customer.id);
});

export const getMySubscriptionsQuery = query(async () => {
	const { customer } = await requireCustomer();
	return listMySubscriptions(customer.id);
});

export const getMySubscriptionQuery = query(id, async (subId) => {
	const { customer } = await requireCustomer();
	const sub = await getMySubscription(customer.id, subId);
	if (!sub) error(404, 'Subscription not found.');
	return sub;
});

export const getMyInvoicesQuery = query(async () => {
	const { customer } = await requireCustomer();
	return listMyInvoices(customer.id);
});

export const getMyInvoiceQuery = query(id, async (invoiceId) => {
	const { customer } = await requireCustomer();
	const inv = await getMyInvoice(customer.id, invoiceId);
	if (!inv) error(404, 'Invoice not found.');
	return inv;
});

export const getMyPaymentsQuery = query(async () => {
	const { customer } = await requireCustomer();
	return listMyPayments(customer.id);
});

/* ───────── mock payment portal ───────── */

/** Payment rails offered by the mock checkout, mapped to DB methods. */
const MOCK_METHODS = {
	upi: { method: 'upi', label: 'UPI' },
	card: { method: 'card', label: 'Credit Card' },
	gpay: { method: 'other', label: 'Google Pay' },
	apple_pay: { method: 'other', label: 'Apple Pay' }
} as const;

export type MockPaymentMethod = keyof typeof MOCK_METHODS;

/**
 * Pay the full outstanding balance of one of the customer's invoices
 * through the mock payment portal. No real gateway is involved — the
 * payment is recorded exactly like a staff-recorded one, so the
 * invoice flips to Paid and shows up in payment history.
 */
export const payInvoiceCommand = command(
	z.object({ invoiceId: id, method: z.enum(['upi', 'card', 'gpay', 'apple_pay']) }),
	async ({ invoiceId, method }) => {
		const { user, customer } = await requireCustomer();
		const inv = await getMyInvoice(customer.id, invoiceId);
		if (!inv) error(404, 'Invoice not found.');
		if (inv.status === 'paid') error(400, 'This invoice is already paid.');
		if (inv.status !== 'confirmed') {
			error(400, 'This invoice is not ready for payment yet.');
		}
		const balance = Math.round((Number(inv.total) - Number(inv.amountPaid)) * 100) / 100;
		if (!(balance > 0)) error(400, 'Nothing is due on this invoice.');

		const rail = MOCK_METHODS[method];
		try {
			const payment = await recordPayment(
				{
					invoiceId,
					method: rail.method,
					amount: balance,
					paidOn: new Date().toISOString().slice(0, 10),
					note: `Mock payment via ${rail.label}`
				},
				user.id
			);
			void getMyInvoicesQuery().refresh();
			void getMyInvoiceQuery(invoiceId).refresh();
			void getMyPaymentsQuery().refresh();
			void getMyOverviewQuery().refresh();
			return { payment, invoiceNumber: inv.number, amount: balance, methodLabel: rail.label };
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Payment failed. Please try again.');
		}
	}
);

/* ───────── add-ons ───────── */

export const getMyAddonsQuery = query(id, async (subscriptionId) => {
	const { customer } = await requireCustomer();
	const sub = await getMySubscription(customer.id, subscriptionId);
	if (!sub) error(404, 'Subscription not found.');
	const addons = await listAddonProducts();
	return { addons, lines: sub.lines, status: sub.status };
});

export const toggleMyAddonCommand = command(
	z.object({
		subscriptionId: id,
		productId: id,
		variantId: id.nullable(),
		enabled: z.boolean()
	}),
	async ({ subscriptionId, productId, variantId, enabled }) => {
		const { customer } = await requireCustomer();
		try {
			const updated = await toggleMyAddon(
				customer.id,
				subscriptionId,
				productId,
				variantId,
				enabled
			);
			void getMySubscriptionsQuery().refresh();
			void getMySubscriptionQuery(subscriptionId).refresh();
			void getMyAddonsQuery(subscriptionId).refresh();
			return updated;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not change the add-on.');
		}
	}
);

const PORTAL_ACTIONS = ['pause', 'resume', 'renew', 'close'] as const;

export const transitionMySubscriptionCommand = command(
	z.object({ id, action: z.enum(PORTAL_ACTIONS) }),
	async ({ id: subId, action }) => {
		const { customer } = await requireCustomer();
		try {
			const row = await transitionMySubscription(customer.id, subId, action);
			void getMySubscriptionsQuery().refresh();
			void getMySubscriptionQuery(subId).refresh();
			void getMyOverviewQuery().refresh();
			return row;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Action failed.');
		}
	}
);

export const getMyProfileQuery = query(async () => {
	const { user, customer } = await requireCustomer();
	return { user, customer };
});

export const updateMyProfileCommand = command(
	z.object({
		name: z.string().trim().min(1).max(120),
		company: z.string().trim().max(160).nullable().optional(),
		phone: z.string().trim().max(40).nullable().optional(),
		address: z.string().trim().max(500).nullable().optional()
	}),
	async (data) => {
		const { user, customer } = await requireCustomer();
		const updated = await updateMyProfile(user.id, customer.id, data);
		void getMyProfileQuery().refresh();
		return updated;
	}
);

export const changeMyPasswordCommand = command(
	z
		.object({
			currentPassword: z.string().min(1),
			newPassword: z
				.string()
				.min(9, 'Password must be more than 8 characters.')
				.regex(/[A-Z]/, 'Password must include an uppercase letter.')
				.regex(/[a-z]/, 'Password must include a lowercase letter.')
				.regex(/[^A-Za-z0-9\s]/, 'Password must include a special character.')
		})
		.refine((d) => d.currentPassword !== d.newPassword, {
			message: 'The new password must be different from the current one.',
			path: ['newPassword']
		}),
	async ({ currentPassword, newPassword }) => {
		await requireCustomer();
		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions: true },
				headers: getRequestEvent().request.headers
			});
			return { ok: true };
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not change the password.');
		}
	}
);

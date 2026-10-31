import { error } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';
import { z } from 'zod';
import { auth } from '#lib/server/auth.ts';
import {
	getCustomerForUser,
	getMyInvoice,
	getMySubscription,
	getPortalOverview,
	listMyInvoices,
	listMyPayments,
	listMySubscriptions,
	transitionMySubscription,
	updateMyProfile
} from '#lib/server/portal.ts';

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

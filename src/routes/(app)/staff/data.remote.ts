import { error } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';
import { z } from 'zod';
import { getStaffOverview } from '#lib/server/staff.ts';
import { listCustomers } from '#lib/server/admin/users.ts';
import { listPlans, listProducts, listTaxes } from '#lib/server/admin/catalog.ts';
import {
	addSubscriptionLine,
	cancelInvoice,
	confirmInvoice,
	createSubscription,
	getInvoiceDetail,
	getSubscriptionDetail,
	listInvoices,
	listPayments,
	listQuotationTemplates,
	listSubscriptions,
	recordPayment,
	deletePayment,
	removeSubscriptionLine,
	sendInvoice,
	transitionSubscription,
	updateSubscriptionLineQuantity,
	type SubscriptionAction
} from '#lib/server/admin/operations.ts';

const id = z.string().min(1);

/**
 * Staff remote functions. Day-to-day operations only — catalog,
 * discounts, user management and the billing run stay admin-only.
 * Remote endpoints are public, so the role is re-checked per call.
 */
function requireStaff() {
	const { locals } = getRequestEvent();
	if (!locals.user) error(401, 'Sign in required.');
	if (locals.user.role !== 'admin' && locals.user.role !== 'staff') {
		error(403, 'Staff only.');
	}
	return locals.user;
}

export const getStaffOverviewQuery = query(async () => {
	requireStaff();
	return getStaffOverview();
});

/* Subscriptions */
export const getSubscriptions = query(async () => {
	requireStaff();
	return listSubscriptions();
});

export const getSubscription = query(id, async (subId) => {
	requireStaff();
	const sub = await getSubscriptionDetail(subId);
	if (!sub) error(404, 'Subscription not found.');
	return sub;
});

export const createSubscriptionCommand = command(
	z.object({
		customerId: id,
		planId: id,
		templateId: id.nullable().optional(),
		startDate: z.iso.date(),
		paymentTermsDays: z.number().int().min(0).max(365),
		lines: z.array(
			z.object({
				productId: id,
				variantId: id.nullable().optional(),
				quantity: z.number().int().positive(),
				taxId: id.nullable().optional()
			})
		)
	}),
	async (data) => {
		requireStaff();
		try {
			const row = await createSubscription(data);
			void getSubscriptions().refresh();
			return row;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not create the subscription.');
		}
	}
);

const STAFF_ACTIONS = [
	'send-quotation',
	'confirm',
	'activate',
	'pause',
	'resume',
	'close',
	'renew'
] as const satisfies readonly SubscriptionAction[];

export const transitionSubscriptionCommand = command(
	z.object({ id, action: z.enum(STAFF_ACTIONS) }),
	async ({ id: subId, action }) => {
		requireStaff();
		try {
			const row = await transitionSubscription(subId, action);
			void getSubscriptions().refresh();
			void getSubscription(subId).refresh();
			return row;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not update the subscription.');
		}
	}
);

/* Subscription line editing (add-ons on/off after purchase) */

const lineInput = z.object({
	productId: id,
	variantId: id.nullable().optional(),
	quantity: z.number().int().positive(),
	taxId: id.nullable().optional()
});

export const addSubscriptionLineCommand = command(
	z.object({ subscriptionId: id, data: lineInput }),
	async ({ subscriptionId, data }) => {
		requireStaff();
		try {
			const row = await addSubscriptionLine(subscriptionId, data);
			void getSubscriptions().refresh();
			void getSubscription(subscriptionId).refresh();
			return row;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not add the line.');
		}
	}
);

export const updateSubscriptionLineCommand = command(
	z.object({ lineId: id, subscriptionId: id, quantity: z.number().int().min(1) }),
	async ({ lineId, subscriptionId, quantity }) => {
		requireStaff();
		try {
			const row = await updateSubscriptionLineQuantity(lineId, quantity);
			void getSubscriptions().refresh();
			void getSubscription(subscriptionId).refresh();
			return row;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not update the line.');
		}
	}
);

export const removeSubscriptionLineCommand = command(
	z.object({ lineId: id, subscriptionId: id }),
	async ({ lineId, subscriptionId }) => {
		requireStaff();
		try {
			await removeSubscriptionLine(lineId);
			void getSubscriptions().refresh();
			void getSubscription(subscriptionId).refresh();
			return { ok: true };
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not remove the line.');
		}
	}
);

/* Reference data for forms */
export const getCustomers = query(async () => {
	requireStaff();
	return listCustomers();
});

export const getPlans = query(async () => {
	requireStaff();
	return listPlans();
});

export const getProducts = query(async () => {
	requireStaff();
	return listProducts();
});

export const getTaxes = query(async () => {
	requireStaff();
	return listTaxes();
});

export const getQuotationTemplates = query(async () => {
	requireStaff();
	return listQuotationTemplates();
});

/* Invoices & payments */
export const getInvoices = query(async () => {
	requireStaff();
	return listInvoices();
});

export const getInvoice = query(id, async (invoiceId) => {
	requireStaff();
	const inv = await getInvoiceDetail(invoiceId);
	if (!inv) error(404, 'Invoice not found.');
	return inv;
});

export const confirmInvoiceCommand = command(id, async (invoiceId) => {
	requireStaff();
	try {
		const row = await confirmInvoice(invoiceId);
		void getInvoices().refresh();
		void getInvoice(invoiceId).refresh();
		return row;
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not confirm the invoice.');
	}
});

export const cancelInvoiceCommand = command(id, async (invoiceId) => {
	requireStaff();
	try {
		const row = await cancelInvoice(invoiceId);
		void getInvoices().refresh();
		void getInvoice(invoiceId).refresh();
		return row;
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not cancel the invoice.');
	}
});

export const sendInvoiceCommand = command(id, async (invoiceId) => {
	requireStaff();
	try {
		const row = await sendInvoice(invoiceId);
		void getInvoices().refresh();
		void getInvoice(invoiceId).refresh();
		return row;
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not send the invoice.');
	}
});

export const getPayments = query(async () => {
	requireStaff();
	return listPayments();
});

const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'upi', 'cheque', 'other'] as const;

export const recordPaymentCommand = command(
	z.object({
		invoiceId: id,
		method: z.enum(PAYMENT_METHODS),
		amount: z.number().positive(),
		paidOn: z.iso.date(),
		note: z.string().trim().max(500).nullable().optional()
	}),
	async (data) => {
		const actor = requireStaff();
		try {
			const row = await recordPayment(data, actor.id);
			void getPayments().refresh();
			void getInvoices().refresh();
			void getInvoice(data.invoiceId).refresh();
			return row;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not record the payment.');
		}
	}
);

export const deletePaymentCommand = command(id, async (paymentId) => {
	requireStaff();
	try {
		await deletePayment(paymentId);
		void getPayments().refresh();
		void getInvoices().refresh();
		return { ok: true };
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not delete the payment.');
	}
});

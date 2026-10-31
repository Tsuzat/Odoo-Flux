import { error } from '@sveltejs/kit';
import { command, getRequestEvent, query } from '$app/server';
import { z } from 'zod';
import { getDashboardData } from '#lib/server/admin/dashboard.ts';
import {
	createDiscount,
	createPlan,
	createProduct,
	createVariant,
	createTax,
	deleteDiscount,
	deletePlan,
	deleteProduct,
	deleteTax,
	deleteVariant,
	listDiscounts,
	listPlans,
	listProducts,
	listTaxes,
	updateDiscount,
	updatePlan,
	updateProduct,
	updateTax,
	updateVariant
} from '#lib/server/admin/catalog.ts';
import {
	addSubscriptionLine,
	cancelInvoice,
	confirmInvoice,
	createQuotationTemplate,
	createSubscription,
	deletePayment,
	deleteQuotationTemplate,
	deleteSubscription,
	getInvoiceDetail,
	getSubscriptionDetail,
	listInvoices,
	listPayments,
	listQuotationTemplates,
	listSubscriptions,
	recordPayment,
	removeSubscriptionLine,
	sendInvoice,
	sendOverdueReminders,
	transitionSubscription,
	updateQuotationTemplate,
	updateSubscriptionLineQuantity,
	type SubscriptionAction
} from '#lib/server/admin/operations.ts';
import { generateNextInvoice, getDueSubscriptions, runBilling } from '#lib/server/admin/billing.ts';
import {
	APP_ROLES,
	banUser,
	createStaffUser,
	listCustomers,
	listStaffUsers,
	removeUser,
	setUserRole,
	unbanUser
} from '#lib/server/admin/users.ts';
import {
	BILLING_PERIODS,
	DISCOUNT_SCOPES,
	DISCOUNT_TYPES,
	PRODUCT_TYPES
} from '#lib/server/db/schema.ts';

/**
 * Remote functions are public HTTP endpoints, so every one of them
 * re-checks the session and role on the server — the admin layout
 * guard alone is not enough.
 */
/** Row ids come from our own queries; the DB enforces referential integrity. */
const id = z.string().min(1);

function requireAdmin() {
	const { locals } = getRequestEvent();
	if (!locals.user) error(401, 'Sign in required.');
	if (locals.user.role !== 'admin') error(403, 'Admins only.');
	return locals.user;
}

/** Map a failed write (usually an FK constraint) to a readable client error. */
async function guardWrite<T>(run: () => Promise<T>, message: string): Promise<T> {
	try {
		return await run();
	} catch (cause) {
		console.error(message, cause);
		error(400, message);
	}
}

/* ───────── dashboard ───────── */

/** Finance overview for the admin dashboard (cached server-side for 60s). */
export const getDashboard = query(async () => {
	requireAdmin();
	return getDashboardData();
});

/* ───────── products & variants ───────── */

export const getProducts = query(async () => {
	requireAdmin();
	return listProducts();
});

const productInput = z.object({
	name: z.string().trim().min(1, 'Name is required.').max(120),
	type: z.enum(PRODUCT_TYPES),
	salesPrice: z.number().nonnegative('Sales price cannot be negative.'),
	costPrice: z.number().nonnegative('Cost price cannot be negative.'),
	notes: z.string().trim().max(1000).nullable().optional(),
	active: z.boolean()
});

export const createProductCommand = command(productInput, async (data) => {
	requireAdmin();
	const row = await guardWrite(
		() => createProduct(data),
		'Could not create the product. Please try again.'
	);
	void getProducts().refresh();
	void getDashboard().refresh();
	return row;
});

export const updateProductCommand = command(
	z.object({ id: id, data: productInput }),
	async ({ id, data }) => {
		requireAdmin();
		const row = await guardWrite(
			() => updateProduct(id, data),
			'Could not save the product. Please try again.'
		);
		void getProducts().refresh();
		void getDashboard().refresh();
		return row;
	}
);

export const deleteProductCommand = command(id, async (id) => {
	requireAdmin();
	await guardWrite(
		() => deleteProduct(id),
		'This product is used by subscriptions or invoices and cannot be deleted. Deactivate it instead.'
	);
	void getProducts().refresh();
	void getDashboard().refresh();
	return { ok: true };
});

const variantInput = z.object({
	attribute: z.string().trim().min(1, 'Attribute is required.').max(80),
	value: z.string().trim().min(1, 'Value is required.').max(80),
	extraPrice: z.number().nonnegative('Extra price cannot be negative.')
});

export const createVariantCommand = command(
	z.object({ productId: id, data: variantInput }),
	async ({ productId, data }) => {
		requireAdmin();
		const row = await guardWrite(
			() => createVariant(productId, data),
			'Could not add the variant — the same attribute/value may already exist for this product.'
		);
		void getProducts().refresh();
		return row;
	}
);

export const updateVariantCommand = command(
	z.object({ id: id, data: variantInput }),
	async ({ id, data }) => {
		requireAdmin();
		const row = await guardWrite(
			() => updateVariant(id, data),
			'Could not save the variant — the same attribute/value may already exist for this product.'
		);
		void getProducts().refresh();
		return row;
	}
);

export const deleteVariantCommand = command(id, async (id) => {
	requireAdmin();
	await guardWrite(
		() => deleteVariant(id),
		'This variant is used by subscriptions or templates and cannot be deleted.'
	);
	void getProducts().refresh();
	return { ok: true };
});

/* ───────── plans ───────── */

export const getPlans = query(async () => {
	requireAdmin();
	return listPlans();
});

const planInput = z.object({
	name: z.string().trim().min(1, 'Name is required.').max(120),
	price: z.number().nonnegative('Price cannot be negative.'),
	billingPeriod: z.enum(BILLING_PERIODS),
	minQuantity: z.number().int().min(0),
	validFrom: z.iso.date(),
	validTo: z.iso.date().nullable().optional(),
	autoClose: z.boolean(),
	closable: z.boolean(),
	pausable: z.boolean(),
	renewable: z.boolean(),
	active: z.boolean()
});

export const createPlanCommand = command(planInput, async (data) => {
	requireAdmin();
	const row = await guardWrite(
		() => createPlan(data),
		'Could not create the plan. Please try again.'
	);
	void getPlans().refresh();
	void getDashboard().refresh();
	return row;
});

export const updatePlanCommand = command(
	z.object({ id: id, data: planInput }),
	async ({ id, data }) => {
		requireAdmin();
		const row = await guardWrite(
			() => updatePlan(id, data),
			'Could not save the plan. Please try again.'
		);
		void getPlans().refresh();
		void getDashboard().refresh();
		return row;
	}
);

export const deletePlanCommand = command(id, async (id) => {
	requireAdmin();
	await guardWrite(
		() => deletePlan(id),
		'This plan is used by subscriptions or quotation templates and cannot be deleted. Deactivate it instead.'
	);
	void getPlans().refresh();
	void getDashboard().refresh();
	return { ok: true };
});

/* ───────── discounts ───────── */

export const getDiscounts = query(async () => {
	requireAdmin();
	return listDiscounts();
});

const discountInput = z
	.object({
		name: z.string().trim().min(1, 'Name is required.').max(120),
		type: z.enum(DISCOUNT_TYPES),
		value: z.number().positive('Value must be greater than zero.'),
		scope: z.enum(DISCOUNT_SCOPES),
		productId: id.nullable().optional(),
		minPurchase: z.number().nonnegative().nullable().optional(),
		minQuantity: z.number().int().nonnegative().nullable().optional(),
		startDate: z.iso.date(),
		endDate: z.iso.date().nullable().optional(),
		usageLimit: z.number().int().positive().nullable().optional(),
		active: z.boolean()
	})
	.superRefine((data, ctx) => {
		if (data.scope === 'product' && !data.productId) {
			ctx.addIssue({
				code: 'custom',
				path: ['productId'],
				message: 'Choose a product for a product-scoped discount.'
			});
		}
		if (data.type === 'percentage' && data.value > 100) {
			ctx.addIssue({
				code: 'custom',
				path: ['value'],
				message: 'A percentage discount cannot exceed 100.'
			});
		}
		if (data.endDate && data.endDate < data.startDate) {
			ctx.addIssue({
				code: 'custom',
				path: ['endDate'],
				message: 'End date cannot be before the start date.'
			});
		}
	});

export const createDiscountCommand = command(discountInput, async (data) => {
	requireAdmin();
	const row = await guardWrite(
		() => createDiscount(data),
		'Could not create the discount. Please try again.'
	);
	void getDiscounts().refresh();
	void getDashboard().refresh();
	return row;
});

export const updateDiscountCommand = command(
	z.object({ id: id, data: discountInput }),
	async ({ id, data }) => {
		requireAdmin();
		const row = await guardWrite(
			() => updateDiscount(id, data),
			'Could not save the discount. Please try again.'
		);
		void getDiscounts().refresh();
		void getDashboard().refresh();
		return row;
	}
);

export const deleteDiscountCommand = command(id, async (id) => {
	requireAdmin();
	await guardWrite(
		() => deleteDiscount(id),
		'This discount has already been applied to invoices and cannot be deleted. Deactivate it instead.'
	);
	void getDiscounts().refresh();
	void getDashboard().refresh();
	return { ok: true };
});

/* ───────── taxes ───────── */

export const getTaxes = query(async () => {
	requireAdmin();
	return listTaxes();
});

const taxInput = z.object({
	name: z.string().trim().min(1, 'Name is required.').max(80),
	ratePercent: z.number().min(0).max(100),
	active: z.boolean()
});

export const createTaxCommand = command(taxInput, async (data) => {
	requireAdmin();
	const row = await guardWrite(
		() => createTax(data),
		'Could not create the tax. Please try again.'
	);
	void getTaxes().refresh();
	void getDashboard().refresh();
	return row;
});

export const updateTaxCommand = command(
	z.object({ id: id, data: taxInput }),
	async ({ id, data }) => {
		requireAdmin();
		const row = await guardWrite(
			() => updateTax(id, data),
			'Could not save the tax. Please try again.'
		);
		void getTaxes().refresh();
		void getDashboard().refresh();
		return row;
	}
);

export const deleteTaxCommand = command(id, async (id) => {
	requireAdmin();
	await guardWrite(
		() => deleteTax(id),
		'This tax is used by subscription lines and cannot be deleted. Deactivate it instead.'
	);
	void getTaxes().refresh();
	void getDashboard().refresh();
	return { ok: true };
});

/* ───────── subscriptions ───────── */

export const getSubscriptions = query(async () => {
	requireAdmin();
	return listSubscriptions();
});

export const getSubscription = query(id, async (id) => {
	requireAdmin();
	const sub = await getSubscriptionDetail(id);
	if (!sub) error(404, 'Subscription not found.');
	return sub;
});

const subscriptionLineInput = z.object({
	productId: id,
	variantId: id.nullable().optional(),
	quantity: z.number().int().positive(),
	taxId: id.nullable().optional()
});

export const createSubscriptionCommand = command(
	z.object({
		customerId: id,
		planId: id,
		templateId: id.nullable().optional(),
		startDate: z.iso.date(),
		paymentTermsDays: z.number().int().min(0).max(365),
		lines: z.array(subscriptionLineInput)
	}),
	async (data) => {
		requireAdmin();
		try {
			const row = await createSubscription(data);
			void getSubscriptions().refresh();
			void getDashboard().refresh();
			return row;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not create the subscription.');
		}
	}
);

const SUBSCRIPTION_ACTIONS = [
	'send-quotation',
	'confirm',
	'activate',
	'pause',
	'resume',
	'close',
	'renew'
] as const satisfies readonly SubscriptionAction[];

export const transitionSubscriptionCommand = command(
	z.object({ id: id, action: z.enum(SUBSCRIPTION_ACTIONS) }),
	async ({ id, action }) => {
		requireAdmin();
		try {
			const row = await transitionSubscription(id, action);
			void getSubscriptions().refresh();
			void getSubscription(id).refresh();
			void getDashboard().refresh();
			return row;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not update the subscription.');
		}
	}
);

/* Subscription line editing (add-ons on/off after purchase) */

export const addSubscriptionLineCommand = command(
	z.object({ subscriptionId: id, data: subscriptionLineInput }),
	async ({ subscriptionId, data }) => {
		requireAdmin();
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
		requireAdmin();
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
		requireAdmin();
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

export const deleteSubscriptionCommand = command(id, async (id) => {
	requireAdmin();
	try {
		await deleteSubscription(id);
		void getSubscriptions().refresh();
		void getDashboard().refresh();
		return { ok: true };
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not delete the subscription.');
	}
});

/* ───────── quotation templates ───────── */

export const getQuotationTemplates = query(async () => {
	requireAdmin();
	return listQuotationTemplates();
});

const templateInput = z.object({
	name: z.string().trim().min(1, 'Name is required.').max(120),
	validityDays: z.number().int().min(1).max(365),
	planId: id,
	lines: z
		.array(
			z.object({
				productId: id,
				variantId: id.nullable().optional(),
				quantity: z.number().int().positive()
			})
		)
		.min(1, 'Add at least one product line.')
});

export const createTemplateCommand = command(templateInput, async (data) => {
	requireAdmin();
	try {
		const row = await createQuotationTemplate(data);
		void getQuotationTemplates().refresh();
		void getDashboard().refresh();
		return row;
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not create the template.');
	}
});

export const updateTemplateCommand = command(
	z.object({ id: id, data: templateInput }),
	async ({ id, data }) => {
		requireAdmin();
		try {
			const row = await updateQuotationTemplate(id, data);
			void getQuotationTemplates().refresh();
			return row;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not save the template.');
		}
	}
);

export const deleteTemplateCommand = command(id, async (id) => {
	requireAdmin();
	await guardWrite(
		() => deleteQuotationTemplate(id),
		'This template is used by subscriptions and cannot be deleted.'
	);
	void getQuotationTemplates().refresh();
	void getDashboard().refresh();
	return { ok: true };
});

/* ───────── invoices & payments ───────── */

export const getInvoices = query(async () => {
	requireAdmin();
	return listInvoices();
});

export const getInvoice = query(id, async (id) => {
	requireAdmin();
	const inv = await getInvoiceDetail(id);
	if (!inv) error(404, 'Invoice not found.');
	return inv;
});

export const confirmInvoiceCommand = command(id, async (id) => {
	requireAdmin();
	try {
		const row = await confirmInvoice(id);
		void getInvoices().refresh();
		void getInvoice(id).refresh();
		void getDashboard().refresh();
		return row;
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not confirm the invoice.');
	}
});

export const cancelInvoiceCommand = command(id, async (id) => {
	requireAdmin();
	try {
		const row = await cancelInvoice(id);
		void getInvoices().refresh();
		void getInvoice(id).refresh();
		void getDashboard().refresh();
		return row;
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not cancel the invoice.');
	}
});

export const sendInvoiceCommand = command(id, async (id) => {
	requireAdmin();
	try {
		const row = await sendInvoice(id);
		void getInvoices().refresh();
		void getInvoice(id).refresh();
		return row;
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not send the invoice.');
	}
});

/** Generate the invoice for a subscription's next unbilled period. */
export const generateInvoiceCommand = command(id, async (subscriptionId) => {
	requireAdmin();
	try {
		const result = await generateNextInvoice(subscriptionId);
		void getInvoices().refresh();
		void getSubscriptions().refresh();
		void getSubscription(subscriptionId).refresh();
		void getDashboard().refresh();
		return result;
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not generate the invoice.');
	}
});

export const getPayments = query(async () => {
	requireAdmin();
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
		const actor = requireAdmin();
		try {
			const row = await recordPayment(data, actor.id);
			void getPayments().refresh();
			void getInvoices().refresh();
			void getInvoice(data.invoiceId).refresh();
			void getDashboard().refresh();
			return row;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not record the payment.');
		}
	}
);

export const deletePaymentCommand = command(id, async (id) => {
	requireAdmin();
	try {
		await deletePayment(id);
		void getPayments().refresh();
		void getInvoices().refresh();
		void getDashboard().refresh();
		return { ok: true };
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not delete the payment.');
	}
});

/* ───────── billing run ───────── */

export const getBillingPreview = query(async () => {
	requireAdmin();
	return getDueSubscriptions(new Date().toISOString().slice(0, 10));
});

export const runBillingCommand = command(async () => {
	requireAdmin();
	const summary = await runBilling(new Date().toISOString().slice(0, 10));
	void getBillingPreview().refresh();
	void getSubscriptions().refresh();
	void getInvoices().refresh();
	void getDashboard().refresh();
	return summary;
});

/** Email payment reminders for confirmed invoices past their due date. */
export const sendOverdueRemindersCommand = command(async () => {
	requireAdmin();
	return sendOverdueReminders(new Date().toISOString().slice(0, 10));
});

/* ───────── staff & customers (Better Auth admin plugin) ───────── */

export const getStaff = query(async () => {
	requireAdmin();
	return listStaffUsers();
});

export const getCustomers = query(async () => {
	requireAdmin();
	return listCustomers();
});

function requestHeaders(): Headers {
	return getRequestEvent().request.headers;
}

export const createStaffCommand = command(
	z.object({
		name: z.string().trim().min(1).max(120),
		email: z.email(),
		password: z.string().min(6, 'Password must be more than 6 characters.'),
		role: z.enum(['admin', 'staff'])
	}),
	async (data) => {
		requireAdmin();
		try {
			const result = await createStaffUser(requestHeaders(), data);
			void getStaff().refresh();
			return result;
		} catch (e) {
			error(
				400,
				e instanceof Error
					? e.message
					: 'Could not create the user. The email may already be in use.'
			);
		}
	}
);

export const setUserRoleCommand = command(
	z.object({ userId: z.string().min(1), role: z.enum(APP_ROLES) }),
	async ({ userId, role }) => {
		const actor = requireAdmin();
		try {
			const result = await setUserRole(requestHeaders(), actor.id, userId, role);
			void getStaff().refresh();
			void getCustomers().refresh();
			return result;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not change the role.');
		}
	}
);

export const banUserCommand = command(
	z.object({
		userId: z.string().min(1),
		banReason: z.string().trim().max(500),
		banExpiresInDays: z.number().int().positive().max(3650).nullable().optional()
	}),
	async ({ userId, banReason, banExpiresInDays }) => {
		const actor = requireAdmin();
		try {
			const result = await banUser(requestHeaders(), actor.id, userId, banReason, banExpiresInDays);
			void getStaff().refresh();
			void getCustomers().refresh();
			return result;
		} catch (e) {
			error(400, e instanceof Error ? e.message : 'Could not ban the user.');
		}
	}
);

export const unbanUserCommand = command(z.string().min(1), async (userId) => {
	requireAdmin();
	try {
		const result = await unbanUser(requestHeaders(), userId);
		void getStaff().refresh();
		void getCustomers().refresh();
		return result;
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not unban the user.');
	}
});

export const removeUserCommand = command(z.string().min(1), async (userId) => {
	const actor = requireAdmin();
	try {
		const result = await removeUser(requestHeaders(), actor.id, userId);
		void getStaff().refresh();
		void getCustomers().refresh();
		void getDashboard().refresh();
		return result;
	} catch (e) {
		error(400, e instanceof Error ? e.message : 'Could not delete the user.');
	}
});

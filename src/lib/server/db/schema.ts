import { relations } from 'drizzle-orm';
import {
	pgTable,
	integer,
	text,
	pgEnum,
	boolean,
	date,
	index,
	numeric,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { account, user } from './auth.schema';

const money = (name: string) => numeric(name, { precision: 12, scale: 2 });
const createdAt = () => timestamp('created_at').defaultNow().notNull();

/** Default payment terms (days after issue) applied to new subscriptions. */
export const DEFAULT_PAYMENT_TERMS_DAYS = 15;
/** Default number of days a quotation generated from a template stays valid. */
export const DEFAULT_QUOTATION_VALIDITY_DAYS = 30;
export const billingPeriod = pgEnum('billing_period', ['daily', 'weekly', 'monthly', 'yearly']);
export const subStatus = pgEnum('subscription_status', [
	'draft',
	'quotation',
	'confirmed',
	'active',
	'paused',
	'closed'
]);
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'confirmed', 'paid', 'cancelled']);
export const discountType = pgEnum('discount_type', ['fixed', 'percentage']);
export const discountScope = pgEnum('discount_scope', ['product', 'subscription']);
export const paymentMethod = pgEnum('payment_method', [
	'cash',
	'card',
	'bank_transfer',
	'upi',
	'cheque',
	'other'
]);

export const customer = pgTable('customer', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	company: text('company'),
	phone: text('phone'),
	address: text('address'),
	createdAt: createdAt()
});

/* ───────── catalog ───────── */
export const product = pgTable('product', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	type: text('type').notNull(), // 'service' | 'goods' | 'addon' ...
	salesPrice: money('sales_price').notNull(),
	costPrice: money('cost_price').notNull().default('0'),
	notes: text('notes'),
	active: boolean('active').notNull().default(true),
	createdAt: createdAt()
});

export const productVariant = pgTable(
	'product_variant',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		productId: uuid('product_id')
			.notNull()
			.references(() => product.id, { onDelete: 'cascade' }),
		attribute: text('attribute').notNull(), // 'Brand'
		value: text('value').notNull(), // 'Acme'
		extraPrice: money('extra_price').notNull().default('0') // 560, per unit
	},
	(t) => [uniqueIndex('variant_uq').on(t.productId, t.attribute, t.value)]
);

export const tax = pgTable('tax', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	ratePercent: numeric('rate_percent', { precision: 5, scale: 2 }).notNull(),
	active: boolean('active').notNull().default(true)
});

export const plan = pgTable('plan', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	price: money('price').notNull(),
	billingPeriod: billingPeriod('billing_period').notNull(),
	minQuantity: integer('min_quantity').notNull().default(1),
	validFrom: date('valid_from', { mode: 'string' }).notNull(),
	validTo: date('valid_to', { mode: 'string' }),
	autoClose: boolean('auto_close').notNull().default(false),
	closable: boolean('closable').notNull().default(true),
	pausable: boolean('pausable').notNull().default(false),
	renewable: boolean('renewable').notNull().default(true),
	active: boolean('active').notNull().default(true),
	createdAt: createdAt()
});

/* ───────── quotation templates ───────── */
export const quotationTemplate = pgTable('quotation_template', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	validityDays: integer('validity_days').notNull().default(DEFAULT_QUOTATION_VALIDITY_DAYS),
	planId: uuid('plan_id')
		.notNull()
		.references(() => plan.id),
	createdAt: createdAt()
});

export const quotationTemplateLine = pgTable('quotation_template_line', {
	id: uuid('id').primaryKey().defaultRandom(),
	templateId: uuid('template_id')
		.notNull()
		.references(() => quotationTemplate.id, { onDelete: 'cascade' }),
	productId: uuid('product_id')
		.notNull()
		.references(() => product.id),
	variantId: uuid('variant_id').references(() => productVariant.id),
	quantity: integer('quantity').notNull().default(1)
});

/* ───────── subscriptions ───────── */
export const subscription = pgTable(
	'subscription',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		number: text('number').notNull().unique(), // SUB-000123
		customerId: uuid('customer_id')
			.notNull()
			.references(() => customer.id),
		planId: uuid('plan_id')
			.notNull()
			.references(() => plan.id),
		templateId: uuid('template_id').references(() => quotationTemplate.id),
		status: subStatus('status').notNull().default('draft'),
		startDate: date('start_date', { mode: 'string' }).notNull(),
		expiryDate: date('expiry_date', { mode: 'string' }),
		quotationValidUntil: date('quotation_valid_until', { mode: 'string' }),
		paymentTermsDays: integer('payment_terms_days').notNull().default(DEFAULT_PAYMENT_TERMS_DAYS),
		nextBillingDate: date('next_billing_date', { mode: 'string' }),
		createdBy: text('created_by').references(() => user.id),
		createdAt: createdAt(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [
		index('sub_status_idx').on(t.status),
		index('sub_customer_idx').on(t.customerId),
		index('sub_billing_idx').on(t.status, t.nextBillingDate) // billing run query
	]
);

export const subscriptionLine = pgTable(
	'subscription_line',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		subscriptionId: uuid('subscription_id')
			.notNull()
			.references(() => subscription.id, { onDelete: 'cascade' }),
		productId: uuid('product_id')
			.notNull()
			.references(() => product.id),
		variantId: uuid('variant_id').references(() => productVariant.id),
		quantity: integer('quantity').notNull(),
		unitPrice: money('unit_price').notNull(), // plan/product price + variant extra, per unit
		taxId: uuid('tax_id').references(() => tax.id),
		amount: money('amount').notNull() // qty × unitPrice, pre-tax
	},
	(t) => [index('subline_sub_idx').on(t.subscriptionId)]
);

/* ───────── discounts ───────── */
export const discount = pgTable('discount', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	type: discountType('type').notNull(),
	value: money('value').notNull(), // amount or percent
	scope: discountScope('scope').notNull(),
	productId: uuid('product_id').references(() => product.id), // when scope = 'product'
	minPurchase: money('min_purchase'),
	minQuantity: integer('min_quantity'),
	startDate: date('start_date', { mode: 'string' }).notNull(),
	endDate: date('end_date', { mode: 'string' }),
	usageLimit: integer('usage_limit'), // null = unlimited
	usedCount: integer('used_count').notNull().default(0),
	active: boolean('active').notNull().default(true),
	createdAt: createdAt()
});

/* ───────── invoices ───────── */
export const invoice = pgTable(
	'invoice',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		number: text('number').notNull().unique(), // INV-000123
		subscriptionId: uuid('subscription_id')
			.notNull()
			.references(() => subscription.id),
		customerId: uuid('customer_id')
			.notNull()
			.references(() => customer.id),
		periodStart: date('period_start', { mode: 'string' }).notNull(),
		periodEnd: date('period_end', { mode: 'string' }).notNull(),
		status: invoiceStatus('status').notNull().default('draft'),
		issueDate: date('issue_date', { mode: 'string' }).notNull(),
		dueDate: date('due_date', { mode: 'string' }).notNull(),
		subtotal: money('subtotal').notNull(),
		discountTotal: money('discount_total').notNull().default('0'),
		taxTotal: money('tax_total').notNull().default('0'),
		total: money('total').notNull(),
		amountPaid: money('amount_paid').notNull().default('0'), // denormalised, updated with each payment
		sentAt: timestamp('sent_at'),
		createdAt: createdAt()
	},
	(t) => [
		// THE duplicate-billing guard
		uniqueIndex('inv_sub_period_uq').on(t.subscriptionId, t.periodStart, t.periodEnd),
		index('inv_customer_idx').on(t.customerId),
		index('inv_status_due_idx').on(t.status, t.dueDate), // overdue + outstanding queries
		index('inv_issue_idx').on(t.issueDate)
	]
);

export const invoiceLine = pgTable(
	'invoice_line',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		invoiceId: uuid('invoice_id')
			.notNull()
			.references(() => invoice.id, { onDelete: 'cascade' }),
		productId: uuid('product_id').references(() => product.id),
		description: text('description').notNull(), // snapshot: "Plan X – Acme brand"
		quantity: integer('quantity').notNull(),
		unitPrice: money('unit_price').notNull(), // snapshot
		taxRatePercent: numeric('tax_rate_percent', { precision: 5, scale: 2 }).notNull().default('0'), // snapshot
		discountAmount: money('discount_amount').notNull().default('0'),
		taxAmount: money('tax_amount').notNull().default('0'),
		amount: money('amount').notNull() // line total after discount, before tax
	},
	(t) => [index('invline_invoice_idx').on(t.invoiceId)]
);

export const discountApplication = pgTable(
	'discount_application',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		discountId: uuid('discount_id')
			.notNull()
			.references(() => discount.id),
		invoiceId: uuid('invoice_id')
			.notNull()
			.references(() => invoice.id, { onDelete: 'cascade' }),
		amount: money('amount').notNull(),
		appliedAt: createdAt()
	},
	(t) => [uniqueIndex('discapp_uq').on(t.discountId, t.invoiceId)]
);

/* ───────── payments ───────── */
export const payment = pgTable(
	'payment',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		invoiceId: uuid('invoice_id')
			.notNull()
			.references(() => invoice.id),
		method: paymentMethod('method').notNull(),
		amount: money('amount').notNull(),
		paidOn: date('paid_on', { mode: 'string' }).notNull(),
		note: text('note'),
		recordedBy: text('recorded_by').references(() => user.id),
		createdAt: createdAt()
	},
	(t) => [index('pay_invoice_idx').on(t.invoiceId), index('pay_date_idx').on(t.paidOn)]
);

/* ───────── relations ─────────
 * ORM-level only (used by `db.query.*` relational queries in
 * `db/index.ts`); they do not change the database schema, so no
 * migration is needed for this section.
 *
 * `userRelations` here supersedes the accounts-only one exported
 * from `auth.schema.ts` (the local export wins over the `export *`
 * below), adding the billing-side relations of a user.
 */
export const userRelations = relations(user, ({ one, many }) => ({
	accounts: many(account),
	customer: one(customer, { fields: [user.id], references: [customer.userId] }),
	createdSubscriptions: many(subscription),
	recordedPayments: many(payment)
}));

export const customerRelations = relations(customer, ({ one, many }) => ({
	user: one(user, { fields: [customer.userId], references: [user.id] }),
	subscriptions: many(subscription),
	invoices: many(invoice)
}));

export const productRelations = relations(product, ({ many }) => ({
	variants: many(productVariant),
	quotationTemplateLines: many(quotationTemplateLine),
	subscriptionLines: many(subscriptionLine),
	invoiceLines: many(invoiceLine),
	discounts: many(discount)
}));

export const productVariantRelations = relations(productVariant, ({ one, many }) => ({
	product: one(product, { fields: [productVariant.productId], references: [product.id] }),
	quotationTemplateLines: many(quotationTemplateLine),
	subscriptionLines: many(subscriptionLine)
}));

export const taxRelations = relations(tax, ({ many }) => ({
	subscriptionLines: many(subscriptionLine)
}));

export const planRelations = relations(plan, ({ many }) => ({
	quotationTemplates: many(quotationTemplate),
	subscriptions: many(subscription)
}));

export const quotationTemplateRelations = relations(quotationTemplate, ({ one, many }) => ({
	plan: one(plan, { fields: [quotationTemplate.planId], references: [plan.id] }),
	lines: many(quotationTemplateLine),
	subscriptions: many(subscription)
}));

export const quotationTemplateLineRelations = relations(quotationTemplateLine, ({ one }) => ({
	template: one(quotationTemplate, {
		fields: [quotationTemplateLine.templateId],
		references: [quotationTemplate.id]
	}),
	product: one(product, { fields: [quotationTemplateLine.productId], references: [product.id] }),
	variant: one(productVariant, {
		fields: [quotationTemplateLine.variantId],
		references: [productVariant.id]
	})
}));

export const subscriptionRelations = relations(subscription, ({ one, many }) => ({
	customer: one(customer, { fields: [subscription.customerId], references: [customer.id] }),
	plan: one(plan, { fields: [subscription.planId], references: [plan.id] }),
	template: one(quotationTemplate, {
		fields: [subscription.templateId],
		references: [quotationTemplate.id]
	}),
	createdByUser: one(user, { fields: [subscription.createdBy], references: [user.id] }),
	lines: many(subscriptionLine),
	invoices: many(invoice)
}));

export const subscriptionLineRelations = relations(subscriptionLine, ({ one }) => ({
	subscription: one(subscription, {
		fields: [subscriptionLine.subscriptionId],
		references: [subscription.id]
	}),
	product: one(product, { fields: [subscriptionLine.productId], references: [product.id] }),
	variant: one(productVariant, {
		fields: [subscriptionLine.variantId],
		references: [productVariant.id]
	}),
	tax: one(tax, { fields: [subscriptionLine.taxId], references: [tax.id] })
}));

export const discountRelations = relations(discount, ({ one, many }) => ({
	product: one(product, { fields: [discount.productId], references: [product.id] }),
	applications: many(discountApplication)
}));

export const invoiceRelations = relations(invoice, ({ one, many }) => ({
	subscription: one(subscription, {
		fields: [invoice.subscriptionId],
		references: [subscription.id]
	}),
	customer: one(customer, { fields: [invoice.customerId], references: [customer.id] }),
	lines: many(invoiceLine),
	payments: many(payment),
	discountApplications: many(discountApplication)
}));

export const invoiceLineRelations = relations(invoiceLine, ({ one }) => ({
	invoice: one(invoice, { fields: [invoiceLine.invoiceId], references: [invoice.id] }),
	product: one(product, { fields: [invoiceLine.productId], references: [product.id] })
}));

export const discountApplicationRelations = relations(discountApplication, ({ one }) => ({
	discount: one(discount, {
		fields: [discountApplication.discountId],
		references: [discount.id]
	}),
	invoice: one(invoice, { fields: [discountApplication.invoiceId], references: [invoice.id] })
}));

export const paymentRelations = relations(payment, ({ one }) => ({
	invoice: one(invoice, { fields: [payment.invoiceId], references: [invoice.id] }),
	recordedByUser: one(user, { fields: [payment.recordedBy], references: [user.id] })
}));

/* ───────── enum values & literal types ───────── */
export const BILLING_PERIODS = billingPeriod.enumValues;
export type BillingPeriod = (typeof billingPeriod.enumValues)[number];

export const SUBSCRIPTION_STATUSES = subStatus.enumValues;
export type SubscriptionStatus = (typeof subStatus.enumValues)[number];

export const INVOICE_STATUSES = invoiceStatus.enumValues;
export type InvoiceStatus = (typeof invoiceStatus.enumValues)[number];

export const DISCOUNT_TYPES = discountType.enumValues;
export type DiscountType = (typeof discountType.enumValues)[number];

export const DISCOUNT_SCOPES = discountScope.enumValues;
export type DiscountScope = (typeof discountScope.enumValues)[number];

export const PAYMENT_METHODS = paymentMethod.enumValues;
export type PaymentMethod = (typeof paymentMethod.enumValues)[number];

/** Product kinds stored in `product.type` (free text at the DB level). */
export const PRODUCT_TYPES = ['service', 'goods', 'addon'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

/** Statuses picked up by the recurring billing run. */
export const BILLABLE_SUBSCRIPTION_STATUSES = [
	'active'
] as const satisfies readonly SubscriptionStatus[];
/** Statuses in which a subscription has not yet reached a terminal state. */
export const OPEN_SUBSCRIPTION_STATUSES = [
	'draft',
	'quotation',
	'confirmed',
	'active',
	'paused'
] as const satisfies readonly SubscriptionStatus[];
/** Invoice statuses that can still carry an outstanding balance. */
export const UNPAID_INVOICE_STATUSES = [
	'draft',
	'confirmed'
] as const satisfies readonly InvoiceStatus[];

/* ───────── row / insert types ───────── */
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Customer = typeof customer.$inferSelect;
export type NewCustomer = typeof customer.$inferInsert;

export type Product = typeof product.$inferSelect;
export type NewProduct = typeof product.$inferInsert;

export type ProductVariant = typeof productVariant.$inferSelect;
export type NewProductVariant = typeof productVariant.$inferInsert;

export type Tax = typeof tax.$inferSelect;
export type NewTax = typeof tax.$inferInsert;

export type Plan = typeof plan.$inferSelect;
export type NewPlan = typeof plan.$inferInsert;

export type QuotationTemplate = typeof quotationTemplate.$inferSelect;
export type NewQuotationTemplate = typeof quotationTemplate.$inferInsert;

export type QuotationTemplateLine = typeof quotationTemplateLine.$inferSelect;
export type NewQuotationTemplateLine = typeof quotationTemplateLine.$inferInsert;

export type Subscription = typeof subscription.$inferSelect;
export type NewSubscription = typeof subscription.$inferInsert;

export type SubscriptionLine = typeof subscriptionLine.$inferSelect;
export type NewSubscriptionLine = typeof subscriptionLine.$inferInsert;

export type Discount = typeof discount.$inferSelect;
export type NewDiscount = typeof discount.$inferInsert;

export type Invoice = typeof invoice.$inferSelect;
export type NewInvoice = typeof invoice.$inferInsert;

export type InvoiceLine = typeof invoiceLine.$inferSelect;
export type NewInvoiceLine = typeof invoiceLine.$inferInsert;

export type DiscountApplication = typeof discountApplication.$inferSelect;
export type NewDiscountApplication = typeof discountApplication.$inferInsert;

export type Payment = typeof payment.$inferSelect;
export type NewPayment = typeof payment.$inferInsert;

/* ───────── composite (relational query) types ───────── */
/** Product together with its variants — catalog listing/detail. */
export type ProductWithVariants = Product & { variants: ProductVariant[] };
/** Quotation template together with its lines — template editor. */
export type QuotationTemplateWithLines = QuotationTemplate & { lines: QuotationTemplateLine[] };
/** Subscription together with its lines — subscription detail page. */
export type SubscriptionWithLines = Subscription & { lines: SubscriptionLine[] };
/** Subscription with customer, plan, lines and invoices — full detail view. */
export type SubscriptionDetail = Subscription & {
	customer: Customer;
	plan: Plan;
	lines: SubscriptionLine[];
	invoices: Invoice[];
};
/** Invoice together with its (snapshot) lines — invoice view/print. */
export type InvoiceWithLines = Invoice & { lines: InvoiceLine[] };
/** Invoice with lines, payments and applied discounts — invoice detail. */
export type InvoiceDetail = Invoice & {
	lines: InvoiceLine[];
	payments: Payment[];
	discountApplications: DiscountApplication[];
};
/** Customer together with their subscriptions — customer detail page. */
export type CustomerWithSubscriptions = Customer & { subscriptions: Subscription[] };

export * from './auth.schema';

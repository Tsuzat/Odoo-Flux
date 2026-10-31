import { asc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	discount,
	plan,
	product,
	productVariant,
	tax,
	type BillingPeriod,
	type DiscountScope,
	type DiscountType,
	type ProductType
} from '#lib/server/db/schema.ts';
import { cached, deleteCached } from '../cache.ts';
import { DASHBOARD_CACHE_KEY } from './dashboard.ts';

/**
 * Admin catalog management (PDF: "An admin sets up products, plans,
 * taxes and discounts"). Lists are Redis-cached briefly; every write
 * invalidates the catalog lists and the dashboard (which shows
 * catalog counts).
 */

const PRODUCTS_KEY = 'admin:products';
const PLANS_KEY = 'admin:plans';
const DISCOUNTS_KEY = 'admin:discounts';
const TAXES_KEY = 'admin:taxes';
const LIST_TTL_SECONDS = 120;

async function invalidateCatalog(): Promise<void> {
	await Promise.all([
		deleteCached(PRODUCTS_KEY),
		deleteCached(PLANS_KEY),
		deleteCached(DISCOUNTS_KEY),
		deleteCached(TAXES_KEY),
		deleteCached(DASHBOARD_CACHE_KEY)
	]);
}

/* ───────── products & variants ───────── */

export interface ProductInput {
	name: string;
	type: ProductType;
	salesPrice: number;
	costPrice: number;
	notes?: string | null;
	active: boolean;
}

export interface VariantInput {
	attribute: string;
	value: string;
	extraPrice: number;
}

export function listProducts() {
	return cached(PRODUCTS_KEY, LIST_TTL_SECONDS, () =>
		db.query.product.findMany({
			with: { variants: true },
			orderBy: asc(product.name)
		})
	);
}

export async function createProduct(input: ProductInput) {
	const [row] = await db
		.insert(product)
		.values({
			name: input.name,
			type: input.type,
			salesPrice: String(input.salesPrice),
			costPrice: String(input.costPrice),
			notes: input.notes ?? null,
			active: input.active
		})
		.returning();
	await invalidateCatalog();
	return row;
}

export async function updateProduct(id: string, input: ProductInput) {
	const [row] = await db
		.update(product)
		.set({
			name: input.name,
			type: input.type,
			salesPrice: String(input.salesPrice),
			costPrice: String(input.costPrice),
			notes: input.notes ?? null,
			active: input.active
		})
		.where(eq(product.id, id))
		.returning();
	await invalidateCatalog();
	return row;
}

export async function deleteProduct(id: string) {
	await db.delete(product).where(eq(product.id, id));
	await invalidateCatalog();
}

export async function createVariant(productId: string, input: VariantInput) {
	const [row] = await db
		.insert(productVariant)
		.values({
			productId,
			attribute: input.attribute,
			value: input.value,
			extraPrice: String(input.extraPrice)
		})
		.returning();
	await invalidateCatalog();
	return row;
}

export async function updateVariant(id: string, input: VariantInput) {
	const [row] = await db
		.update(productVariant)
		.set({
			attribute: input.attribute,
			value: input.value,
			extraPrice: String(input.extraPrice)
		})
		.where(eq(productVariant.id, id))
		.returning();
	await invalidateCatalog();
	return row;
}

export async function deleteVariant(id: string) {
	await db.delete(productVariant).where(eq(productVariant.id, id));
	await invalidateCatalog();
}

/* ───────── plans ───────── */

export interface PlanInput {
	name: string;
	price: number;
	billingPeriod: BillingPeriod;
	minQuantity: number;
	validFrom: string;
	validTo?: string | null;
	autoClose: boolean;
	closable: boolean;
	pausable: boolean;
	renewable: boolean;
	active: boolean;
}

export function listPlans() {
	return cached(PLANS_KEY, LIST_TTL_SECONDS, () =>
		db.select().from(plan).orderBy(asc(plan.billingPeriod), asc(plan.price))
	);
}

export async function createPlan(input: PlanInput) {
	const [row] = await db
		.insert(plan)
		.values({ ...input, price: String(input.price) })
		.returning();
	await invalidateCatalog();
	return row;
}

export async function updatePlan(id: string, input: PlanInput) {
	const [row] = await db
		.update(plan)
		.set({ ...input, price: String(input.price) })
		.where(eq(plan.id, id))
		.returning();
	await invalidateCatalog();
	return row;
}

export async function deletePlan(id: string) {
	await db.delete(plan).where(eq(plan.id, id));
	await invalidateCatalog();
}

/* ───────── discounts ───────── */

export interface DiscountInput {
	name: string;
	type: DiscountType;
	value: number;
	scope: DiscountScope;
	productId?: string | null;
	minPurchase?: number | null;
	minQuantity?: number | null;
	startDate: string;
	endDate?: string | null;
	usageLimit?: number | null;
	active: boolean;
}

export function listDiscounts() {
	return cached(DISCOUNTS_KEY, LIST_TTL_SECONDS, () =>
		db.query.discount.findMany({
			with: { product: true },
			orderBy: asc(discount.name)
		})
	);
}

export async function createDiscount(input: DiscountInput) {
	const [row] = await db
		.insert(discount)
		.values({
			...input,
			value: String(input.value),
			productId: input.scope === 'product' ? (input.productId ?? null) : null,
			minPurchase: input.minPurchase != null ? String(input.minPurchase) : null
		})
		.returning();
	await invalidateCatalog();
	return row;
}

export async function updateDiscount(id: string, input: DiscountInput) {
	const [row] = await db
		.update(discount)
		.set({
			...input,
			value: String(input.value),
			productId: input.scope === 'product' ? (input.productId ?? null) : null,
			minPurchase: input.minPurchase != null ? String(input.minPurchase) : null
		})
		.where(eq(discount.id, id))
		.returning();
	await invalidateCatalog();
	return row;
}

export async function deleteDiscount(id: string) {
	await db.delete(discount).where(eq(discount.id, id));
	await invalidateCatalog();
}

/* ───────── taxes ───────── */

export interface TaxInput {
	name: string;
	ratePercent: number;
	active: boolean;
}

export function listTaxes() {
	return cached(TAXES_KEY, LIST_TTL_SECONDS, () => db.select().from(tax).orderBy(asc(tax.name)));
}

export async function createTax(input: TaxInput) {
	const [row] = await db
		.insert(tax)
		.values({ name: input.name, ratePercent: String(input.ratePercent), active: input.active })
		.returning();
	await invalidateCatalog();
	return row;
}

export async function updateTax(id: string, input: TaxInput) {
	const [row] = await db
		.update(tax)
		.set({ name: input.name, ratePercent: String(input.ratePercent), active: input.active })
		.where(eq(tax.id, id))
		.returning();
	await invalidateCatalog();
	return row;
}

export async function deleteTax(id: string) {
	await db.delete(tax).where(eq(tax.id, id));
	await invalidateCatalog();
}

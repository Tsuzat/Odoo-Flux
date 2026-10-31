import { asc, count, eq, inArray } from 'drizzle-orm';
import { auth } from '#lib/server/auth.ts';
import { db } from '#lib/server/db/index.ts';
import { customer, invoice, subscription, user } from '#lib/server/db/schema.ts';

/**
 * User management for the admin Staff and Customers pages.
 *
 * Mutations go through the Better Auth admin plugin (`auth.api.*`,
 * see https://better-auth.com/docs/plugins/admin) so password
 * hashing, session revocation on ban, and plugin bookkeeping stay
 * consistent — the plugin endpoints require the caller's session
 * headers, which the remote functions pass through.
 *
 * Lists are read straight from the DB (typed, fast, cacheable by
 * the caller if needed).
 */

export const APP_ROLES = ['admin', 'staff', 'customer'] as const;
export type AppRole = (typeof APP_ROLES)[number];

/** Internal team: admins + staff (PDF: "Only the admin can add a new member of staff"). */
export async function listStaffUsers() {
	return db
		.select()
		.from(user)
		.where(inArray(user.role, ['admin', 'staff']))
		.orderBy(asc(user.name));
}

/** Every customer account, with its login user and activity counts. */
export async function listCustomers() {
	const rows = await db
		.select({ customer, user })
		.from(customer)
		.innerJoin(user, eq(customer.userId, user.id))
		.orderBy(asc(customer.name));

	if (rows.length === 0) return [];

	const [subCounts, invCounts] = await Promise.all([
		db
			.select({ customerId: subscription.customerId, value: count() })
			.from(subscription)
			.groupBy(subscription.customerId),
		db
			.select({ customerId: invoice.customerId, value: count() })
			.from(invoice)
			.groupBy(invoice.customerId)
	]);
	const subs = new Map(subCounts.map((r) => [r.customerId, r.value]));
	const invs = new Map(invCounts.map((r) => [r.customerId, r.value]));

	return rows.map((r) => ({
		...r,
		subscriptionCount: subs.get(r.customer.id) ?? 0,
		invoiceCount: invs.get(r.customer.id) ?? 0
	}));
}

async function assertNotLastAdmin(targetId: string, actorId: string) {
	if (targetId === actorId) {
		throw new Error('You cannot perform this action on your own account.');
	}
	const target = await db.query.user.findFirst({ where: eq(user.id, targetId) });
	if (!target) throw new Error('User not found.');
	if (target.role === 'admin') {
		const [{ value }] = await db
			.select({ value: count() })
			.from(user)
			.where(eq(user.role, 'admin'));
		if (value <= 1) throw new Error('You cannot remove or demote the last admin.');
	}
	return target;
}

/** Create a staff/admin login (Better Auth hashes the password). */
export async function createStaffUser(
	headers: Headers,
	input: { name: string; email: string; password: string; role: 'admin' | 'staff' }
) {
	const result = await auth.api.createUser({
		body: {
			name: input.name,
			email: input.email,
			password: input.password,
			role: input.role
		},
		headers
	});
	return result;
}

export async function setUserRole(
	headers: Headers,
	actorId: string,
	userId: string,
	role: AppRole
) {
	await assertNotLastAdmin(userId, actorId);
	return auth.api.setRole({ body: { userId, role }, headers });
}

/** Ban with a reason; the plugin revokes all of the user's sessions. */
export async function banUser(
	headers: Headers,
	actorId: string,
	userId: string,
	banReason: string,
	banExpiresInDays?: number | null
) {
	await assertNotLastAdmin(userId, actorId);
	return auth.api.banUser({
		body: {
			userId,
			banReason: banReason || undefined,
			banExpiresIn: banExpiresInDays ? banExpiresInDays * 24 * 60 * 60 : undefined
		},
		headers
	});
}

export async function unbanUser(headers: Headers, userId: string) {
	return auth.api.unbanUser({ body: { userId }, headers });
}

/** Hard-delete a user (cascades to their customer record and accounts). */
export async function removeUser(headers: Headers, actorId: string, userId: string) {
	await assertNotLastAdmin(userId, actorId);
	return auth.api.removeUser({ body: { userId }, headers });
}

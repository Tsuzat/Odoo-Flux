import { ORIGIN, BETTER_AUTH_SECRET } from '$app/env/private';

import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { admin } from 'better-auth/plugins';
import { db } from '#lib/server/db/index.ts';
import { redis } from 'bun';
import { sendEmail, type EmailTemplate } from './email/index.ts';
import {
	getPasswordResetTemplate,
	getExistingUserSignupTemplate,
	getSignupVerificationTemplate
} from './email/templates';
import { customer } from './db/schema.ts';

/**
 * Fire-and-forget delivery for auth emails. Not awaiting keeps the
 * response time independent of the mail provider (which would
 * otherwise leak whether an account exists); errors are logged
 * instead of failing the auth request.
 */
/** App icon served from `static/` in production, used in email headers. */
const appIconUrl = new URL('/favicon.svg', ORIGIN).toString();

function sendAuthEmail(to: string, subject: string, template: EmailTemplate): void {
	void sendEmail(to, subject, template).catch((error: unknown) => {
		console.error(`Failed to send "${subject}" email to ${to}`, error);
	});
}

export const auth = betterAuth({
	appName: 'Brightloop Software',
	baseURL: ORIGIN,
	secret: BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	rateLimit: {
		window: 60,
		max: 100,
		enabled: true,
		storage: 'secondary-storage',
		customRules: {
			'/sign-in/email': {
				window: 10,
				max: 3
			},
			'/sign-up/email': {
				window: 10,
				max: 3
			},
			'/forget-password': {
				window: 10,
				max: 3
			},
			'/reset-password': {
				window: 10,
				max: 3
			},
			'/send-verification-email': {
				window: 10,
				max: 3
			}
		}
	},
	secondaryStorage: {
		get: async (key) => {
			return await redis.get(key);
		},
		set: async (key, value, ttl) => {
			if (ttl) await redis.set(key, value, 'EX', ttl.toString());
			else await redis.set(key, value);
		},
		delete: async (key) => {
			await redis.del(key);
		},
		getAndDelete: async (key) => {
			return await redis.getdel(key);
		},
		increment: async (key, ttl) => {
			const count = await redis.incr(key);
			if (count === 1 && ttl) {
				await redis.expire(key, ttl);
			}
			return count;
		}
	},
	trustedOrigins: [ORIGIN.replace('www', '*'), ORIGIN],
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		revokeSessionsOnPasswordReset: true,
		// Keep in sync with the "expires in 1 hour" copy in the email templates.
		resetPasswordTokenExpiresIn: 60 * 60,
		sendResetPassword: async ({ user, url }) => {
			sendAuthEmail(
				user.email,
				'Reset your password',
				getPasswordResetTemplate({ url, name: user.name, iconUrl: appIconUrl })
			);
		},
		// NOTE: `onExistingUserSignUp` belongs to `emailAndPassword`, not
		// `emailVerification` — under the latter it is silently ignored.
		// It only fires when `requireEmailVerification` is true (above).
		onExistingUserSignUp: async ({ user }) => {
			sendAuthEmail(
				user.email,
				'Sign-up attempt with your email',
				getExistingUserSignupTemplate({
					name: user.name,
					signInUrl: new URL('/signin', ORIGIN).toString(),
					iconUrl: appIconUrl
				})
			);
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		// Keep in sync with the "expires in 1 hour" copy in the email templates.
		expiresIn: 60 * 60,
		sendVerificationEmail: async ({ user, url }) => {
			sendAuthEmail(
				user.email,
				'Verify your email address',
				getSignupVerificationTemplate({ url, name: user.name, iconUrl: appIconUrl })
			);
		}
	},
	databaseHooks: {
		user: {
			create: {
				after: async (u) => {
					if (u.role && u.role !== 'customer') return; // skip staff/admin
					await db.insert(customer).values({ userId: u.id, name: u.name }).onConflictDoNothing();
				}
			}
		}
	},
	plugins: [
		admin({ defaultRole: 'customer', adminRoles: ['admin'] }),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});

export type AuthSession = typeof auth.$Infer.Session;

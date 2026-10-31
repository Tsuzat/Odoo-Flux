import { redis } from 'bun';

/**
 * Thin JSON cache over the same Redis/Valkey client Better Auth uses
 * for secondary storage (`auth.ts`). Every operation is best-effort:
 * a cache outage must never fail a request, it just falls back to
 * hitting the database.
 */

const PREFIX = 'brightloop:cache:';

export async function getCached<T>(key: string): Promise<T | null> {
	try {
		const raw = await redis.get(PREFIX + key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

export async function setCached(key: string, value: unknown, ttlSeconds: number): Promise<void> {
	try {
		await redis.set(PREFIX + key, JSON.stringify(value), 'EX', ttlSeconds.toString());
	} catch {
		// Cache is an optimisation only — ignore write failures.
	}
}

export async function deleteCached(key: string): Promise<void> {
	try {
		await redis.del(PREFIX + key);
	} catch {
		// Ignore — stale entries expire via TTL.
	}
}

/** Read-through cache: return the cached value, or compute, store and return it. */
export async function cached<T>(
	key: string,
	ttlSeconds: number,
	loader: () => Promise<T>
): Promise<T> {
	const hit = await getCached<T>(key);
	if (hit !== null) return hit;
	const value = await loader();
	await setCached(key, value, ttlSeconds);
	return value;
}

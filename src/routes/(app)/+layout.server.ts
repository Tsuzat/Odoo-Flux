import { redirect } from '@sveltejs/kit';
import type { User } from '#lib/server/db/auth.schema.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { user, session }, url }) => {
	if (!user || !session) {
		throw redirect(302, '/signin?next=' + encodeURIComponent(url.toString()));
	}

	// The Better Auth session user marks profile fields optional, while
	// the `User` row type uses `| null` — normalise once here so the
	// app shell (sidebar, header) can rely on the row shape.
	const appUser: User = {
		...user,
		image: user.image ?? null,
		role: user.role ?? null,
		banned: user.banned ?? null,
		banReason: user.banReason ?? null,
		banExpires: user.banExpires ?? null
	};

	return { user: appUser, session };
};

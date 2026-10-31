<script lang="ts">
	import * as Sidebar from '#lib/components/ui/sidebar/index.ts';
	import AppSidebar from '#lib/components/custom/sidebar/app-sidebar.svelte';
	import type { User } from '#lib/server/db/auth.schema.ts';

	const user: User = {
		id: '1',
		name: 'Alok Singh',
		email: 'alok@brightloop.software',
		emailVerified: true,
		image: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		role: 'admin',
		banned: false,
		banReason: null,
		banExpires: null
	};
</script>

<Sidebar.Provider>
	<AppSidebar {user} />
	<Sidebar.Inset>
		<header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
			<Sidebar.Trigger />
			<span class="font-medium">Footer menu preview</span>
		</header>
		<div class="p-4 text-muted-foreground">Preview content</div>
	</Sidebar.Inset>
</Sidebar.Provider>

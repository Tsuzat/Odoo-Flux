<script lang="ts">
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import AppSidebar from '#lib/components/custom/sidebar/app-sidebar.svelte';
	const { data, children } = $props();
</script>

<Sidebar.Provider>
	<AppSidebar user={data.user} />
	<Sidebar.Inset class="p-4">
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>

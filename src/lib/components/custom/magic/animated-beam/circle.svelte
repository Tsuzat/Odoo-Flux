<script lang="ts">
	import { cn } from '#lib/utils.ts';
	import type { Snippet } from 'svelte';
	import * as Tooltip from '#lib/components/ui/tooltip/index.ts';

	interface Props {
		class?: string;
		ref: HTMLDivElement | null;
		content: string;
		children?: Snippet<[]>;
	}

	let { class: className = '', ref = $bindable(), children, content }: Props = $props();
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger
			bind:ref
			class={cn(
				'z-10 flex size-14 cursor-pointer items-center justify-center rounded-xl border bg-background p-2 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] transition-all duration-200 dark:hover:border-primary',
				className
			)}
		>
			{@render children?.()}
		</Tooltip.Trigger>
		<Tooltip.Content>
			{content}
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>

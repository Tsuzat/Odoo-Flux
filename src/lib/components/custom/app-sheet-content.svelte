<script lang="ts">
	import { Dialog as SheetPrimitive } from 'bits-ui';
	import XIcon from '@lucide/svelte/icons/x';
	import Maximize2Icon from '@lucide/svelte/icons/maximize-2';
	import Minimize2Icon from '@lucide/svelte/icons/minimize-2';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { SheetOverlay, SheetPortal } from '#lib/components/ui/sheet/index.ts';
	import { cn, type WithoutChildrenOrChild } from '#lib/utils.ts';
	import type { Snippet } from 'svelte';
	import type { ComponentProps } from 'svelte';

	/**
	 * Drop-in replacement for `Sheet.Content` (right side) used across
	 * the app.
	 *
	 * Desktop: the panel floats — inset from the screen edges, rounded,
	 * slightly wider than stock — and an expand toggle (top right, next
	 * to the close button) transitions it to a centered panel
	 * (max-w-3xl, 90dvh tall). Both states are expressed with explicit
	 * `left / top / width / height` lengths (plus the `translate`
	 * property for centering), so every geometric property transitions
	 * together — no snapping or dancing.
	 *
	 * Scrolling happens in an inner wrapper clipped by the panel's
	 * rounded corners (`overflow-hidden`), so the corners stay rounded
	 * even while content scrolls.
	 *
	 * Mobile: keeps the default full-height sheet; the toggle is hidden.
	 */
	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		...restProps
	}: WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof SheetPortal>>;
		children: Snippet;
	} = $props();

	let expanded = $state(false);
</script>

<SheetPortal {...portalProps}>
	<SheetOverlay />
	<SheetPrimitive.Content
		bind:ref
		data-slot="sheet-content"
		data-side="right"
		class={cn(
			'fixed inset-y-0 right-0 z-50 flex h-full w-3/4 flex-col gap-4 overflow-hidden border-l bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition-all duration-300 ease-in-out outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-right-10 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-right-10',
			// Floating docked panel (desktop): explicit geometry.
			'sm:top-4 sm:right-auto sm:bottom-auto sm:left-[calc(100vw-31rem)] sm:h-[calc(100dvh-2rem)] sm:w-120 sm:rounded-xl sm:border sm:shadow-2xl',
			// Centered expanded panel: same properties, all length values.
			expanded &&
				'sm:top-1/2 sm:left-1/2 sm:h-[90dvh] sm:w-[min(48rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2',
			className
		)}
		{...restProps}
	>
		<Button
			variant="ghost"
			size="icon-sm"
			class="absolute top-4 right-14 z-10 hidden shrink-0 sm:inline-flex"
			onclick={() => (expanded = !expanded)}
			aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
			title={expanded ? 'Collapse panel' : 'Expand panel'}
		>
			{#if expanded}
				<Minimize2Icon />
			{:else}
				<Maximize2Icon />
			{/if}
		</Button>
		<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
			{@render children?.()}
		</div>
		<SheetPrimitive.Close data-slot="sheet-close">
			{#snippet child({ props })}
				<Button variant="ghost" class="absolute top-4 right-4 shrink-0" size="icon-sm" {...props}>
					<XIcon />
					<span class="sr-only">Close</span>
				</Button>
			{/snippet}
		</SheetPrimitive.Close>
	</SheetPrimitive.Content>
</SheetPortal>

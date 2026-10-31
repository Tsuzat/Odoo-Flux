<script lang="ts">
	import { cn } from '#lib/utils.ts';
	import { resolve } from '$app/paths';
	import { slide } from 'svelte/transition';

	interface Props {
		size?: number;
		showLogo?: boolean;
		logo?: string;
		class?: string;
	}

	let { size = 2.5, showLogo = true, logo = 'Brightloop', class: className = '' }: Props = $props();
</script>

<a class={cn('logo nodefault flex items-center', className)} href={resolve('/')}>
	<div class="relative" style={`width: ${size}rem; height: ${size}rem`}>
		<div class="rect"></div>
		<div class="rect blur-rect absolute bg-primary/50! backdrop-blur-[2px]"></div>
	</div>
	{#if showLogo}
		<div transition:slide={{ axis: 'x' }} class="ml-4 hidden text-2xl font-bold sm:block">
			{logo}
		</div>
	{/if}
</a>

<style>
	.rect {
		position: absolute;
		width: 70%;
		height: 70%;
		z-index: 0;
		background: var(--color-primary);
		border: 1px solid var(--color-primary);
		box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
		transform: translate(10%, 10%);
		border-radius: var(--radius-sm);
		transition: all 500ms ease;
	}

	.blur-rect {
		z-index: 1;
		transform: translate(30%, 30%);
		box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.5);
	}

	.logo:hover .rect {
		transform: translate(5%, 5%);
	}

	.logo:hover .blur-rect {
		transform: translate(35%, 35%);
	}

	.logo:active .rect {
		transform: translate(10%, 10%);
	}

	.logo:active .blur-rect {
		transform: translate(30%, 30%);
	}
</style>

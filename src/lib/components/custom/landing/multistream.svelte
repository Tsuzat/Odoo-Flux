<script lang="ts">
	import { AnimatedBeam, Circle } from '#lib/components/custom/index.ts';
	import Building2 from '@lucide/svelte/icons/building-2';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Headphones from '@lucide/svelte/icons/headphones';
	import Package from '@lucide/svelte/icons/package';
	import Users from '@lucide/svelte/icons/users';
	import { cn } from '#lib/utils.ts';

	const { class: className }: { class?: string } = $props();

	let containerRef: HTMLDivElement | null = $state(null);
	let div1Ref: HTMLDivElement | null = $state(null);
	let div2Ref: HTMLDivElement | null = $state(null);
	let div3Ref: HTMLDivElement | null = $state(null);
	let div4Ref: HTMLDivElement | null = $state(null);
	let div5Ref: HTMLDivElement | null = $state(null);
	let div6Ref: HTMLDivElement | null = $state(null);
	let div7Ref: HTMLDivElement | null = $state(null);
</script>

<div
	class={cn(
		'relative flex h-96 w-full items-center justify-center overflow-hidden border p-10',
		className
	)}
	bind:this={containerRef}
>
	<div class="flex size-full max-w-lg flex-row items-stretch justify-between gap-10">
		<div class="flex flex-col justify-center gap-2">
			<Circle bind:ref={div1Ref} content="Billing">
				<CreditCard class="size-5 text-primary" aria-hidden="true" />
			</Circle>
			<Circle bind:ref={div2Ref} content="CRM">
				<Users class="size-5 text-primary" aria-hidden="true" />
			</Circle>
			<Circle bind:ref={div3Ref} content="Inventory">
				<Package class="size-5 text-primary" aria-hidden="true" />
			</Circle>
			<Circle bind:ref={div4Ref} content="Analytics">
				<ChartColumn class="size-5 text-primary" aria-hidden="true" />
			</Circle>
			<Circle bind:ref={div5Ref} content="Support">
				<Headphones class="size-5 text-primary" aria-hidden="true" />
			</Circle>
		</div>
		<div class="flex flex-col justify-center">
			<Circle bind:ref={div6Ref} content="Brightloop">
				<div class="relative size-9" aria-hidden="true">
					<div
						class="absolute top-[10%] left-[10%] size-[70%] rounded-sm bg-primary shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
					></div>
					<div
						class="absolute top-[30%] left-[30%] size-[70%] rounded-sm bg-primary/50 shadow-[0_4px_4px_rgba(0,0,0,0.35)] backdrop-blur-[2px]"
					></div>
				</div>
			</Circle>
		</div>
		<div class="flex flex-col justify-center">
			<Circle bind:ref={div7Ref} content="Your business">
				<Building2 class="size-5 text-primary" aria-hidden="true" />
			</Circle>
		</div>
	</div>

	<AnimatedBeam {containerRef} fromRef={div1Ref} toRef={div6Ref} />
	<AnimatedBeam {containerRef} fromRef={div2Ref} toRef={div6Ref} />
	<AnimatedBeam {containerRef} fromRef={div3Ref} toRef={div6Ref} />
	<AnimatedBeam {containerRef} fromRef={div4Ref} toRef={div6Ref} />
	<AnimatedBeam {containerRef} fromRef={div5Ref} toRef={div6Ref} />
	<AnimatedBeam {containerRef} fromRef={div6Ref} toRef={div7Ref} />
</div>

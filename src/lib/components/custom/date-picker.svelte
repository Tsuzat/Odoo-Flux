<script lang="ts">
	import { Calendar } from '#lib/components/ui/calendar/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { parseDate, type DateValue } from '@internationalized/date';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import { formatDate } from '#lib/index.ts';
	import { cn } from '#lib/utils.ts';

	/**
	 * shadcn-svelte Calendar in a popover, bound to a `YYYY-MM-DD`
	 * string so it drops into existing form state (and the API
	 * payloads) without conversion at submit time.
	 */
	interface Props {
		value?: string;
		id?: string;
		placeholder?: string;
		/** Show a "Clear date" action (for optional dates). */
		clearable?: boolean;
		disabled?: boolean;
		class?: string;
	}

	let {
		value = $bindable(''),
		id,
		placeholder = 'Pick a date',
		clearable = false,
		disabled = false,
		class: className
	}: Props = $props();

	let open = $state(false);

	function safeParse(v: string): DateValue | undefined {
		try {
			return parseDate(v);
		} catch {
			return undefined;
		}
	}

	const selected = $derived<DateValue | undefined>(value ? safeParse(value) : undefined);

	function onSelect(next: DateValue | undefined) {
		value = next ? next.toString() : '';
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				{id}
				type="button"
				variant="outline"
				{disabled}
				class={cn(
					'w-full justify-start text-left font-normal',
					!value && 'text-muted-foreground',
					className
				)}
			>
				<CalendarIcon data-icon="inline-start" />
				{value ? formatDate(value) : placeholder}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0" align="start">
		<Calendar type="single" value={selected} onValueChange={onSelect} />
		{#if clearable && value}
			<div class="border-t p-2">
				<Button
					variant="ghost"
					size="sm"
					class="w-full"
					onclick={() => {
						value = '';
						open = false;
					}}
				>
					Clear date
				</Button>
			</div>
		{/if}
	</Popover.Content>
</Popover.Root>

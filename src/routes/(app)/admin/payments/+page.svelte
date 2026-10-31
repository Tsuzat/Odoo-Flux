<script lang="ts">
	import {
		deletePaymentCommand,
		getInvoices,
		getPayments,
		recordPaymentCommand
	} from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';
	import { BarSpinner } from '#lib/components/custom/index.ts';

	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	type PaymentRow = NonNullable<typeof payments.current>[number];
	type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'upi' | 'cheque' | 'other';

	const payments = getPayments();
	const invoices = getInvoices();

	const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
		{ value: 'cash', label: 'Cash' },
		{ value: 'card', label: 'Card' },
		{ value: 'bank_transfer', label: 'Bank transfer' },
		{ value: 'upi', label: 'UPI' },
		{ value: 'cheque', label: 'Cheque' },
		{ value: 'other', label: 'Other' }
	];

	const openInvoices = $derived(
		(invoices.current ?? []).filter(
			(i) => i.status === 'confirmed' && Number(i.amountPaid) < Number(i.total)
		)
	);

	let sheetOpen = $state(false);
	let form = $state<{
		invoiceId: string;
		method: PaymentMethod;
		amount: number | undefined;
		paidOn: string;
		note: string;
	}>({
		invoiceId: '',
		method: 'bank_transfer',
		amount: undefined,
		paidOn: new Date().toISOString().slice(0, 10),
		note: ''
	});
	let saving = $state(false);
	let deleteTarget = $state<PaymentRow | null>(null);
	let deleting = $state(false);

	function openCreate(invoiceId = '') {
		form = {
			invoiceId,
			method: 'bank_transfer',
			amount: undefined,
			paidOn: new Date().toISOString().slice(0, 10),
			note: ''
		};
		sheetOpen = true;
	}

	async function save() {
		if (!form.invoiceId || form.amount == null || !(form.amount > 0) || !form.paidOn) {
			toast.error('Choose an invoice and enter an amount and date.');
			return;
		}
		saving = true;
		try {
			await recordPaymentCommand({
				invoiceId: form.invoiceId,
				method: form.method,
				amount: form.amount,
				paidOn: form.paidOn,
				note: form.note.trim() || null
			});
			toast.success('Payment recorded.');
			sheetOpen = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not record the payment.');
		} finally {
			saving = false;
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			await deletePaymentCommand(deleteTarget.id);
			toast.success('Payment deleted.');
			deleteTarget = null;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not delete the payment.');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Payments — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				<SidebarTrigger class="mr-4" />
				Payments
			</h1>
			<p class="text-sm text-muted-foreground">
				Money in, matched to the right invoice — no more scrolling bank statements.
			</p>
		</div>
		<Button onclick={() => openCreate()} disabled={openInvoices.length === 0}>
			<PlusIcon data-icon="inline-start" />
			Record payment
		</Button>
	</div>

	{#if payments.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load payments
				</Card.Title>
				<Card.Description>{payments.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => payments.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !payments.current}
		<Skeleton class="h-96" aria-label="Loading payments" />
	{:else if payments.current.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No payments yet</p>
				<p class="text-sm text-muted-foreground">
					Payments you record against confirmed invoices will appear here.
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Date</Table.Head>
							<Table.Head>Invoice</Table.Head>
							<Table.Head>Customer</Table.Head>
							<Table.Head>Method</Table.Head>
							<Table.Head>Note</Table.Head>
							<Table.Head class="text-right">Amount</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each payments.current as p (p.id)}
							<Table.Row>
								<Table.Cell>{formatDate(p.paidOn)}</Table.Cell>
								<Table.Cell class="font-medium">{p.invoice.number}</Table.Cell>
								<Table.Cell>{p.invoice.customer.name}</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">{humanize(p.method)}</Badge>
								</Table.Cell>
								<Table.Cell class="max-w-48 truncate text-muted-foreground">
									{p.note ?? '—'}
								</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(p.amount)}</Table.Cell>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button {...props} variant="ghost" size="icon" aria-label="Payment actions">
													<EllipsisIcon />
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Group>
												<DropdownMenu.Item variant="destructive" onclick={() => (deleteTarget = p)}>
													<Trash2Icon />
													Delete
												</DropdownMenu.Item>
											</DropdownMenu.Group>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<Sheet.Root bind:open={sheetOpen}>
	<Sheet.Content class="overflow-y-auto sm:max-w-md">
		<Sheet.Header>
			<Sheet.Title>Record payment</Sheet.Title>
			<Sheet.Description>
				Payments update the invoice balance; a fully paid invoice flips to Paid automatically.
			</Sheet.Description>
		</Sheet.Header>
		<form
			class="flex flex-col gap-5 px-4 pb-6"
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<Field.FieldGroup>
				<Field.Field>
					<Field.FieldLabel for="pay-invoice">Invoice</Field.FieldLabel>
					<Select.Root
						type="single"
						value={form.invoiceId}
						onValueChange={(v) => (form.invoiceId = v)}
					>
						<Select.Trigger id="pay-invoice" class="w-full">
							{openInvoices.find((i) => i.id === form.invoiceId)
								? `${openInvoices.find((i) => i.id === form.invoiceId)?.number} — ${openInvoices.find((i) => i.id === form.invoiceId)?.customer.name}`
								: 'Select invoice'}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each openInvoices as i (i.id)}
									<Select.Item
										value={i.id}
										label={`${i.number} — ${i.customer.name} (${formatCurrency(Number(i.total) - Number(i.amountPaid))} due)`}
									/>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</Field.Field>
				<div class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.FieldLabel for="pay-method">Method</Field.FieldLabel>
						<Select.Root
							type="single"
							value={form.method}
							onValueChange={(v) => (form.method = v as PaymentMethod)}
						>
							<Select.Trigger id="pay-method" class="w-full">
								{METHOD_OPTIONS.find((o) => o.value === form.method)?.label}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									{#each METHOD_OPTIONS as o (o.value)}
										<Select.Item value={o.value} label={o.label} />
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="pay-amount">Amount (₹)</Field.FieldLabel>
						<Input
							id="pay-amount"
							type="number"
							min="0"
							step="0.01"
							bind:value={form.amount}
							required
						/>
					</Field.Field>
				</div>
				<Field.Field>
					<Field.FieldLabel for="pay-date">Paid on</Field.FieldLabel>
					<Input id="pay-date" type="date" bind:value={form.paidOn} required />
				</Field.Field>
				<Field.Field>
					<Field.FieldLabel for="pay-note">Note (optional)</Field.FieldLabel>
					<Textarea id="pay-note" bind:value={form.note} placeholder="UPI ref, cheque no…" />
				</Field.Field>
			</Field.FieldGroup>
			<Sheet.Footer class="px-0">
				<Button type="submit" disabled={saving}>
					{#if saving}<BarSpinner role="status" aria-label="Saving" />{/if}
					Record payment
				</Button>
				<Sheet.Close>
					{#snippet child({ props })}
						<Button {...props} variant="outline" type="button">Cancel</Button>
					{/snippet}
				</Sheet.Close>
			</Sheet.Footer>
		</form>
	</Sheet.Content>
</Sheet.Root>

<AlertDialog.Root
	open={deleteTarget !== null}
	onOpenChange={(open) => {
		if (!open) deleteTarget = null;
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete this payment?</AlertDialog.Title>
			<AlertDialog.Description>
				The invoice balance will be recalculated; a paid invoice may go back to outstanding.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-white hover:bg-destructive/90"
				disabled={deleting}
				onclick={confirmDelete}
			>
				{#if deleting}<BarSpinner role="status" aria-label="Deleting" />{/if}
				Delete
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

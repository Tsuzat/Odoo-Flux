<script lang="ts">
	import {
		cancelInvoiceCommand,
		confirmInvoiceCommand,
		getInvoice,
		getInvoices,
		recordPaymentCommand,
		sendInvoiceCommand
	} from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import AppSheetContent from '#lib/components/custom/app-sheet-content.svelte';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';
	import { BarSpinner } from '#lib/components/custom/index.ts';
	import DatePicker from '#lib/components/custom/date-picker.svelte';

	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import MailIcon from '@lucide/svelte/icons/mail';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CircleXIcon from '@lucide/svelte/icons/circle-x';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	type InvoiceRow = NonNullable<typeof invoices.current>[number];
	type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'upi' | 'cheque' | 'other';

	const invoices = getInvoices();

	const STATUS_BADGE: Record<string, BadgeVariant> = {
		draft: 'outline',
		confirmed: 'secondary',
		paid: 'default',
		cancelled: 'destructive'
	};

	const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
		{ value: 'cash', label: 'Cash' },
		{ value: 'card', label: 'Card' },
		{ value: 'bank_transfer', label: 'Bank transfer' },
		{ value: 'upi', label: 'UPI' },
		{ value: 'cheque', label: 'Cheque' },
		{ value: 'other', label: 'Other' }
	];

	let statusFilter = $state('all');
	let selectedId = $state<string | null>(null);
	const detail = $derived(selectedId ? getInvoice(selectedId) : null);

	const filtered = $derived(
		(invoices.current ?? []).filter((i) => statusFilter === 'all' || i.status === statusFilter)
	);

	const todayStr = new Date().toISOString().slice(0, 10);
	const isOverdue = (i: InvoiceRow) =>
		(i.status === 'draft' || i.status === 'confirmed') && i.dueDate < todayStr;

	let payForm = $state<{ method: PaymentMethod; amount: number | undefined; paidOn: string }>({
		method: 'bank_transfer',
		amount: undefined,
		paidOn: todayStr
	});
	let paying = $state(false);
	let acting = $state<string | null>(null);

	async function act(id: string, action: 'confirm' | 'cancel' | 'send') {
		acting = `${action}-${id}`;
		try {
			if (action === 'confirm') await confirmInvoiceCommand(id);
			else if (action === 'cancel') await cancelInvoiceCommand(id);
			else await sendInvoiceCommand(id);
			toast.success(
				action === 'confirm'
					? 'Invoice confirmed.'
					: action === 'cancel'
						? 'Invoice cancelled.'
						: 'Invoice sent to the customer.'
			);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Action failed.');
		} finally {
			acting = null;
		}
	}

	async function recordPayment(invoiceId: string) {
		if (payForm.amount == null || !(payForm.amount > 0)) {
			toast.error('Enter a payment amount.');
			return;
		}
		paying = true;
		try {
			await recordPaymentCommand({
				invoiceId,
				method: payForm.method,
				amount: payForm.amount,
				paidOn: payForm.paidOn,
				note: null
			});
			toast.success('Payment recorded.');
			payForm = { method: 'bank_transfer', amount: undefined, paidOn: todayStr };
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not record the payment.');
		} finally {
			paying = false;
		}
	}
</script>

<svelte:head>
	<title>Invoices — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				<SidebarTrigger class="mr-4" />
				Invoices
			</h1>
			<p class="text-sm text-muted-foreground">
				Generated from subscriptions on billing day — confirm, send, and track what's paid.
			</p>
		</div>
		<Select.Root type="single" value={statusFilter} onValueChange={(v) => (statusFilter = v)}>
			<Select.Trigger class="w-44">
				{statusFilter === 'all' ? 'All statuses' : humanize(statusFilter)}
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.Item value="all" label="All statuses" />
					<Select.Item value="draft" label="Draft" />
					<Select.Item value="confirmed" label="Confirmed" />
					<Select.Item value="paid" label="Paid" />
					<Select.Item value="cancelled" label="Cancelled" />
				</Select.Group>
			</Select.Content>
		</Select.Root>
	</div>

	{#if invoices.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load invoices
				</Card.Title>
				<Card.Description>{invoices.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => invoices.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !invoices.current}
		<Skeleton class="h-96" aria-label="Loading invoices" />
	{:else if filtered.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No invoices found</p>
				<p class="text-sm text-muted-foreground">
					Run billing to generate invoices for due subscriptions.
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Number</Table.Head>
							<Table.Head>Customer</Table.Head>
							<Table.Head>Subscription</Table.Head>
							<Table.Head>Period</Table.Head>
							<Table.Head>Due</Table.Head>
							<Table.Head class="text-right">Total</Table.Head>
							<Table.Head class="text-right">Paid</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filtered as inv (inv.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{inv.number}</Table.Cell>
								<Table.Cell>{inv.customer.name}</Table.Cell>
								<Table.Cell>{inv.subscription.number}</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
								</Table.Cell>
								<Table.Cell class={isOverdue(inv) ? 'font-medium text-destructive' : ''}>
									{formatDate(inv.dueDate)}
									{#if isOverdue(inv)}<Badge variant="destructive" class="ml-1">Overdue</Badge>{/if}
								</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(inv.total)}</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(inv.amountPaid)}</Table.Cell>
								<Table.Cell>
									<Badge variant={STATUS_BADGE[inv.status] ?? 'outline'}>
										{humanize(inv.status)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button {...props} variant="ghost" size="icon" aria-label="Invoice actions">
													<EllipsisIcon />
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Group>
												<DropdownMenu.Item onclick={() => (selectedId = inv.id)}>
													<EyeIcon />
													View
												</DropdownMenu.Item>
												{#if inv.status === 'draft'}
													<DropdownMenu.Item onclick={() => act(inv.id, 'confirm')}>
														<CircleCheckIcon />
														Confirm
													</DropdownMenu.Item>
												{/if}
												{#if inv.status === 'confirmed'}
													<DropdownMenu.Item onclick={() => act(inv.id, 'send')}>
														<MailIcon />
														Send to customer
													</DropdownMenu.Item>
												{/if}
												{#if inv.status !== 'paid' && inv.status !== 'cancelled'}
													<DropdownMenu.Separator />
													<DropdownMenu.Item
														variant="destructive"
														onclick={() => act(inv.id, 'cancel')}
													>
														<CircleXIcon />
														Cancel
													</DropdownMenu.Item>
												{/if}
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

<Sheet.Root
	open={selectedId !== null}
	onOpenChange={(open) => {
		if (!open) selectedId = null;
	}}
>
	<AppSheetContent>
		{#if detail?.error}
			<Sheet.Header>
				<Sheet.Title>Invoice</Sheet.Title>
				<Sheet.Description class="text-destructive">{detail.error.message}</Sheet.Description>
			</Sheet.Header>
		{:else if !detail?.current}
			<div class="flex flex-col gap-3 p-4">
				<Skeleton class="h-8 w-48" />
				<Skeleton class="h-64" />
			</div>
		{:else}
			{@const inv = detail.current}
			<Sheet.Header>
				<Sheet.Title>Invoice {inv.number}</Sheet.Title>
				<Sheet.Description>
					{inv.customer.name} · {inv.subscription.number} · {formatDate(inv.periodStart)} – {formatDate(
						inv.periodEnd
					)}
				</Sheet.Description>
			</Sheet.Header>

			<div class="flex flex-col gap-5 px-4 pb-6">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant={STATUS_BADGE[inv.status] ?? 'outline'}>{humanize(inv.status)}</Badge>
					{#if isOverdue(inv)}<Badge variant="destructive">Overdue</Badge>{/if}
					{#if inv.sentAt}
						<span class="text-xs text-muted-foreground">Sent {formatDate(inv.sentAt)}</span>
					{/if}
				</div>

				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Description</Table.Head>
							<Table.Head class="text-right">Qty</Table.Head>
							<Table.Head class="text-right">Unit</Table.Head>
							<Table.Head class="text-right">Amount</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each inv.lines as l (l.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-col">
										<span>{l.description}</span>
										{#if Number(l.discountAmount) > 0 || Number(l.taxAmount) > 0}
											<span class="text-xs text-muted-foreground">
												{#if Number(l.discountAmount) > 0}Discount −{formatCurrency(
														l.discountAmount
													)} ·
												{/if}
												Tax {Number(l.taxRatePercent)}%: {formatCurrency(l.taxAmount)}
											</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">{l.quantity}</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(l.unitPrice)}</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(l.amount)}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>

				<div class="flex flex-col gap-1 text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Subtotal</span><span
							>{formatCurrency(inv.subtotal)}</span
						>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Discounts</span><span
							>−{formatCurrency(inv.discountTotal)}</span
						>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Tax</span><span>{formatCurrency(inv.taxTotal)}</span
						>
					</div>
					<div class="flex justify-between border-t pt-2 font-semibold">
						<span>Total</span><span>{formatCurrency(inv.total)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Paid</span><span
							>{formatCurrency(inv.amountPaid)}</span
						>
					</div>
					<div class="flex justify-between font-medium">
						<span>Balance due</span>
						<span>{formatCurrency(Number(inv.total) - Number(inv.amountPaid))}</span>
					</div>
					<p class="text-xs text-muted-foreground">Due by {formatDate(inv.dueDate)}</p>
				</div>

				{#if inv.discountApplications.length > 0}
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium">Discounts applied</p>
						{#each inv.discountApplications as app (app.id)}
							<p class="text-sm text-muted-foreground">
								{app.discount.name} — −{formatCurrency(app.amount)}
							</p>
						{/each}
					</div>
				{/if}

				<div class="flex flex-col gap-2">
					<p class="text-sm font-medium">Payments</p>
					{#if inv.payments.length === 0}
						<p class="text-sm text-muted-foreground">No payments yet.</p>
					{:else}
						{#each inv.payments as p (p.id)}
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground">
									{formatDate(p.paidOn)} · {humanize(p.method)}
								</span>
								<span class="font-medium">{formatCurrency(p.amount)}</span>
							</div>
						{/each}
					{/if}
				</div>

				{#if inv.status === 'confirmed'}
					<form
						class="flex flex-col gap-3 rounded-lg border p-3"
						onsubmit={(e) => {
							e.preventDefault();
							recordPayment(inv.id);
						}}
					>
						<p class="text-sm font-medium">Record a payment</p>
						<div class="grid grid-cols-2 gap-3">
							<Field.Field>
								<Field.FieldLabel for="inv-pay-method">Method</Field.FieldLabel>
								<Select.Root
									type="single"
									value={payForm.method}
									onValueChange={(v) => (payForm.method = v as PaymentMethod)}
								>
									<Select.Trigger id="inv-pay-method" class="w-full">
										{METHOD_OPTIONS.find((o) => o.value === payForm.method)?.label}
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
								<Field.FieldLabel for="inv-pay-amount">Amount (₹)</Field.FieldLabel>
								<Input
									id="inv-pay-amount"
									type="number"
									min="0"
									step="0.01"
									bind:value={payForm.amount}
									required
								/>
							</Field.Field>
						</div>
						<Field.Field>
							<Field.FieldLabel for="inv-pay-date">Paid on</Field.FieldLabel>
							<DatePicker id="inv-pay-date" bind:value={payForm.paidOn} />
						</Field.Field>
						<Button type="submit" size="sm" disabled={paying}>
							{#if paying}<BarSpinner role="status" aria-label="Recording payment" />{/if}
							Record payment
						</Button>
					</form>
				{/if}

				<div class="flex flex-wrap gap-2">
					{#if inv.status === 'draft'}
						<Button size="sm" disabled={acting !== null} onclick={() => act(inv.id, 'confirm')}>
							Confirm invoice
						</Button>
					{/if}
					{#if inv.status === 'confirmed'}
						<Button
							size="sm"
							variant="outline"
							disabled={acting !== null}
							onclick={() => act(inv.id, 'send')}
						>
							<MailIcon data-icon="inline-start" />
							Send to customer
						</Button>
					{/if}
					{#if inv.status !== 'paid' && inv.status !== 'cancelled'}
						<Button
							size="sm"
							variant="destructive"
							disabled={acting !== null}
							onclick={() => act(inv.id, 'cancel')}
						>
							Cancel invoice
						</Button>
					{/if}
				</div>
			</div>
		{/if}
	</AppSheetContent>
</Sheet.Root>

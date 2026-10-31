<script lang="ts">
	import { getMyInvoiceQuery, getMyInvoicesQuery } from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';

	import EyeIcon from '@lucide/svelte/icons/eye';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	const invoices = getMyInvoicesQuery();

	const STATUS_BADGE: Record<string, BadgeVariant> = {
		draft: 'outline',
		confirmed: 'secondary',
		paid: 'default',
		cancelled: 'destructive'
	};

	const todayStr = new Date().toISOString().slice(0, 10);

	let selectedId = $state<string | null>(null);
	const detail = $derived(selectedId ? getMyInvoiceQuery(selectedId) : null);
</script>

<svelte:head>
	<title>My Invoices — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">
			<SidebarTrigger class="mr-4" />
			My Invoices
		</h1>
		<p class="text-sm text-muted-foreground">Every bill for your subscriptions, in one place.</p>
	</div>

	{#if invoices.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load your invoices
				</Card.Title>
				<Card.Description>{invoices.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => invoices.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !invoices.current}
		<Skeleton class="h-96" aria-label="Loading invoices" />
	{:else if invoices.current.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No invoices yet</p>
				<p class="text-sm text-muted-foreground">Your first invoice will appear on billing day.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Number</Table.Head>
							<Table.Head>Subscription</Table.Head>
							<Table.Head>Period</Table.Head>
							<Table.Head>Due</Table.Head>
							<Table.Head class="text-right">Total</Table.Head>
							<Table.Head class="text-right">Paid</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">View</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each invoices.current as inv (inv.id)}
							{@const overdue =
								(inv.status === 'draft' || inv.status === 'confirmed') && inv.dueDate < todayStr}
							<Table.Row>
								<Table.Cell class="font-medium">{inv.number}</Table.Cell>
								<Table.Cell>{inv.subscription.number}</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
								</Table.Cell>
								<Table.Cell class={overdue ? 'font-medium text-destructive' : ''}>
									{formatDate(inv.dueDate)}
									{#if overdue}<Badge variant="destructive" class="ml-1">Overdue</Badge>{/if}
								</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(inv.total)}</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(inv.amountPaid)}</Table.Cell>
								<Table.Cell>
									<Badge variant={STATUS_BADGE[inv.status] ?? 'outline'}
										>{humanize(inv.status)}</Badge
									>
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										variant="ghost"
										size="icon"
										aria-label="View invoice"
										onclick={() => (selectedId = inv.id)}
									>
										<EyeIcon />
									</Button>
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
	<Sheet.Content class="overflow-y-auto sm:max-w-lg">
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
					{inv.subscription.number} · {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
				</Sheet.Description>
			</Sheet.Header>

			<div class="flex flex-col gap-5 px-4 pb-6">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant={STATUS_BADGE[inv.status] ?? 'outline'}>{humanize(inv.status)}</Badge>
					<span class="text-xs text-muted-foreground">Due by {formatDate(inv.dueDate)}</span>
				</div>

				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Description</Table.Head>
							<Table.Head class="text-right">Qty</Table.Head>
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
												Tax: {formatCurrency(l.taxAmount)}
											</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">{l.quantity}</Table.Cell>
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
						<p class="text-sm text-muted-foreground">No payments recorded yet.</p>
					{:else}
						{#each inv.payments as p (p.id)}
							<div class="flex items-center justify-between text-sm">
								<span class="text-muted-foreground"
									>{formatDate(p.paidOn)} · {humanize(p.method)}</span
								>
								<span class="font-medium">{formatCurrency(p.amount)}</span>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>

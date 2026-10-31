<script lang="ts">
	import { getStaffOverviewQuery } from './data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';

	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import ReceiptTextIcon from '@lucide/svelte/icons/receipt-text';
	import RepeatIcon from '@lucide/svelte/icons/repeat';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import WalletIcon from '@lucide/svelte/icons/wallet';

	const overview = getStaffOverviewQuery();

	const INVOICE_BADGE: Record<string, BadgeVariant> = {
		draft: 'outline',
		confirmed: 'secondary',
		paid: 'default',
		cancelled: 'destructive'
	};
</script>

<svelte:head>
	<title>Staff Dashboard — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">
			<SidebarTrigger class="mr-4" />
			Dashboard
		</h1>
		<p class="text-sm text-muted-foreground">Today's operations at a glance.</p>
	</div>

	{#if overview.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load the dashboard
				</Card.Title>
				<Card.Description>{overview.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => overview.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !overview.current}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<Skeleton class="h-32" />
			<Skeleton class="h-32" />
			<Skeleton class="h-32" />
			<Skeleton class="h-32" />
		</div>
	{:else}
		{@const o = overview.current}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground"
						>Active subscriptions</Card.Title
					>
					<RepeatIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content>
					<span class="text-3xl font-semibold">{o.activeSubscriptions}</span>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground">Due for billing</Card.Title>
					<CalendarClockIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					<span class="text-3xl font-semibold">{o.dueForBilling}</span>
					<span class="text-xs text-muted-foreground">Waiting for the admin billing run</span>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground">Outstanding</Card.Title>
					<ReceiptTextIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					<span class="text-3xl font-semibold">{formatCurrency(o.outstandingAmount)}</span>
					<span class="text-xs text-muted-foreground">{o.outstandingInvoices} open invoices</span>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground">Overdue invoices</Card.Title
					>
					<TriangleAlertIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					<span class="text-3xl font-semibold">{o.overdueInvoices}</span>
					<span class="text-xs text-muted-foreground"
						>Chase these before they become lost revenue</span
					>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Recent invoices</Card.Title>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					{#if o.recentInvoices.length === 0}
						<p class="text-sm text-muted-foreground">No invoices yet.</p>
					{:else}
						{#each o.recentInvoices as inv (inv.id)}
							<div class="flex items-center justify-between gap-3 text-sm">
								<div class="flex flex-col">
									<span class="font-medium">{inv.number}</span>
									<span class="text-xs text-muted-foreground">
										{inv.customer.name} · Due {formatDate(inv.dueDate)}
									</span>
								</div>
								<span class="flex items-center gap-2">
									<Badge variant={INVOICE_BADGE[inv.status] ?? 'outline'}
										>{humanize(inv.status)}</Badge
									>
									<span class="font-medium">{formatCurrency(inv.total)}</span>
								</span>
							</div>
						{/each}
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<WalletIcon class="size-5 text-muted-foreground" aria-hidden="true" />
						Recent payments
					</Card.Title>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					{#if o.recentPayments.length === 0}
						<p class="text-sm text-muted-foreground">No payments recorded yet.</p>
					{:else}
						{#each o.recentPayments as p (p.id)}
							<div class="flex items-center justify-between gap-3 text-sm">
								<div class="flex flex-col">
									<span class="font-medium">{p.invoice.number}</span>
									<span class="text-xs text-muted-foreground">
										{p.invoice.customer.name} · {humanize(p.method)} · {formatDate(p.paidOn)}
									</span>
								</div>
								<span class="font-medium">{formatCurrency(p.amount)}</span>
							</div>
						{/each}
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
